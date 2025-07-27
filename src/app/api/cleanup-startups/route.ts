import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { DataValidator } from '@/lib/validation/data-validator'

const validator = new DataValidator()

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🧹 Starting startup cleanup based on funding requirements...')

    // Get all startups
    const { data: startups, error: fetchError } = await supabaseAdmin
      .from('startups')
      .select('*')

    if (fetchError) {
      throw fetchError
    }

    let removedCount = 0
    let keptCount = 0

    for (const startup of startups || []) {
      // Validate each startup against funding requirements
      const result = await validator.validateStartupStory(startup, [])
      
      if (result.finalVerdict === 'rejected') {
        console.log(`❌ Removing ${startup.name}: ${result.issues.join(', ')}`)
        
        // Delete related stories first
        await supabaseAdmin
          .from('success_stories')
          .delete()
          .eq('startup_id', startup.id)
        
        // Delete data sources
        await supabaseAdmin
          .from('data_sources')
          .delete()
          .eq('startup_id', startup.id)
        
        // Delete startup
        await supabaseAdmin
          .from('startups')
          .delete()
          .eq('id', startup.id)
        
        removedCount++
      } else {
        console.log(`✅ Keeping ${startup.name}: meets funding requirements`)
        keptCount++
      }
    }

    // Get final counts
    const { count: finalStartups } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    const { count: finalStories } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    console.log('🧹 Cleanup completed')

    return NextResponse.json({
      success: true,
      message: 'Startup cleanup completed',
      removed: removedCount,
      kept: keptCount,
      finalCounts: {
        startups: finalStartups || 0,
        stories: finalStories || 0
      }
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ 
      error: 'Failed to cleanup startups',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}