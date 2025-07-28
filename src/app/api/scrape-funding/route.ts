import { NextResponse } from 'next/server'
import { FundingScraper } from '@/lib/data-collectors/funding-scraper'
import { AIContentGenerator } from '@/lib/ai/content-generator'
import { supabaseAdmin } from '@/lib/supabase/client'

const fundingScraper = new FundingScraper()
const aiGenerator = new AIContentGenerator()

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🔍 Scraping real funding announcements from sources...')

    // Clear existing data first
    await supabaseAdmin.from('success_stories').delete()
    await supabaseAdmin.from('startups').delete()
    await supabaseAdmin.from('data_sources').delete()

    // Scrape funding announcements
    await fundingScraper.processScrapedFunding()

    // Generate stories for funded startups
    const { data: fundedStartups } = await supabaseAdmin
      .from('startups')
      .select(`
        *,
        success_stories(id)
      `)
      .gte('funding_amount', 500000)
      .is('success_stories.id', null)

    let storiesGenerated = 0

    for (const startup of fundedStartups || []) {
      try {
        console.log(`📝 Generating story for: ${startup.name} (founded ${startup.founded_date?.split('-')[0]})`)

        const fundingStory = await aiGenerator.generateFundingStory(
          startup.name,
          startup.funding_amount || 0,
          startup.funding_stage || 'funding',
          {
            description: startup.description,
            industry: startup.industry,
            location: startup.location,
            website_url: startup.website_url,
            founded_date: startup.founded_date,
            funding_date: startup.funding_date,
            current_valuation: startup.current_valuation,
            valuation_date: startup.valuation_date
          }
        )

        if (fundingStory.isSuccessStory) {
          const storyData = {
            startup_id: startup.id,
            title: fundingStory.title,
            content: fundingStory.content,
            summary: fundingStory.summary,
            story_type: fundingStory.storyType,
            confidence_score: fundingStory.confidence,
            tags: fundingStory.tags,
            sources: [{
              type: 'funding_scraped',
              url: startup.website_url || '',
              confidence: 0.9
            }],
            ai_generated: true,
            featured: (startup.funding_amount || 0) >= 10000000,
            published_at: new Date().toISOString()
          }

          await supabaseAdmin
            .from('success_stories')
            .insert(storyData)

          console.log(`✅ Generated story for: ${startup.name}`)
          storiesGenerated++
        }

      } catch (error) {
        console.error(`Error processing ${startup.name}:`, error)
      }
    }

    // Get final counts
    const { count: totalStories } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    const { count: totalStartups } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Funding scraping and story generation completed',
      storiesGenerated,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Funding scraping error:', error)
    return NextResponse.json({
      error: 'Failed to scrape funding data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get scraped funding statistics
    const { data: scrapedStartups } = await supabaseAdmin
      .from('startups')
      .select('funding_amount, funding_stage, industry, founded_date')
      .gte('funding_amount', 500000)
      .gte('founded_date', '2020-07-01')

    const { data: recentStories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(name, funding_amount, funding_stage, website_url, founded_date)
      `)
      .order('published_at', { ascending: false })
      .limit(5)

    const fundingRanges = {
      '500K-1M': 0,
      '1M-10M': 0,
      '10M-100M': 0,
      '100M+': 0
    }

    const foundingYears = {
      '2020': 0,
      '2021': 0,
      '2022': 0,
      '2023': 0,
      '2024': 0,
      '2025': 0
    }

    scrapedStartups?.forEach(startup => {
      const amount = startup.funding_amount || 0
      if (amount >= 100000000) fundingRanges['100M+']++
      else if (amount >= 10000000) fundingRanges['10M-100M']++
      else if (amount >= 1000000) fundingRanges['1M-10M']++
      else fundingRanges['500K-1M']++

      const foundedYear = startup.founded_date?.split('-')[0]
      if (foundedYear && foundingYears[foundedYear as keyof typeof foundingYears] !== undefined) {
        foundingYears[foundedYear as keyof typeof foundingYears]++
      }
    })

    return NextResponse.json({
      scrapedFunding: {
        totalScrapedStartups: scrapedStartups?.length || 0,
        fundingRanges,
        foundingYears,
        recentStories: recentStories || []
      }
    })

  } catch (error) {
    console.error('Scraped funding stats error:', error)
    return NextResponse.json({
      error: 'Failed to get scraped funding statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 