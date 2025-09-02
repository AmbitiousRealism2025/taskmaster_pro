/**
 * Load Testing & Capacity Planning
 * Enterprise-scale performance testing and system capacity analysis
 */

import { performance } from 'perf_hooks'
import { EventEmitter } from 'events'

export interface LoadTestConfig {
  maxUsers: number
  rampUpTime: number // seconds
  testDuration: number // seconds
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  concurrent: boolean
  thinkTime: number // milliseconds between requests
}

export interface LoadTestMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  throughput: number // requests per second
  errorRate: number
  percentiles: {
    p50: number
    p90: number
    p95: number
    p99: number
  }
  concurrentUsers: number
  memoryUsage: number
  cpuUsage: number
}

export interface CapacityPlan {
  currentCapacity: number
  recommendedCapacity: number
  scalingFactor: number
  bottlenecks: string[]
  recommendations: string[]
  costEstimate?: number
}

export interface TestScenario {
  name: string
  description: string
  config: LoadTestConfig
  expectedThroughput: number
  acceptanceThreshold: {
    maxResponseTime: number
    minThroughput: number
    maxErrorRate: number
  }
}

export class LoadTestRunner extends EventEmitter {
  private activeUsers = 0
  private metrics: LoadTestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Number.MAX_VALUE,
    maxResponseTime: 0,
    throughput: 0,
    errorRate: 0,
    percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
    concurrentUsers: 0,
    memoryUsage: 0,
    cpuUsage: 0
  }
  private responseTimes: number[] = []
  private startTime = 0
  private endTime = 0

  constructor(private config: LoadTestConfig) {
    super()
  }

  /**
   * Execute load test scenario
   */
  async run(): Promise<LoadTestMetrics> {
    console.log(`🚀 Starting load test: ${this.config.maxUsers} users, ${this.config.testDuration}s duration`)
    
    this.startTime = performance.now()
    this.resetMetrics()

    // Start resource monitoring
    const resourceMonitor = this.startResourceMonitoring()

    try {
      if (this.config.concurrent) {
        await this.runConcurrentTest()
      } else {
        await this.runRampUpTest()
      }
    } catch (error) {
      console.error('Load test error:', error)
    } finally {
      clearInterval(resourceMonitor)
      this.endTime = performance.now()
      this.calculateFinalMetrics()
    }

    console.log(`✅ Load test completed: ${this.metrics.totalRequests} requests, ${this.metrics.throughput.toFixed(2)} RPS`)
    
    return this.metrics
  }

  /**
   * Run concurrent load test (all users start simultaneously)
   */
  private async runConcurrentTest(): Promise<void> {
    const userPromises: Promise<void>[] = []

    // Start all users concurrently
    for (let i = 0; i < this.config.maxUsers; i++) {
      userPromises.push(this.simulateUser(i))
    }

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration * 1000))

    // Wait for all users to complete
    await Promise.allSettled(userPromises)
  }

  /**
   * Run ramp-up test (gradually increase users)
   */
  private async runRampUpTest(): Promise<void> {
    const rampUpInterval = (this.config.rampUpTime * 1000) / this.config.maxUsers
    const userPromises: Promise<void>[] = []

    // Gradually ramp up users
    for (let i = 0; i < this.config.maxUsers; i++) {
      userPromises.push(this.simulateUser(i))
      
      if (i < this.config.maxUsers - 1) {
        await new Promise(resolve => setTimeout(resolve, rampUpInterval))
      }
    }

    // Wait for test duration after ramp-up
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration * 1000))

    // Wait for all users to complete
    await Promise.allSettled(userPromises)
  }

  /**
   * Simulate individual user behavior
   */
  private async simulateUser(userId: number): Promise<void> {
    this.activeUsers++
    this.emit('userStarted', { userId, activeUsers: this.activeUsers })

    const endTime = Date.now() + (this.config.testDuration * 1000)

    while (Date.now() < endTime) {
      try {
        const responseTime = await this.makeRequest()
        this.recordResponse(responseTime, true)
        
        // Think time between requests
        if (this.config.thinkTime > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.thinkTime))
        }
      } catch (error) {
        this.recordResponse(0, false)
      }
    }

    this.activeUsers--
    this.emit('userFinished', { userId, activeUsers: this.activeUsers })
  }

  /**
   * Make HTTP request and measure response time
   */
  private async makeRequest(): Promise<number> {
    const startTime = performance.now()

    const response = await fetch(this.config.endpoint, {
      method: this.config.method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: this.config.body ? JSON.stringify(this.config.body) : undefined
    })

    const endTime = performance.now()
    const responseTime = endTime - startTime

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return responseTime
  }

  /**
   * Record response metrics
   */
  private recordResponse(responseTime: number, success: boolean): void {
    this.metrics.totalRequests++

    if (success) {
      this.metrics.successfulRequests++
      this.responseTimes.push(responseTime)
      
      // Update min/max response times
      this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime)
      this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime)
    } else {
      this.metrics.failedRequests++
    }

    // Update concurrent users metric
    this.metrics.concurrentUsers = Math.max(this.metrics.concurrentUsers, this.activeUsers)

    // Emit real-time metrics
    this.emit('metrics', this.getCurrentMetrics())
  }

  /**
   * Start resource monitoring (CPU, memory)
   */
  private startResourceMonitoring(): NodeJS.Timeout {
    return setInterval(() => {
      // Update memory usage
      const memUsage = process.memoryUsage()
      this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024 // MB

      // CPU usage would require external library or system calls
      // For now, we'll simulate or use approximation
      this.metrics.cpuUsage = this.estimateCpuUsage()
    }, 5000) // Every 5 seconds
  }

  /**
   * Estimate CPU usage based on request rate
   */
  private estimateCpuUsage(): number {
    const currentThroughput = this.getCurrentThroughput()
    // Simple heuristic: higher throughput = higher CPU usage
    return Math.min(currentThroughput * 0.1, 100) // Cap at 100%
  }

  /**
   * Get current throughput (requests per second)
   */
  private getCurrentThroughput(): number {
    const currentTime = performance.now()
    const elapsedSeconds = (currentTime - this.startTime) / 1000
    return elapsedSeconds > 0 ? this.metrics.totalRequests / elapsedSeconds : 0
  }

  /**
   * Get current metrics snapshot
   */
  private getCurrentMetrics(): Partial<LoadTestMetrics> {
    const elapsedTime = (performance.now() - this.startTime) / 1000
    const throughput = elapsedTime > 0 ? this.metrics.totalRequests / elapsedTime : 0
    const errorRate = this.metrics.totalRequests > 0 ? this.metrics.failedRequests / this.metrics.totalRequests : 0

    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      throughput,
      errorRate,
      concurrentUsers: this.activeUsers,
      memoryUsage: this.metrics.memoryUsage,
      cpuUsage: this.metrics.cpuUsage
    }
  }

  /**
   * Calculate final metrics including percentiles
   */
  private calculateFinalMetrics(): void {
    const elapsedTime = (this.endTime - this.startTime) / 1000

    // Calculate throughput
    this.metrics.throughput = elapsedTime > 0 ? this.metrics.totalRequests / elapsedTime : 0

    // Calculate error rate
    this.metrics.errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0

    // Calculate average response time
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length

      // Calculate percentiles
      const sorted = [...this.responseTimes].sort((a, b) => a - b)
      this.metrics.percentiles = {
        p50: this.getPercentile(sorted, 50),
        p90: this.getPercentile(sorted, 90),
        p95: this.getPercentile(sorted, 95),
        p99: this.getPercentile(sorted, 99)
      }
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)] || 0
  }

  /**
   * Reset metrics for new test
   */
  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Number.MAX_VALUE,
      maxResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
      concurrentUsers: 0,
      memoryUsage: 0,
      cpuUsage: 0
    }
    this.responseTimes = []
    this.activeUsers = 0
  }
}

export class CapacityPlanner {
  private static readonly SAFETY_MARGIN = 0.8 // 80% of max capacity

  /**
   * Analyze capacity requirements based on load test results
   */
  static analyzeCapacity(
    testResults: LoadTestMetrics[], 
    targetUsers: number,
    targetThroughput: number
  ): CapacityPlan {
    const maxThroughputResult = testResults.reduce((max, result) => 
      result.throughput > max.throughput ? result : max
    )

    const currentCapacity = maxThroughputResult.throughput
    const scalingFactor = targetThroughput / currentCapacity
    const recommendedCapacity = Math.ceil(targetThroughput / this.SAFETY_MARGIN)

    const bottlenecks = this.identifyBottlenecks(testResults)
    const recommendations = this.generateRecommendations(testResults, scalingFactor)

    return {
      currentCapacity,
      recommendedCapacity,
      scalingFactor,
      bottlenecks,
      recommendations
    }
  }

  /**
   * Identify system bottlenecks from test results
   */
  private static identifyBottlenecks(results: LoadTestMetrics[]): string[] {
    const bottlenecks: string[] = []

    // High response times indicate processing bottlenecks
    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length
    if (avgResponseTime > 1000) { // > 1 second
      bottlenecks.push('High response times indicate server processing bottleneck')
    }

    // High error rates indicate capacity limits
    const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length
    if (avgErrorRate > 0.05) { // > 5% error rate
      bottlenecks.push('High error rates indicate system capacity limits')
    }

    // Memory usage concerns
    const maxMemoryUsage = Math.max(...results.map(r => r.memoryUsage))
    if (maxMemoryUsage > 1000) { // > 1GB
      bottlenecks.push('High memory usage may limit concurrent user capacity')
    }

    // CPU usage concerns
    const maxCpuUsage = Math.max(...results.map(r => r.cpuUsage))
    if (maxCpuUsage > 80) { // > 80%
      bottlenecks.push('High CPU usage indicates processing power limitations')
    }

    return bottlenecks
  }

  /**
   * Generate scaling recommendations
   */
  private static generateRecommendations(results: LoadTestMetrics[], scalingFactor: number): string[] {
    const recommendations: string[] = []

    if (scalingFactor > 2) {
      recommendations.push('Consider horizontal scaling (multiple server instances)')
      recommendations.push('Implement load balancing to distribute traffic')
    }

    if (scalingFactor > 1.5) {
      recommendations.push('Optimize database queries and add appropriate indexes')
      recommendations.push('Implement caching layer for frequently accessed data')
    }

    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length
    if (avgResponseTime > 500) {
      recommendations.push('Optimize API response times through code profiling')
      recommendations.push('Consider CDN implementation for static content')
    }

    const maxMemoryUsage = Math.max(...results.map(r => r.memoryUsage))
    if (maxMemoryUsage > 500) {
      recommendations.push('Optimize memory usage and implement garbage collection tuning')
    }

    return recommendations
  }

  /**
   * Estimate infrastructure costs based on capacity requirements
   */
  static estimateCosts(capacityPlan: CapacityPlan, region: string = 'us-east-1'): number {
    // Simplified cost estimation (would integrate with cloud pricing APIs in production)
    const baseServerCost = 100 // $100/month per server
    const serversNeeded = Math.ceil(capacityPlan.scalingFactor)
    const loadBalancerCost = serversNeeded > 1 ? 25 : 0 // $25/month for load balancer
    const databaseScalingCost = capacityPlan.scalingFactor > 1.5 ? 50 : 0 // $50/month for database scaling
    
    return (serversNeeded * baseServerCost) + loadBalancerCost + databaseScalingCost
  }
}

// Predefined test scenarios for TaskMaster Pro
export const TestScenarios: TestScenario[] = [
  {
    name: 'User Authentication Load',
    description: 'Test authentication endpoint under high load',
    config: {
      maxUsers: 100,
      rampUpTime: 30,
      testDuration: 300, // 5 minutes
      endpoint: '/api/auth/signin',
      method: 'POST',
      concurrent: false,
      thinkTime: 2000,
      body: { email: 'test@example.com', password: 'testpassword' }
    },
    expectedThroughput: 20,
    acceptanceThreshold: {
      maxResponseTime: 2000,
      minThroughput: 15,
      maxErrorRate: 0.02
    }
  },
  {
    name: 'Task Management Operations',
    description: 'Test task CRUD operations under load',
    config: {
      maxUsers: 200,
      rampUpTime: 60,
      testDuration: 600, // 10 minutes
      endpoint: '/api/tasks',
      method: 'GET',
      concurrent: false,
      thinkTime: 1000,
      headers: { 'Authorization': 'Bearer test-token' }
    },
    expectedThroughput: 50,
    acceptanceThreshold: {
      maxResponseTime: 1000,
      minThroughput: 40,
      maxErrorRate: 0.01
    }
  },
  {
    name: 'Analytics Dashboard Load',
    description: 'Test analytics endpoints with heavy data processing',
    config: {
      maxUsers: 50,
      rampUpTime: 30,
      testDuration: 300,
      endpoint: '/api/analytics/productivity',
      method: 'GET',
      concurrent: false,
      thinkTime: 5000,
      headers: { 'Authorization': 'Bearer test-token' }
    },
    expectedThroughput: 10,
    acceptanceThreshold: {
      maxResponseTime: 5000,
      minThroughput: 8,
      maxErrorRate: 0.03
    }
  },
  {
    name: 'Real-time Connections',
    description: 'Test WebSocket connection capacity',
    config: {
      maxUsers: 1000,
      rampUpTime: 120,
      testDuration: 900, // 15 minutes
      endpoint: '/api/realtime/connect',
      method: 'GET',
      concurrent: true,
      thinkTime: 10000
    },
    expectedThroughput: 100,
    acceptanceThreshold: {
      maxResponseTime: 3000,
      minThroughput: 80,
      maxErrorRate: 0.05
    }
  }
]

// Utility function to run comprehensive capacity analysis
export async function runCapacityAnalysis(scenarios: TestScenario[] = TestScenarios): Promise<{
  results: LoadTestMetrics[]
  capacityPlan: CapacityPlan
  estimatedCost: number
}> {
  const results: LoadTestMetrics[] = []

  console.log('🎯 Starting comprehensive capacity analysis...')

  // Run all test scenarios
  for (const scenario of scenarios) {
    console.log(`\n📊 Running scenario: ${scenario.name}`)
    const runner = new LoadTestRunner(scenario.config)
    
    const result = await runner.run()
    results.push(result)

    // Check acceptance thresholds
    const passed = 
      result.averageResponseTime <= scenario.acceptanceThreshold.maxResponseTime &&
      result.throughput >= scenario.acceptanceThreshold.minThroughput &&
      result.errorRate <= scenario.acceptanceThreshold.maxErrorRate

    console.log(`${passed ? '✅' : '❌'} Scenario ${scenario.name}: ${passed ? 'PASSED' : 'FAILED'}`)
  }

  // Analyze capacity requirements
  const targetUsers = 10000 // Target for 10K concurrent users
  const targetThroughput = 500 // Target 500 RPS

  const capacityPlan = CapacityPlanner.analyzeCapacity(results, targetUsers, targetThroughput)
  const estimatedCost = CapacityPlanner.estimateCosts(capacityPlan)

  console.log('\n📈 Capacity Analysis Complete')
  console.log(`Current Capacity: ${capacityPlan.currentCapacity.toFixed(2)} RPS`)
  console.log(`Recommended Capacity: ${capacityPlan.recommendedCapacity.toFixed(2)} RPS`)
  console.log(`Scaling Factor: ${capacityPlan.scalingFactor.toFixed(2)}x`)
  console.log(`Estimated Monthly Cost: $${estimatedCost}`)

  return {
    results,
    capacityPlan,
    estimatedCost
  }
}