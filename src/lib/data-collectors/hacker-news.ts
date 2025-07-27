import { HackerNewsPost } from '@/lib/types'

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0'

export class HackerNewsCollector {
  async fetchTopStories(limit: number = 100): Promise<number[]> {
    try {
      const response = await fetch(`${HN_API_BASE}/topstories.json`)
      if (!response.ok) {
        throw new Error(`HN API error: ${response.status}`)
      }
      const storyIds = await response.json()
      return storyIds.slice(0, limit)
    } catch (error) {
      console.error('Error fetching HN top stories:', error)
      return []
    }
  }

  async fetchNewStories(limit: number = 100): Promise<number[]> {
    try {
      const response = await fetch(`${HN_API_BASE}/newstories.json`)
      if (!response.ok) {
        throw new Error(`HN API error: ${response.status}`)
      }
      const storyIds = await response.json()
      return storyIds.slice(0, limit)
    } catch (error) {
      console.error('Error fetching HN new stories:', error)
      return []
    }
  }

  async fetchStory(id: number): Promise<HackerNewsPost | null> {
    try {
      const response = await fetch(`${HN_API_BASE}/item/${id}.json`)
      if (!response.ok) {
        throw new Error(`HN API error: ${response.status}`)
      }
      const story = await response.json()
      
      if (!story || story.deleted || story.dead) {
        return null
      }

      return {
        id: story.id,
        title: story.title || '',
        url: story.url,
        score: story.score || 0,
        by: story.by || '',
        time: story.time,
        descendants: story.descendants || 0,
        text: story.text,
      }
    } catch (error) {
      console.error(`Error fetching HN story ${id}:`, error)
      return null
    }
  }

  async fetchMultipleStories(ids: number[]): Promise<HackerNewsPost[]> {
    const stories: HackerNewsPost[] = []
    const batchSize = 10
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const batchPromises = batch.map(id => this.fetchStory(id))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        const validStories = batchResults
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<HackerNewsPost>).value)
        
        stories.push(...validStories)
        
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('Error fetching batch of HN stories:', error)
      }
    }
    
    return stories
  }

  async fetchShowHNStories(days: number = 7): Promise<HackerNewsPost[]> {
    const newStoryIds = await this.fetchNewStories(500)
    const stories = await this.fetchMultipleStories(newStoryIds)
    
    const cutoffTime = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
    
    return stories.filter(story => 
      story.time > cutoffTime &&
      story.title.toLowerCase().includes('show hn')
    )
  }

  async fetchStartupStories(days: number = 7): Promise<HackerNewsPost[]> {
    const newStoryIds = await this.fetchNewStories(500)
    const topStoryIds = await this.fetchTopStories(200)
    const allIds = [...new Set([...newStoryIds, ...topStoryIds])]
    
    const stories = await this.fetchMultipleStories(allIds)
    
    const cutoffTime = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
    
    return stories.filter(story => 
      story.time > cutoffTime &&
      this.isStartupRelated(story)
    )
  }

  async searchByKeywords(keywords: string[], days: number = 30): Promise<HackerNewsPost[]> {
    const newStoryIds = await this.fetchNewStories(1000)
    const stories = await this.fetchMultipleStories(newStoryIds)
    
    const cutoffTime = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
    
    return stories.filter(story => {
      if (story.time < cutoffTime) return false
      
      const searchText = `${story.title} ${story.text || ''}`.toLowerCase()
      return keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      )
    })
  }

  isStartupRelated(story: HackerNewsPost): boolean {
    const startupKeywords = [
      'startup', 'funded', 'raised', 'series a', 'series b', 'series c',
      'venture capital', 'vc', 'seed round', 'funding', 'investment',
      'unicorn', 'ipo', 'acquisition', 'acquired', 'launch', 'launching',
      'show hn', 'new startup', 'my startup', 'our startup', 'founder',
      'co-founder', 'entrepreneur', 'bootstrapped', 'saas', 'mvp',
      'product hunt', 'beta launch', 'soft launch', 'public launch'
    ]

    const text = `${story.title} ${story.text || ''}`.toLowerCase()
    return startupKeywords.some(keyword => text.includes(keyword))
  }

  isSuccessCandidate(story: HackerNewsPost): boolean {
    const successKeywords = [
      'raised', 'funding', 'series', 'million', 'billion', 'acquired',
      'acquisition', 'ipo', 'unicorn', 'growth', 'milestone', 'success',
      'profitable', 'revenue', 'users', 'customers', 'exit'
    ]

    const hasHighScore = story.score > 100
    const hasEngagement = story.descendants > 50
    
    const text = `${story.title} ${story.text || ''}`.toLowerCase()
    const hasSuccessKeywords = successKeywords.some(keyword => 
      text.includes(keyword)
    )

    return (hasHighScore || hasEngagement) && hasSuccessKeywords
  }

  extractCompanyName(story: HackerNewsPost): string | null {
    const title = story.title.toLowerCase()
    
    const patterns = [
      /show hn[:\s]+([^(\[\-]+)/i,
      /^([^(\[\-]+)(?:\s+\(|\s+\[|\s+\-)/,
      /([a-z]+(?:\.[a-z]+)*)\s+(?:raised|acquired|launches?)/i,
    ]

    for (const pattern of patterns) {
      const match = story.title.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        if (name.length > 2 && name.length < 50) {
          return name
        }
      }
    }

    return null
  }
}