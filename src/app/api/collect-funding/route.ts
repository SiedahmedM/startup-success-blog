import { NextResponse } from 'next/server'
import { FundingCollector } from '@/lib/data-collectors/funding-collector'
import { AIContentGenerator } from '@/lib/ai/content-generator'
import { supabaseAdmin } from '@/lib/supabase/client'

const fundingCollector = new FundingCollector()
const aiGenerator = new AIContentGenerator()

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('💰 Collecting real funding announcements...')

    // Collect funding announcements
    await fundingCollector.processFundingAnnouncements()

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
        console.log(`📝 Generating story for: ${startup.name}`)

        const fundingStory = await aiGenerator.generateFundingStory(
          startup.name,
          startup.funding_amount || 0,
          startup.funding_stage || 'funding',
          {
            description: startup.description,
            industry: startup.industry,
            location: startup.location,
            website_url: startup.website_url
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
              type: 'funding_announcement',
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
      message: 'Funding collection and story generation completed',
      storiesGenerated,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Funding collection error:', error)
    return NextResponse.json({
      error: 'Failed to collect funding data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get funding statistics
    const { data: fundingStats } = await supabaseAdmin
      .from('startups')
      .select('funding_amount, funding_stage, industry')
      .gte('funding_amount', 500000)

    const { data: recentStories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(name, funding_amount, funding_stage, website_url)
      `)
      .order('published_at', { ascending: false })
      .limit(5)

    const fundingRanges = {
      '500K-1M': 0,
      '1M-5M': 0,
      '5M-10M': 0,
      '10M+': 0
    }

    fundingStats?.forEach(startup => {
      const amount = startup.funding_amount || 0
      if (amount >= 10000000) fundingRanges['10M+']++
      else if (amount >= 5000000) fundingRanges['5M-10M']++
      else if (amount >= 1000000) fundingRanges['1M-5M']++
      else fundingRanges['500K-1M']++
    })

    return NextResponse.json({
      fundingStats: {
        totalFundedStartups: fundingStats?.length || 0,
        fundingRanges,
        recentStories: recentStories || []
      }
    })

  } catch (error) {
    console.error('Funding stats error:', error)
    return NextResponse.json({
      error: 'Failed to get funding statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 