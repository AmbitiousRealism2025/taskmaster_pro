// Enhanced Push Notification Types for TaskMaster Pro
// Part of Phase 3.2 - External Integration Layer

export interface NotificationBatch {
  id: string
  notifications: NotificationQueueItem[]
  size: number
  createdAt: Date
  processedAt?: Date
}

export interface NotificationQueueItem {
  id: string
  userId: string
  payload: PushNotificationPayload
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'
  scheduledFor: Date
  attempts: number
  createdAt: Date
  batchable: boolean
  dedupKey?: string
}

export interface QueueConfig {
  batchSize: number
  maxBatchWaitMs: number
  maxQueueSize: number
}

export interface RateLimitConfig {
  maxNotificationsPerMinute: number
  maxNotificationsPerHour: number
  maxNotificationsPerDay: number
  burstLimit: number
  backoffMultiplier: number
  maxBackoffMs: number
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  timestamp?: number
  data?: {
    type?: string
    entityId?: string
    actionUrl?: string
    [key: string]: any
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

// Enhanced notification preferences with advanced controls
export interface EnhancedNotificationPreferences {
  id: string
  userId: string
  
  // Basic preferences
  pushNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
  
  // Notification types
  taskDeadlines: boolean
  habitReminders: boolean
  weeklyReports: boolean
  projectUpdates: boolean
  teamMentions: boolean
  systemAlerts: boolean
  
  // Legacy quiet hours
  quietHoursEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  
  // Advanced batching controls
  batchingEnabled: boolean
  maxBatchSize: number
  batchWindowMinutes: number
  
  // Frequency controls
  maxNotificationsPerHour: number
  digestMode: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY'
  digestTime?: string
  
  // Priority filtering
  minimumPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  
  // Advanced Do Not Disturb
  dndEnabled: boolean
  dndSchedule: Array<{
    dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
    startTime: string // HH:MM format
    endTime: string   // HH:MM format
  }>
  
  // Smart features
  intelligentTimingEnabled: boolean
  learningEnabled: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface NotificationMetrics {
  deliveryRate: number
  errorRate: number
  averageLatency: number
  throughput: number
  batchEfficiency: number
  queueDepth: number
  memoryUsage: number
  cpuUsage: number
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeoutMs: number
  monitoringWindowMs: number
  halfOpenMaxCalls: number
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
}

export interface QueueHealth {
  queueSize: number
  oldestItemAge: number
  averageProcessingTime: number
  backlog: number
  throughput: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
  remaining: number
  resetTime: Date
}

export interface NotificationDeliveryResult {
  success: boolean
  queued?: boolean
  batchId?: string
  error?: string
  latency?: number
}

// System health monitoring
export interface SystemHealth {
  queue: QueueHealth
  rateLimits: RateLimitResult
  circuitBreaker: CircuitBreakerState
  metrics: NotificationMetrics
  memory: {
    usage: number
    limit: number
    efficiency: number
  }
}