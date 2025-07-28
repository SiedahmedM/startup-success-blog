import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🧹 Cleaning up old stories (founded > 5 years ago)...')

    // Get all stories with startup data
    const { data: stories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(founded_date)
      `)

    let removedStories = 0
    let removedStartups = 0
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)

    if (stories) {
      for (const story of stories) {
        const startup = story.startup
        let shouldRemove = false

        // Remove if no founded_date or founded more than 5 years ago
        if (!startup?.founded_date) {
          shouldRemove = true
          console.log(`❌ Removing story for ${story.title} - No founding date`)
        } else {
          const foundedDate = new Date(startup.founded_date)
          if (foundedDate < fiveYearsAgo) {
            shouldRemove = true
            console.log(`❌ Removing story for ${story.title} - Founded ${startup.founded_date} (too old)`)
          }
        }

        if (shouldRemove) {
          // Remove the story
          await supabaseAdmin
            .from('success_stories')
            .delete()
            .eq('id', story.id)
          
          removedStories++

          // Check if this was the last story for this startup
          const { data: otherStories } = await supabaseAdmin
            .from('success_stories')
            .select('id')
            .eq('startup_id', story.startup_id)
            .neq('id', story.id)

          if (!otherStories || otherStories.length === 0) {
            // Remove the startup and its data sources
            await supabaseAdmin
              .from('data_sources')
              .delete()
              .eq('startup_id', story.startup_id)
            
            await supabaseAdmin
              .from('startups')
              .delete()
              .eq('id', story.startup_id)
            
            removedStartups++
            console.log(`❌ Removed startup: ${story.startup?.name || 'Unknown'}`)
          }
        }
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
      message: 'Old stories cleaned successfully',
      removedStories,
      removedStartups,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Clean old stories error:', error)
    return NextResponse.json({
      error: 'Failed to clean old stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 