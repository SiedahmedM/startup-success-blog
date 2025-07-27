import Parser from 'rss-parser'
import { RSSItem } from '@/lib/types'

export class RSSCollector {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['dc:creator', 'creator'],
          ['content:encoded', 'contentEncoded']
        ]
      }
    })
  }

  private readonly RSS_FEEDS = {
    techcrunch: {
      url: 'https://techcrunch.com/feed/',
      name: 'TechCrunch',
      category: 'general'
    },
    techcrunchStartups: {
      url: 'https://techcrunch.com/category/startups/feed/',
      name: 'TechCrunch Startups',
      category: 'startups'
    },
    venturebeat: {
      url: 'https://venturebeat.com/feed/',
      name: 'VentureBeat',
      category: 'general'
    },
    theVerge: {
      url: 'https://www.theverge.com/rss/index.xml',
      name: 'The Verge',
      category: 'general'
    },
    producthunt: {
      url: 'https://www.producthunt.com/feed',
      name: 'Product Hunt',
      category: 'products'
    },
    indiehackers: {
      url: 'https://www.indiehackers.com/feed.xml',
      name: 'Indie Hackers',
      category: 'startups'
    },
    hackernoon: {
      url: 'https://hackernoon.com/feed',
      name: 'Hacker Noon',
      category: 'tech'
    },
    startupGrind: {
      url: 'https://medium.com/feed/startup-grind',
      name: 'Startup Grind',
      category: 'startups'
    }
  }

  async fetchFeed(feedKey: keyof typeof this.RSS_FEEDS): Promise<RSSItem[]> {
    const feed = this.RSS_FEEDS[feedKey]
    
    try {
      const parsedFeed = await this.parser.parseURL(feed.url)
      
      return parsedFeed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        description: this.cleanDescription(item.contentSnippet || item.summary || ''),
        pubDate: item.pubDate || item.isoDate || '',
        categories: item.categories || [],
        creator: (item as any).creator || parsedFeed.title || feed.name,
        content: this.cleanContent((item as any).contentEncoded || item.content || ''),
        source: feed.name
      }))
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedKey}:`, error)
      return []
    }
  }

  async fetchAllFeeds(): Promise<RSSItem[]> {
    const allItems: RSSItem[] = []
    
    for (const feedKey of Object.keys(this.RSS_FEEDS) as Array<keyof typeof this.RSS_FEEDS>) {
      try {
        const items = await this.fetchFeed(feedKey)
        allItems.push(...items)
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error fetching feed ${feedKey}:`, error)
      }
    }
    
    return this.deduplicateItems(allItems)
  }

  async fetchStartupNews(days: number = 7): Promise<RSSItem[]> {
    const startupFeeds: Array<keyof typeof this.RSS_FEEDS> = [
      'techcrunchStartups',
      'indiehackers',
      'startupGrind'
    ]
    
    const allItems: RSSItem[] = []
    
    for (const feedKey of startupFeeds) {
      try {
        const items = await this.fetchFeed(feedKey)
        allItems.push(...items)
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error fetching startup feed ${feedKey}:`, error)
      }
    }
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return allItems.filter(item => {
      const itemDate = new Date(item.pubDate)
      return itemDate > cutoffDate && this.isStartupRelated(item)
    })
  }

  async searchByKeywords(keywords: string[], days: number = 30): Promise<RSSItem[]> {
    const allItems = await this.fetchAllFeeds()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return allItems.filter(item => {
      const itemDate = new Date(item.pubDate)
      if (itemDate < cutoffDate) return false
      
      const searchText = `${item.title} ${item.description} ${item.content}`.toLowerCase()
      return keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      )
    })
  }

  async fetchFundingNews(days: number = 30): Promise<RSSItem[]> {
    const fundingKeywords = [
      'raised', 'funding', 'series a', 'series b', 'series c', 'seed round',
      'venture capital', 'investment', 'valuation', 'million', 'billion',
      'unicorn', 'ipo', 'acquisition', 'acquired', 'exit'
    ]
    
    return this.searchByKeywords(fundingKeywords, days)
  }

  isStartupRelated(item: RSSItem): boolean {
    const startupKeywords = [
      'startup', 'entrepreneur', 'founder', 'co-founder', 'tech company',
      'saas', 'platform', 'app launch', 'product launch', 'mvp',
      'venture', 'innovation', 'disrupt', 'scale', 'growth hack'
    ]
    
    const searchText = `${item.title} ${item.description}`.toLowerCase()
    return startupKeywords.some(keyword => searchText.includes(keyword))
  }

  isSuccessCandidate(item: RSSItem): boolean {
    const successKeywords = [
      'raised', 'funding', 'million', 'billion', 'unicorn', 'ipo',
      'acquisition', 'acquired', 'breakthrough', 'milestone', 'success',
      'profitable', 'revenue', 'growth', 'expansion', 'exit',
      'valuation', 'series', 'round', 'investment'
    ]
    
    const searchText = `${item.title} ${item.description}`.toLowerCase()
    return successKeywords.some(keyword => searchText.includes(keyword))
  }

  extractCompanyName(item: RSSItem): string | null {
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:raised|announces|launches|acquired)/,
      /^([^:]+):/,
      /([A-Z][a-z]+)\s+CEO/,
      /startup\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ]
    
    for (const pattern of patterns) {
      const match = item.title.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        if (name.length > 2 && name.length < 50 && !this.isCommonWord(name)) {
          return name
        }
      }
    }
    
    return null
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, '')
      .trim()
      .substring(0, 500)
  }

  private cleanContent(content: string): string {
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, '')
      .trim()
      .substring(0, 2000)
  }

  private deduplicateItems(items: RSSItem[]): RSSItem[] {
    const seen = new Set<string>()
    return items.filter(item => {
      const key = `${item.title}-${item.link}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'The', 'This', 'That', 'With', 'From', 'Here', 'How', 'Why',
      'What', 'When', 'Where', 'New', 'Best', 'Top', 'Most', 'All'
    ]
    return commonWords.includes(word)
  }

  async fetchCustomRSSFeed(url: string, source: string): Promise<RSSItem[]> {
    try {
      const parsedFeed = await this.parser.parseURL(url)
      
      return parsedFeed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        description: this.cleanDescription(item.contentSnippet || item.summary || ''),
        pubDate: item.pubDate || item.isoDate || '',
        categories: item.categories || [],
        creator: (item as any).creator || parsedFeed.title || source,
        content: this.cleanContent((item as any).contentEncoded || item.content || ''),
        source
      }))
    } catch (error) {
      console.error(`Error fetching custom RSS feed ${url}:`, error)
      return []
    }
  }
}