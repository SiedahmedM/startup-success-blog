import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'
import { RateLimitError } from './error-handler'

export class RateLimiterManager {
  private limiters: Map<string, RateLimiterMemory> = new Map()
  private defaultOptions = {
    points: 100,
    duration: 60,
    blockDuration: 60,
    execEvenly: false,
  }

  constructor() {
    this.setupDefaultLimiters()
  }

  private setupDefaultLimiters(): void {
    this.limiters.set('api', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 100,
      duration: 60,
    }))

    this.limiters.set('data_collection', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 20,
      duration: 60,
    }))

    this.limiters.set('web_scraping', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 10,
      duration: 60,
      blockDuration: 300,
    }))

    this.limiters.set('ai_processing', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 50,
      duration: 60,
    }))

    this.limiters.set('product_hunt', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 100,
      duration: 3600,
    }))

    this.limiters.set('github', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 5000,
      duration: 3600,
    }))

    this.limiters.set('openai', new RateLimiterMemory({
      ...this.defaultOptions,
      points: 3000,
      duration: 60,
    }))
  }

  async checkLimit(key: string, identifier: string): Promise<void> {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      throw new Error(`Rate limiter '${key}' not found`)
    }

    try {
      await limiter.consume(identifier)
    } catch (rejRes: any) {
      const remainingTime = Math.round(rejRes.msBeforeNext / 1000)
      throw new RateLimitError(
        `Rate limit exceeded for ${key}. Try again in ${remainingTime} seconds.`,
        remainingTime
      )
    }
  }

  async getRemainingPoints(key: string, identifier: string): Promise<number> {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      return 0
    }

    try {
      const result = await limiter.get(identifier)
      return result ? result.remainingPoints : this.defaultOptions.points
    } catch {
      return 0
    }
  }

  createMiddleware(key: string) {
    return async (identifier: string) => {
      await this.checkLimit(key, identifier)
    }
  }

  async waitForAvailability(key: string, identifier: string): Promise<void> {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      throw new Error(`Rate limiter '${key}' not found`)
    }

    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        await limiter.consume(identifier)
        return
      } catch (rejRes: any) {
        attempts++
        const waitTime = Math.min(rejRes.msBeforeNext, 30000)
        
        if (attempts >= maxAttempts) {
          throw new RateLimitError(
            `Max retry attempts reached for ${key}`,
            Math.round(waitTime / 1000)
          )
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  async penalty(key: string, identifier: string, points: number = 1): Promise<void> {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      return
    }

    try {
      await limiter.penalty(identifier, points)
    } catch (error) {
      console.warn(`Failed to apply penalty for ${key}:`, error)
    }
  }

  async reward(key: string, identifier: string, points: number = 1): Promise<void> {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      return
    }

    try {
      await limiter.reward(identifier, points)
    } catch (error) {
      console.warn(`Failed to apply reward for ${key}:`, error)
    }
  }

  getStats(key: string): { points: number; duration: number; blockDuration: number } | null {
    const limiter = this.limiters.get(key)
    
    if (!limiter) {
      return null
    }

    return {
      points: (limiter as any).points,
      duration: (limiter as any).duration,
      blockDuration: (limiter as any).blockDuration,
    }
  }
}

export const rateLimiter = new RateLimiterManager()

export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiterKey: string,
  getIdentifier: (...args: Parameters<T>) => string = () => 'default'
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = getIdentifier(...args)
    await rateLimiter.checkLimit(limiterKey, identifier)
    return fn(...args)
  }) as T
}

export class AdaptiveRateLimiter {
  private successCount = 0
  private errorCount = 0
  private currentDelay = 1000
  private minDelay = 500
  private maxDelay = 30000
  private adjustmentFactor = 0.1

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, this.currentDelay))
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onError()
      throw error
    }
  }

  private onSuccess(): void {
    this.successCount++
    this.errorCount = Math.max(0, this.errorCount - 1)
    
    if (this.successCount >= 5 && this.errorCount === 0) {
      this.currentDelay = Math.max(
        this.minDelay,
        this.currentDelay * (1 - this.adjustmentFactor)
      )
      this.successCount = 0
    }
  }

  private onError(): void {
    this.errorCount++
    this.successCount = 0
    
    this.currentDelay = Math.min(
      this.maxDelay,
      this.currentDelay * (1 + this.adjustmentFactor * 2)
    )
  }

  getCurrentDelay(): number {
    return this.currentDelay
  }

  reset(): void {
    this.successCount = 0
    this.errorCount = 0
    this.currentDelay = 1000
  }
}

export function createApiLimiter(
  requestsPerMinute: number = 60,
  burstAllowance: number = 10
) {
  return new RateLimiterMemory({
    points: requestsPerMinute + burstAllowance,
    duration: 60,
    blockDuration: 60,
    execEvenly: true,
  })
}

export async function delayBetweenRequests(
  lastRequestTime: number,
  minDelay: number = 1000
): Promise<void> {
  const timeSinceLastRequest = Date.now() - lastRequestTime
  const delayNeeded = Math.max(0, minDelay - timeSinceLastRequest)
  
  if (delayNeeded > 0) {
    await new Promise(resolve => setTimeout(resolve, delayNeeded))
  }
}