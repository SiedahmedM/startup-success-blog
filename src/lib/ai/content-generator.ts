import OpenAI from 'openai'
import { AIAnalysisResult, ProductHuntPost, HackerNewsPost, GitHubRepo, RSSItem } from '@/lib/types'

export class AIContentGenerator {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async analyzeStartupData(data: {
    productHunt?: ProductHuntPost[]
    hackerNews?: HackerNewsPost[]
    github?: GitHubRepo[]
    rss?: RSSItem[]
    scraped?: any[]
    companyName: string
  }): Promise<AIAnalysisResult> {
    const prompt = this.buildEnhancedAnalysisPrompt(data)

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert startup analyst and content writer specializing in funding rounds, growth milestones, and startup success stories. Focus on startups that have raised at least $500,000 in the past 2 years.

Your response must be valid JSON with this exact structure:
{
  "isSuccessStory": boolean,
  "confidence": number (0-1),
  "title": "string (compelling headline about funding/growth)",
  "summary": "string (100-200 words highlighting key achievements)",
  "content": "string (500-1500 words with detailed analysis)",
  "tags": ["string"],
  "storyType": "funding" | "milestone" | "success" | "pivot",
  "keyMetrics": {
    "funding": number | null,
    "userGrowth": number | null,
    "revenue": number | null
  }
}

Focus on:
- Funding rounds ($500K+ in past 2 years)
- Growth milestones and user traction
- Product launches and market validation
- Team expansion and hiring
- Strategic partnerships and acquisitions
- Revenue growth and business model validation

Be specific about amounts, dates, and concrete achievements.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      try {
        const result = JSON.parse(content) as AIAnalysisResult
        return this.validateAndSanitizeResult(result)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError)
        return this.createFallbackResult(data.companyName)
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      return this.createFallbackResult(data.companyName)
    }
  }

  async generateFundingStory(companyName: string, fundingAmount: number, fundingStage: string, additionalData?: any): Promise<AIAnalysisResult> {
    // Don't generate stories for $0 funding
    if (fundingAmount < 500000) {
      return {
        isSuccessStory: false,
        confidence: 0,
        title: '',
        summary: '',
        content: '',
        tags: [],
        storyType: 'funding',
        keyMetrics: {
          funding: null,
          userGrowth: null,
          revenue: null
        }
      }
    }

    const fundingAmountM = (fundingAmount / 1000000).toFixed(1)
    
    // Extract funding date and current valuation from additional data
    const fundingDate = additionalData?.funding_date || additionalData?.founded_date
    const currentValuation = additionalData?.current_valuation
    const valuationDate = additionalData?.valuation_date
    
    // Format funding date for title
    let titleDate = ''
    if (fundingDate) {
      const date = new Date(fundingDate)
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      titleDate = ` (${month}/${year})`
    }

    const prompt = `Create a compelling funding story for ${companyName} that has raised $${fundingAmountM}M in ${fundingStage} funding.

Additional Context: ${JSON.stringify(additionalData || {})}

Create a detailed, professional story that includes:
- Company background and mission
- Funding round details and investors
- Current valuation and market position
- Growth metrics and achievements
- Market opportunity and competitive advantage
- Future plans and vision

Make it engaging and informative for startup enthusiasts and investors.`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup journalist specializing in funding announcements and startup success stories. Write compelling, accurate, and engaging content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      return {
        isSuccessStory: true,
        confidence: 0.9,
        title: `${companyName} Secures $${fundingAmountM}M in ${fundingStage} Funding${titleDate}`,
        summary: `${companyName} has successfully raised $${fundingAmountM} million in ${fundingStage.toLowerCase()} funding, demonstrating strong market validation and growth potential.`,
        content: content,
        tags: ['startup', 'funding', 'success', fundingStage.toLowerCase()],
        storyType: 'funding',
        keyMetrics: {
          funding: fundingAmount,
          userGrowth: null,
          revenue: null
        }
      }
    } catch (error) {
      console.error('Error generating funding story:', error)
      return this.createFallbackResult(companyName)
    }
  }

  async generateGrowthStory(companyName: string, growthMetrics: any): Promise<AIAnalysisResult> {
    const prompt = `Create a compelling growth story for ${companyName} based on the following metrics:

Growth Metrics: ${JSON.stringify(growthMetrics)}

Focus on:
- User growth and engagement
- Revenue milestones
- Product development achievements
- Market expansion
- Team growth and hiring

Make it engaging and highlight the startup's journey to success.`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup analyst focusing on growth stories and milestone achievements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      return {
        isSuccessStory: true,
        confidence: 0.85,
        title: `${companyName} Achieves Remarkable Growth Milestone`,
        summary: `${companyName} has demonstrated exceptional growth and market traction, positioning itself as a rising star in its industry.`,
        content: content,
        tags: ['startup', 'growth', 'success', 'milestone'],
        storyType: 'milestone',
        keyMetrics: growthMetrics
      }
    } catch (error) {
      console.error('Error generating growth story:', error)
      return this.createFallbackResult(companyName)
    }
  }

  async generateStoryFromSources(sources: any[], companyName: string): Promise<AIAnalysisResult> {
    const prompt = `Analyze the following data sources about ${companyName} and create a compelling startup success story:

${JSON.stringify(sources, null, 2)}

Create a well-structured article that:
1. Identifies the key success indicators
2. Tells a coherent narrative about the company's journey
3. Highlights specific achievements and milestones
4. Includes relevant metrics and data points
5. Explains why this is a success story worth sharing

Focus on concrete achievements like funding rounds, user growth, product launches, market traction, or significant partnerships.`

    return this.analyzeStartupData({ companyName, scraped: sources })
  }

  async enhanceStoryContent(existingContent: string, additionalData: any[]): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a skilled content editor. Enhance the existing startup story with new information while maintaining narrative flow and accuracy.'
          },
          {
            role: 'user',
            content: `Enhance this startup story with the following additional information:

Existing story:
${existingContent}

Additional data:
${JSON.stringify(additionalData, null, 2)}

Return an improved version that seamlessly integrates the new information while maintaining the original story's structure and tone.`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })

      return response.choices[0]?.message?.content || existingContent
    } catch (error) {
      console.error('Error enhancing story content:', error)
      return existingContent
    }
  }

  async extractKeyMetrics(content: string): Promise<{
    funding?: number
    userGrowth?: number
    revenue?: number
    employees?: number
    valuation?: number
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract numerical metrics from startup content. Return JSON with these fields (set to null if not found):
{
  "funding": number (in USD),
  "userGrowth": number (percentage or absolute),
  "revenue": number (in USD),
  "employees": number,
  "valuation": number (in USD)
}`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      })

      const result = response.choices[0]?.message?.content
      return result ? JSON.parse(result) : {}
    } catch (error) {
      console.error('Error extracting metrics:', error)
      return {}
    }
  }

  async generateTags(content: string, title: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate 5-8 relevant tags for this startup story. Return as JSON array of strings. Focus on industry, stage, achievement type, and tech stack.'
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })

      const result = response.choices[0]?.message?.content
      return result ? JSON.parse(result) : []
    } catch (error) {
      console.error('Error generating tags:', error)
      return ['startup', 'technology', 'innovation']
    }
  }

  async detectSuccessSignals(data: any[]): Promise<{
    signals: Array<{ type: string; confidence: number; description: string }>
    overallScore: number
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze data for startup success signals. Return JSON:
{
  "signals": [
    {
      "type": "funding" | "growth" | "traction" | "recognition" | "expansion",
      "confidence": number (0-1),
      "description": "string"
    }
  ],
  "overallScore": number (0-1)
}`
          },
          {
            role: 'user',
            content: JSON.stringify(data, null, 2)
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      })

      const result = response.choices[0]?.message?.content
      return result ? JSON.parse(result) : { signals: [], overallScore: 0 }
    } catch (error) {
      console.error('Error detecting success signals:', error)
      return { signals: [], overallScore: 0 }
    }
  }

  private buildEnhancedAnalysisPrompt(data: any): string {
    const sources = []
    
    if (data.productHunt?.length) {
      sources.push(`Product Hunt Data: ${JSON.stringify(data.productHunt.slice(0, 3))}`)
    }
    
    if (data.hackerNews?.length) {
      sources.push(`Hacker News Data: ${JSON.stringify(data.hackerNews.slice(0, 3))}`)
    }
    
    if (data.github?.length) {
      sources.push(`GitHub Data: ${JSON.stringify(data.github.slice(0, 3))}`)
    }
    
    if (data.rss?.length) {
      sources.push(`RSS Data: ${JSON.stringify(data.rss.slice(0, 3))}`)
    }
    
    if (data.scraped?.length) {
      sources.push(`Scraped Data: ${JSON.stringify(data.scraped.slice(0, 3))}`)
    }

    return `Analyze the following data about ${data.companyName} and determine if it represents a quality startup success story worth featuring.

Focus on startups that have:
- Raised $500,000+ in funding in the past 2 years
- Demonstrated significant growth or traction
- Launched successful products or services
- Achieved notable milestones or partnerships
- Showed strong market validation

Data Sources:
${sources.join('\n\n')}

Company Name: ${data.companyName}

Please analyze this data and create a compelling success story if the startup meets the quality criteria. Focus on concrete achievements, specific metrics, and clear evidence of success.

If the startup doesn't meet the quality criteria, set isSuccessStory to false and provide a brief explanation.`
  }

  private validateAndSanitizeResult(result: AIAnalysisResult): AIAnalysisResult {
    return {
      isSuccessStory: Boolean(result.isSuccessStory),
      confidence: Math.min(Math.max(Number(result.confidence) || 0, 0), 1),
      title: String(result.title || 'Untitled Story').substring(0, 200),
      summary: String(result.summary || '').substring(0, 500),
      content: String(result.content || '').substring(0, 5000),
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
      storyType: ['success', 'funding', 'milestone', 'pivot'].includes(result.storyType) 
        ? result.storyType as any 
        : 'success',
      keyMetrics: {
        funding: Number(result.keyMetrics?.funding) || null,
        userGrowth: Number(result.keyMetrics?.userGrowth) || null,
        revenue: Number(result.keyMetrics?.revenue) || null
      }
    }
  }

  private createFallbackResult(companyName: string): AIAnalysisResult {
    return {
      isSuccessStory: false,
      confidence: 0,
      title: `Analysis of ${companyName}`,
      summary: 'Unable to analyze startup data due to processing error.',
      content: 'Data analysis failed. Please review manually.',
      tags: ['error', 'manual-review'],
      storyType: 'success',
      keyMetrics: {
        funding: null,
        userGrowth: null,
        revenue: null
      }
    }
  }

  async generateHeadline(summary: string, keyMetrics: any): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Create a compelling, click-worthy headline for this startup success story. Keep it under 100 characters and focus on the key achievement.'
          },
          {
            role: 'user',
            content: `Summary: ${summary}\nKey Metrics: ${JSON.stringify(keyMetrics)}`
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      })

      const headline = response.choices[0]?.message?.content?.trim()
      return headline || 'Startup Success Story'
    } catch (error) {
      console.error('Error generating headline:', error)
      return 'Startup Success Story'
    }
  }
}