import { NextResponse } from 'next/server'
import { DataCollectionOrchestrator } from '@/lib/jobs/data-collection-orchestrator'
import { supabaseAdmin } from '@/lib/supabase/client'

const orchestrator = new DataCollectionOrchestrator()

// Allow public access for testing
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🚀 Manual collection trigger started...')

    // Get current count
    const { count: beforeCount } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Stories before collection: ${beforeCount}`)

    // Run collection
    const result = await orchestrator.runManualCollection(['product_hunt', 'hacker_news', 'github'])

    // Get new count
    const { count: afterCount } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Stories after collection: ${afterCount}`)

    return NextResponse.json({
      success: true,
      message: 'Data collection completed',
      storiesBefore: beforeCount || 0,
      storiesAfter: afterCount || 0,
      newStories: (afterCount || 0) - (beforeCount || 0),
      collectionResults: result
    })

  } catch (error) {
    console.error('Collection trigger error:', error)
    return NextResponse.json({ 
      error: 'Failed to trigger collection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get current database state
    const { count: storiesCount } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    const { count: startupsCount } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    const { count: jobLogsCount } = await supabaseAdmin
      .from('job_logs')
      .select('*', { count: 'exact', head: true })

    // Get recent job logs
    const { data: recentJobs } = await supabaseAdmin
      .from('job_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      database: {
        stories: storiesCount || 0,
        startups: startupsCount || 0,
        jobLogs: jobLogsCount || 0
      },
      recentJobs: recentJobs || [],
      environment: {
        hasSupabase: !!supabaseAdmin,
        hasOpenAI: !!process.env.OPENAI_API_KEY
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}