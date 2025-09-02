// Circuit Breaker Pattern for Notification System Protection
// Part of Phase 3.2 - External Integration Layer

import { CircuitBreakerConfig, CircuitBreakerState } from '../../../types/enhanced-notifications'

export class NotificationCircuitBreaker {
  private config: CircuitBreakerConfig
  private state: CircuitBreakerState
  private stats: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    lastExecutionTime: Date | null
  }

  constructor(config: CircuitBreakerConfig) {
    this.config = config
    this.state = {
      state: 'CLOSED',
      failureCount: 0
    }
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastExecutionTime: null
    }
  }

  // Execute a function with circuit breaker protection
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'HALF_OPEN'
        console.log('Circuit breaker transitioning to HALF_OPEN state')
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable')
      }
    }

    try {
      this.stats.totalRequests++
      this.stats.lastExecutionTime = new Date()

      const result = await this.executeWithTimeout(fn)
      
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  // Execute function with timeout protection
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutMs = 5000 // 5 second timeout

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Circuit breaker timeout'))
      }, timeoutMs)

      fn()
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  // Handle successful execution
  private onSuccess(): void {
    this.stats.successfulRequests++

    if (this.state.state === 'HALF_OPEN') {
      // Reset to closed state after successful execution
      this.reset()
      console.log('Circuit breaker reset to CLOSED state after successful execution')
    } else if (this.state.state === 'CLOSED') {
      // Gradually reduce failure count on successful requests
      this.state.failureCount = Math.max(0, this.state.failureCount - 1)
    }
  }

  // Handle failed execution
  private onFailure(): void {
    this.stats.failedRequests++
    this.state.failureCount++
    this.state.lastFailureTime = new Date()

    if (this.state.state === 'HALF_OPEN') {
      // Return to open state if we fail during half-open
      this.state.state = 'OPEN'
      this.state.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs)
      console.log('Circuit breaker returning to OPEN state after failure during HALF_OPEN')
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      // Trip the circuit breaker
      this.state.state = 'OPEN'
      this.state.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs)
      console.log(`Circuit breaker tripped to OPEN state after ${this.state.failureCount} failures`)
    }
  }

  // Check if we should attempt to reset the circuit breaker
  private shouldAttemptReset(): boolean {
    if (!this.state.nextAttemptTime) {
      return false
    }

    return Date.now() >= this.state.nextAttemptTime.getTime()
  }

  // Reset the circuit breaker to closed state
  private reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0
    }
  }

  // Manually reset the circuit breaker (admin function)
  forceReset(): void {
    this.reset()
    console.log('Circuit breaker manually reset to CLOSED state')
  }

  // Get current circuit breaker state
  getState(): CircuitBreakerState {
    return { ...this.state }
  }

  // Get circuit breaker statistics
  getStats(): {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    successRate: number
    failureRate: number
    lastExecutionTime: Date | null
  } {
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
      : 0

    const failureRate = this.stats.totalRequests > 0
      ? (this.stats.failedRequests / this.stats.totalRequests) * 100
      : 0

    return {
      ...this.stats,
      successRate,
      failureRate
    }
  }

  // Check if circuit breaker is healthy
  isHealthy(): boolean {
    return this.state.state === 'CLOSED'
  }

  // Get time until next attempt (for OPEN state)
  getTimeUntilNextAttempt(): number {
    if (this.state.state !== 'OPEN' || !this.state.nextAttemptTime) {
      return 0
    }

    return Math.max(0, this.state.nextAttemptTime.getTime() - Date.now())
  }

  // Update circuit breaker configuration
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Get current configuration
  getConfig(): CircuitBreakerConfig {
    return { ...this.config }
  }

  // Comprehensive health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    state: string
    failureRate: number
    timeUntilReset: number
    recommendedAction: string
  }> {
    const stats = this.getStats()
    const timeUntilReset = this.getTimeUntilNextAttempt()

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let recommendedAction = 'No action required'

    if (this.state.state === 'OPEN') {
      status = 'unhealthy'
      recommendedAction = `Service is unavailable. Will retry in ${Math.ceil(timeUntilReset / 1000)}s`
    } else if (this.state.state === 'HALF_OPEN') {
      status = 'degraded'
      recommendedAction = 'Service is recovering - monitoring next requests'
    } else if (stats.failureRate > 20) {
      status = 'degraded'
      recommendedAction = 'High failure rate detected - monitor closely'
    }

    return {
      status,
      state: this.state.state,
      failureRate: stats.failureRate,
      timeUntilReset,
      recommendedAction
    }
  }

  // Monitor circuit breaker over time (background task)
  startMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      const stats = this.getStats()
      const health = this.isHealthy()

      console.log(`Circuit Breaker Status - State: ${this.state.state}, ` +
        `Success Rate: ${stats.successRate.toFixed(1)}%, ` +
        `Failures: ${this.state.failureCount}/${this.config.failureThreshold}`)

      // Auto-reset stale failure counts if service is healthy for extended period
      if (health && this.state.failureCount > 0 && this.stats.lastExecutionTime) {
        const timeSinceLastExecution = Date.now() - this.stats.lastExecutionTime.getTime()
        
        // Reset failure count if healthy for 10 minutes
        if (timeSinceLastExecution > 600000) {
          this.state.failureCount = Math.max(0, Math.floor(this.state.failureCount * 0.9))
          console.log(`Auto-reducing failure count to ${this.state.failureCount} due to extended healthy period`)
        }
      }
    }, intervalMs)
  }

  // Export metrics for external monitoring systems
  exportMetrics(): {
    timestamp: number
    state: string
    failureCount: number
    totalRequests: number
    successRate: number
    failureRate: number
    isHealthy: boolean
  } {
    const stats = this.getStats()

    return {
      timestamp: Date.now(),
      state: this.state.state,
      failureCount: this.state.failureCount,
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
      failureRate: stats.failureRate,
      isHealthy: this.isHealthy()
    }
  }
}