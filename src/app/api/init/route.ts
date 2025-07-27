import { NextResponse } from 'next/server'
import { DataCollectionOrchestrator } from '@/lib/jobs/data-collection-orchestrator'
import { supabaseAdmin } from '@/lib/supabase/client'

const orchestrator = new DataCollectionOrchestrator()

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🚀 Initializing startup success stories app...')

    // Check if we have any stories
    const { count } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Current stories in database: ${count}`)

    if (!count || count === 0) {
      console.log('🔄 No stories found, triggering initial data collection...')
      
      // Trigger immediate data collection
      const result = await orchestrator.runManualCollection(['product_hunt', 'hacker_news', 'github'])
      
      return NextResponse.json({
        message: 'App initialized and initial data collection triggered',
        storiesCollected: result.totalProcessed || 0,
        previousCount: count,
        ...result
      })
    }

    return NextResponse.json({
      message: 'App already initialized',
      currentStories: count
    })

  } catch (error) {
    console.error('Initialization error:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize app',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}