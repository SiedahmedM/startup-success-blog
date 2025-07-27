import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { AIContentGenerator } from '@/lib/ai/content-generator'

const aiGenerator = new AIContentGenerator()

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🔄 Generating missing stories for existing startups...')

    // Get startups without stories
    const { data: startupsWithoutStories } = await supabaseAdmin
      .from('startups')
      .select(`
        *,
        success_stories(id)
      `)
      .is('success_stories.id', null)

    console.log(`Found ${startupsWithoutStories?.length || 0} startups without stories`)

    let storiesGenerated = 0

    for (const startup of startupsWithoutStories || []) {
      try {
        console.log(`📝 Generating story for: ${startup.name}`)

        // Create story data
        const storyData = {
          startup_id: startup.id,
          title: `${startup.name} ${generateTitle(startup)}`,
          summary: generateSummary(startup),
          content: generateContent(startup),
          story_type: determineStoryType(startup),
          confidence_score: 0.85,
          tags: generateTags(startup),
          sources: [{
            type: 'automated_generation',
            url: startup.website_url || ''
          }],
          ai_generated: true,
          featured: storiesGenerated === 0, // Make first one featured
          published_at: new Date().toISOString()
        }

        // Insert story
        const { error: storyError } = await supabaseAdmin
          .from('success_stories')
          .insert(storyData)

        if (storyError) {
          console.error(`Error creating story for ${startup.name}:`, storyError)
          continue
        }

        console.log(`✅ Generated story for: ${startup.name}`)
        storiesGenerated++

      } catch (error) {
        console.error(`Error processing ${startup.name}:`, error)
        continue
      }
    }

    // Get final counts
    const { count: totalStories } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    const { count: totalStartups } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Story generation completed',
      storiesGenerated,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Story generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateTitle(startup: any): string {
    const titles = [
      `Raises $${(startup.funding_amount / 1000000).toFixed(1)}M ${startup.funding_stage?.replace('_', ' ').toUpperCase()}`,
      `Reaches Major Milestone in ${startup.industry}`,
      `Disrupts ${startup.industry} with Innovative Platform`,
      `Secures Significant Funding Round`,
      `Achieves Breakthrough in ${startup.industry} Sector`
    ]
    return titles[Math.floor(Math.random() * titles.length)]
  }

function generateSummary(startup: any): string {
    return `${startup.name}, a ${startup.location}-based ${startup.industry} company, has achieved significant success through innovation and strategic growth. The company has raised $${(startup.funding_amount / 1000000).toFixed(1)}M and continues to make waves in the industry.`
  }

function generateContent(startup: any): string {
    return `${startup.name} has emerged as a leading player in the ${startup.industry} space, demonstrating remarkable growth and innovation since its founding in ${new Date(startup.founded_date).getFullYear()}.

The ${startup.location}-based company has successfully raised $${(startup.funding_amount / 1000000).toFixed(1)} million in ${startup.funding_stage?.replace('_', ' ')} funding, positioning itself for continued expansion and market leadership.

${startup.description}

With ${startup.employee_count} team members, ${startup.name} has built a strong foundation for scalable growth. The company's success story exemplifies the power of innovative thinking and strategic execution in today's competitive market.

Key achievements include:
- Successfully raising $${(startup.funding_amount / 1000000).toFixed(1)}M in funding
- Building a team of ${startup.employee_count} professionals
- Establishing a strong presence in ${startup.location}
- Developing innovative solutions in the ${startup.industry} sector

The company continues to focus on growth and innovation, with plans for further expansion and product development. Their success demonstrates the viability of their business model and the strength of their market position.`
  }

function determineStoryType(startup: any): string {
    if (startup.funding_stage?.includes('series')) return 'funding'
    if (startup.employee_count > 50) return 'milestone'
    return 'growth'
  }

function generateTags(startup: any): string[] {
    const baseTags = [startup.industry?.toLowerCase(), startup.funding_stage]
    const additionalTags = ['startup', 'success', 'funding', 'growth']
    return [...baseTags.filter(Boolean), ...additionalTags].slice(0, 5)
  }
}