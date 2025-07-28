import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('💰 Updating startup valuations...')

    // Update startups with current valuations
    const valuationUpdates = [
      { name: 'Mistral AI', current_valuation: 2000000000, valuation_date: '2024-12-20' },
      { name: 'Replicate', current_valuation: 200000000, valuation_date: '2024-01-15' },
      { name: 'Together AI', current_valuation: 750000000, valuation_date: '2024-02-15' },
      { name: 'Character.ai', current_valuation: 1000000000, valuation_date: '2024-03-20' },
      { name: 'Perplexity AI', current_valuation: 520000000, valuation_date: '2024-01-25' },
      { name: 'LangChain', current_valuation: 150000000, valuation_date: '2024-02-28' },
      { name: 'Anthropic', current_valuation: 18000000000, valuation_date: '2024-03-15' },
      { name: 'Stability AI', current_valuation: 800000000, valuation_date: '2024-01-10' }
    ]

    let updatedCount = 0

    for (const update of valuationUpdates) {
      const { error } = await supabaseAdmin
        .from('startups')
        .update({
          current_valuation: update.current_valuation,
          valuation_date: update.valuation_date
        })
        .ilike('name', update.name)

      if (error) {
        console.error(`Error updating ${update.name}:`, error)
      } else {
        updatedCount++
        console.log(`✅ Updated ${update.name} with valuation: $${(update.current_valuation / 1000000).toFixed(1)}M`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Startup valuations updated successfully',
      updatedCount
    })

  } catch (error) {
    console.error('Update valuations error:', error)
    return NextResponse.json({
      error: 'Failed to update valuations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 