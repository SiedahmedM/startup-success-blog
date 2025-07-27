import { supabaseAdmin } from '@/lib/supabase/client'

export interface Metric {
  name: string
  value: number
  unit: string
  tags?: Record<string, string>
  timestamp?: string
}

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  error?: string
  details?: Record<string, any>
}

export class MonitoringService {
  private metrics: Metric[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()

  async recordMetric(metric: Metric): Promise<void> {
    const metricWithTimestamp = {
      ...metric,
      timestamp: metric.timestamp || new Date().toISOString()
    }

    this.metrics.push(metricWithTimestamp)

    try {
      await supabaseAdmin
        .from('metrics')
        .insert(metricWithTimestamp)
    } catch (error) {
      console.error('Failed to store metric:', error)
    }

    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500)
    }
  }

  async recordDataCollectionMetrics(
    source: string,
    itemsCollected: number,
    duration: number,
    errors: number = 0
  ): Promise<void> {
    const baseData = {
      timestamp: new Date().toISOString(),
      tags: { source }
    }

    await Promise.all([
      this.recordMetric({
        name: 'data_collection_items',
        value: itemsCollected,
        unit: 'count',
        ...baseData
      }),
      this.recordMetric({
        name: 'data_collection_duration',
        value: duration,
        unit: 'milliseconds',
        ...baseData
      }),
      this.recordMetric({
        name: 'data_collection_errors',
        value: errors,
        unit: 'count',
        ...baseData
      })
    ])
  }

  async recordApiMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): Promise<void> {
    const tags = { endpoint, method, status_code: statusCode.toString() }

    await Promise.all([
      this.recordMetric({
        name: 'api_requests',
        value: 1,
        unit: 'count',
        tags
      }),
      this.recordMetric({
        name: 'api_response_time',
        value: responseTime,
        unit: 'milliseconds',
        tags
      })
    ])
  }

  async recordUserActivity(
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordMetric({
      name: 'user_activity',
      value: 1,
      unit: 'count',
      tags: {
        action,
        user_id: userId || 'anonymous',
        ...metadata
      }
    })
  }

  async performHealthCheck(service: string, checkFn: () => Promise<any>): Promise<HealthCheck> {
    const startTime = Date.now()
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let error: string | undefined
    let details: Record<string, any> | undefined

    try {
      const result = await Promise.race([
        checkFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ])
      
      details = typeof result === 'object' ? result : undefined
    } catch (err) {
      status = 'unhealthy'
      error = err instanceof Error ? err.message : 'Unknown error'
    }

    const responseTime = Date.now() - startTime
    
    if (responseTime > 5000) {
      status = status === 'healthy' ? 'degraded' : status
    }

    const healthCheck: HealthCheck = {
      service,
      status,
      responseTime,
      error,
      details
    }

    this.healthChecks.set(service, healthCheck)

    await this.recordMetric({
      name: 'health_check',
      value: status === 'healthy' ? 1 : 0,
      unit: 'boolean',
      tags: { service, status }
    })

    return healthCheck
  }

  async checkSystemHealth(): Promise<Record<string, HealthCheck>> {
    const checks = await Promise.allSettled([
      this.performHealthCheck('database', () => 
        supabaseAdmin.from('startups').select('id').limit(1)
      ),
      this.performHealthCheck('openai', async () => {
        if (!process.env.OPENAI_API_KEY) throw new Error('API key not configured')
        return { configured: true }
      }),
      this.performHealthCheck('memory', () => {
        const memUsage = process.memoryUsage()
        if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
          throw new Error('High memory usage')
        }
        return memUsage
      })
    ])

    const results: Record<string, HealthCheck> = {}
    checks.forEach((result, index) => {
      const services = ['database', 'openai', 'memory']
      const service = services[index]
      
      if (result.status === 'fulfilled') {
        results[service] = result.value
      } else {
        results[service] = {
          service,
          status: 'unhealthy',
          responseTime: 0,
          error: result.reason?.message || 'Health check failed'
        }
      }
    })

    return results
  }

  async getMetricsSummary(
    metricName: string,
    timeRange: number = 3600000
  ): Promise<{
    count: number
    average: number
    min: number
    max: number
    latest: number
  }> {
    const cutoff = new Date(Date.now() - timeRange).toISOString()
    
    try {
      const { data } = await supabaseAdmin
        .from('metrics')
        .select('value')
        .eq('name', metricName)
        .gte('timestamp', cutoff)
        .order('timestamp', { ascending: false })

      if (!data || data.length === 0) {
        return { count: 0, average: 0, min: 0, max: 0, latest: 0 }
      }

      const values = data.map(m => m.value)
      
      return {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[0]
      }
    } catch (error) {
      console.error('Failed to get metrics summary:', error)
      return { count: 0, average: 0, min: 0, max: 0, latest: 0 }
    }
  }

  async getErrorRate(timeRange: number = 3600000): Promise<number> {
    const cutoff = new Date(Date.now() - timeRange).toISOString()
    
    try {
      const [totalRequests, errorRequests] = await Promise.all([
        supabaseAdmin
          .from('metrics')
          .select('value', { count: 'exact' })
          .eq('name', 'api_requests')
          .gte('timestamp', cutoff),
        supabaseAdmin
          .from('metrics')
          .select('value', { count: 'exact' })
          .eq('name', 'api_requests')
          .gte('timestamp', cutoff)
          .like('tags->status_code', '5%')
      ])

      const total = totalRequests.count || 0
      const errors = errorRequests.count || 0

      return total > 0 ? errors / total : 0
    } catch (error) {
      console.error('Failed to calculate error rate:', error)
      return 0
    }
  }

  async trackJobPerformance(
    jobName: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now()
    let success = true
    let error: Error | undefined

    try {
      const result = await fn()
      return result
    } catch (err) {
      success = false
      error = err as Error
      throw err
    } finally {
      const duration = Date.now() - startTime

      await Promise.all([
        this.recordMetric({
          name: 'job_duration',
          value: duration,
          unit: 'milliseconds',
          tags: { job: jobName, success: success.toString() }
        }),
        this.recordMetric({
          name: 'job_executions',
          value: 1,
          unit: 'count',
          tags: { job: jobName, success: success.toString() }
        })
      ])

      if (error) {
        await this.recordMetric({
          name: 'job_errors',
          value: 1,
          unit: 'count',
          tags: { job: jobName, error: error.name }
        })
      }
    }
  }

  createTimer(metricName: string, tags?: Record<string, string>) {
    const startTime = Date.now()
    
    return {
      stop: async () => {
        const duration = Date.now() - startTime
        await this.recordMetric({
          name: metricName,
          value: duration,
          unit: 'milliseconds',
          tags
        })
        return duration
      }
    }
  }

  async alertOnThreshold(
    metricName: string,
    threshold: number,
    comparison: 'greater' | 'less' = 'greater'
  ): Promise<boolean> {
    const summary = await this.getMetricsSummary(metricName, 300000)
    
    const shouldAlert = comparison === 'greater' 
      ? summary.latest > threshold
      : summary.latest < threshold

    if (shouldAlert) {
      console.warn(`ALERT: ${metricName} is ${summary.latest}, threshold: ${threshold}`)
      
      await this.recordMetric({
        name: 'alerts_triggered',
        value: 1,
        unit: 'count',
        tags: { metric: metricName, threshold: threshold.toString() }
      })
    }

    return shouldAlert
  }
}

export const monitoring = new MonitoringService()

export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  metricName: string,
  tags?: Record<string, string>
): T {
  return (async (...args: Parameters<T>) => {
    const timer = monitoring.createTimer(metricName, tags)
    
    try {
      const result = await fn(...args)
      await timer.stop()
      return result
    } catch (error) {
      await timer.stop()
      
      await monitoring.recordMetric({
        name: `${metricName}_errors`,
        value: 1,
        unit: 'count',
        tags: { ...tags, error: (error as Error).name }
      })
      
      throw error
    }
  }) as T
}