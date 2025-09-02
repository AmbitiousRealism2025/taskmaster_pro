// Comprehensive Metrics and Monitoring for Notification System
// Part of Phase 3.2 - External Integration Layer

import { EnhancedRedisClient } from '../../redis/enhanced-client'
import { NotificationMetrics } from '../../../types/enhanced-notifications'

export class NotificationMetricsCollector {
  private redis: EnhancedRedisClient
  private metricsBuffer: Array<{
    timestamp: number
    type: string
    success: boolean
    latency: number
    batchSize?: number
  }> = []
  private readonly BUFFER_SIZE = 1000

  constructor(redisClient: EnhancedRedisClient) {
    this.redis = redisClient
    this.startMetricsAggregation()
  }

  // Record a notification delivery attempt
  async recordDelivery(
    type: string,
    success: boolean,
    latency: number,
    batchSize: number = 1
  ): Promise<void> {
    const timestamp = Date.now()
    
    // Add to buffer
    this.metricsBuffer.push({
      timestamp,
      type,
      success,
      latency,
      batchSize
    })

    // Flush buffer if it's getting full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetricsBuffer()
    }

    // Update real-time counters
    await this.updateRealtimeCounters(type, success, latency)
  }

  // Update real-time counters in Redis
  private async updateRealtimeCounters(
    type: string,
    success: boolean,
    latency: number
  ): Promise<void> {
    const hour = Math.floor(Date.now() / (60 * 60 * 1000))
    const minute = Math.floor(Date.now() / (60 * 1000))

    const promises = [
      // Hourly counters
      this.redis.incrBy(`metrics:hour:${hour}:total`, 1),
      this.redis.incrBy(`metrics:hour:${hour}:${success ? 'success' : 'failed'}`, 1),
      this.redis.incrBy(`metrics:hour:${hour}:type:${type}`, 1),
      
      // Minute counters for recent data
      this.redis.incrBy(`metrics:minute:${minute}:total`, 1),
      this.redis.incrBy(`metrics:minute:${minute}:${success ? 'success' : 'failed'}`, 1),
      
      // Latency tracking
      this.redis.zadd(`metrics:latency:recent`, Date.now(), latency.toString())
    ]

    // Set TTL on minute counters (keep for 2 hours)
    promises.push(this.redis.expire(`metrics:minute:${minute}:total`, 7200))
    promises.push(this.redis.expire(`metrics:minute:${minute}:${success ? 'success' : 'failed'}`, 7200))

    await Promise.all(promises)
  }

  // Flush metrics buffer to persistent storage
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    try {
      // Group metrics by hour for batch processing
      const metricsByHour = new Map<number, typeof this.metricsBuffer>()
      
      for (const metric of this.metricsBuffer) {
        const hour = Math.floor(metric.timestamp / (60 * 60 * 1000))
        if (!metricsByHour.has(hour)) {
          metricsByHour.set(hour, [])
        }
        metricsByHour.get(hour)!.push(metric)
      }

      // Process each hour's metrics
      for (const [hour, metrics] of metricsByHour) {
        await this.processHourlyMetrics(hour, metrics)
      }

      // Clear the buffer
      this.metricsBuffer = []
    } catch (error) {
      console.error('Failed to flush metrics buffer:', error)
    }
  }

  // Process hourly metrics aggregation
  private async processHourlyMetrics(
    hour: number,
    metrics: Array<{
      timestamp: number
      type: string
      success: boolean
      latency: number
      batchSize?: number
    }>
  ): Promise<void> {
    const aggregated = {
      total: metrics.length,
      successful: metrics.filter(m => m.success).length,
      failed: metrics.filter(m => !m.success).length,
      averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length,
      totalBatchSize: metrics.reduce((sum, m) => sum + (m.batchSize || 1), 0),
      typeBreakdown: {} as Record<string, number>
    }

    // Calculate type breakdown
    for (const metric of metrics) {
      aggregated.typeBreakdown[metric.type] = (aggregated.typeBreakdown[metric.type] || 0) + 1
    }

    // Store aggregated metrics
    const promises = [
      this.redis.hset(`metrics:hourly:${hour}`, 'total', aggregated.total.toString()),
      this.redis.hset(`metrics:hourly:${hour}`, 'successful', aggregated.successful.toString()),
      this.redis.hset(`metrics:hourly:${hour}`, 'failed', aggregated.failed.toString()),
      this.redis.hset(`metrics:hourly:${hour}`, 'averageLatency', aggregated.averageLatency.toFixed(2)),
      this.redis.hset(`metrics:hourly:${hour}`, 'totalBatchSize', aggregated.totalBatchSize.toString()),
      this.redis.hset(`metrics:hourly:${hour}`, 'typeBreakdown', JSON.stringify(aggregated.typeBreakdown)),
      
      // Set TTL to keep hourly data for 30 days
      this.redis.expire(`metrics:hourly:${hour}`, 30 * 24 * 60 * 60)
    ]

    await Promise.all(promises)
  }

  // Get comprehensive metrics for a time period
  async getMetrics(periodHours: number = 24): Promise<NotificationMetrics> {
    const now = Date.now()
    const startTime = now - (periodHours * 60 * 60 * 1000)
    const startHour = Math.floor(startTime / (60 * 60 * 1000))
    const endHour = Math.floor(now / (60 * 60 * 1000))

    const hourlyData: Array<{
      total: number
      successful: number
      failed: number
      averageLatency: number
      totalBatchSize: number
    }> = []

    // Collect data for each hour in the period
    for (let hour = startHour; hour <= endHour; hour++) {
      const data = await this.redis.hgetall(`metrics:hourly:${hour}`)
      
      if (Object.keys(data).length > 0) {
        hourlyData.push({
          total: parseInt(data.total) || 0,
          successful: parseInt(data.successful) || 0,
          failed: parseInt(data.failed) || 0,
          averageLatency: parseFloat(data.averageLatency) || 0,
          totalBatchSize: parseInt(data.totalBatchSize) || 0
        })
      }
    }

    // Aggregate the data
    const totals = hourlyData.reduce(
      (acc, hour) => ({
        total: acc.total + hour.total,
        successful: acc.successful + hour.successful,
        failed: acc.failed + hour.failed,
        totalLatency: acc.totalLatency + (hour.averageLatency * hour.total),
        totalBatchSize: acc.totalBatchSize + hour.totalBatchSize
      }),
      { total: 0, successful: 0, failed: 0, totalLatency: 0, totalBatchSize: 0 }
    )

    // Calculate rates and averages
    const deliveryRate = totals.total > 0 ? (totals.successful / totals.total) * 100 : 100
    const errorRate = totals.total > 0 ? (totals.failed / totals.total) * 100 : 0
    const averageLatency = totals.total > 0 ? totals.totalLatency / totals.total : 0
    const throughput = periodHours > 0 ? totals.total / periodHours : 0
    const batchEfficiency = totals.total > 0 ? (totals.totalBatchSize / totals.total) : 1

    // Get current queue depth
    const queueDepth = await this.getQueueDepth()
    
    // Get memory usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024

    return {
      deliveryRate,
      errorRate,
      averageLatency,
      throughput,
      batchEfficiency,
      queueDepth,
      memoryUsage,
      cpuUsage: await this.getCpuUsage()
    }
  }

  // Get current queue depth across all queues
  private async getQueueDepth(): Promise<number> {
    const queueSizes = await Promise.all([
      this.redis.zcard('notifications:global'),
      this.redis.zcard('notifications:critical'),
      // Add user queues - in production you'd maintain a registry
    ])

    return queueSizes.reduce((sum, size) => sum + size, 0)
  }

  // Get CPU usage (simplified)
  private async getCpuUsage(): Promise<number> {
    // This is a simplified implementation
    // In production, you'd use a proper CPU monitoring library
    return Math.random() * 20 + 5 // Simulate 5-25% CPU usage
  }

  // Get queue health information
  async getQueueHealth(): Promise<{
    queueSize: number
    oldestItemAge: number
    averageProcessingTime: number
    backlog: number
    throughput: number
  }> {
    const globalQueueSize = await this.redis.zcard('notifications:global')
    const oldestItems = await this.redis.zrange('notifications:global', 0, 0, { WITHSCORES: true })
    
    const oldestItemAge = oldestItems.length > 0 
      ? Date.now() - parseInt(oldestItems[1])
      : 0

    // Get recent processing metrics
    const recentMetrics = await this.getMetrics(1) // Last hour

    return {
      queueSize: globalQueueSize,
      oldestItemAge,
      averageProcessingTime: recentMetrics.averageLatency,
      backlog: Math.max(0, globalQueueSize - 100), // Anything over 100 is considered backlog
      throughput: recentMetrics.throughput
    }
  }

  // Get top notification types by volume
  async getTopNotificationTypes(hours: number = 24): Promise<Array<{
    type: string
    count: number
    percentage: number
  }>> {
    const startHour = Math.floor((Date.now() - hours * 60 * 60 * 1000) / (60 * 60 * 1000))
    const endHour = Math.floor(Date.now() / (60 * 60 * 1000))

    const typeBreakdowns = new Map<string, number>()

    for (let hour = startHour; hour <= endHour; hour++) {
      const data = await this.redis.hget(`metrics:hourly:${hour}`, 'typeBreakdown')
      
      if (data) {
        try {
          const breakdown = JSON.parse(data) as Record<string, number>
          
          for (const [type, count] of Object.entries(breakdown)) {
            typeBreakdowns.set(type, (typeBreakdowns.get(type) || 0) + count)
          }
        } catch (error) {
          console.error('Failed to parse type breakdown:', error)
        }
      }
    }

    const totalCount = Array.from(typeBreakdowns.values()).reduce((sum, count) => sum + count, 0)
    
    return Array.from(typeBreakdowns.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 types
  }

  // Start background metrics aggregation
  private startMetricsAggregation(): void {
    // Flush buffer every 30 seconds
    setInterval(async () => {
      await this.flushMetricsBuffer()
    }, 30000)

    // Clean up old latency data every hour
    setInterval(async () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      await this.redis.zrangeByScore('metrics:latency:recent', 0, oneHourAgo)
    }, 60 * 60 * 1000)

    console.log('Notification metrics collector initialized')
  }

  // Export metrics for external monitoring systems (Prometheus, etc.)
  async exportMetricsForPrometheus(): Promise<string> {
    const metrics = await this.getMetrics(1) // Last hour
    const queueHealth = await this.getQueueHealth()
    
    return `
# HELP notification_delivery_rate Percentage of successful notification deliveries
# TYPE notification_delivery_rate gauge
notification_delivery_rate ${metrics.deliveryRate}

# HELP notification_error_rate Percentage of failed notification deliveries
# TYPE notification_error_rate gauge
notification_error_rate ${metrics.errorRate}

# HELP notification_average_latency Average notification processing latency in milliseconds
# TYPE notification_average_latency gauge
notification_average_latency ${metrics.averageLatency}

# HELP notification_throughput Notifications processed per hour
# TYPE notification_throughput gauge
notification_throughput ${metrics.throughput}

# HELP notification_queue_depth Current number of queued notifications
# TYPE notification_queue_depth gauge
notification_queue_depth ${queueHealth.queueSize}

# HELP notification_memory_usage Memory usage in MB
# TYPE notification_memory_usage gauge
notification_memory_usage ${metrics.memoryUsage}
`.trim()
  }

  // Get performance insights and recommendations
  async getPerformanceInsights(): Promise<Array<{
    level: 'info' | 'warning' | 'critical'
    message: string
    recommendation: string
  }>> {
    const metrics = await this.getMetrics(24)
    const queueHealth = await this.getQueueHealth()
    const insights: Array<{ level: 'info' | 'warning' | 'critical'; message: string; recommendation: string }> = []

    // Delivery rate insights
    if (metrics.deliveryRate < 95) {
      insights.push({
        level: 'critical',
        message: `Low delivery rate: ${metrics.deliveryRate.toFixed(1)}%`,
        recommendation: 'Check external service connectivity and error logs'
      })
    } else if (metrics.deliveryRate < 98) {
      insights.push({
        level: 'warning',
        message: `Delivery rate could be improved: ${metrics.deliveryRate.toFixed(1)}%`,
        recommendation: 'Monitor error patterns and consider retry logic improvements'
      })
    }

    // Latency insights
    if (metrics.averageLatency > 1000) {
      insights.push({
        level: 'critical',
        message: `High average latency: ${metrics.averageLatency.toFixed(0)}ms`,
        recommendation: 'Optimize notification processing or increase batch sizes'
      })
    } else if (metrics.averageLatency > 500) {
      insights.push({
        level: 'warning',
        message: `Elevated latency: ${metrics.averageLatency.toFixed(0)}ms`,
        recommendation: 'Consider performance optimizations'
      })
    }

    // Queue depth insights
    if (queueHealth.queueSize > 1000) {
      insights.push({
        level: 'critical',
        message: `Large queue backlog: ${queueHealth.queueSize} notifications`,
        recommendation: 'Increase processing capacity or review batch processing settings'
      })
    } else if (queueHealth.queueSize > 500) {
      insights.push({
        level: 'warning',
        message: `Queue building up: ${queueHealth.queueSize} notifications`,
        recommendation: 'Monitor processing rate and consider scaling'
      })
    }

    // Batch efficiency insights
    if (metrics.batchEfficiency < 2) {
      insights.push({
        level: 'warning',
        message: `Low batch efficiency: ${metrics.batchEfficiency.toFixed(1)} notifications per batch`,
        recommendation: 'Review batching configuration to improve efficiency'
      })
    }

    // Memory usage insights
    if (metrics.memoryUsage > 200) {
      insights.push({
        level: 'critical',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(0)}MB`,
        recommendation: 'Trigger memory optimization or restart service'
      })
    }

    return insights
  }
}