// Main Enhanced Notification Service
// Part of Phase 3.2 - External Integration Layer

import { createRedisClient, EnhancedRedisClient } from '../redis/enhanced-client'
import { NotificationQueue } from './queue/NotificationQueue'
import { NotificationRateLimiter } from './throttling/RateLimiter'
import { NotificationCircuitBreaker } from './circuit/CircuitBreaker'
import { NotificationMetricsCollector } from './monitoring/NotificationMetrics'
import { NotificationMemoryOptimizer } from './optimization/MemoryOptimizer'
import {
  PushNotificationPayload,
  NotificationQueueItem,
  NotificationBatch,
  EnhancedNotificationPreferences,
  SystemHealth,
  NotificationDeliveryResult
} from '../../types/enhanced-notifications'

export class EnhancedNotificationService {
  private queue: NotificationQueue
  private rateLimiter: NotificationRateLimiter
  private circuitBreaker: NotificationCircuitBreaker
  private metrics: NotificationMetricsCollector
  private redis: EnhancedRedisClient
  private isProcessing: boolean = false

  constructor() {
    // Initialize Redis client
    this.redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    })

    // Initialize queue with configuration
    this.queue = new NotificationQueue(this.redis, {
      batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '10'),
      maxBatchWaitMs: parseInt(process.env.NOTIFICATION_MAX_BATCH_WAIT || '30000'),
      maxQueueSize: parseInt(process.env.NOTIFICATION_MAX_QUEUE_SIZE || '10000')
    })

    // Initialize rate limiter
    this.rateLimiter = new NotificationRateLimiter(this.redis, {
      maxNotificationsPerMinute: parseInt(process.env.NOTIFICATION_MAX_PER_MINUTE || '10'),
      maxNotificationsPerHour: parseInt(process.env.NOTIFICATION_MAX_PER_HOUR || '100'),
      maxNotificationsPerDay: parseInt(process.env.NOTIFICATION_MAX_PER_DAY || '500'),
      burstLimit: parseInt(process.env.NOTIFICATION_BURST_LIMIT || '5'),
      backoffMultiplier: 2,
      maxBackoffMs: 300000 // 5 minutes
    })

    // Initialize circuit breaker
    this.circuitBreaker = new NotificationCircuitBreaker({
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
      resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'),
      monitoringWindowMs: 300000, // 5 minutes
      halfOpenMaxCalls: 3
    })

    // Initialize metrics collector
    this.metrics = new NotificationMetricsCollector(this.redis)

    // Start background processors
    this.initializeBackgroundProcessors()
  }

  // Main notification sending method with full optimization pipeline
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL',
    options: {
      batchable?: boolean
      dedupKey?: string
      scheduleFor?: Date
      bypassRateLimit?: boolean
    } = {}
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now()

    try {
      // Check user preferences first
      const preferences = await this.getUserPreferences(userId)
      if (!this.shouldSendBasedOnPreferences(payload, preferences)) {
        await this.metrics.recordDelivery(payload.data?.type || 'unknown', false, 0)
        return { success: false, error: 'Blocked by user preferences' }
      }

      // Critical notifications get special handling
      if (priority === 'CRITICAL') {
        const result = await this.sendCriticalNotification(userId, payload)
        await this.metrics.recordDelivery(payload.data?.type || 'critical', result.success, Date.now() - startTime)
        return result
      }

      // Check if we should batch this notification
      if (this.shouldBatch(payload, preferences, priority)) {
        const queueId = await this.queue.enqueue({
          userId,
          payload,
          priority,
          scheduledFor: options.scheduleFor || new Date(),
          batchable: options.batchable !== false,
          dedupKey: options.dedupKey
        })

        await this.metrics.recordDelivery(payload.data?.type || 'batched', true, Date.now() - startTime)
        return { success: true, queued: true, batchId: queueId }
      }

      // Check rate limits for immediate sending
      if (!options.bypassRateLimit) {
        const [userLimitCheck, globalLimitCheck] = await Promise.all([
          this.rateLimiter.checkUserLimit(userId),
          this.rateLimiter.checkGlobalLimit()
        ])

        if (!userLimitCheck.allowed || !globalLimitCheck.allowed) {
          // Queue with exponential backoff
          const retryDelay = userLimitCheck.retryAfterMs || globalLimitCheck.retryAfterMs || 60000
          const queueId = await this.queue.enqueue({
            userId,
            payload,
            priority,
            scheduledFor: new Date(Date.now() + retryDelay),
            batchable: options.batchable !== false,
            dedupKey: options.dedupKey
          })

          await this.metrics.recordDelivery(payload.data?.type || 'rate-limited', false, Date.now() - startTime)
          return { 
            success: true, 
            queued: true, 
            batchId: queueId,
            error: `Rate limited, scheduled for ${new Date(Date.now() + retryDelay).toISOString()}` 
          }
        }
      }

      // Send immediately with circuit breaker protection
      const result = await this.sendImmediately(userId, payload)
      await this.metrics.recordDelivery(payload.data?.type || 'immediate', result.success, Date.now() - startTime)
      return result

    } catch (error) {
      console.error('Enhanced notification service error:', error)
      await this.metrics.recordDelivery(payload.data?.type || 'error', false, Date.now() - startTime)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Send critical notifications immediately with minimal checks
  private async sendCriticalNotification(
    userId: string, 
    payload: PushNotificationPayload
  ): Promise<NotificationDeliveryResult> {
    try {
      // Critical notifications bypass most rate limits but still use circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        // Increment counters but don't check limits
        await this.rateLimiter.incrementCounters(userId)
        
        // Send directly without queueing
        return await this.sendToExternalService(userId, {
          ...payload,
          requireInteraction: true, // Critical notifications require interaction
          tag: `critical-${Date.now()}` // Prevent batching
        })
      })

      return result
    } catch (error) {
      console.error('Critical notification failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Critical send failed' 
      }
    }
  }

  // Determine if notification should be batched
  private shouldBatch(
    payload: PushNotificationPayload,
    preferences: EnhancedNotificationPreferences | null,
    priority: string
  ): boolean {
    // Never batch critical or high priority
    if (priority === 'CRITICAL' || priority === 'HIGH') {
      return false
    }

    // Check user preferences
    if (!preferences?.batchingEnabled) {
      return false
    }

    // Don't batch if user wants immediate notifications
    if (preferences.digestMode === 'IMMEDIATE') {
      return false
    }

    // Batch based on notification type
    const batchableTypes = ['TASK_DEADLINE', 'HABIT_REMINDER', 'WEEKLY_REPORT']
    return batchableTypes.includes(payload.data?.type || '')
  }

  // Send notification immediately with full protection
  private async sendImmediately(
    userId: string, 
    payload: PushNotificationPayload
  ): Promise<NotificationDeliveryResult> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.incrementCounters(userId)
        return await this.sendToExternalService(userId, payload)
      })

      return result
    } catch (error) {
      if (error instanceof Error && error.message.includes('Circuit breaker')) {
        // Queue for later when circuit is open
        await this.queue.enqueue({
          userId,
          payload,
          priority: 'NORMAL',
          scheduledFor: new Date(Date.now() + 60000),
          batchable: true
        })

        return { success: false, error: 'Service temporarily unavailable, queued for retry' }
      }

      return { success: false, error: error instanceof Error ? error.message : 'Send failed' }
    }
  }

  // Send to external push notification service (mock implementation)
  private async sendToExternalService(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<NotificationDeliveryResult> {
    // This would integrate with actual push notification services like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNs)
    // - Web Push Protocol
    // - SendGrid, Twilio, etc.

    // Simulate network call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))

    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('External service timeout')
    }

    console.log(`📱 Notification sent to user ${userId}:`, payload.title)
    return { success: true }
  }

  // Background batch processor
  private async initializeBackgroundProcessors(): Promise<void> {
    // Connect to Redis
    await this.redis.connect()

    // Subscribe to batch triggers
    await this.redis.subscribe('notification:batch-trigger', async (userId) => {
      await this.processBatchForUser(userId)
    })

    // Periodic batch processing
    setInterval(async () => {
      try {
        await this.processScheduledBatches()
        await NotificationMemoryOptimizer.optimizeMemoryUsage()
      } catch (error) {
        console.error('Batch processor error:', error)
      }
    }, 15000) // Every 15 seconds

    console.log('Enhanced notification service background processors started')
  }

  // Process batches for specific user
  private async processBatchForUser(userId: string): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    try {
      const batch = await this.queue.dequeueBatch(userId)
      if (batch) {
        await this.processBatch(batch)
      }
    } catch (error) {
      console.error(`Batch processing error for user ${userId}:`, error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process scheduled batches across all users
  private async processScheduledBatches(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    try {
      const batch = await this.queue.dequeueBatch()
      if (batch) {
        await this.processBatch(batch)
      }
    } catch (error) {
      console.error('Scheduled batch processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process a notification batch with optimization
  private async processBatch(batch: NotificationBatch): Promise<void> {
    console.log(`Processing notification batch ${batch.id} with ${batch.size} notifications`)

    const batchStartTime = Date.now()

    // Process notifications with concurrency limit
    const CONCURRENCY_LIMIT = 5
    const chunks = this.chunkArray(batch.notifications, CONCURRENCY_LIMIT)

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (notification) => {
          try {
            // Re-check rate limits before sending
            const limitCheck = await this.rateLimiter.checkUserLimit(notification.userId)
            if (!limitCheck.allowed) {
              // Re-queue with delay
              await this.queue.enqueue({
                ...notification,
                scheduledFor: new Date(Date.now() + limitCheck.retryAfterMs!)
              })
              return { success: false, reason: 'Rate limited, re-queued' }
            }

            const result = await this.sendImmediately(notification.userId, notification.payload)
            return result
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
      )

      // Small delay between chunks to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const batchLatency = Date.now() - batchStartTime
    await this.metrics.recordDelivery('batch', true, batchLatency, batch.size)

    console.log(`Batch ${batch.id} completed in ${batchLatency}ms`)
  }

  // Utility to chunk arrays for processing
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  // Get user preferences (with caching)
  private async getUserPreferences(userId: string): Promise<EnhancedNotificationPreferences | null> {
    // This would integrate with your actual database
    // For now, return default preferences
    return {
      id: 'default',
      userId,
      pushNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      taskDeadlines: true,
      habitReminders: true,
      weeklyReports: true,
      projectUpdates: true,
      teamMentions: true,
      systemAlerts: true,
      quietHoursEnabled: false,
      batchingEnabled: true,
      maxBatchSize: 5,
      batchWindowMinutes: 30,
      maxNotificationsPerHour: 10,
      digestMode: 'IMMEDIATE',
      minimumPriority: 'LOW',
      dndEnabled: false,
      dndSchedule: [],
      intelligentTimingEnabled: true,
      learningEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Enhanced preference checking with advanced DND
  private shouldSendBasedOnPreferences(
    payload: PushNotificationPayload,
    preferences: EnhancedNotificationPreferences | null
  ): boolean {
    if (!preferences) return true

    // Check minimum priority threshold
    const payloadPriority = this.getPayloadPriority(payload)
    if (!this.meetsPriorityThreshold(payloadPriority, preferences.minimumPriority)) {
      return false
    }

    // Check advanced do not disturb schedule
    if (preferences.dndEnabled && this.isInDNDPeriod(preferences.dndSchedule)) {
      return payloadPriority === 'CRITICAL' // Only critical during DND
    }

    // Check legacy quiet hours
    if (preferences.quietHoursEnabled && this.isInQuietHours(preferences)) {
      return payloadPriority === 'CRITICAL'
    }

    // Check notification type preferences
    return this.isNotificationTypeEnabled(payload, preferences)
  }

  private getPayloadPriority(payload: PushNotificationPayload): string {
    // Infer priority from payload if not explicitly set
    if (payload.requireInteraction) return 'CRITICAL'
    if (payload.data?.type === 'TASK_DEADLINE') return 'HIGH'
    return 'NORMAL'
  }

  private meetsPriorityThreshold(payloadPriority: string, minimumPriority: string): boolean {
    const priorityLevels = { 'LOW': 0, 'NORMAL': 1, 'HIGH': 2, 'CRITICAL': 3 }
    return priorityLevels[payloadPriority] >= priorityLevels[minimumPriority]
  }

  private isInDNDPeriod(dndSchedule: EnhancedNotificationPreferences['dndSchedule']): boolean {
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    return dndSchedule.some(schedule => {
      if (schedule.dayOfWeek !== currentDay) return false

      const [startHour, startMin] = schedule.startTime.split(':').map(Number)
      const [endHour, endMin] = schedule.endTime.split(':').map(Number)
      
      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin

      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime < endTime
      } else {
        // Overnight schedule
        return currentTime >= startTime || currentTime < endTime
      }
    })
  }

  private isInQuietHours(preferences: EnhancedNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime < endTime
    }
  }

  private isNotificationTypeEnabled(
    payload: PushNotificationPayload,
    preferences: EnhancedNotificationPreferences
  ): boolean {
    const type = payload.data?.type
    
    switch (type) {
      case 'TASK_DEADLINE': return preferences.taskDeadlines
      case 'HABIT_REMINDER': return preferences.habitReminders
      case 'WEEKLY_REPORT': return preferences.weeklyReports
      case 'PROJECT_UPDATE': return preferences.projectUpdates
      case 'TEAM_MENTION': return preferences.teamMentions
      case 'SYSTEM_ALERT': return preferences.systemAlerts
      default: return true
    }
  }

  // Get comprehensive system health
  async getSystemHealth(): Promise<SystemHealth> {
    const [queueHealth, rateLimitStatus, circuitState, performanceMetrics] = await Promise.all([
      this.metrics.getQueueHealth(),
      this.rateLimiter.checkGlobalLimit(),
      this.circuitBreaker.getState(),
      this.metrics.getMetrics(24)
    ])

    const memoryUsage = process.memoryUsage()
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024

    return {
      queue: queueHealth,
      rateLimits: rateLimitStatus,
      circuitBreaker: circuitState,
      metrics: performanceMetrics,
      memory: {
        usage: memoryMB,
        limit: 256,
        efficiency: (256 - memoryMB) / 256
      }
    }
  }
}

// Singleton instance
let notificationService: EnhancedNotificationService | null = null

export function getNotificationService(): EnhancedNotificationService {
  if (!notificationService) {
    notificationService = new EnhancedNotificationService()
  }
  return notificationService
}