import { chromium, Browser, Page } from 'playwright'
import * as cheerio from 'cheerio'

export interface ScrapedData {
  url: string
  title: string
  content: string
  metadata: Record<string, any>
  scrapedAt: string
}

export class WebScraper {
  private browser: Browser | null = null
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ]

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  async scrapePage(url: string, options: {
    waitForSelector?: string
    timeout?: number
    extractors?: Record<string, string>
  } = {}): Promise<ScrapedData | null> {
    if (!this.browser) {
      await this.init()
    }

    const page = await this.browser!.newPage()
    
    try {
      await page.setUserAgent(this.getRandomUserAgent())
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      })

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options.timeout || 30000
      })

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 })
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      const content = await page.content()
      const $ = cheerio.load(content)

      const title = $('title').text() || $('h1').first().text() || ''
      const mainContent = this.extractMainContent($)
      
      const metadata: Record<string, any> = {
        description: $('meta[name="description"]').attr('content') || '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || '',
        publishedTime: $('meta[property="article:published_time"]').attr('content') || '',
        modifiedTime: $('meta[property="article:modified_time"]').attr('content') || '',
        ogTitle: $('meta[property="og:title"]').attr('content') || '',
        ogDescription: $('meta[property="og:description"]').attr('content') || '',
        ogImage: $('meta[property="og:image"]').attr('content') || '',
      }

      if (options.extractors) {
        for (const [key, selector] of Object.entries(options.extractors)) {
          metadata[key] = $(selector).text().trim()
        }
      }

      return {
        url,
        title: title.trim(),
        content: mainContent,
        metadata,
        scrapedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error)
      return null
    } finally {
      await page.close()
    }
  }

  async scrapeLinkedInCompany(companyName: string): Promise<ScrapedData | null> {
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`
    
    return this.scrapePage(searchUrl, {
      waitForSelector: '.search-result',
      extractors: {
        employees: '.company-employees-count',
        industry: '.company-industry',
        location: '.company-location',
        followers: '.followers-count'
      }
    })
  }

  async scrapeAngelListProfile(startupName: string): Promise<ScrapedData | null> {
    const searchUrl = `https://angel.co/company/${startupName.toLowerCase().replace(/\s+/g, '-')}`
    
    return this.scrapePage(searchUrl, {
      extractors: {
        stage: '.startup-stage',
        funding: '.funding-amount',
        employees: '.employee-count',
        markets: '.markets',
        location: '.location'
      }
    })
  }

  async scrapeTwitterProfile(handle: string): Promise<ScrapedData | null> {
    const url = `https://twitter.com/${handle}`
    
    return this.scrapePage(url, {
      waitForSelector: '[data-testid="UserName"]',
      extractors: {
        followers: '[data-testid="UserFollowerCount"]',
        following: '[data-testid="UserFollowingCount"]',
        tweets: '[data-testid="UserTweetCount"]',
        bio: '[data-testid="UserDescription"]'
      }
    })
  }

  async scrapeIndieHackersProfile(username: string): Promise<ScrapedData | null> {
    const url = `https://www.indiehackers.com/user/${username}`
    
    return this.scrapePage(url, {
      extractors: {
        products: '.product-card',
        milestones: '.milestone',
        revenue: '.revenue-amount',
        followers: '.followers-count'
      }
    })
  }

  async searchGoogleNews(query: string, days: number = 30): Promise<ScrapedData[]> {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const dateString = fromDate.toISOString().split('T')[0]
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&tbs=cdr:1,cd_min:${dateString}`
    
    const result = await this.scrapePage(searchUrl, {
      waitForSelector: '.g',
      extractors: {
        headlines: '.n0jPhd',
        sources: '.NUnG9d',
        dates: '.f',
        snippets: '.st'
      }
    })

    if (!result) return []

    const $ = cheerio.load(result.content)
    const articles: ScrapedData[] = []

    $('.g').each((i, element) => {
      const $el = $(element)
      const title = $el.find('.n0jPhd').text().trim()
      const link = $el.find('a').attr('href')
      const snippet = $el.find('.st').text().trim()
      const source = $el.find('.NUnG9d').text().trim()
      const date = $el.find('.f').text().trim()

      if (title && link) {
        articles.push({
          url: link,
          title,
          content: snippet,
          metadata: { source, date, searchQuery: query },
          scrapedAt: new Date().toISOString()
        })
      }
    })

    return articles.slice(0, 10)
  }

  async scrapeFundingAnnouncements(companyName: string): Promise<ScrapedData[]> {
    const queries = [
      `"${companyName}" raised funding`,
      `"${companyName}" series A`,
      `"${companyName}" series B`,
      `"${companyName}" seed round`,
      `"${companyName}" investment`
    ]

    const allResults: ScrapedData[] = []

    for (const query of queries) {
      try {
        const results = await this.searchGoogleNews(query, 90)
        allResults.push(...results)
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error searching for funding news: ${query}`, error)
      }
    }

    return this.deduplicateResults(allResults)
  }

  async scrapeJobPostings(companyName: string): Promise<{
    jobCount: number
    recentJobs: Array<{ title: string; location: string; posted: string }>
  }> {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(companyName)}&f_C=${encodeURIComponent(companyName)}`
    
    const result = await this.scrapePage(searchUrl, {
      waitForSelector: '.job-search-card',
      extractors: {
        jobTitles: '.job-search-card__title',
        locations: '.job-search-card__location',
        companies: '.job-search-card__subtitle',
        posted: '.job-search-card__listdate'
      }
    })

    if (!result) {
      return { jobCount: 0, recentJobs: [] }
    }

    const $ = cheerio.load(result.content)
    const jobs: Array<{ title: string; location: string; posted: string }> = []

    $('.job-search-card').slice(0, 10).each((i, element) => {
      const $el = $(element)
      const title = $el.find('.job-search-card__title').text().trim()
      const location = $el.find('.job-search-card__location').text().trim()
      const posted = $el.find('.job-search-card__listdate').text().trim()

      if (title) {
        jobs.push({ title, location, posted })
      }
    })

    return {
      jobCount: jobs.length,
      recentJobs: jobs
    }
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, header, footer, aside').remove()
    
    const contentSelectors = [
      'article',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main',
      '.main-content'
    ]

    for (const selector of contentSelectors) {
      const content = $(selector).text().trim()
      if (content.length > 100) {
        return content.substring(0, 5000)
      }
    }

    return $('body').text().trim().substring(0, 5000)
  }

  private deduplicateResults(results: ScrapedData[]): ScrapedData[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = `${result.title}-${result.url}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async scrapeWithRetry(
    url: string,
    options: any = {},
    maxRetries: number = 3
  ): Promise<ScrapedData | null> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.scrapePage(url, options)
        if (result) return result
      } catch (error) {
        lastError = error as Error
        console.error(`Scraping attempt ${attempt} failed for ${url}:`, error)
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error(`All scraping attempts failed for ${url}:`, lastError)
    return null
  }
}