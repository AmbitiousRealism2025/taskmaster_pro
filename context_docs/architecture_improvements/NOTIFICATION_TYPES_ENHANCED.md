# Enhanced Notification System Type Definitions

## Core Type Definitions for Batching and Throttling

```typescript
// types/enhanced-notifications.ts

// Base notification queue item
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
  retryAfterMs?: number
}

// Batch container for grouped notifications
export interface NotificationBatch {
  id: string
  notifications: NotificationQueueItem[]
  size: number
  createdAt: Date
  processedAt?: Date
  processingTimeMs?: number
  deliveryResults?: BatchDeliveryResult[]
}

// Configuration for notification queue
export interface QueueConfig {
  batchSize: number
  maxBatchWaitMs: number
  maxQueueSize: number
  adaptiveBatching: boolean
  memoryThresholdMB: number
}

// Rate limiting configuration
export interface RateLimitConfig {
  maxNotificationsPerMinute: number
  maxNotificationsPerHour: number
  maxNotificationsPerDay: number
  burstLimit: number
  backoffMultiplier: number
  maxBackoffMs: number
  globalMultiplier: number // For system-wide limits
}

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
  currentCount: number
  resetTime: Date
  window: 'minute' | 'hour' | 'day' | 'global'
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeoutMs: number
  monitoringWindowMs: number
  halfOpenMaxCalls: number
}

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

// Enhanced notification preferences with batching controls
export interface EnhancedNotificationPreferences extends NotificationPreferences {
  // Batching preferences
  batchingEnabled: boolean
  maxBatchSize: number
  batchWindowMinutes: number
  
  // Frequency controls
  maxNotificationsPerHour: number
  digestMode: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY'
  digestTime?: string // HH:MM format
  digestDays?: number[] // Days of week for weekly digest
  
  // Priority filtering
  minimumPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  
  // Advanced do not disturb
  dndEnabled: boolean
  dndSchedule: DNDPeriod[]
  emergencyContactsEnabled: boolean // Allow critical from emergency contacts
  
  // Smart timing features
  intelligentTimingEnabled: boolean
  learningEnabled: boolean
  personalizedQuietHours: boolean // AI-learned optimal times
  
  // Notification grouping
  groupSimilarNotifications: boolean
  maxGroupSize: number
  groupingWindowMinutes: number
  
  // Delivery preferences
  deliveryMethod: 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP_ONLY'
  fallbackMethods: ('EMAIL' | 'SMS')[]
  confirmationRequired: boolean // For critical notifications
}

// Do not disturb period definition
export interface DNDPeriod {
  id?: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isActive: boolean
  allowCritical: boolean
  allowEmergencyContacts: boolean
}

// Batch delivery result tracking
export interface BatchDeliveryResult {
  notificationId: string
  userId: string
  success: boolean
  latencyMs: number
  error?: string
  retryScheduled?: Date
}

// Performance metrics for monitoring
export interface NotificationMetrics {
  // Delivery performance
  deliveryRate: number // Percentage successful
  errorRate: number // Percentage failed
  averageLatency: number // Average delivery time in ms
  throughput: number // Notifications per hour
  
  // Batching efficiency
  batchEfficiency: number // Percentage of notifications batched
  averageBatchSize: number
  batchProcessingTime: number // Average batch processing time
  
  // Queue performance
  queueDepth: number // Current queue size
  averageQueueTime: number // Time items spend in queue
  queueThroughput: number // Items processed per hour
  
  // System health
  memoryUsage: number // MB used by notification system
  circuitBreakerStatus: CircuitState
  rateLimitViolations: number // Recent rate limit hits
}

// Queue health monitoring
export interface QueueHealthMetrics {
  queueSize: number
  oldestItemAge: number // Milliseconds
  processingRate: number // Items per hour
  backlog: number // Items above optimal queue size
  estimatedProcessingTime: number // Time to clear current queue
  memoryUsageBytes: number
}

// System-wide notification health
export interface NotificationSystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  queue: QueueHealthMetrics
  rateLimits: {
    global: RateLimitResult
    userAverages: {
      requestsPerMinute: number
      requestsPerHour: number
      blockedRequests: number
    }
  }
  circuitBreaker: {
    state: CircuitState
    failureCount: number
    timeSinceLastFailure: number
    recentFailures: FailureRecord[]
  }
  metrics: NotificationMetrics
  memory: {
    usage: number // MB
    limit: number // MB  
    efficiency: number // Percentage
    gcFrequency: number // Recent garbage collections
  }
  alerts: SystemAlert[]
}

// Failure tracking for circuit breaker
export interface FailureRecord {
  timestamp: Date
  error: string
  operation: string
  userId?: string
  severity: 'WARNING' | 'ERROR' | 'CRITICAL'
}

// System alert definitions
export interface SystemAlert {
  id: string
  type: 'QUEUE_OVERLOAD' | 'HIGH_ERROR_RATE' | 'CIRCUIT_OPEN' | 'MEMORY_PRESSURE' | 'RATE_LIMIT_EXCEEDED'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata?: Record<string, any>
}

// Configuration for notification delivery channels
export interface DeliveryChannelConfig {
  push: {
    enabled: boolean
    maxRetries: number
    retryBackoffMs: number
    batchingEnabled: boolean
  }
  email: {
    enabled: boolean
    maxRetries: number
    retryBackoffMs: number
    digestOnly: boolean // Only send as digest
  }
  sms: {
    enabled: boolean
    emergencyOnly: boolean
    maxRetries: number
    rateLimitPerDay: number
  }
  inApp: {
    enabled: boolean
    persistDays: number
    maxUnread: number
  }
}

// Intelligent timing preferences (AI-driven)
export interface IntelligentTimingData {
  userId: string
  optimalHours: number[] // Hours when user is most responsive
  responsePatterns: {
    hour: number
    responseRate: number
    averageResponseTimeMinutes: number
  }[]
  productivityCorrelation: {
    morningNotifications: number // Productivity impact score
    afternoonNotifications: number
    eveningNotifications: number
  }
  lastAnalyzed: Date
  confidence: number // 0-1 confidence in recommendations
}

// Notification interaction tracking
export interface NotificationInteraction {
  id: string
  notificationId: string
  userId: string
  action: 'CLICKED' | 'DISMISSED' | 'IGNORED' | 'ACTED_UPON'
  timestamp: Date
  responseTimeMs?: number
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET'
  context: {
    timeOfDay: number // Hour 0-23
    dayOfWeek: number // 0-6
    userActivity: 'ACTIVE' | 'IDLE' | 'FOCUS_MODE' | 'OFFLINE'
    notificationCount: number // How many notifications user had pending
  }
}

// Delivery optimization recommendations
export interface DeliveryOptimization {
  userId: string
  recommendations: {
    optimalBatchSize: number
    preferredDeliveryHours: number[]
    shouldEnableBatching: boolean
    recommendedDigestMode: EnhancedNotificationPreferences['digestMode']
    estimatedEngagementImprovement: number // Percentage
  }
  confidence: number
  basedOnInteractions: number // Number of interactions analyzed
  lastUpdated: Date
}

// Real-time notification status
export interface NotificationStatus {
  id: string
  status: 'QUEUED' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
  queuePosition?: number
  estimatedDeliveryTime?: Date
  actualDeliveryTime?: Date
  deliveryLatencyMs?: number
  batchId?: string
  retryCount: number
  lastError?: string
}

// Notification analytics for admin dashboard
export interface NotificationAnalytics {
  timeRange: {
    start: Date
    end: Date
  }
  overall: {
    totalSent: number
    totalBatched: number
    totalFailed: number
    averageLatency: number
    peakThroughput: number
  }
  byType: Record<string, {
    count: number
    successRate: number
    averageLatency: number
    batchingRate: number
  }>
  byUser: {
    topUsers: Array<{
      userId: string
      notificationCount: number
      engagementRate: number
      preferredTiming: string
    }>
    averageNotificationsPerUser: number
    userSatisfactionScore: number
  }
  systemPerformance: {
    queueEfficiency: number
    memoryEfficiency: number
    circuitBreakerEvents: number
    rateLimitViolations: number
  }
}

// Configuration for production deployment
export interface ProductionNotificationConfig {
  redis: {
    host: string
    port: number
    password?: string
    cluster?: boolean
    maxRetriesPerRequest: number
  }
  queue: QueueConfig
  rateLimiting: RateLimitConfig
  circuitBreaker: CircuitBreakerConfig
  monitoring: {
    metricsEnabled: boolean
    healthCheckIntervalMs: number
    alertThresholds: {
      queueDepth: number
      errorRate: number
      latency: number
      memoryUsage: number
    }
  }
  optimization: {
    memoryOptimizationEnabled: boolean
    adaptiveBatchingEnabled: boolean
    intelligentTimingEnabled: boolean
    autoScalingEnabled: boolean
  }
}

// Error types for proper error handling
export class NotificationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message)
    this.name = 'NotificationServiceError'
  }
}

export class RateLimitError extends NotificationServiceError {
  constructor(message: string, public readonly retryAfterMs: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfterMs })
  }
}

export class CircuitBreakerError extends NotificationServiceError {
  constructor(message: string, public readonly circuitState: CircuitState) {
    super(message, 'CIRCUIT_BREAKER_OPEN', { circuitState })
  }
}

export class QueueOverflowError extends NotificationServiceError {
  constructor(message: string, public readonly queueSize: number) {
    super(message, 'QUEUE_OVERFLOW', { queueSize })
  }
}

// Utility types for API responses
export interface NotificationSendResponse {
  success: boolean
  notificationId?: string
  batchId?: string
  queued: boolean
  estimatedDeliveryTime?: Date
  error?: string
  rateLimitInfo?: {
    retryAfterMs: number
    currentUsage: number
    limit: number
  }
}

export interface NotificationBatchResponse {
  batchId: string
  size: number
  processed: number
  successful: number
  failed: number
  processingTimeMs: number
  errors: Array<{
    notificationId: string
    error: string
  }>
}

// WebSocket events for real-time updates
export interface NotificationWebSocketEvents {
  'notification:queued': { notificationId: string; queuePosition: number }
  'notification:processing': { batchId: string; size: number }
  'notification:delivered': { notificationId: string; latencyMs: number }
  'notification:failed': { notificationId: string; error: string; willRetry: boolean }
  'system:health': NotificationSystemHealth
  'preferences:updated': { userId: string; changes: string[] }
}

// Service worker integration types
export interface ServiceWorkerNotificationData {
  type: 'INDIVIDUAL' | 'BATCH'
  batchSize?: number
  actionUrl?: string
  entityIds?: string[]
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'
  requiresInteraction: boolean
  expiresAt?: Date
}

// Performance monitoring types
export interface PerformanceThresholds {
  latency: {
    critical: number // ms - notifications that must be delivered immediately
    normal: number // ms - standard notifications
    batch: number // ms - batch processing time
  }
  throughput: {
    minimum: number // notifications per minute
    target: number // optimal notifications per minute
    maximum: number // burst capacity
  }
  memory: {
    warningThresholdMB: number
    criticalThresholdMB: number
    maxHeapUsageMB: number
  }
  queue: {
    optimalSize: number
    warningSize: number
    criticalSize: number
  }
}

// A/B testing for notification optimization
export interface NotificationExperiment {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  variants: {
    control: NotificationVariant
    treatment: NotificationVariant
  }
  targetUsers: string[] // User IDs in experiment
  metrics: {
    engagementRate: number
    responseTime: number
    userSatisfaction: number
    systemLoad: number
  }
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'
}

export interface NotificationVariant {
  batchingStrategy: 'AGGRESSIVE' | 'CONSERVATIVE' | 'DISABLED'
  batchSize: number
  batchWindowMs: number
  rateLimitMultiplier: number
  intelligentTimingEnabled: boolean
}

// Redis data structures for queue management
export interface RedisQueueStructure {
  // Main queues (sorted sets with priority scores)
  'notifications:critical': 'priority_score notification_json'
  'notifications:global': 'priority_score notification_json'
  'notifications:user:{userId}': 'priority_score notification_json'
  
  // Deduplication (key-value with TTL)
  'dedup:{dedupKey}': 'notification_id'
  
  // Rate limiting (hash with time windows)
  'rate:user:{userId}:minute': 'window_start count'
  'rate:user:{userId}:hour': 'window_start count'
  'rate:user:{userId}:day': 'window_start count'
  'rate:global:minute': 'window_start count'
  
  // Batch triggers (pub/sub)
  'notification:batch-trigger': 'userId'
  
  // Failed notifications (list)
  'notifications:failed': 'failed_notification_json[]'
  
  // Metrics (hash with hourly buckets)
  'metrics:{type}:{hour}': '{total, successful, failed, latency_sum, latency_count}'
  
  // Circuit breaker state (hash)
  'circuit:state': '{state, failure_count, last_failure_time}'
}

// Database schema extensions for enhanced features
export interface DatabaseSchema {
  // Enhanced notification preferences table
  NotificationPreferences: {
    id: string
    userId: string
    
    // Existing fields
    taskDeadlineEnabled: boolean
    taskDeadlineHours: number[]
    habitReminderEnabled: boolean
    // ... other existing fields
    
    // New enhanced fields
    batchingEnabled: boolean
    maxBatchSize: number
    batchWindowMinutes: number
    maxNotificationsPerHour: number
    digestMode: string
    digestTime?: string
    minimumPriority: string
    dndEnabled: boolean
    dndSchedule: any[] // JSON array
    intelligentTimingEnabled: boolean
    learningEnabled: boolean
    
    createdAt: Date
    updatedAt: Date
  }
  
  // New notification interaction tracking table
  NotificationInteraction: {
    id: string
    notificationId: string
    userId: string
    action: string
    timestamp: Date
    responseTimeMs?: number
    deviceType: string
    context: any // JSON object
  }
  
  // New notification batch tracking table
  NotificationBatch: {
    id: string
    size: number
    createdAt: Date
    processedAt?: Date
    processingTimeMs?: number
    successfulDeliveries: number
    failedDeliveries: number
    averageLatencyMs: number
  }
  
  // Enhanced scheduled notifications
  ScheduledNotification: {
    // Existing fields
    id: string
    userId: string
    type: string
    scheduledFor: Date
    payload: any
    status: string
    attempts: number
    
    // New enhanced fields
    priority: string
    batchable: boolean
    dedupKey?: string
    batchId?: string
    parentNotificationId?: string // For retries
    estimatedDeliveryTime?: Date
    actualDeliveryTime?: Date
    deliveryLatencyMs?: number
    
    createdAt: Date
    updatedAt: Date
  }
}

// API request/response types
export interface SendNotificationRequest {
  payload: PushNotificationPayload
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'
  options?: {
    batchable?: boolean
    dedupKey?: string
    scheduleFor?: string // ISO date string
    bypassRateLimit?: boolean
  }
}

export interface UpdatePreferencesRequest {
  preferences: Partial<EnhancedNotificationPreferences>
  reconcileScheduled?: boolean // Whether to update existing scheduled notifications
}

export interface NotificationHealthResponse {
  health: NotificationSystemHealth
  recommendations: string[]
  timestamp: Date
}

// Service layer interfaces for dependency injection
export interface INotificationQueue {
  enqueue(item: Omit<NotificationQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<string>
  dequeueBatch(userId?: string): Promise<NotificationBatch | null>
  getQueueSize(userId?: string): Promise<number>
  clear(userId?: string): Promise<void>
}

export interface INotificationRateLimiter {
  checkUserLimit(userId: string): Promise<RateLimitResult>
  checkGlobalLimit(): Promise<RateLimitResult>
  incrementCounters(userId: string): Promise<void>
  calculateBackoff(attempts: number): number
}

export interface INotificationCircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>
  getState(): { state: CircuitState; failureCount: number; timeSinceLastFailure: number }
  reset(): void
}

export interface INotificationMetrics {
  recordDelivery(type: string, success: boolean, latencyMs: number, batchSize?: number): Promise<void>
  getMetrics(hours?: number): Promise<NotificationMetrics>
  getQueueHealth(): Promise<QueueHealthMetrics>
  getSystemHealth(): Promise<NotificationSystemHealth>
}

// Testing utilities and mocks
export interface NotificationTestUtils {
  createMockNotification(overrides?: Partial<NotificationQueueItem>): NotificationQueueItem
  createMockBatch(size: number, userId?: string): NotificationBatch
  createMockPreferences(overrides?: Partial<EnhancedNotificationPreferences>): EnhancedNotificationPreferences
  simulateHighLoad(notificationCount: number, userCount: number): Promise<void>
  measureBatchingEfficiency(notifications: NotificationQueueItem[]): number
}
```

## Environment Configuration

```typescript
// Environment variables for production deployment
export interface NotificationEnvironmentConfig {
  // Redis Configuration
  REDIS_HOST: string
  REDIS_PORT: string
  REDIS_PASSWORD?: string
  REDIS_CLUSTER_ENABLED?: string
  
  // Rate Limiting
  NOTIFICATION_MAX_PER_MINUTE: string
  NOTIFICATION_MAX_PER_HOUR: string
  NOTIFICATION_MAX_PER_DAY: string
  NOTIFICATION_BURST_LIMIT: string
  
  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: string
  CIRCUIT_BREAKER_RESET_TIMEOUT: string
  
  // Batch Processing
  NOTIFICATION_BATCH_SIZE: string
  NOTIFICATION_MAX_BATCH_WAIT: string
  NOTIFICATION_MAX_QUEUE_SIZE: string
  
  // Performance
  NOTIFICATION_MEMORY_LIMIT_MB: string
  NOTIFICATION_METRICS_ENABLED: string
  NOTIFICATION_ADAPTIVE_BATCHING: string
  
  // Security
  NOTIFICATION_ENCRYPTION_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_EMAIL: string
}

// Default configurations for different environments
export const NotificationConfigs = {
  development: {
    batchSize: 5,
    maxBatchWaitMs: 10000, // 10 seconds for faster testing
    maxNotificationsPerMinute: 5,
    memoryLimitMB: 128
  },
  
  staging: {
    batchSize: 10,
    maxBatchWaitMs: 30000,
    maxNotificationsPerMinute: 20,
    memoryLimitMB: 256
  },
  
  production: {
    batchSize: 20,
    maxBatchWaitMs: 60000,
    maxNotificationsPerMinute: 50,
    memoryLimitMB: 512
  }
} as const
```

This comprehensive type system provides:

1. **Type Safety**: Full TypeScript coverage for all notification system components
2. **Performance Monitoring**: Detailed metrics and health tracking types
3. **Configuration Management**: Environment-specific configuration types
4. **Error Handling**: Specific error types for different failure scenarios
5. **Extensibility**: Interfaces for dependency injection and testing
6. **Analytics**: Rich data types for notification performance analysis

The type system ensures the enhanced notification system is maintainable, testable, and performant at scale.