import { supabaseAdmin } from '@/lib/supabase/client'
import { AIContentGenerator } from '@/lib/ai/content-generator'
import { WebScraper } from '@/lib/data-collectors/web-scraper'

export interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  crossReferences: Array<{
    source: string
    url: string
    confirmingData: any
  }>
  finalVerdict: 'approved' | 'needs_review' | 'rejected'
}

export class DataValidator {
  private aiGenerator: AIContentGenerator
  private webScraper: WebScraper

  constructor() {
    this.aiGenerator = new AIContentGenerator()
    this.webScraper = new WebScraper()
  }

  async validateStartupStory(
    startupData: any,
    sources: any[]
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      issues: [],
      crossReferences: [],
      finalVerdict: 'approved'
    }

    await this.webScraper.init()

    try {
      await this.validateBasicInfo(startupData, result)
      await this.crossReferenceData(startupData, sources, result)
      await this.validateFundingClaims(startupData, result)
      await this.validateMetrics(startupData, result)
      await this.checkForDuplicates(startupData, result)
      
      this.calculateFinalVerdict(result)
    } catch (error) {
      console.error('Validation error:', error)
      result.issues.push('Validation process failed')
      result.confidence = 0
      result.finalVerdict = 'needs_review'
    } finally {
      await this.webScraper.close()
    }

    return result
  }

  private async validateBasicInfo(
    startupData: any,
    result: ValidationResult
  ): Promise<void> {
    if (!startupData.name || startupData.name.length < 2) {
      result.issues.push('Company name is missing or too short')
      result.confidence -= 0.3
    }

    if (!startupData.description || startupData.description.length < 10) {
      result.issues.push('Company description is missing or too short')
      result.confidence -= 0.2
    }

    if (!startupData.website_url && !startupData.product_hunt_url && !startupData.github_repo) {
      result.issues.push('No verifiable online presence found')
      result.confidence -= 0.4
    }

    if (startupData.website_url) {
      const websiteValid = await this.validateWebsite(startupData.website_url)
      if (!websiteValid) {
        result.issues.push('Company website is not accessible')
        result.confidence -= 0.2
      }
    }
  }

  private async crossReferenceData(
    startupData: any,
    sources: any[],
    result: ValidationResult
  ): Promise<void> {
    const companyName = startupData.name
    const searchQueries = [
      `"${companyName}" startup`,
      `"${companyName}" funding`,
      `"${companyName}" raised`,
      `"${companyName}" founded`
    ]

    for (const query of searchQueries.slice(0, 2)) {
      try {
        const newsResults = await this.webScraper.searchGoogleNews(query, 90)
        
        if (newsResults.length > 0) {
          result.crossReferences.push({
            source: 'Google News',
            url: `search: ${query}`,
            confirmingData: newsResults.slice(0, 3)
          })
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error searching for ${query}:`, error)
      }
    }

    if (result.crossReferences.length === 0) {
      result.issues.push('No external news sources found confirming the story')
      result.confidence -= 0.3
    }
  }

  private async validateFundingClaims(
    startupData: any,
    result: ValidationResult
  ): Promise<void> {
    if (startupData.funding_amount && startupData.funding_amount > 0) {
      const fundingAmount = startupData.funding_amount
      const stage = startupData.funding_stage

      if (this.isFundingAmountSuspicious(fundingAmount, stage)) {
        result.issues.push(`Funding amount ${fundingAmount} seems unusual for stage ${stage}`)
        result.confidence -= 0.2
      }

      try {
        const fundingNews = await this.webScraper.scrapeFundingAnnouncements(startupData.name)
        
        const confirmedFunding = fundingNews.some(news => {
          const content = `${news.title} ${news.content}`.toLowerCase()
          const amountStr = this.formatFundingAmount(fundingAmount)
          return content.includes(amountStr.toLowerCase()) || 
                 content.includes(stage?.toLowerCase() || '')
        })

        if (!confirmedFunding && fundingAmount > 1000000) {
          result.issues.push('Large funding claim not confirmed by news sources')
          result.confidence -= 0.3
        }
      } catch (error) {
        console.error('Error validating funding claims:', error)
      }
    }
  }

  private async validateMetrics(
    startupData: any,
    result: ValidationResult
  ): Promise<void> {
    const metrics = ['employee_count', 'funding_amount']
    
    for (const metric of metrics) {
      const value = startupData[metric]
      if (value !== null && value !== undefined) {
        if (this.isMetricSuspicious(metric, value)) {
          result.issues.push(`${metric} value ${value} appears suspicious`)
          result.confidence -= 0.1
        }
      }
    }

    if (startupData.founded_date) {
      const foundedDate = new Date(startupData.founded_date)
      const now = new Date()
      const ageInYears = (now.getTime() - foundedDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

      if (ageInYears < 0 || ageInYears > 50) {
        result.issues.push('Founded date appears to be incorrect')
        result.confidence -= 0.2
      }
    }
  }

  private async checkForDuplicates(
    startupData: any,
    result: ValidationResult
  ): Promise<void> {
    try {
      const { data: existingStartups } = await supabaseAdmin
        .from('startups')
        .select('id, name, website_url')
        .or(`name.ilike.%${startupData.name}%,website_url.eq.${startupData.website_url}`)

      if (existingStartups && existingStartups.length > 0) {
        result.issues.push('Similar startup already exists in database')
        result.confidence -= 0.5
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error)
    }
  }

  private async validateWebsite(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  private isFundingAmountSuspicious(amount: number, stage?: string): boolean {
    const ranges: Record<string, [number, number]> = {
      'pre-seed': [10000, 500000],
      'seed': [100000, 3000000],
      'series_a': [1000000, 15000000],
      'series_b': [5000000, 50000000],
      'series_c': [20000000, 200000000]
    }

    if (!stage) return false

    const range = ranges[stage.toLowerCase().replace(/\s+/g, '_')]
    if (!range) return false

    return amount < range[0] * 0.1 || amount > range[1] * 5
  }

  private formatFundingAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount}`
    }
  }

  private isMetricSuspicious(metric: string, value: number): boolean {
    const suspiciousRanges: Record<string, [number, number]> = {
      employee_count: [1, 100000],
      funding_amount: [1000, 10000000000]
    }

    const range = suspiciousRanges[metric]
    if (!range) return false

    return value < range[0] || value > range[1]
  }

  private calculateFinalVerdict(result: ValidationResult): void {
    if (result.confidence < 0.3) {
      result.finalVerdict = 'rejected'
      result.isValid = false
    } else if (result.confidence < 0.7 || result.issues.length > 2) {
      result.finalVerdict = 'needs_review'
    } else {
      result.finalVerdict = 'approved'
    }
  }

  async validateDataConsistency(
    sources: Array<{ source_type: string; data: any }>
  ): Promise<{
    inconsistencies: Array<{ field: string; values: any[]; sources: string[] }>
    reliability: number
  }> {
    const inconsistencies: Array<{ field: string; values: any[]; sources: string[] }> = []
    const fieldMap = new Map<string, Array<{ value: any; source: string }>>()

    for (const source of sources) {
      const data = source.data
      const sourceType = source.source_type

      for (const [field, value] of Object.entries(data)) {
        if (value != null && value !== '') {
          if (!fieldMap.has(field)) {
            fieldMap.set(field, [])
          }
          fieldMap.get(field)!.push({ value, source: sourceType })
        }
      }
    }

    for (const [field, entries] of fieldMap.entries()) {
      if (entries.length > 1) {
        const uniqueValues = [...new Set(entries.map(e => JSON.stringify(e.value)))]
        
        if (uniqueValues.length > 1) {
          inconsistencies.push({
            field,
            values: entries.map(e => e.value),
            sources: entries.map(e => e.source)
          })
        }
      }
    }

    const totalFields = fieldMap.size
    const consistentFields = totalFields - inconsistencies.length
    const reliability = totalFields > 0 ? consistentFields / totalFields : 1

    return { inconsistencies, reliability }
  }

  async scoreDataQuality(
    startupData: any,
    sources: any[]
  ): Promise<{
    score: number
    breakdown: {
      completeness: number
      accuracy: number
      freshness: number
      reliability: number
    }
  }> {
    const completeness = this.calculateCompleteness(startupData)
    const accuracy = await this.estimateAccuracy(startupData, sources)
    const freshness = this.calculateFreshness(sources)
    const { reliability } = await this.validateDataConsistency(sources)

    const score = (completeness + accuracy + freshness + reliability) / 4

    return {
      score,
      breakdown: {
        completeness,
        accuracy,
        freshness,
        reliability
      }
    }
  }

  private calculateCompleteness(data: any): number {
    const requiredFields = ['name', 'description', 'website_url', 'industry']
    const optionalFields = ['founded_date', 'funding_amount', 'funding_stage', 'location']
    
    const requiredScore = requiredFields.filter(field => data[field]).length / requiredFields.length
    const optionalScore = optionalFields.filter(field => data[field]).length / optionalFields.length
    
    return (requiredScore * 0.7) + (optionalScore * 0.3)
  }

  private async estimateAccuracy(data: any, sources: any[]): Promise<number> {
    let accuracyScore = 1.0

    if (data.website_url) {
      const websiteWorks = await this.validateWebsite(data.website_url)
      if (!websiteWorks) accuracyScore -= 0.2
    }

    if (sources.length === 0) {
      accuracyScore -= 0.3
    } else if (sources.length === 1) {
      accuracyScore -= 0.1
    }

    return Math.max(0, accuracyScore)
  }

  private calculateFreshness(sources: any[]): number {
    if (sources.length === 0) return 0

    const now = new Date()
    const ages = sources.map(source => {
      const extractedAt = new Date(source.extracted_at || source.last_checked || now)
      return (now.getTime() - extractedAt.getTime()) / (1000 * 60 * 60 * 24)
    })

    const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length
    
    if (avgAge <= 1) return 1.0
    if (avgAge <= 7) return 0.8
    if (avgAge <= 30) return 0.6
    if (avgAge <= 90) return 0.4
    return 0.2
  }
}