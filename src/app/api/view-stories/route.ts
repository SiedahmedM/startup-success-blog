import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get all stories with startup information
    const { data: stories } = await supabaseAdmin
      .from('success_stories')
      .select(`
        *,
        startup:startups(name, funding_amount, funding_stage, industry, location, founded_date, website_url)
      `)
      .order('published_at', { ascending: false })

    // Get all startups
    const { data: startups } = await supabaseAdmin
      .from('startups')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      stories: stories || [],
      startups: startups || [],
      summary: {
        totalStories: stories?.length || 0,
        totalStartups: startups?.length || 0,
        storiesWithFunding: stories?.filter(s => s.startup?.funding_amount > 0).length || 0,
        averageFunding: stories?.reduce((sum, s) => sum + (s.startup?.funding_amount || 0), 0) / (stories?.length || 1)
      }
    })

  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 