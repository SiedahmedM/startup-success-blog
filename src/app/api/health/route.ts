import { NextResponse } from 'next/server'
import { monitoring } from '@/lib/utils/monitoring'

export async function GET() {
  try {
    const healthChecks = await monitoring.checkSystemHealth()
    
    const overallStatus = Object.values(healthChecks).every(check => 
      check.status === 'healthy'
    ) ? 'healthy' : 'unhealthy'

    const metrics = await Promise.all([
      monitoring.getMetricsSummary('api_requests', 3600000),
      monitoring.getMetricsSummary('data_collection_items', 3600000),
      monitoring.getErrorRate(3600000)
    ])

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      metrics: {
        apiRequests: metrics[0],
        dataCollectionItems: metrics[1],
        errorRate: metrics[2]
      }
    }, {
      status: overallStatus === 'healthy' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}