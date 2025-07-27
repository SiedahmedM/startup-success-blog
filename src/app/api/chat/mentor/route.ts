import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import OpenAI from 'openai'
import { rateLimiter } from '@/lib/utils/rate-limiter'
import { ErrorHandler } from '@/lib/utils/error-handler'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  struggle_category?: string
}

interface MentorResponse {
  message: string
  examples: Array<{
    startup: string
    struggle: string
    solution: string
    outcome: string
  }>
  actionSteps: string[]
  category: string
}

const STRUGGLE_CATEGORIES = {
  'quit': 'burnout_motivation',
  'users': 'user_acquisition',
  'money': 'funding_revenue',
  'alone': 'isolation_support',
  'product': 'product_market_fit',
  'team': 'team_building',
  'competition': 'market_competition',
  'growth': 'scaling_challenges'
}

const QUICK_PROMPTS = {
  'I want to quit': 'quit',
  'No users yet': 'users',
  'Out of money': 'money',
  'Feeling alone': 'alone'
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    await rateLimiter.checkLimit('ai_processing', clientIp)

    const body = await request.json()
    const { message, conversationId, userId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Determine struggle category
    const category = determineStruggleCategory(message)
    
    // Get or create conversation
    const conversation = await getOrCreateConversation(conversationId, userId, category)
    
    // Save user message
    await saveMessage(conversation.id, 'user', message, category)
    
    // Get relevant startup examples
    const examples = await getRelevantStartupExamples(category, message)
    
    // Generate AI response
    const mentorResponse = await generateMentorResponse(message, category, examples)
    
    // Save assistant message
    const assistantMessage = await saveMessage(
      conversation.id, 
      'assistant', 
      JSON.stringify(mentorResponse),
      category,
      examples.map(e => e.startup_id)
    )
    
    // Update conversation timestamp
    await updateConversationTimestamp(conversation.id, category)

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      response: mentorResponse,
      messageId: assistantMessage.id
    })

  } catch (error) {
    console.error('Chat mentor error:', error)
    return ErrorHandler.handleApiError(error, 'chat_mentor')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    const chatHistory = messages?.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.role === 'assistant' ? JSON.parse(msg.content) : msg.content,
      timestamp: msg.created_at,
      category: msg.struggle_category
    })) || []

    return NextResponse.json({ messages: chatHistory })

  } catch (error) {
    return ErrorHandler.handleApiError(error, 'get_chat_history')
  }
}

function determineStruggleCategory(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  // Check quick prompts first
  for (const [prompt, category] of Object.entries(QUICK_PROMPTS)) {
    if (lowerMessage.includes(prompt.toLowerCase())) {
      return STRUGGLE_CATEGORIES[category as keyof typeof STRUGGLE_CATEGORIES]
    }
  }
  
  // Check for keywords
  const keywords = {
    burnout_motivation: ['quit', 'burnout', 'exhausted', 'motivation', 'give up', 'tired'],
    user_acquisition: ['users', 'customers', 'traction', 'marketing', 'growth', 'acquisition'],
    funding_revenue: ['money', 'funding', 'revenue', 'cash', 'investors', 'broke'],
    isolation_support: ['alone', 'lonely', 'isolated', 'support', 'mentor', 'help'],
    product_market_fit: ['product', 'market fit', 'pivot', 'features', 'feedback'],
    team_building: ['team', 'hiring', 'employees', 'co-founder', 'staff'],
    market_competition: ['competition', 'competitors', 'market', 'differentiate'],
    scaling_challenges: ['scale', 'growth', 'expand', 'operations', 'systems']
  }
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      return category
    }
  }
  
  return 'general'
}

async function getOrCreateConversation(conversationId: string | null, userId: string, category: string) {
  if (conversationId) {
    const { data: existing } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()
    
    if (existing) return existing
  }
  
  const { data: newConversation } = await supabaseAdmin
    .from('chat_conversations')
    .insert({
      user_identifier: userId || 'anonymous',
      struggle_category: category,
      status: 'active'
    })
    .select('*')
    .single()
  
  return newConversation
}

async function saveMessage(
  conversationId: string, 
  role: 'user' | 'assistant', 
  content: string, 
  category: string,
  mentionedStartups: string[] = []
) {
  const { data } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      struggle_category: category,
      mentioned_startups: mentionedStartups
    })
    .select('*')
    .single()
  
  return data
}

async function updateConversationTimestamp(conversationId: string, category: string) {
  await supabaseAdmin
    .from('chat_conversations')
    .update({ 
      last_message_at: new Date().toISOString(),
      struggle_category: category
    })
    .eq('id', conversationId)
}

async function getRelevantStartupExamples(category: string, message: string) {
  // Get startups with success stories that match the struggle category
  const { data: stories } = await supabaseAdmin
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .contains('tags', getTagsForCategory(category))
    .eq('featured', false)
    .gte('confidence_score', 0.7)
    .order('published_at', { ascending: false })
    .limit(5)

  if (!stories || stories.length === 0) {
    // Fallback: get any high-confidence stories
    const { data: fallbackStories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(*)
      `)
      .gte('confidence_score', 0.8)
      .order('published_at', { ascending: false })
      .limit(3)
    
    return fallbackStories?.map(story => ({
      startup_id: story.startup?.id,
      name: story.startup?.name || 'Unknown Startup',
      struggle: extractStruggleFromStory(story.content),
      solution: story.summary || story.content.substring(0, 200),
      outcome: extractOutcomeFromStory(story.content),
      tags: story.tags || []
    })) || []
  }

  return stories.map(story => ({
    startup_id: story.startup?.id,
    name: story.startup?.name || 'Unknown Startup',
    struggle: extractStruggleFromStory(story.content),
    solution: story.summary || story.content.substring(0, 200),
    outcome: extractOutcomeFromStory(story.content),
    tags: story.tags || []
  }))
}

function getTagsForCategory(category: string): string[] {
  const categoryTags = {
    burnout_motivation: ['motivation', 'perseverance', 'comeback'],
    user_acquisition: ['growth', 'marketing', 'users', 'traction'],
    funding_revenue: ['funding', 'revenue', 'bootstrap', 'investment'],
    isolation_support: ['community', 'mentorship', 'support'],
    product_market_fit: ['pivot', 'product', 'market-fit'],
    team_building: ['team', 'hiring', 'co-founder'],
    market_competition: ['competition', 'differentiation'],
    scaling_challenges: ['scale', 'growth', 'expansion']
  }
  
  return categoryTags[category as keyof typeof categoryTags] || ['startup', 'success']
}

function extractStruggleFromStory(content: string): string {
  const sentences = content.split('. ')
  const struggleIndicators = ['struggled', 'challenge', 'problem', 'difficulty', 'faced', 'obstacle']
  
  for (const sentence of sentences) {
    if (struggleIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
      return sentence.length > 150 ? sentence.substring(0, 150) + '...' : sentence
    }
  }
  
  return sentences[0]?.substring(0, 150) + '...' || 'Various entrepreneurial challenges'
}

function extractOutcomeFromStory(content: string): string {
  const sentences = content.split('. ')
  const outcomeIndicators = ['success', 'achieved', 'raised', 'grew', 'reached', 'million', 'acquired']
  
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i]
    if (outcomeIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
      return sentence.length > 150 ? sentence.substring(0, 150) + '...' : sentence
    }
  }
  
  return 'Achieved significant business success'
}

async function generateMentorResponse(
  message: string, 
  category: string, 
  examples: any[]
): Promise<MentorResponse> {
  const prompt = `You are an empathetic startup mentor helping a struggling founder. 

User's struggle: "${message}"
Struggle category: ${category}

Available startup examples who overcame similar challenges:
${examples.map(ex => `- ${ex.name}: ${ex.struggle} → ${ex.outcome}`).join('\n')}

Respond with a JSON object containing:
{
  "message": "Empathetic acknowledgment (2-3 sentences)",
  "examples": [
    {
      "startup": "Company name",
      "struggle": "What they struggled with",
      "solution": "How they overcame it",
      "outcome": "What they achieved"
    }
  ],
  "actionSteps": ["Specific actionable step 1", "Specific actionable step 2", "Specific actionable step 3"],
  "category": "${category}"
}

Make the response personal, actionable, and encouraging. Use the real examples provided but make them concise. Focus on practical steps they can take this week.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic startup mentor. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    try {
      return JSON.parse(content)
    } catch (parseError) {
      // Fallback response if JSON parsing fails
      return {
        message: "I understand you're going through a tough time. Every successful founder has faced similar challenges - you're not alone in this journey.",
        examples: examples.slice(0, 2).map(ex => ({
          startup: ex.name,
          struggle: ex.struggle,
          solution: "Persevered through challenges with strategic pivots",
          outcome: ex.outcome
        })),
        actionSteps: [
          "Take a step back and assess your current situation objectively",
          "Reach out to other founders or mentors in your network",
          "Focus on one small win you can achieve this week"
        ],
        category
      }
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback response
    return {
      message: "I hear you, and what you're experiencing is completely normal in the startup journey. Many successful founders have felt exactly like you do right now.",
      examples: examples.slice(0, 2).map(ex => ({
        startup: ex.name,
        struggle: ex.struggle,
        solution: "Found creative solutions through persistence",
        outcome: ex.outcome
      })),
      actionSteps: [
        "Document what you've learned so far",
        "Identify your next smallest viable step",
        "Connect with one person who might help or advise"
      ],
      category
    }
  }
}