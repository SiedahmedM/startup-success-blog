import { RSSItem } from '@/lib/types'

export class RSSCollector {
  private fundingKeywords = [
    'raised', 'funding', 'investment', 'series', 'seed', 'venture',
    'million', 'billion', 'fund', 'capital', 'investment round',
    'funding round', 'raised funding', 'secured funding'
  ]

  private successKeywords = [
    'success', 'growth', 'milestone', 'launch', 'expansion',
    'acquisition', 'partnership', 'revenue', 'users', 'customers'
  ]

  async fetchStartupNews(days: number = 7): Promise<RSSItem[]> {
    const feeds = [
      'https://techcrunch.com/feed/',
      'https://venturebeat.com/feed/',
      'https://www.theverge.com/rss/index.xml',
      'https://www.wired.com/feed/rss',
      'https://feeds.feedburner.com/TechCrunch/',
      'https://www.businessinsider.com/tech/rss',
      'https://www.forbes.com/technology/feed/',
      'https://www.axios.com/feeds/feed.rss'
    ]

    const allNews: RSSItem[] = []

    for (const feedUrl of feeds) {
      try {
        const news = await this.parseRSSFeed(feedUrl, days)
        const filteredNews = this.filterFundingAndSuccessNews(news)
        allNews.push(...filteredNews)
      } catch (error) {
        console.error(`Error fetching RSS from ${feedUrl}:`, error)
      }
    }

    return allNews
  }

  async fetchFundingNews(days: number = 7): Promise<RSSItem[]> {
    const fundingFeeds = [
      'https://techcrunch.com/tag/funding/feed/',
      'https://venturebeat.com/category/funding/feed/',
      'https://www.crunchbase.com/feed/',
      'https://www.pitchbook.com/news/feed',
      'https://www.axios.com/tag/funding/feed/'
    ]

    const allFundingNews: RSSItem[] = []

    for (const feedUrl of fundingFeeds) {
      try {
        const news = await this.parseRSSFeed(feedUrl, days)
        const filteredNews = this.filterFundingNews(news)
        allFundingNews.push(...filteredNews)
      } catch (error) {
        console.error(`Error fetching funding RSS from ${feedUrl}:`, error)
      }
    }

    return allFundingNews
  }

  private filterFundingAndSuccessNews(news: RSSItem[]): RSSItem[] {
    return news.filter(item => {
      const content = `${item.title} ${item.description}`.toLowerCase()
      
      // Check for funding keywords
      const hasFundingKeywords = this.fundingKeywords.some(keyword => 
        content.includes(keyword)
      )
      
      // Check for success keywords
      const hasSuccessKeywords = this.successKeywords.some(keyword => 
        content.includes(keyword)
      )
      
      // Check for funding amounts
      const hasFundingAmount = /\$?\d+(?:\.\d+)?\s*(?:million|billion|k|m|b)/i.test(content)
      
      return hasFundingKeywords || (hasSuccessKeywords && hasFundingAmount)
    })
  }

  private filterFundingNews(news: RSSItem[]): RSSItem[] {
    return news.filter(item => {
      const content = `${item.title} ${item.description}`.toLowerCase()
      
      // Must have funding keywords
      const hasFundingKeywords = this.fundingKeywords.some(keyword => 
        content.includes(keyword)
      )
      
      // Must have funding amounts
      const hasFundingAmount = /\$?\d+(?:\.\d+)?\s*(?:million|billion|k|m|b)/i.test(content)
      
      return hasFundingKeywords && hasFundingAmount
    })
  }

  async parseRSSFeed(feedUrl: string, days: number = 7): Promise<RSSItem[]> {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'StartupSuccessBot/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status}`)
      }

      const text = await response.text()
      return this.parseRSSContent(text, days)
    } catch (error) {
      console.error(`Error parsing RSS feed ${feedUrl}:`, error)
      return []
    }
  }

  private parseRSSContent(rssText: string, days: number): RSSItem[] {
    const items: RSSItem[] = []
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    try {
      // Simple XML parsing for RSS
      const itemMatches = rssText.match(/<item>([\s\S]*?)<\/item>/g)
      
      if (itemMatches) {
        for (const itemMatch of itemMatches) {
          const title = this.extractTag(itemMatch, 'title')
          const description = this.extractTag(itemMatch, 'description')
          const link = this.extractTag(itemMatch, 'link')
          const pubDate = this.extractTag(itemMatch, 'pubDate')
          
          if (title && description && link) {
            const publishDate = new Date(pubDate || Date.now())
            
            if (publishDate >= cutoffDate) {
              items.push({
                title: this.cleanText(title),
                description: this.cleanText(description),
                link,
                pubDate: publishDate.toISOString(),
                source: 'rss'
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing RSS content:', error)
    }

    return items
  }

  private extractTag(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : null
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[a-zA-Z]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  isSuccessCandidate(item: RSSItem): boolean {
    const content = `${item.title} ${item.description}`.toLowerCase()
    
    // Check for funding amounts ($500K+)
    const fundingMatch = content.match(/\$?(\d+(?:\.\d+)?)\s*(?:million|billion|k|m|b)/i)
    if (fundingMatch) {
      let amount = parseFloat(fundingMatch[1])
      if (content.includes('million')) amount *= 1000000
      if (content.includes('billion')) amount *= 1000000000
      if (content.includes('k')) amount *= 1000
      
      return amount >= 500000 // $500K minimum
    }
    
    // Check for success indicators
    const successIndicators = [
      'raised', 'funding', 'investment', 'series', 'seed',
      'growth', 'milestone', 'launch', 'expansion', 'acquisition'
    ]
    
    return successIndicators.some(indicator => content.includes(indicator))
  }

  extractCompanyName(item: RSSItem): string | null {
    const content = `${item.title} ${item.description}`
    
    // Look for company names in quotes or after "raised" keywords
    const patterns = [
      /"([^"]+)"\s+(?:raised|secured|announced)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:raised|secured|announced)/i,
      /(?:raised|secured|announced)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ]
    
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        const companyName = match[1].trim()
        if (companyName.length > 2 && companyName.length < 50) {
          return companyName
        }
      }
    }
    
    return null
  }

  extractFundingAmount(item: RSSItem): number | null {
    const content = `${item.title} ${item.description}`
    const match = content.match(/\$?(\d+(?:\.\d+)?)\s*(?:million|billion|k|m|b)/i)
    
    if (match) {
      let amount = parseFloat(match[1])
      if (content.includes('million')) amount *= 1000000
      if (content.includes('billion')) amount *= 1000000000
      if (content.includes('k')) amount *= 1000
      
      return amount
    }
    
    return null
  }

  extractFundingStage(item: RSSItem): string | null {
    const content = `${item.title} ${item.description}`.toLowerCase()
    
    if (content.includes('seed')) return 'seed'
    if (content.includes('series a')) return 'series_a'
    if (content.includes('series b')) return 'series_b'
    if (content.includes('series c')) return 'series_c'
    if (content.includes('series d')) return 'series_d'
    if (content.includes('funding')) return 'funding'
    
    return null
  }
}