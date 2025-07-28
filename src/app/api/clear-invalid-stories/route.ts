import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🗑️ Clearing all invalid stories...')

    // Get all stories
    const { data: stories } = await supabaseAdmin
      .from('success_stories')
      .select('*')

    let removedStories = 0
    let removedStartups = 0

    if (stories) {
      // Get unique startup IDs
      const startupIds = [...new Set(stories.map(s => s.startup_id))]

      // Remove all stories
      await supabaseAdmin
        .from('success_stories')
        .delete()
        .in('id', stories.map(s => s.id))

      removedStories = stories.length

      // Remove all startups
      await supabaseAdmin
        .from('startups')
        .delete()
        .in('id', startupIds)

      removedStartups = startupIds.length

      // Remove all data sources
      await supabaseAdmin
        .from('data_sources')
        .delete()
        .in('startup_id', startupIds)

      console.log(`✅ Removed ${removedStories} stories and ${removedStartups} startups`)
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
      message: 'All invalid stories cleared',
      removedStories,
      removedStartups,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Clear stories error:', error)
    return NextResponse.json({ 
      error: 'Failed to clear stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 