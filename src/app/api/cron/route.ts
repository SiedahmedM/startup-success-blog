import { NextRequest, NextResponse } from 'next/server'
import { DataCollectionOrchestrator } from '@/lib/jobs/data-collection-orchestrator'

const orchestrator = new DataCollectionOrchestrator()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const job = searchParams.get('job')
    const sources = searchParams.get('sources')?.split(',') || []

    if (job === 'manual') {
      const result = await orchestrator.runManualCollection(sources)
      return NextResponse.json(result)
    }

    return NextResponse.json({ 
      error: 'Invalid job parameter. Use ?job=manual' 
    }, { status: 400 })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sources } = body

    if (action === 'start') {
      await orchestrator.start()
      return NextResponse.json({ message: 'Data collection started' })
    }

    if (action === 'collect') {
      const result = await orchestrator.runManualCollection(sources)
      return NextResponse.json(result)
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use "start" or "collect"' 
    }, { status: 400 })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}