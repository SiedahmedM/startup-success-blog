import { GitHubRepo } from '@/lib/types'

const GITHUB_API_BASE = 'https://api.github.com'

export class GitHubCollector {
  private token?: string

  constructor() {
    this.token = process.env.GITHUB_TOKEN
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'startup-success-blog'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    return headers
  }

  async fetchTrendingRepos(language?: string, since: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<GitHubRepo[]> {
    try {
      const dateThreshold = this.getDateThreshold(since)
      const languageQuery = language ? `language:${language}` : ''
      const query = `created:>${dateThreshold} stars:>10 ${languageQuery}`.trim()

      const response = await fetch(
        `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      
      return data.items.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        language: repo.language,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        topics: repo.topics || [],
      }))
    } catch (error) {
      console.error('Error fetching GitHub trending repos:', error)
      return []
    }
  }

  async searchRepositories(query: string, limit: number = 50): Promise<GitHubRepo[]> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      
      return data.items.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        language: repo.language,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        topics: repo.topics || [],
      }))
    } catch (error) {
      console.error('Error searching GitHub repositories:', error)
      return []
    }
  }

  async fetchStartupRepos(days: number = 30): Promise<GitHubRepo[]> {
    const startupKeywords = [
      'saas', 'startup', 'mvp', 'product', 'platform', 'tool', 'service',
      'app', 'web-app', 'mobile-app', 'dashboard', 'analytics', 'crm',
      'ecommerce', 'e-commerce', 'marketplace', 'fintech', 'edtech',
      'healthtech', 'proptech', 'api', 'sdk', 'framework', 'library'
    ]

    const allRepos: GitHubRepo[] = []

    for (const keyword of startupKeywords.slice(0, 5)) {
      try {
        const dateThreshold = this.getDateThreshold('daily', days)
        const query = `${keyword} created:>${dateThreshold} stars:>5`
        
        const repos = await this.searchRepositories(query, 20)
        allRepos.push(...repos)
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error fetching repos for keyword ${keyword}:`, error)
      }
    }

    return this.deduplicateRepos(allRepos)
  }

  async fetchRepoDetails(owner: string, repo: string): Promise<GitHubRepo | null> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const repoData = await response.json()
      
      return {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        html_url: repoData.html_url,
        stargazers_count: repoData.stargazers_count,
        language: repoData.language,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        topics: repoData.topics || [],
      }
    } catch (error) {
      console.error(`Error fetching repo details for ${owner}/${repo}:`, error)
      return null
    }
  }

  async fetchRepoStats(owner: string, repo: string): Promise<{
    stars: number
    forks: number
    issues: number
    contributors: number
  } | null> {
    try {
      const [repoResponse, contributorsResponse] = await Promise.all([
        fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers: this.getHeaders() }),
        fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=1`, { headers: this.getHeaders() })
      ])

      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`)
      }

      const repoData = await repoResponse.json()
      
      let contributorCount = 0
      if (contributorsResponse.ok) {
        const linkHeader = contributorsResponse.headers.get('link')
        if (linkHeader) {
          const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
          contributorCount = lastPageMatch ? parseInt(lastPageMatch[1]) : 1
        } else {
          const contributors = await contributorsResponse.json()
          contributorCount = contributors.length
        }
      }

      return {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        issues: repoData.open_issues_count,
        contributors: contributorCount
      }
    } catch (error) {
      console.error(`Error fetching repo stats for ${owner}/${repo}:`, error)
      return null
    }
  }

  isSuccessCandidate(repo: GitHubRepo): boolean {
    const hasHighStars = repo.stargazers_count > 100
    const hasGoodDescription = repo.description && repo.description.length > 20
    const hasSuccessKeywords = repo.description ? [
      'production', 'used by', 'companies', 'enterprise', 'scale',
      'millions', 'popular', 'leading', 'industry', 'standard'
    ].some(keyword => repo.description!.toLowerCase().includes(keyword)) : false

    const isRecentlyActive = new Date(repo.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    return (hasHighStars || hasSuccessKeywords) && hasGoodDescription && isRecentlyActive
  }

  extractCompanyFromRepo(repo: GitHubRepo): string | null {
    // First, try to extract company name from description
    if (repo.description) {
      // Look for patterns like "by CompanyName", "from CompanyName", "CompanyName's"
      const companyPatterns = [
        /by\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+inc|\.|,|$)/i,
        /from\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+inc|\.|,|$)/i,
        /([A-Z][a-zA-Z0-9\s&]+?)'s\s+(?:platform|tool|service|app)/i,
        /developed\s+by\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+inc|\.|,|$)/i,
        /created\s+by\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+inc|\.|,|$)/i,
        /powered\s+by\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+inc|\.|,|$)/i
      ]

      for (const pattern of companyPatterns) {
        const match = repo.description.match(pattern)
        if (match && match[1]) {
          const companyName = match[1].trim()
          if (this.isValidCompanyName(companyName)) {
            return companyName
          }
        }
      }

      // Look for trademark symbols or company indicators
      const trademarkPatterns = [
        /([A-Z][a-zA-Z0-9\s&]+?)\s*™/i,
        /([A-Z][a-zA-Z0-9\s&]+?)\s*®/i,
        /([A-Z][a-zA-Z0-9\s&]+?)\s*Inc\./i,
        /([A-Z][a-zA-Z0-9\s&]+?)\s*LLC/i,
        /([A-Z][a-zA-Z0-9\s&]+?)\s*Corp\./i
      ]

      for (const pattern of trademarkPatterns) {
        const match = repo.description.match(pattern)
        if (match && match[1]) {
          const companyName = match[1].trim()
          if (this.isValidCompanyName(companyName)) {
            return companyName
          }
        }
      }
    }

    // Check if the repo name itself looks like a company name
    if (this.isValidCompanyName(repo.name)) {
      return repo.name
    }

    // Check if the owner looks like a company (not a personal account)
    const parts = repo.full_name.split('/')
    const owner = parts[0]
    
    if (owner && this.isValidCompanyName(owner) && !this.isPersonalAccount(owner)) {
      return owner
    }
    
    return null
  }

  private isValidCompanyName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 50) {
      return false
    }

    // Must start with a letter
    if (!/^[A-Za-z]/.test(name)) {
      return false
    }

    // Must contain at least one letter
    if (!/[A-Za-z]/.test(name)) {
      return false
    }

    // Common words that are not company names
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'within', 'without',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
      'app', 'api', 'sdk', 'tool', 'library', 'framework', 'platform',
      'service', 'product', 'startup', 'company', 'inc', 'llc', 'corp'
    ]

    const lowerName = name.toLowerCase()
    if (commonWords.includes(lowerName)) {
      return false
    }

    // Check for personal account patterns
    if (this.isPersonalAccount(name)) {
      return false
    }

    return true
  }

  private isPersonalAccount(username: string): boolean {
    const personalIndicators = [
      /^\w+\d+$/,
      /^(mr|ms|dr)[-_]?\w+/i,
      /\d{4}$/,
      /^[a-z]+[_-][a-z]+$/,
      /^[a-z]+\d+$/,
      /^[a-z]+[a-z]+\d+$/,
      /^[a-z]+\.[a-z]+$/,
      /^[a-z]+_[a-z]+$/,
      /^[a-z]+-[a-z]+$/,
      /^[a-z]+\d+[a-z]+$/,
      /^[a-z]+\d+[a-z]+\d+$/
    ]
    
    return personalIndicators.some(pattern => pattern.test(username))
  }

  private getDateThreshold(period: 'daily' | 'weekly' | 'monthly', customDays?: number): string {
    const now = new Date()
    let daysToSubtract: number
    
    if (customDays) {
      daysToSubtract = customDays
    } else {
      switch (period) {
        case 'daily':
          daysToSubtract = 1
          break
        case 'weekly':
          daysToSubtract = 7
          break
        case 'monthly':
          daysToSubtract = 30
          break
        default:
          daysToSubtract = 7
      }
    }
    
    const threshold = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000))
    return threshold.toISOString().split('T')[0]
  }

  private deduplicateRepos(repos: GitHubRepo[]): GitHubRepo[] {
    const seen = new Set<number>()
    return repos.filter(repo => {
      if (seen.has(repo.id)) {
        return false
      }
      seen.add(repo.id)
      return true
    })
  }
}