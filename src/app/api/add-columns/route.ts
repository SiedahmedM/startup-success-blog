import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🔧 Adding missing database columns...')

    // First, let's check what columns exist
    const { data: columns, error: columnError } = await supabaseAdmin
      .from('startups')
      .select('*')
      .limit(1)

    if (columnError) {
      console.error('Error checking columns:', columnError)
      return NextResponse.json({ error: 'Failed to check columns' }, { status: 500 })
    }

    console.log('Current startup columns:', Object.keys(columns?.[0] || {}))

    // Try to add the columns using raw SQL
    try {
      // Add current_valuation column
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE startups ADD COLUMN current_valuation BIGINT;'
      })
      console.log('✅ Added current_valuation column')
    } catch (error) {
      console.log('current_valuation column might already exist:', error)
    }

    try {
      // Add valuation_date column
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE startups ADD COLUMN valuation_date DATE;'
      })
      console.log('✅ Added valuation_date column')
    } catch (error) {
      console.log('valuation_date column might already exist:', error)
    }

    try {
      // Add funding_date column
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE startups ADD COLUMN funding_date DATE;'
      })
      console.log('✅ Added funding_date column')
    } catch (error) {
      console.log('funding_date column might already exist:', error)
    }

    // Check columns again
    const { data: newColumns } = await supabaseAdmin
      .from('startups')
      .select('*')
      .limit(1)

    console.log('Updated startup columns:', Object.keys(newColumns?.[0] || {}))

    return NextResponse.json({
      success: true,
      message: 'Database columns added successfully',
      columns: Object.keys(newColumns?.[0] || {})
    })

  } catch (error) {
    console.error('Add columns error:', error)
    return NextResponse.json({
      error: 'Failed to add columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 