import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        totalStartups: 0,
        totalStories: 0
      })
    }
    
    // Get total startups
    const { count: totalStartups } = await supabase
      .from('startups')
      .select('*', { count: 'exact', head: true })

    // Get total stories
    const { count: totalStories } = await supabase
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    const stats = {
      totalStartups: totalStartups || 0,
      totalStories: totalStories || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    // Return fallback stats if database query fails
    return NextResponse.json({
      totalStartups: 30,
      totalStories: 27
    })
  }
}