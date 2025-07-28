import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🔧 Running database migration...')

    // Add current valuation and valuation date fields to startups table
    const { error: error1 } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE startups 
        ADD COLUMN IF NOT EXISTS current_valuation BIGINT,
        ADD COLUMN IF NOT EXISTS valuation_date DATE,
        ADD COLUMN IF NOT EXISTS funding_date DATE;
      `
    })

    if (error1) {
      console.error('Migration error 1:', error1)
    }

    // Add index for current valuation
    const { error: error2 } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_startups_current_valuation ON startups(current_valuation);
        CREATE INDEX IF NOT EXISTS idx_startups_funding_date ON startups(funding_date);
      `
    })

    if (error2) {
      console.error('Migration error 2:', error2)
    }

    // Update existing startups with current valuations from funding scraper data
    const { data: startups } = await supabaseAdmin
      .from('startups')
      .select('*')

    console.log(`Found ${startups?.length || 0} startups to update`)

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      startupsUpdated: startups?.length || 0
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Failed to run migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 