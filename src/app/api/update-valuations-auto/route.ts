import { NextResponse } from 'next/server'
import { ValuationFetcher } from '@/lib/data-collectors/valuation-fetcher'

const valuationFetcher = new ValuationFetcher()

export async function POST() {
  try {
    console.log('💰 Starting automatic valuation updates...')

    await valuationFetcher.updateStartupValuations()

    return NextResponse.json({
      success: true,
      message: 'Automatic valuation updates completed successfully'
    })

  } catch (error) {
    console.error('Automatic valuation update error:', error)
    return NextResponse.json({
      error: 'Failed to update valuations automatically',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('📊 Fetching current valuations...')

    const valuations = await valuationFetcher.fetchCurrentValuations()

    return NextResponse.json({
      success: true,
      valuations: valuations.map(v => ({
        company: v.companyName,
        valuation: `$${(v.currentValuation / 1000000).toFixed(1)}M`,
        date: v.valuationDate,
        confidence: `${Math.round(v.confidence * 100)}%`
      }))
    })

  } catch (error) {
    console.error('Fetch valuations error:', error)
    return NextResponse.json({
      error: 'Failed to fetch valuations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 