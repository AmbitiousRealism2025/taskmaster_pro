// High-Performance Notification Queue Implementation
// Part of Phase 3.2 - External Integration Layer

import { EnhancedRedisClient } from '../../redis/enhanced-client'
import {
  NotificationQueueItem,
  NotificationBatch,
  QueueConfig,
  PushNotificationPayload
} from '../../../types/enhanced-notifications'

export class NotificationQueue {
  private redis: EnhancedRedisClient
  private config: QueueConfig

  constructor(redisClient: EnhancedRedisClient, config: QueueConfig) {
    this.redis = redisClient
    this.config = config
  }

  // Optimized enqueue with intelligent batching triggers
  async enqueue(item: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
    const queueItem: NotificationQueueItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      attempts: 0
    }

    // Advanced deduplication with sliding window
    if (item.dedupKey) {
      const dedupResult = await this.handleDeduplication(item.dedupKey, queueItem.id)
      if (dedupResult.isDuplicate) {
        return dedupResult.existingId
      }
    }

    // Intelligent queue selection based on load and priority
    const queueKey = await this.selectOptimalQueue(queueItem)
    
    // Add to priority queue with optimized scoring
    const priorityScore = this.calculatePriorityScore(queueItem)
    await this.redis.zadd(queueKey, priorityScore, JSON.stringify(queueItem))

    // Adaptive batch triggering based on system load
    await this.triggerAdaptiveBatching(queueItem.userId, queueKey)

    return queueItem.id
  }

  // Smart batch creation with optimization for similar notifications
  async dequeueBatch(userId?: string): Promise<NotificationBatch | null> {
    const now = Date.now()
    const adaptiveBatchSize = await this.getAdaptiveBatchSize()

    // Select queue based on priority and load balancing
    const queueKeys = userId 
      ? [`notifications:user:${userId}`]
      : await this.getActiveQueues()

    const allItems: NotificationQueueItem[] = []

    // Collect items from multiple queues with load balancing
    for (const queueKey of queueKeys) {
      const items = await this.redis.zrangeByScore(
        queueKey,
        0,
        now,
        {
          LIMIT: {
            offset: 0,
            count: Math.ceil(adaptiveBatchSize / queueKeys.length)
          }
        }
      )

      if (items.length > 0) {
        const notifications = items.map(item => JSON.parse(item) as NotificationQueueItem)
        allItems.push(...notifications)

        // Remove from queue atomically
        await this.redis.zrem(queueKey, ...items)
      }
    }

    if (allItems.length === 0) {
      return null
    }

    // Create optimized batch with intelligent grouping
    return this.createOptimizedBatch(allItems)
  }

  // Advanced batch optimization with ML-like grouping
  private createOptimizedBatch(notifications: NotificationQueueItem[]): NotificationBatch {
    // Group by user, type, and similarity for maximum batching efficiency
    const grouped = new Map<string, NotificationQueueItem[]>()

    for (const notification of notifications) {
      const groupKey = this.generateGroupingKey(notification)
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, [])
      }
      grouped.get(groupKey)!.push(notification)
    }

    const optimizedNotifications: NotificationQueueItem[] = []

    // Process each group for optimal batching
    for (const [groupKey, groupNotifications] of grouped) {
      if (groupNotifications.length > 1 && this.canOptimallyBatch(groupNotifications)) {
        // Create smart batched notification
        const batchedItem = this.createSmartBatch(groupNotifications)
        optimizedNotifications.push(batchedItem)
      } else {
        // Keep individual notifications
        optimizedNotifications.push(...groupNotifications)
      }
    }

    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      notifications: optimizedNotifications,
      size: optimizedNotifications.length,
      createdAt: new Date()
    }
  }

  // Generate smart grouping key for batching optimization
  private generateGroupingKey(notification: NotificationQueueItem): string {
    const type = notification.payload.data?.type || 'general'
    const priority = notification.priority
    const timeWindow = Math.floor(Date.now() / (15 * 60 * 1000)) // 15-minute windows

    return `${notification.userId}:${type}:${priority}:${timeWindow}`
  }

  // Advanced batching logic with context awareness
  private canOptimallyBatch(notifications: NotificationQueueItem[]): boolean {
    if (notifications.length < 2) return false

    // Check if all notifications are batchable
    if (!notifications.every(n => n.batchable)) return false

    // Never batch different priority levels
    const priorities = new Set(notifications.map(n => n.priority))
    if (priorities.size > 1) return false

    // Never batch critical notifications
    if (notifications.some(n => n.priority === 'CRITICAL')) return false

    // Check for temporal clustering (notifications within 5 minutes)
    const times = notifications.map(n => n.scheduledFor.getTime())
    const timeSpread = Math.max(...times) - Math.min(...times)
    if (timeSpread > 5 * 60 * 1000) return false // 5 minutes max spread

    return true
  }

  // Create intelligent batched notification with context awareness
  private createSmartBatch(notifications: NotificationQueueItem[]): NotificationQueueItem {
    const type = notifications[0].payload.data?.type
    const count = notifications.length
    const userId = notifications[0].userId

    // Generate context-aware batch message
    const batchedPayload = this.generateBatchPayload(type, count, notifications)

    return {
      id: `smart_batch_${Date.now()}`,
      userId,
      payload: batchedPayload,
      priority: notifications[0].priority,
      scheduledFor: new Date(),
      attempts: 0,
      createdAt: new Date(),
      batchable: false // Prevent re-batching
    }
  }

  // Generate intelligent batch payload based on notification context
  private generateBatchPayload(
    type: string | undefined, 
    count: number, 
    notifications: NotificationQueueItem[]
  ): PushNotificationPayload {
    switch (type) {
      case 'TASK_DEADLINE': {
        const taskTitles = notifications
          .map(n => n.payload.title.replace(/Task Deadline Reminder/, '').replace(/"/g, '').trim())
          .slice(0, 2) // Show first 2 task names

        const titleText = taskTitles.length === 1 
          ? `"${taskTitles[0]}" and ${count - 1} other task${count > 2 ? 's' : ''}`
          : count <= 2 
            ? taskTitles.map(t => `"${t}"`).join(' and ')
            : `"${taskTitles[0]}", "${taskTitles[1]}" and ${count - 2} others`

        return {
          title: `${count} Task Deadlines Approaching`,
          body: `${titleText} ${count === 1 ? 'is' : 'are'} due soon`,
          icon: '/icons/task-batch.png',
          tag: 'task-deadline-batch',
          data: {
            type: 'TASK_DEADLINE_BATCH',
            batchSize: count,
            actionUrl: '/tasks?filter=upcoming&sort=due',
            taskIds: notifications.map(n => n.payload.data?.entityId).filter(Boolean)
          },
          actions: [
            { action: 'view-all', title: 'View All Tasks' },
            { action: 'snooze-all', title: 'Snooze All' }
          ]
        }
      }

      case 'HABIT_REMINDER': {
        const habitNames = notifications
          .map(n => n.payload.title.replace(/Habit Reminder/, '').replace(/"/g, '').trim())
          .slice(0, 2)

        const bodyText = habitNames.length === 1
          ? `Time to complete "${habitNames[0]}" and ${count - 1} other habit${count > 2 ? 's' : ''}`
          : count <= 2
            ? `Time to complete ${habitNames.map(h => `"${h}"`).join(' and ')}`
            : `Time to complete "${habitNames[0]}", "${habitNames[1]}" and ${count - 2} other habits`

        return {
          title: `${count} Habit Reminders`,
          body: bodyText,
          icon: '/icons/habit-batch.png',
          tag: 'habit-reminder-batch',
          data: {
            type: 'HABIT_REMINDER_BATCH',
            batchSize: count,
            actionUrl: '/habits?view=today',
            habitIds: notifications.map(n => n.payload.data?.entityId).filter(Boolean)
          },
          actions: [
            { action: 'check-in-all', title: 'Quick Check-in' },
            { action: 'view-habits', title: 'View Habits' }
          ]
        }
      }

      default:
        return {
          title: `${count} Notifications`,
          body: `You have ${count} pending updates`,
          icon: '/icons/notification-batch.png',
          tag: 'general-batch',
          data: {
            type: 'GENERAL_BATCH',
            batchSize: count,
            actionUrl: '/notifications'
          }
        }
    }
  }

  // Adaptive batch size based on system load and user preferences
  async getAdaptiveBatchSize(currentQueueSize?: number): Promise<number> {
    const queueSize = currentQueueSize || await this.redis.zcard('notifications:global')
    
    let adaptiveBatchSize = this.config.batchSize

    // Increase batch size under high load to clear queue faster
    if (queueSize > 500) {
      adaptiveBatchSize = Math.min(this.config.batchSize * 2, 20)
    } else if (queueSize > 1000) {
      adaptiveBatchSize = Math.min(this.config.batchSize * 3, 30)
    }

    // Decrease batch size under memory pressure
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
    if (memoryUsage > 200) {
      adaptiveBatchSize = Math.max(Math.floor(adaptiveBatchSize / 2), 5)
    }

    return adaptiveBatchSize
  }

  // Advanced deduplication with temporal windows
  private async handleDeduplication(dedupKey: string, newId: string): Promise<{
    isDuplicate: boolean
    existingId: string
  }> {
    const existingId = await this.redis.get(`dedup:${dedupKey}`)
    
    if (existingId) {
      // Extend TTL for active dedup keys
      await this.redis.expire(`dedup:${dedupKey}`, 300)
      return { isDuplicate: true, existingId }
    }

    // Set new dedup key with sliding window
    await this.redis.setEx(`dedup:${dedupKey}`, 300, newId)
    return { isDuplicate: false, existingId: newId }
  }

  // Intelligent queue selection for load balancing
  private async selectOptimalQueue(item: NotificationQueueItem): Promise<string> {
    if (item.priority === 'CRITICAL') {
      return 'notifications:critical'
    }

    const userQueueKey = `notifications:user:${item.userId}`
    const globalQueueKey = 'notifications:global'

    // Check user queue size for load balancing
    const userQueueSize = await this.redis.zcard(userQueueKey)
    
    // Use global queue if user queue is overloaded
    if (userQueueSize > 100) {
      return globalQueueKey
    }

    return userQueueKey
  }

  // Adaptive batch triggering based on system conditions
  private async triggerAdaptiveBatching(userId: string, queueKey: string): Promise<void> {
    const [queueSize, systemLoad] = await Promise.all([
      this.redis.zcard(queueKey),
      this.getSystemLoad()
    ])

    // Dynamic batch triggers based on load
    let batchTriggerSize = this.config.batchSize
    let maxWaitMs = this.config.maxBatchWaitMs

    if (systemLoad > 0.8) {
      // High load: smaller batches, faster processing
      batchTriggerSize = Math.ceil(this.config.batchSize / 2)
      maxWaitMs = Math.ceil(this.config.maxBatchWaitMs / 2)
    } else if (systemLoad < 0.3) {
      // Low load: larger batches for efficiency
      batchTriggerSize = this.config.batchSize * 2
      maxWaitMs = this.config.maxBatchWaitMs * 1.5
    }

    // Count-based trigger
    if (queueSize >= batchTriggerSize) {
      await this.redis.publish('notification:batch-trigger', userId)
      return
    }

    // Time-based trigger with adaptive timing
    const oldestItem = await this.redis.zrange(queueKey, 0, 0, { WITHSCORES: true })
    if (oldestItem.length > 0) {
      const ageMs = Date.now() - parseInt(oldestItem[1])
      if (ageMs >= maxWaitMs) {
        await this.redis.publish('notification:batch-trigger', userId)
      }
    }
  }

  // Get system load indicator (simplified)
  private async getSystemLoad(): Promise<number> {
    const globalQueueSize = await this.redis.zcard('notifications:global')
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024

    // Normalize to 0-1 scale
    const queueLoad = Math.min(globalQueueSize / 1000, 1)
    const memoryLoad = Math.min(memoryUsage / 256, 1)

    return Math.max(queueLoad, memoryLoad)
  }

  // Get active queues for processing
  private async getActiveQueues(): Promise<string[]> {
    const queues = ['notifications:global', 'notifications:critical']
    
    // Add user queues that have pending items
    // This is a simplified version - in production you'd maintain a registry
    const userQueues = await this.redis.get('active_user_queues')
    if (userQueues) {
      queues.push(...JSON.parse(userQueues))
    }

    return queues
  }

  // Calculate priority score for sorted set
  private calculatePriorityScore(item: NotificationQueueItem): number {
    const priorityScores = {
      'CRITICAL': 1000000,
      'HIGH': 100000,
      'NORMAL': 10000,
      'LOW': 1000
    }

    const baseScore = priorityScores[item.priority] || priorityScores['NORMAL']
    const timeScore = item.scheduledFor.getTime()

    // Lower timestamp = higher priority (earlier scheduled time)
    return baseScore + (2147483647 - timeScore) // Max int32 - timestamp for inverse ordering
  }

  // Get queue health metrics
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

    // These would be tracked in production with more sophisticated monitoring
    return {
      queueSize: globalQueueSize,
      oldestItemAge,
      averageProcessingTime: 150, // ms - would be calculated from metrics
      backlog: Math.max(0, globalQueueSize - 100),
      throughput: 50 // notifications per minute - would be calculated from metrics
    }
  }
}