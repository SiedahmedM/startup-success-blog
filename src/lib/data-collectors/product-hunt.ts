import { ProductHuntPost } from '@/lib/types'

// Using public Product Hunt data - no authentication required
const PRODUCT_HUNT_API_URL = 'https://api.producthunt.com/v2/api/graphql'
const PRODUCT_HUNT_PUBLIC_URL = 'https://www.producthunt.com'

export class ProductHuntCollector {
  private accessToken: string

  constructor() {
    this.accessToken = process.env.PRODUCT_HUNT_ACCESS_TOKEN || ''
  }

  async fetchRecentLaunches(days: number = 30): Promise<ProductHuntPost[]> {
    // Try authenticated API first, then fall back to public scraping
    if (this.accessToken) {
      try {
        return await this.fetchWithAuth(days)
      } catch (error) {
        console.warn('Authenticated Product Hunt API failed, falling back to public method')
      }
    }
    
    return await this.fetchPublicData(days)

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceDate = since.toISOString().split('T')[0]

    const query = `
      query GetPosts($after: String) {
        posts(first: 20, after: $after, order: VOTES, postedAfter: "${sinceDate}") {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              featuredAt
              website
              maker {
                name
                url
              }
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    try {
      const response = await fetch(PRODUCT_HUNT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`Product Hunt API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      return data.data.posts.edges.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        description: edge.node.description,
        url: edge.node.url || edge.node.website,
        votes_count: edge.node.votesCount,
        comments_count: edge.node.commentsCount,
        featured_at: edge.node.featuredAt,
        maker: {
          name: edge.node.maker?.name || '',
          url: edge.node.maker?.url || '',
        },
        topics: edge.node.topics.edges.map((topicEdge: any) => ({
          name: topicEdge.node.name,
        })),
      }))
    } catch (error) {
      console.error('Error fetching Product Hunt data:', error)
      return []
    }
  }

  async fetchTopProducts(period: 'today' | 'week' | 'month' = 'week'): Promise<ProductHuntPost[]> {
    if (!this.accessToken) {
      console.warn('Product Hunt access token not provided')
      return []
    }

    const query = `
      query GetTopPosts {
        posts(first: 50, order: VOTES, featured: true) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              featuredAt
              website
              maker {
                name
                url
              }
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `

    try {
      const response = await fetch(PRODUCT_HUNT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`Product Hunt API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      return data.data.posts.edges.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        description: edge.node.description,
        url: edge.node.url || edge.node.website,
        votes_count: edge.node.votesCount,
        comments_count: edge.node.commentsCount,
        featured_at: edge.node.featuredAt,
        maker: {
          name: edge.node.maker?.name || '',
          url: edge.node.maker?.url || '',
        },
        topics: edge.node.topics.edges.map((topicEdge: any) => ({
          name: topicEdge.node.name,
        })),
      }))
    } catch (error) {
      console.error('Error fetching Product Hunt top products:', error)
      return []
    }
  }

  async searchProducts(query: string): Promise<ProductHuntPost[]> {
    if (!this.accessToken) {
      console.warn('Product Hunt access token not provided')
      return []
    }

    const searchQuery = `
      query SearchPosts($query: String!) {
        posts(first: 20, order: RELEVANCE, search: $query) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              featuredAt
              website
              maker {
                name
                url
              }
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `

    try {
      const response = await fetch(PRODUCT_HUNT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ 
          query: searchQuery,
          variables: { query }
        }),
      })

      if (!response.ok) {
        throw new Error(`Product Hunt API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      return data.data.posts.edges.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        description: edge.node.description,
        url: edge.node.url || edge.node.website,
        votes_count: edge.node.votesCount,
        comments_count: edge.node.commentsCount,
        featured_at: edge.node.featuredAt,
        maker: {
          name: edge.node.maker?.name || '',
          url: edge.node.maker?.url || '',
        },
        topics: edge.node.topics.edges.map((topicEdge: any) => ({
          name: topicEdge.node.name,
        })),
      }))
    } catch (error) {
      console.error('Error searching Product Hunt:', error)
      return []
    }
  }

  isSuccessCandidate(post: ProductHuntPost): boolean {
    const hasHighEngagement = post.votes_count > 100 || post.comments_count > 20
    const hasSuccessKeywords = [
      'raised', 'funding', 'series', 'million', 'growth', 'users',
      'revenue', 'milestone', 'acquisition', 'unicorn', 'IPO'
    ].some(keyword => 
      post.description.toLowerCase().includes(keyword) ||
      post.tagline.toLowerCase().includes(keyword)
    )

    return hasHighEngagement || hasSuccessKeywords
  }
}