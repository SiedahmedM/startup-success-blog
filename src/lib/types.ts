export interface Startup {
  id: string
  name: string
  description?: string
  website_url?: string
  logo_url?: string
  founded_date?: string
  funding_amount?: number
  funding_stage?: string
  employee_count?: number
  location?: string
  industry?: string
  tags?: string[]
  social_links?: Record<string, string>
  github_repo?: string
  product_hunt_url?: string
  created_at: string
  updated_at: string
}

export interface SuccessStory {
  id: string
  startup_id: string
  title: string
  content: string
  summary?: string
  story_type: 'success' | 'funding' | 'milestone' | 'pivot'
  confidence_score: number
  published_at: string
  view_count: number
  featured: boolean
  tags?: string[]
  sources: DataSource[]
  ai_generated: boolean
  created_at: string
  updated_at: string
  startup?: Startup
}

export interface DataSource {
  id: string
  startup_id: string
  source_type: 'product_hunt' | 'hacker_news' | 'github' | 'rss' | 'scrape'
  source_url: string
  data: any
  extracted_at: string
  last_checked: string
  is_active: boolean
}

export interface FundingEvent {
  id: string
  startup_id: string
  amount?: number
  currency: string
  funding_stage?: string
  investors?: string[]
  announcement_date?: string
  source_url?: string
  verified: boolean
  created_at: string
}

export interface Milestone {
  id: string
  startup_id: string
  milestone_type: string
  title: string
  description?: string
  value?: number
  unit?: string
  achieved_date?: string
  source_url?: string
  verified: boolean
  created_at: string
}

export interface JobLog {
  id: string
  job_name: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  error_message?: string
  records_processed: number
  metadata: Record<string, any>
}

export interface ProductHuntPost {
  id: string
  name: string
  tagline: string
  description: string
  url: string
  votes_count: number
  comments_count: number
  featured_at: string
  maker: {
    name: string
    url: string
  }
  topics: { name: string }[]
}

export interface HackerNewsPost {
  id: number
  title: string
  url?: string
  score: number
  by: string
  time: number
  descendants: number
  text?: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description?: string
  html_url: string
  stargazers_count: number
  language?: string
  created_at: string
  updated_at: string
  topics: string[]
}

export interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  categories?: string[]
}

export interface AIAnalysisResult {
  isSuccessStory: boolean
  confidence: number
  title: string
  summary: string
  content: string
  tags: string[]
  storyType: 'success' | 'funding' | 'milestone' | 'pivot'
  keyMetrics: {
    funding?: number
    userGrowth?: number
    revenue?: number
  }
}