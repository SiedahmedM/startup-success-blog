import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🔍 Validating stories and removing those without proper sources...')

    // Get all stories with their data sources
    const { data: stories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(*),
        data_sources:data_sources(*)
      `)

    let validStories = 0
    let removedStories = 0
    let removedStartups = 0

    for (const story of stories || []) {
      const hasValidSources = await validateStorySources(story)
      
      if (!hasValidSources) {
        console.log(`❌ Removing story: ${story.title} - No valid sources`)
        
        // Remove the story
        await supabaseAdmin
          .from('success_stories')
          .delete()
          .eq('id', story.id)

        // Check if startup has other stories, if not, remove it too
        const { data: otherStories } = await supabaseAdmin
          .from('success_stories')
          .select('id')
          .eq('startup_id', story.startup_id)
          .neq('id', story.id)

        if (!otherStories || otherStories.length === 0) {
          console.log(`❌ Removing startup: ${story.startup?.name} - No valid stories`)
          
          // Remove startup and its data sources
          await supabaseAdmin
            .from('data_sources')
            .delete()
            .eq('startup_id', story.startup_id)

          await supabaseAdmin
            .from('startups')
            .delete()
            .eq('id', story.startup_id)

          removedStartups++
        }

        removedStories++
      } else {
        validStories++
        console.log(`✅ Valid story: ${story.title}`)
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
      message: 'Story validation completed',
      validStories,
      removedStories,
      removedStartups,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Story validation error:', error)
    return NextResponse.json({ 
      error: 'Failed to validate stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function validateStorySources(story: any): Promise<boolean> {
  const dataSources = story.data_sources || []
  
  // Check if we have any data sources
  if (dataSources.length === 0) {
    console.log(`No data sources for story: ${story.title}`)
    return false
  }

  let hasFundingSource = false
  let hasWebsiteSource = false
  let hasRecentActivity = false

  for (const source of dataSources) {
    const sourceData = source.data || {}
    const sourceUrl = source.source_url || ''
    const sourceType = source.source_type || ''

    console.log(`Checking source: ${sourceType} - ${sourceUrl}`)

    // Check for funding information
    if (sourceData.funding_amount || sourceData.funding_stage || 
        sourceUrl.includes('crunchbase') || sourceUrl.includes('techcrunch') ||
        sourceUrl.includes('funding') || sourceType === 'funding_detection' ||
        sourceType === 'funding_update') {
      hasFundingSource = true
      console.log(`Found funding source: ${sourceUrl}`)
    }

    // Check for company website (not GitHub, Product Hunt, etc.)
    if (sourceUrl.includes('http') && 
        !sourceUrl.includes('github.com') && 
        !sourceUrl.includes('producthunt.com') && 
        !sourceUrl.includes('news.ycombinator.com') &&
        !sourceUrl.includes('medium.com') &&
        !sourceUrl.includes('dev.to') &&
        sourceUrl.includes('.com') || sourceUrl.includes('.io') || sourceUrl.includes('.co')) {
      hasWebsiteSource = true
      console.log(`Found website source: ${sourceUrl}`)
    }

    // Check for recent activity (last 2 years)
    const extractedAt = new Date(source.extracted_at)
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    
    if (extractedAt > twoYearsAgo) {
      hasRecentActivity = true
      console.log(`Found recent activity: ${extractedAt}`)
    }
  }

  console.log(`Validation for ${story.title}: funding=${hasFundingSource}, website=${hasWebsiteSource}, recent=${hasRecentActivity}`)

  // Story is valid if it has funding source AND website source AND recent activity
  return hasFundingSource && hasWebsiteSource && hasRecentActivity
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get stories with their validation status
    const { data: stories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(*)
      `)

    const validationResults = []

    for (const story of stories || []) {
      // Get data sources for this story's startup
      const { data: dataSources } = await supabaseAdmin
        .from('data_sources')
        .select('*')
        .eq('startup_id', story.startup_id)

      const hasValidSources = await validateStorySources({
        ...story,
        data_sources: dataSources || []
      })
      
      validationResults.push({
        id: story.id,
        title: story.title,
        startup_name: story.startup?.name,
        hasValidSources,
        dataSourcesCount: dataSources?.length || 0,
        sources: (dataSources || []).map((s: any) => ({
          type: s.source_type,
          url: s.source_url,
          extracted_at: s.extracted_at
        }))
      })
    }

    return NextResponse.json({
      validationResults,
      summary: {
        totalStories: stories?.length || 0,
        validStories: validationResults.filter(r => r.hasValidSources).length,
        invalidStories: validationResults.filter(r => !r.hasValidSources).length
      }
    })

  } catch (error) {
    console.error('Validation check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 