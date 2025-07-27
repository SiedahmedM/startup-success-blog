import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/lib/utils/monitoring'
import { rateLimiter } from '@/lib/utils/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    await rateLimiter.checkLimit('api', clientIp)

    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('name')
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000')

    if (metricName) {
      const summary = await monitoring.getMetricsSummary(metricName, timeRange)
      return NextResponse.json({
        metric: metricName,
        timeRange,
        summary
      })
    }

    const commonMetrics = await Promise.all([
      monitoring.getMetricsSummary('api_requests', timeRange),
      monitoring.getMetricsSummary('api_response_time', timeRange),
      monitoring.getMetricsSummary('data_collection_items', timeRange),
      monitoring.getMetricsSummary('job_executions', timeRange),
      monitoring.getErrorRate(timeRange)
    ])

    return NextResponse.json({
      timeRange,
      metrics: {
        apiRequests: commonMetrics[0],
        apiResponseTime: commonMetrics[1],
        dataCollectionItems: commonMetrics[2],
        jobExecutions: commonMetrics[3],
        errorRate: commonMetrics[4]
      }
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return NextResponse.json({
        error: 'Rate limit exceeded'
      }, { status: 429 })
    }

    return NextResponse.json({
      error: 'Failed to retrieve metrics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    await rateLimiter.checkLimit('api', clientIp)

    const body = await request.json()
    const { name, value, unit, tags } = body

    if (!name || value === undefined || !unit) {
      return NextResponse.json({
        error: 'Missing required fields: name, value, unit'
      }, { status: 400 })
    }

    await monitoring.recordMetric({
      name,
      value: Number(value),
      unit,
      tags: tags || {}
    })

    return NextResponse.json({
      success: true,
      message: 'Metric recorded successfully'
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return NextResponse.json({
        error: 'Rate limit exceeded'
      }, { status: 429 })
    }

    return NextResponse.json({
      error: 'Failed to record metric'
    }, { status: 500 })
  }
}