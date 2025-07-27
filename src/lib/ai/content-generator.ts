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
    const prompt = this.buildAnalysisPrompt(data)

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert startup analyst and content writer. Analyze the provided data about a startup and determine if it represents a success story worth featuring. Be objective and look for concrete evidence of success, growth, funding, or significant milestones.

Your response must be valid JSON with this exact structure:
{
  "isSuccessStory": boolean,
  "confidence": number (0-1),
  "title": "string",
  "summary": "string (100-200 words)",
  "content": "string (500-1500 words)",
  "tags": ["string"],
  "storyType": "success" | "funding" | "milestone" | "pivot",
  "keyMetrics": {
    "funding": number | null,
    "userGrowth": number | null,
    "revenue": number | null
  }
}`
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

  private buildAnalysisPrompt(data: any): string {
    const sections = []

    if (data.productHunt?.length) {
      sections.push(`Product Hunt Data:
${JSON.stringify(data.productHunt, null, 2)}`)
    }

    if (data.hackerNews?.length) {
      sections.push(`Hacker News Data:
${JSON.stringify(data.hackerNews, null, 2)}`)
    }

    if (data.github?.length) {
      sections.push(`GitHub Data:
${JSON.stringify(data.github, null, 2)}`)
    }

    if (data.rss?.length) {
      sections.push(`RSS/News Data:
${JSON.stringify(data.rss, null, 2)}`)
    }

    if (data.scraped?.length) {
      sections.push(`Scraped Data:
${JSON.stringify(data.scraped, null, 2)}`)
    }

    return `Analyze this data about ${data.companyName} to determine if it represents a startup success story:

${sections.join('\n\n')}

Look for evidence of:
- Funding rounds or investment
- User growth or market traction
- Product launches or milestones
- Recognition or awards
- Revenue growth
- Team expansion
- Market validation

Determine if this is a genuine success story and create compelling content if it is.`
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