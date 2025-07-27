import { supabaseAdmin } from '@/lib/supabase/client'

export interface ErrorContext {
  operation: string
  component: string
  userId?: string
  metadata?: Record<string, any>
}

export class ErrorHandler {
  static async logError(
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      operation: context.operation,
      component: context.component,
      user_id: context.userId,
      metadata: context.metadata || {},
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error, context)
    }

    try {
      await supabaseAdmin
        .from('error_logs')
        .insert(errorData)
      
      if (errorData.severity === 'critical') {
        await this.notifyAdmins(errorData)
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    console.error(`[${context.component}:${context.operation}]`, error)
  }

  private static determineSeverity(
    error: Error,
    context: ErrorContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'critical'
    }

    if (context.operation.includes('payment') || context.operation.includes('auth')) {
      return 'high'
    }

    if (context.operation.includes('data_collection')) {
      return 'medium'
    }

    return 'low'
  }

  private static async notifyAdmins(errorData: any): Promise<void> {
    console.error('CRITICAL ERROR:', errorData)
  }

  static createErrorBoundary(
    operation: string,
    component: string,
    fallbackValue?: any
  ) {
    return async <T>(fn: () => Promise<T>): Promise<T | typeof fallbackValue> => {
      try {
        return await fn()
      } catch (error) {
        await this.logError(error as Error, { operation, component })
        
        if (fallbackValue !== undefined) {
          return fallbackValue
        }
        
        throw error
      }
    }
  }

  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    component: string,
    fallbackValue?: any
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args)
      } catch (error) {
        await this.logError(error as Error, {
          operation: fn.name || 'anonymous',
          component,
          metadata: { args: args.slice(0, 3) }
        })
        
        if (fallbackValue !== undefined) {
          return fallbackValue
        }
        
        throw error
      }
    }) as T
  }

  static handleApiError(error: any, operation: string): Response {
    const status = error.status || 500
    const message = error.message || 'Internal Server Error'
    
    this.logError(error, {
      operation,
      component: 'api',
      metadata: { status, url: error.url }
    })

    return new Response(JSON.stringify({ 
      error: message,
      operation,
      timestamp: new Date().toISOString()
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  component: string,
  fallbackValue?: any
): T {
  return ErrorHandler.wrapAsync(fn, component, fallbackValue)
}

export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  component: string = 'unknown'
): T {
  return (async (...args: Parameters<T>) => {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args)
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          await ErrorHandler.logError(lastError, {
            operation: fn.name || 'anonymous',
            component,
            metadata: { 
              attempt: attempt + 1,
              maxRetries,
              args: args.slice(0, 3)
            }
          })
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }) as T
}

export class ValidationError extends Error {
  public readonly field: string
  public readonly value: any

  constructor(message: string, field: string, value: any) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}

export class RateLimitError extends Error {
  public readonly retryAfter: number

  constructor(message: string, retryAfter: number = 60) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class DataSourceError extends Error {
  public readonly source: string
  public readonly statusCode?: number

  constructor(message: string, source: string, statusCode?: number) {
    super(message)
    this.name = 'DataSourceError'
    this.source = source
    this.statusCode = statusCode
  }
}