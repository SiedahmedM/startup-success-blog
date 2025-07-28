import cron from 'node-cron'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProductHuntCollector } from '@/lib/data-collectors/product-hunt'
import { HackerNewsCollector } from '@/lib/data-collectors/hacker-news'
import { GitHubCollector } from '@/lib/data-collectors/github'
import { RSSCollector } from '@/lib/data-collectors/rss-parser'
import { WebScraper } from '@/lib/data-collectors/web-scraper'
import { FundingScraper } from '@/lib/data-collectors/funding-scraper'
import { ValuationFetcher } from '@/lib/data-collectors/valuation-fetcher'
import { AIContentGenerator } from '@/lib/ai/content-generator'
import { DataValidator } from '@/lib/validation/data-validator'
import { RateLimiterMemory } from 'rate-limiter-flexible'

export class DataCollectionOrchestrator {
  private productHunt: ProductHuntCollector
  private hackerNews: HackerNewsCollector
  private github: GitHubCollector
  private rss: RSSCollector
  private webScraper: WebScraper
  private fundingScraper: FundingScraper
  private valuationFetcher: ValuationFetcher
  private aiGenerator: AIContentGenerator
  private validator: DataValidator
  private rateLimiter: RateLimiterMemory
  private isRunning = false

  constructor() {
    this.productHunt = new ProductHuntCollector()
    this.hackerNews = new HackerNewsCollector()
    this.github = new GitHubCollector()
    this.rss = new RSSCollector()
    this.webScraper = new WebScraper()
    this.fundingScraper = new FundingScraper()
    this.valuationFetcher = new ValuationFetcher()
    this.aiGenerator = new AIContentGenerator()
    this.validator = new DataValidator()
    
    this.rateLimiter = new RateLimiterMemory({
      points: 200, // Increased rate limits
      duration: 60,
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    console.log('Starting enhanced data collection orchestrator...')

    // More frequent data collection for better story generation
    cron.schedule('0 */3 * * *', async () => {
      await this.runProductHuntCollection()
    })

    cron.schedule('0 */3 * * *', async () => {
      await this.runHackerNewsCollection()
    })

    cron.schedule('0 6,12,18 * * *', async () => {
      await this.runRSSCollection()
    })

    cron.schedule('0 8,16 * * *', async () => {
      await this.runGitHubCollection()
    })

    cron.schedule('0 2,10,14,22 * * *', async () => {
      await this.runWebScrapingJobs()
    })

    // Funding collection for recently founded startups
    cron.schedule('0 7,15,23 * * *', async () => {
      await this.runFundingCollection()
    })

    // More frequent story generation
    cron.schedule('0 4,12,20 * * *', async () => {
      await this.runStoryGeneration()
    })

    // Daily maintenance and cleanup
    cron.schedule('0 1 * * *', async () => {
      await this.runDailyMaintenance()
    })

    // Weekly valuation updates
    cron.schedule('0 2 * * 0', async () => {
      await this.runValuationUpdates()
    })

    console.log('Enhanced cron jobs scheduled successfully')
  }

  stop(): void {
    this.isRunning = false
    cron.destroy()
    console.log('Data collection orchestrator stopped')
  }

  private async logJobStart(jobName: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('job_logs')
      .insert({
        job_name: jobName,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging job start:', error)
      return ''
    }

    return data.id
  }

  private async logJobComplete(
    jobId: string,
    recordsProcessed: number,
    metadata: any = {}
  ): Promise<void> {
    await supabaseAdmin
      .from('job_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        metadata
      })
      .eq('id', jobId)
  }

  private async logJobError(jobId: string, error: string): Promise<void> {
    await supabaseAdmin
      .from('job_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error
      })
      .eq('id', jobId)
  }

  private async runProductHuntCollection(): Promise<void> {
    const jobId = await this.logJobStart('product_hunt_collection')
    let recordsProcessed = 0

    try {
      await this.rateLimiter.consume('product_hunt')

      console.log('Starting Product Hunt collection...')
      const posts = await this.productHunt.fetchRecentLaunches(7)
      
      for (const post of posts) {
        if (this.productHunt.isSuccessCandidate(post)) {
          await this.processStartupLead({
            name: post.name,
            description: post.description,
            website_url: post.url,
            product_hunt_url: `https://www.producthunt.com/posts/${post.id}`,
            tags: post.topics.map(t => t.name)
          }, 'product_hunt', post)
          recordsProcessed++
        }
      }

      await this.logJobComplete(jobId, recordsProcessed, { posts_fetched: posts.length })
      console.log(`Product Hunt collection completed. Processed ${recordsProcessed} records`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Product Hunt collection failed:', error)
    }
  }

  private async runHackerNewsCollection(): Promise<void> {
    const jobId = await this.logJobStart('hacker_news_collection')
    let recordsProcessed = 0

    try {
      await this.rateLimiter.consume('hacker_news')

      console.log('Starting Hacker News collection...')
      const showHNStories = await this.hackerNews.fetchShowHNStories(7)
      const startupStories = await this.hackerNews.fetchStartupStories(7)
      
      const allStories = [...showHNStories, ...startupStories]

      for (const story of allStories) {
        if (this.hackerNews.isSuccessCandidate(story)) {
          const companyName = this.hackerNews.extractCompanyName(story)
          
          if (companyName) {
            await this.processStartupLead({
              name: companyName,
              description: story.text || story.title,
              website_url: story.url
            }, 'hacker_news', story)
            recordsProcessed++
          }
        }
      }

      await this.logJobComplete(jobId, recordsProcessed, { stories_fetched: allStories.length })
      console.log(`Hacker News collection completed. Processed ${recordsProcessed} records`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Hacker News collection failed:', error)
    }
  }

  private async runGitHubCollection(): Promise<void> {
    const jobId = await this.logJobStart('github_collection')
    let recordsProcessed = 0

    try {
      await this.rateLimiter.consume('github')

      console.log('Starting GitHub collection...')
      const startupRepos = await this.github.fetchStartupRepos(7)
      
      for (const repo of startupRepos) {
        if (this.github.isSuccessCandidate(repo)) {
          const companyName = this.github.extractCompanyFromRepo(repo) || repo.name
          
          await this.processStartupLead({
            name: companyName,
            description: repo.description || '',
            website_url: repo.html_url,
            github_repo: repo.html_url,
            tags: repo.topics
          }, 'github', repo)
          recordsProcessed++
        }
      }

      await this.logJobComplete(jobId, recordsProcessed, { repos_fetched: startupRepos.length })
      console.log(`GitHub collection completed. Processed ${recordsProcessed} records`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('GitHub collection failed:', error)
    }
  }

  private async runRSSCollection(): Promise<void> {
    const jobId = await this.logJobStart('rss_collection')
    let recordsProcessed = 0

    try {
      await this.rateLimiter.consume('rss')

      console.log('Starting RSS collection...')
      const startupNews = await this.rss.fetchStartupNews(7)
      const fundingNews = await this.rss.fetchFundingNews(7)
      
      const allNews = [...startupNews, ...fundingNews]

      for (const item of allNews) {
        if (this.rss.isSuccessCandidate(item)) {
          const companyName = this.rss.extractCompanyName(item)
          
          if (companyName) {
            await this.processStartupLead({
              name: companyName,
              description: item.description,
              website_url: item.link
            }, 'rss', item)
            recordsProcessed++
          }
        }
      }

      await this.logJobComplete(jobId, recordsProcessed, { items_fetched: allNews.length })
      console.log(`RSS collection completed. Processed ${recordsProcessed} records`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('RSS collection failed:', error)
    }
  }

  private async runWebScrapingJobs(): Promise<void> {
    const jobId = await this.logJobStart('web_scraping')
    let recordsProcessed = 0

    try {
      await this.webScraper.init()

      const { data: startups } = await supabaseAdmin
        .from('startups')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (startups) {
        for (const startup of startups.slice(0, 10)) {
          await this.rateLimiter.consume('web_scraping')
          
          const jobPostings = await this.webScraper.scrapeJobPostings(startup.name)
          const fundingNews = await this.webScraper.scrapeFundingAnnouncements(startup.name)

          if (jobPostings.jobCount > 0 || fundingNews.length > 0) {
            await supabaseAdmin
              .from('data_sources')
              .insert({
                startup_id: startup.id,
                source_type: 'scrape',
                source_url: 'multiple',
                data: { jobPostings, fundingNews }
              })
            recordsProcessed++
          }

          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }

      await this.logJobComplete(jobId, recordsProcessed)
      console.log(`Web scraping completed. Processed ${recordsProcessed} records`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Web scraping failed:', error)
    } finally {
      await this.webScraper.close()
    }
  }

  private async runFundingCollection(): Promise<void> {
    const jobId = await this.logJobStart('funding_collection')
    let recordsProcessed = 0

    try {
      await this.rateLimiter.consume('funding_collection')
      
      // Collect funding announcements for recently founded startups
      await this.fundingScraper.processScrapedFunding()
      
      // Generate stories for funded startups
      const { data: fundedStartups } = await supabaseAdmin
        .from('startups')
        .select(`
          *,
          success_stories(id)
        `)
        .gte('funding_amount', 500000)
        .is('success_stories.id', null)

      for (const startup of fundedStartups || []) {
        try {
          // Check if startup was founded in the last 5 years
          if (startup.founded_date) {
            const foundedDate = new Date(startup.founded_date)
            const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
            
            if (foundedDate >= fiveYearsAgo) {
              const fundingStory = await this.aiGenerator.generateFundingStory(
                startup.name,
                startup.funding_amount || 0,
                startup.funding_stage || 'funding',
                {
                  description: startup.description,
                  industry: startup.industry,
                  location: startup.location,
                  website_url: startup.website_url,
                  founded_date: startup.founded_date
                }
              )

              if (fundingStory.isSuccessStory) {
                const storyData = {
                  startup_id: startup.id,
                  title: fundingStory.title,
                  content: fundingStory.content,
                  summary: fundingStory.summary,
                  story_type: fundingStory.storyType,
                  confidence_score: fundingStory.confidence,
                  tags: fundingStory.tags,
                  sources: [{
                    type: 'funding_scraped',
                    url: startup.website_url || '',
                    confidence: 0.9
                  }],
                  ai_generated: true,
                  featured: (startup.funding_amount || 0) >= 10000000,
                  published_at: new Date().toISOString()
                }

                await supabaseAdmin
                  .from('success_stories')
                  .insert(storyData)

                recordsProcessed++
                console.log(`✅ Generated funding story for: ${startup.name}`)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing ${startup.name}:`, error)
        }
      }

      await this.logJobComplete(jobId, recordsProcessed)
      console.log(`Funding collection completed. Generated ${recordsProcessed} stories`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Funding collection failed:', error)
    }
  }

  private async runStoryGeneration(): Promise<void> {
    const jobId = await this.logJobStart('story_generation')
    let recordsProcessed = 0

    try {
      // Enhanced query to focus on recently founded startups with funding
      const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
      const { data: startupsNeedingStories } = await supabaseAdmin
        .from('startups')
        .select(`
          *,
          data_sources(*),
          success_stories(id)
        `)
        .is('success_stories.id', null)
        .gte('funding_amount', 500000) // At least $500K funding
        .gte('founded_date', fiveYearsAgo) // Founded in last 5 years
        .limit(10) // Increased limit for more stories

      if (startupsNeedingStories) {
        for (const startup of startupsNeedingStories) {
          const sources = startup.data_sources || []
          
          // Lowered threshold - only need 1 data source for story generation
          if (sources.length >= 1) {
            const analysisResult = await this.aiGenerator.analyzeStartupData({
              companyName: startup.name,
              productHunt: sources.filter(s => s.source_type === 'product_hunt').map(s => s.data),
              hackerNews: sources.filter(s => s.source_type === 'hacker_news').map(s => s.data),
              github: sources.filter(s => s.source_type === 'github').map(s => s.data),
              rss: sources.filter(s => s.source_type === 'rss').map(s => s.data),
              scraped: sources.filter(s => s.source_type === 'scrape').map(s => s.data)
            })

            // Lowered confidence threshold for more stories
            if (analysisResult.isSuccessStory && analysisResult.confidence > 0.4) {
              const validationResult = await this.validator.validateStartupStory(startup, sources)
              
              if (validationResult.finalVerdict !== 'rejected') {
                await supabaseAdmin
                  .from('success_stories')
                  .insert({
                    startup_id: startup.id,
                    title: analysisResult.title,
                    content: analysisResult.content,
                    summary: analysisResult.summary,
                    story_type: analysisResult.storyType,
                    confidence_score: analysisResult.confidence,
                    tags: analysisResult.tags,
                    sources: sources.map(s => ({
                      type: s.source_type,
                      url: s.source_url
                    })),
                    featured: validationResult.finalVerdict === 'approved' && analysisResult.confidence > 0.7
                  })

                recordsProcessed++
                console.log(`✅ Generated story for: ${startup.name} (confidence: ${analysisResult.confidence})`)
              }
            }
          }
        }
      }

      await this.logJobComplete(jobId, recordsProcessed)
      console.log(`Story generation completed. Created ${recordsProcessed} stories`)
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Story generation failed:', error)
    }
  }

  private async runWeeklyMaintenance(): Promise<void> {
    const jobId = await this.logJobStart('weekly_maintenance')

    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      await supabaseAdmin
        .from('data_sources')
        .delete()
        .eq('is_active', false)
        .lt('last_checked', weekAgo)

      await supabaseAdmin
        .from('job_logs')
        .delete()
        .lt('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      await this.logJobComplete(jobId, 0, { type: 'maintenance' })
      console.log('Weekly maintenance completed')
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Weekly maintenance failed:', error)
    }
  }

  private async processStartupLead(
    startupData: any,
    sourceType: string,
    rawData: any
  ): Promise<void> {
    try {
      // Validate and clean startup data
      const cleanedData = this.cleanStartupData(startupData)
      
      if (!cleanedData.name || this.isInvalidCompanyName(cleanedData.name)) {
        console.log(`Skipping invalid company name: ${startupData.name}`)
        return
      }

      // Check if startup already exists
      const { data: existingStartup } = await supabaseAdmin
        .from('startups')
        .select('*')
        .ilike('name', cleanedData.name)
        .single()

      if (existingStartup) {
        // Update existing startup with new data
        await supabaseAdmin
          .from('startups')
          .update({
            description: cleanedData.description || existingStartup.description,
            website_url: cleanedData.website_url || existingStartup.website_url,
            github_repo: cleanedData.github_repo || existingStartup.github_repo,
            tags: cleanedData.tags || existingStartup.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStartup.id)
      } else {
        // Create new startup
        const { data: newStartup } = await supabaseAdmin
          .from('startups')
          .insert({
            name: cleanedData.name,
            description: cleanedData.description,
            website_url: cleanedData.website_url,
            github_repo: cleanedData.github_repo,
            tags: cleanedData.tags,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (newStartup) {
          console.log(`✅ Created new startup: ${cleanedData.name}`)
        }
      }

      // Store data source
      await supabaseAdmin
        .from('data_sources')
        .insert({
          startup_id: existingStartup?.id || (await this.getStartupId(cleanedData.name)),
          source_type: sourceType,
          source_url: rawData.html_url || rawData.link || rawData.url || '',
          data: rawData,
          extracted_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error processing startup lead:', error)
    }
  }

  private cleanStartupData(data: any): any {
    return {
      name: this.cleanCompanyName(data.name),
      description: data.description?.trim() || '',
      website_url: data.website_url || '',
      github_repo: data.github_repo || '',
      tags: data.tags || []
    }
  }

  private cleanCompanyName(name: string): string {
    if (!name) return ''
    
    // Remove common prefixes/suffixes
    let cleaned = name
      .replace(/^(the\s+)/i, '')
      .replace(/(\s+inc\.?|\s+llc|\s+corp\.?|\s+ltd\.?)$/i, '')
      .trim()

    // Capitalize properly
    cleaned = cleaned.replace(/\b\w/g, l => l.toUpperCase())
    
    return cleaned
  }

  private isInvalidCompanyName(name: string): boolean {
    if (!name || name.length < 2) return true
    
    // Check for GitHub username patterns
    const githubPatterns = [
      /^[a-z]+\d+$/i,
      /^[a-z]+[_-][a-z]+$/i,
      /^[a-z]+\d+[a-z]+$/i,
      /^[a-z]+\.[a-z]+$/i,
      /^\d+[a-z]+$/i,
      /^[a-z]+\d+[a-z]+\d+$/i
    ]
    
    if (githubPatterns.some(pattern => pattern.test(name))) {
      return true
    }
    
    // Check for common non-company words
    const commonWords = [
      'app', 'api', 'sdk', 'tool', 'library', 'framework', 'platform',
      'service', 'product', 'startup', 'company', 'inc', 'llc', 'corp',
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'
    ]
    
    if (commonWords.includes(name.toLowerCase())) {
      return true
    }
    
    return false
  }

  private async getStartupId(name: string): Promise<string | null> {
    const { data: startup } = await supabaseAdmin
      .from('startups')
      .select('id')
      .ilike('name', name)
      .single()
    
    return startup?.id || null
  }

  async runManualCollection(sources: string[] = []): Promise<{
    success: boolean
    results: Record<string, number>
  }> {
    const results: Record<string, number> = {}

    try {
      if (sources.length === 0 || sources.includes('product_hunt')) {
        await this.runProductHuntCollection()
        results.product_hunt = 1
      }

      if (sources.length === 0 || sources.includes('hacker_news')) {
        await this.runHackerNewsCollection()
        results.hacker_news = 1
      }

      if (sources.length === 0 || sources.includes('github')) {
        await this.runGitHubCollection()
        results.github = 1
      }

      if (sources.length === 0 || sources.includes('rss')) {
        await this.runRSSCollection()
        results.rss = 1
      }

      return { success: true, results }
    } catch (error) {
      console.error('Manual collection failed:', error)
      return { success: false, results }
    }
  }

  private async runDailyMaintenance(): Promise<void> {
    const jobId = await this.logJobStart('daily_maintenance')
    
    try {
      // Clean up old data sources (older than 30 days)
      await supabaseAdmin
        .from('data_sources')
        .delete()
        .lt('extracted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Update startup funding information from external sources
      await this.updateStartupFundingInfo()

      // Generate stories for startups with funding but no stories
      await this.generateStoriesForFundedStartups()

      await this.logJobComplete(jobId, 1)
      console.log('Daily maintenance completed')
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Daily maintenance failed:', error)
    }
  }

  private async runValuationUpdates(): Promise<void> {
    const jobId = await this.logJobStart('valuation_updates')
    
    try {
      console.log('💰 Running valuation updates...')
      
      await this.valuationFetcher.updateStartupValuations()
      
      await this.logJobComplete(jobId, 0, { valuations: true })
      console.log('✅ Valuation updates completed')
    } catch (error) {
      await this.logJobError(jobId, error instanceof Error ? error.message : 'Unknown error')
      console.error('Valuation updates error:', error)
    }
  }

  private async updateStartupFundingInfo(): Promise<void> {
    try {
      const { data: startups } = await supabaseAdmin
        .from('startups')
        .select('*')
        .is('funding_amount', null)
        .limit(20)

      if (startups) {
        for (const startup of startups) {
          // Enhanced funding detection from multiple sources
          const fundingInfo = await this.detectFundingFromSources(startup)
          
          if (fundingInfo.hasFunding) {
            await supabaseAdmin
              .from('startups')
              .update({
                funding_amount: fundingInfo.amount,
                funding_stage: fundingInfo.stage,
                updated_at: new Date().toISOString()
              })
              .eq('id', startup.id)
          }
        }
      }
    } catch (error) {
      console.error('Funding info update failed:', error)
    }
  }

  private async detectFundingFromSources(startup: any): Promise<{
    hasFunding: boolean
    amount?: number
    stage?: string
  }> {
    // Enhanced funding detection logic
    const fundingKeywords = [
      'raised', 'funding', 'investment', 'series', 'seed', 'venture',
      'million', 'billion', 'fund', 'capital', 'investment round'
    ]

    const { data: sources } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .eq('startup_id', startup.id)

    if (!sources) return { hasFunding: false }

    for (const source of sources) {
      const content = JSON.stringify(source.data).toLowerCase()
      
      for (const keyword of fundingKeywords) {
        if (content.includes(keyword)) {
          // Extract funding amount using regex patterns
          const amountMatch = content.match(/\$?(\d+(?:\.\d+)?)\s*(?:million|billion|k|m|b)/i)
          if (amountMatch) {
            let amount = parseFloat(amountMatch[1])
            if (content.includes('million')) amount *= 1000000
            if (content.includes('billion')) amount *= 1000000000
            
            return {
              hasFunding: true,
              amount: amount,
              stage: this.detectFundingStage(content)
            }
          }
        }
      }
    }

    return { hasFunding: false }
  }

  private detectFundingStage(content: string): string {
    if (content.includes('seed')) return 'seed'
    if (content.includes('series a')) return 'series_a'
    if (content.includes('series b')) return 'series_b'
    if (content.includes('series c')) return 'series_c'
    return 'funding'
  }

  private async generateStoriesForFundedStartups(): Promise<void> {
    try {
      const { data: fundedStartups } = await supabaseAdmin
        .from('startups')
        .select(`
          *,
          success_stories(id)
        `)
        .gte('funding_amount', 500000)
        .is('success_stories.id', null)
        .limit(5)

      if (fundedStartups) {
        for (const startup of fundedStartups) {
          // Generate story for funded startups even without data sources
          const storyData = await this.generateStoryForFundedStartup(startup)
          
          if (storyData) {
            await supabaseAdmin
              .from('success_stories')
              .insert(storyData)

            console.log(`✅ Generated funding story for: ${startup.name}`)
          }
        }
      }
    } catch (error) {
      console.error('Funded startup story generation failed:', error)
    }
  }

  private async generateStoryForFundedStartup(startup: any): Promise<any> {
    const fundingAmount = (startup.funding_amount || 0) / 1000000
    const fundingStage = startup.funding_stage?.replace('_', ' ').toUpperCase() || 'FUNDING'
    const industry = startup.industry || 'technology'
    const location = startup.location || 'innovative'
    const employeeCount = startup.employee_count || 'a dedicated team of'
    const foundedYear = startup.founded_date ? new Date(startup.founded_date).getFullYear() : 'recent years'
    
    return {
      startup_id: startup.id,
      title: `${startup.name} Secures $${fundingAmount.toFixed(1)}M in ${fundingStage} Round`,
      summary: `${startup.name} has successfully raised $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding, demonstrating strong market validation and growth potential.`,
      content: this.generateFundingStoryContent(startup, fundingAmount, fundingStage, industry, location, employeeCount, foundedYear),
      story_type: 'funding',
      confidence_score: 0.85,
      tags: [
        'startup',
        'funding',
        'success',
        industry.toLowerCase(),
        startup.funding_stage
      ].filter(Boolean),
      sources: [{
        type: 'funding_detection',
        url: startup.website_url || '',
        confidence: 0.9
      }],
      ai_generated: true,
      featured: fundingAmount >= 10, // Feature stories with $10M+ funding
      published_at: new Date().toISOString()
    }
  }

  private generateFundingStoryContent(startup: any, fundingAmount: number, fundingStage: string, industry: string, location: string, employeeCount: string, foundedYear: string): string {
    return `${startup.name} has achieved a significant milestone by securing $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding, marking a pivotal moment in the company's growth trajectory.

Founded in ${foundedYear}, the ${location}-based startup has been making waves in the ${industry} sector with its innovative approach and strong execution.

## About ${startup.name}

${startup.description || 'A promising startup focused on innovation and growth.'}

The company has grown to ${employeeCount} employees and has established itself as a key player in the ${industry} space. This latest funding round positions ${startup.name} for accelerated growth and market expansion.

## Key Achievements

- Successfully raised $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding
- Built a strong team of ${employeeCount} professionals
- Established market presence in ${location}
- Demonstrated product-market fit in the ${industry} sector

## Looking Forward

With this new capital injection, ${startup.name} is well-positioned to scale its operations, expand its market reach, and continue innovating in the ${industry} space. The funding will enable the company to accelerate product development, grow its team, and pursue new market opportunities.

This success story exemplifies the potential of innovative startups to secure significant funding and build sustainable businesses in competitive markets.`
  }
}