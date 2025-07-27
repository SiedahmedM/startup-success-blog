import cron from 'node-cron'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ProductHuntCollector } from '@/lib/data-collectors/product-hunt'
import { HackerNewsCollector } from '@/lib/data-collectors/hacker-news'
import { GitHubCollector } from '@/lib/data-collectors/github'
import { RSSCollector } from '@/lib/data-collectors/rss-parser'
import { WebScraper } from '@/lib/data-collectors/web-scraper'
import { AIContentGenerator } from '@/lib/ai/content-generator'
import { DataValidator } from '@/lib/validation/data-validator'
import { RateLimiterMemory } from 'rate-limiter-flexible'

export class DataCollectionOrchestrator {
  private productHunt: ProductHuntCollector
  private hackerNews: HackerNewsCollector
  private github: GitHubCollector
  private rss: RSSCollector
  private webScraper: WebScraper
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
    this.aiGenerator = new AIContentGenerator()
    this.validator = new DataValidator()
    
    this.rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    console.log('Starting data collection orchestrator...')

    cron.schedule('0 */6 * * *', async () => {
      await this.runProductHuntCollection()
    })

    cron.schedule('0 */6 * * *', async () => {
      await this.runHackerNewsCollection()
    })

    cron.schedule('0 8 * * *', async () => {
      await this.runRSSCollection()
    })

    cron.schedule('0 12 * * *', async () => {
      await this.runGitHubCollection()
    })

    cron.schedule('0 2 * * *', async () => {
      await this.runWebScrapingJobs()
    })

    cron.schedule('0 4 * * *', async () => {
      await this.runStoryGeneration()
    })

    cron.schedule('0 0 * * 0', async () => {
      await this.runWeeklyMaintenance()
    })

    console.log('All cron jobs scheduled successfully')
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

  private async runStoryGeneration(): Promise<void> {
    const jobId = await this.logJobStart('story_generation')
    let recordsProcessed = 0

    try {
      const { data: startupsNeedingStories } = await supabaseAdmin
        .from('startups')
        .select(`
          *,
          data_sources(*),
          success_stories(id)
        `)
        .is('success_stories.id', null)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5)

      if (startupsNeedingStories) {
        for (const startup of startupsNeedingStories) {
          const sources = startup.data_sources || []
          
          if (sources.length >= 2) {
            const analysisResult = await this.aiGenerator.analyzeStartupData({
              companyName: startup.name,
              productHunt: sources.filter(s => s.source_type === 'product_hunt').map(s => s.data),
              hackerNews: sources.filter(s => s.source_type === 'hacker_news').map(s => s.data),
              github: sources.filter(s => s.source_type === 'github').map(s => s.data),
              rss: sources.filter(s => s.source_type === 'rss').map(s => s.data),
              scraped: sources.filter(s => s.source_type === 'scrape').map(s => s.data)
            })

            if (analysisResult.isSuccessStory && analysisResult.confidence > 0.6) {
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
                    featured: validationResult.finalVerdict === 'approved' && analysisResult.confidence > 0.8
                  })

                recordsProcessed++
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
      const { data: existingStartup } = await supabaseAdmin
        .from('startups')
        .select('id')
        .eq('name', startupData.name)
        .single()

      let startupId: string

      if (existingStartup) {
        startupId = existingStartup.id
      } else {
        const { data: newStartup } = await supabaseAdmin
          .from('startups')
          .insert(startupData)
          .select('id')
          .single()

        if (!newStartup) return
        startupId = newStartup.id
      }

      await supabaseAdmin
        .from('data_sources')
        .insert({
          startup_id: startupId,
          source_type: sourceType,
          source_url: rawData.url || rawData.html_url || 'unknown',
          data: rawData
        })
    } catch (error) {
      console.error('Error processing startup lead:', error)
    }
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
}