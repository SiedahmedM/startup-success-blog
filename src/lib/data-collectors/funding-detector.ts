import { supabaseAdmin } from '@/lib/supabase/client'

export interface FundingInfo {
  companyName: string
  amount: number
  stage: string
  date: string
  investors?: string[]
  source: string
  confidence: number
}

export class FundingDetector {
  private fundingKeywords = [
    'raised', 'funding', 'investment', 'series', 'seed', 'venture',
    'million', 'billion', 'fund', 'capital', 'investment round',
    'funding round', 'raised funding', 'secured funding'
  ]

  private fundingStages = [
    'seed', 'series a', 'series b', 'series c', 'series d',
    'pre-seed', 'angel', 'venture', 'growth'
  ]

  async detectFundingFromText(text: string, source: string): Promise<FundingInfo | null> {
    const lowerText = text.toLowerCase()
    
    // Check if text contains funding keywords
    const hasFundingKeywords = this.fundingKeywords.some(keyword => 
      lowerText.includes(keyword)
    )
    
    if (!hasFundingKeywords) {
      return null
    }

    // Extract funding amount
    const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*(?:million|billion|k|m|b)/i)
    if (!amountMatch) {
      return null
    }

    let amount = parseFloat(amountMatch[1])
    if (lowerText.includes('million')) amount *= 1000000
    if (lowerText.includes('billion')) amount *= 1000000000
    if (lowerText.includes('k')) amount *= 1000

    // Must be at least $500K
    if (amount < 500000) {
      return null
    }

    // Extract company name
    const companyName = this.extractCompanyName(text)
    if (!companyName) {
      return null
    }

    // Extract funding stage
    const stage = this.extractFundingStage(lowerText)

    // Extract investors
    const investors = this.extractInvestors(text)

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(text, amount, companyName)

    return {
      companyName,
      amount,
      stage,
      date: new Date().toISOString(),
      investors,
      source,
      confidence
    }
  }

  private extractCompanyName(text: string): string | null {
    const patterns = [
      /"([^"]+)"\s+(?:raised|secured|announced)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:raised|secured|announced)/i,
      /(?:raised|secured|announced)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:has|announces|launches)/i
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const companyName = match[1].trim()
        if (companyName.length > 2 && companyName.length < 50) {
          return companyName
        }
      }
    }

    return null
  }

  private extractFundingStage(text: string): string {
    for (const stage of this.fundingStages) {
      if (text.includes(stage)) {
        return stage.replace(' ', '_')
      }
    }
    return 'funding'
  }

  private extractInvestors(text: string): string[] {
    const investorPatterns = [
      /led\s+by\s+([^,]+)/i,
      /investors?\s+include\s+([^.]+)/i,
      /backed\s+by\s+([^.]+)/i,
      /participated\s+by\s+([^.]+)/i
    ]

    const investors: string[] = []

    for (const pattern of investorPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const investorList = match[1].split(',').map(inv => inv.trim())
        investors.push(...investorList)
      }
    }

    return investors.filter(inv => inv.length > 0 && inv.length < 100)
  }

  private calculateConfidence(text: string, amount: number, companyName: string): number {
    let confidence = 0.5

    // Higher confidence for larger amounts
    if (amount >= 10000000) confidence += 0.2
    else if (amount >= 1000000) confidence += 0.1

    // Higher confidence for specific funding stages
    if (text.toLowerCase().includes('series a') || text.toLowerCase().includes('series b')) {
      confidence += 0.1
    }

    // Higher confidence for named investors
    if (text.toLowerCase().includes('led by') || text.toLowerCase().includes('investors include')) {
      confidence += 0.1
    }

    // Higher confidence for recent news
    if (text.toLowerCase().includes('today') || text.toLowerCase().includes('announced')) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  async updateStartupFunding(startupId: string, fundingInfo: FundingInfo): Promise<void> {
    try {
      await supabaseAdmin
        .from('startups')
        .update({
          funding_amount: fundingInfo.amount,
          funding_stage: fundingInfo.stage,
          updated_at: new Date().toISOString()
        })
        .eq('id', startupId)

      // Log funding detection
      await supabaseAdmin
        .from('data_sources')
        .insert({
          startup_id: startupId,
          source_type: 'funding_detection',
          source_url: fundingInfo.source,
          data: {
            amount: fundingInfo.amount,
            stage: fundingInfo.stage,
            investors: fundingInfo.investors,
            confidence: fundingInfo.confidence,
            detected_at: fundingInfo.date
          },
          extracted_at: new Date().toISOString()
        })

      console.log(`✅ Updated funding info for startup ${startupId}: $${(fundingInfo.amount / 1000000).toFixed(1)}M ${fundingInfo.stage}`)
    } catch (error) {
      console.error('Error updating startup funding:', error)
    }
  }

  async scanForNewFunding(): Promise<void> {
    try {
      // Get recent data sources that might contain funding info
      const { data: recentSources } = await supabaseAdmin
        .from('data_sources')
        .select('*')
        .gte('extracted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('source_type', ['rss', 'hacker_news', 'product_hunt'])

      if (!recentSources) return

      for (const source of recentSources) {
        const content = JSON.stringify(source.data)
        const fundingInfo = await this.detectFundingFromText(content, source.source_url)

        if (fundingInfo && fundingInfo.confidence > 0.6) {
          // Find or create startup
          let { data: startup } = await supabaseAdmin
            .from('startups')
            .select('*')
            .ilike('name', fundingInfo.companyName)
            .single()

          if (!startup) {
            // Create new startup
            const { data: newStartup } = await supabaseAdmin
              .from('startups')
              .insert({
                name: fundingInfo.companyName,
                funding_amount: fundingInfo.amount,
                funding_stage: fundingInfo.stage,
                created_at: new Date().toISOString()
              })
              .select()
              .single()

            startup = newStartup
          }

          if (startup) {
            await this.updateStartupFunding(startup.id, fundingInfo)
          }
        }
      }
    } catch (error) {
      console.error('Error scanning for new funding:', error)
    }
  }
} 