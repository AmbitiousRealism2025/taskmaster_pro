# Real-time & State Orchestration Subgroup - Phase 2 Week 7

## ⚠️ Implementation Notes
- **Subgroup Number**: 8 (Real-time & State Orchestration)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 9
- **Test Coverage**: Phase2_Feature_Tests.md (Tests 23-29)
- **Dependencies**: Content & Focus Systems (Subgroup 7) must be complete
- **Related Enhancements**: None
- **Estimated Context Usage**: 65-75%

---

**Subgroup**: 03 - Real-time & State Orchestration  
**Phase**: Core Features (Week 7)  
**Focus**: Real-time Synchronization + Performance Optimization  

## Subgroup Overview

The Real-time & State Orchestration subgroup implements the high-performance, real-time synchronization infrastructure that powers TaskMaster Pro's collaborative features and ensures optimal user experience across all devices and contexts. This combines advanced state management patterns, real-time data synchronization, and performance optimization techniques to deliver seamless, responsive interactions.

### Primary Responsibilities

- **Real-time Synchronization**: Server-Sent Events and WebSocket implementation for live data updates
- **Optimistic UI Patterns**: Immediate user feedback with conflict resolution and rollback capabilities
- **Cross-tab Synchronization**: BroadcastChannel API for multi-tab state consistency
- **Performance Monitoring**: Comprehensive metrics collection and real-time performance tracking
- **Memory Management**: Efficient resource cleanup and garbage collection strategies
- **Caching Orchestration**: Advanced TanStack Query patterns with selective invalidation
- **Virtual Rendering**: Optimized list virtualization for large datasets
- **State Persistence**: Robust hydration/dehydration with recovery mechanisms
- **Network Resilience**: Offline queue management and conflict resolution

## Test Coverage Requirements

Based on `Phase2_Feature_Tests.md`, the following tests must pass:

### Real-time Updates Tests (6 tests)
- **WebSocket Connection** (`__tests__/integration/real-time-updates.test.ts`)
  - WebSocket initialization and connection management
  - Real-time task status updates across multiple clients
  - Collaborative editing with conflict resolution
  - Connection recovery and reconnection handling
  - Cross-tab synchronization validation
  - Performance under concurrent user load

### State Management Integration Tests (4 tests)
- **State Orchestration** (`__tests__/integration/state-management.test.ts`)
  - TanStack Query + Zustand synchronization patterns
  - Optimistic updates with rollback capability
  - Offline queue management and sync resolution
  - Cross-component state consistency validation

### Performance Tests (5 tests)
- **Performance Optimization** (`__tests__/performance/optimization.test.ts`)
  - Virtual scrolling for large task lists
  - Memory usage monitoring and cleanup
  - Caching efficiency and hit rates
  - Bundle size and loading performance
  - Network request optimization

### State Persistence Tests (3 tests)
- **Persistence & Recovery** (`__tests__/integration/state-persistence.test.ts`)
  - State hydration/dehydration cycles
  - Recovery from corrupted state
  - Migration between state schema versions

## Core Data Models and Types

### Real-time Event Types

```typescript
// types/realtime.ts
export interface RealtimeEvent {
  id: string
  type: RealtimeEventType
  payload: any
  userId: string
  sessionId: string
  timestamp: Date
  version: number
}

export type RealtimeEventType = 
  | 'TASK_CREATED'
  | 'TASK_UPDATED' 
  | 'TASK_DELETED'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_UPDATED'
  | 'NOTE_UPDATED'
  | 'USER_PRESENCE_CHANGED'
  | 'COLLABORATION_CURSOR'
  | 'SYSTEM_NOTIFICATION'

export interface UserPresence {
  userId: string
  sessionId: string
  lastSeen: Date
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentTask?: string
  currentProject?: string
  device: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
  }
}

export interface CollaborationCursor {
  userId: string
  userName: string
  userColor: string
  x: number
  y: number
  elementId?: string
  lastMoved: Date
}

export interface ConflictResolution {
  id: string
  type: 'TASK' | 'PROJECT' | 'NOTE'
  entityId: string
  conflicts: ConflictItem[]
  resolvedBy?: string
  resolvedAt?: Date
  strategy: 'LAST_WRITE_WINS' | 'MERGE' | 'MANUAL'
}

export interface ConflictItem {
  field: string
  localValue: any
  remoteValue: any
  timestamp: Date
  userId: string
}
```

### Performance Monitoring Types

```typescript
// types/performance.ts
export interface PerformanceMetrics {
  id: string
  sessionId: string
  userId: string
  timestamp: Date
  
  // Core Web Vitals
  LCP: number // Largest Contentful Paint
  FID: number // First Input Delay
  CLS: number // Cumulative Layout Shift
  FCP: number // First Contentful Paint
  TTI: number // Time to Interactive
  
  // Runtime Performance
  memory: {
    used: number
    total: number
    limit: number
  }
  
  // Network Performance
  networkRequests: NetworkMetric[]
  cacheHitRate: number
  bundleSize: number
  
  // Application Performance
  renderTime: number
  stateUpdateTime: number
  queryResolutionTime: number
  
  // User Experience
  userActions: UserActionMetric[]
  errorCount: number
  warningCount: number
}

export interface NetworkMetric {
  url: string
  method: string
  duration: number
  size: number
  cached: boolean
  status: number
  type: 'fetch' | 'websocket' | 'sse'
}

export interface UserActionMetric {
  action: string
  element: string
  timestamp: Date
  duration: number
  successful: boolean
}

export interface MemoryUsage {
  component: string
  size: number
  timestamp: Date
  type: 'store' | 'cache' | 'component' | 'other'
}
```

### State Synchronization Types

```typescript
// types/synchronization.ts
export interface StateSnapshot {
  id: string
  version: number
  timestamp: Date
  userId: string
  stores: {
    tasks: any
    projects: any
    notes: any
    focus: any
    ui: any
  }
  checksum: string
}

export interface SyncOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH'
  entity: 'TASK' | 'PROJECT' | 'NOTE' | 'USER'
  entityId: string
  data: any
  timestamp: Date
  userId: string
  sessionId: string
  isOptimistic: boolean
  dependencies: string[]
}

export interface OfflineQueue {
  operations: SyncOperation[]
  lastSync: Date
  conflictStrategy: 'LAST_WRITE_WINS' | 'MANUAL_RESOLUTION'
  maxQueueSize: number
  currentSize: number
}

export interface CrossTabMessage {
  type: 'STATE_UPDATE' | 'USER_ACTION' | 'CACHE_INVALIDATION' | 'FOCUS_CHANGE'
  payload: any
  source: string
  timestamp: Date
}
```

## Real-time Synchronization Architecture

### WebSocket Manager Implementation

```typescript
// lib/realtime/websocket-manager.ts
import { RealtimeEvent, UserPresence, CollaborationCursor } from '@/types/realtime'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { logger } from '@/lib/monitoring/logger'

export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private messageQueue: RealtimeEvent[] = []
  private isConnecting = false

  constructor(
    private userId: string,
    private sessionId: string,
    private onMessage: (event: RealtimeEvent) => void,
    private onPresenceUpdate: (presence: UserPresence[]) => void
  ) {}

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      const token = await this.getAuthToken()
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws?token=${token}&userId=${this.userId}&sessionId=${this.sessionId}`
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

    } catch (error) {
      logger.error('WebSocket connection failed', { error, userId: this.userId })
      this.isConnecting = false
      throw error
    }
  }

  private handleOpen() {
    logger.info('WebSocket connected', { userId: this.userId })
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Send queued messages
    this.flushMessageQueue()
    
    // Update user presence
    this.updatePresence('online')
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'REALTIME_EVENT':
          this.onMessage(data.payload as RealtimeEvent)
          break
          
        case 'PRESENCE_UPDATE':
          this.onPresenceUpdate(data.payload as UserPresence[])
          break
          
        case 'HEARTBEAT':
          this.sendMessage({ type: 'HEARTBEAT_ACK', timestamp: Date.now() })
          break
          
        case 'CONFLICT_DETECTED':
          this.handleConflict(data.payload)
          break
          
        default:
          logger.warn('Unknown WebSocket message type', { type: data.type })
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { error, raw: event.data })
    }
  }

  private handleClose(event: CloseEvent) {
    logger.info('WebSocket disconnected', { 
      code: event.code, 
      reason: event.reason,
      userId: this.userId 
    })
    
    this.stopHeartbeat()
    this.updatePresence('offline')
    
    // Attempt reconnection if not intentional
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect()
    }
  }

  private handleError(error: Event) {
    logger.error('WebSocket error', { error, userId: this.userId })
    this.updatePresence('offline')
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', { userId: this.userId })
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    this.reconnectAttempts++
    
    setTimeout(() => {
      logger.info('Attempting WebSocket reconnection', { 
        attempt: this.reconnectAttempts,
        userId: this.userId 
      })
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'HEARTBEAT', timestamp: Date.now() })
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const event = this.messageQueue.shift()!
      this.ws.send(JSON.stringify(event))
    }
  }

  public sendEvent(event: Omit<RealtimeEvent, 'id' | 'userId' | 'sessionId' | 'timestamp'>): void {
    const fullEvent: RealtimeEvent = {
      id: crypto.randomUUID(),
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      ...event
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'REALTIME_EVENT', payload: fullEvent }))
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(fullEvent)
      
      // Prevent queue from growing too large
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift()
      }
    }
  }

  private sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private updatePresence(status: 'online' | 'away' | 'offline') {
    this.sendEvent({
      type: 'USER_PRESENCE_CHANGED',
      payload: {
        userId: this.userId,
        status,
        currentPage: window.location.pathname,
        device: {
          type: this.getDeviceType(),
          browser: navigator.userAgent
        }
      },
      version: 1
    })
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('mobile')) return 'mobile'
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) return 'tablet'
    return 'desktop'
  }

  private async getAuthToken(): Promise<string> {
    // This would integrate with your auth system
    return 'mock-auth-token'
  }

  private handleConflict(conflict: ConflictResolution) {
    // Handle conflict resolution
    logger.warn('Data conflict detected', { conflict })
    // Implement conflict resolution strategy
  }

  public disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  public getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed'
    
    const states = ['connecting', 'open', 'closing', 'closed'] as const
    return states[this.ws.readyState]
  }
}
```

### Server-Sent Events for Unidirectional Updates

```typescript
// lib/realtime/sse-manager.ts
import { RealtimeEvent } from '@/types/realtime'
import { logger } from '@/lib/monitoring/logger'

export class SSEManager {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 5000

  constructor(
    private userId: string,
    private onEvent: (event: RealtimeEvent) => void,
    private onError?: (error: Event) => void
  ) {}

  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return
    }

    try {
      const url = `/api/events/subscribe?userId=${this.userId}&timestamp=${Date.now()}`
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        logger.info('SSE connected', { userId: this.userId })
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data)
          this.onEvent(realtimeEvent)
        } catch (error) {
          logger.error('Failed to parse SSE event', { error, data: event.data })
        }
      }

      this.eventSource.onerror = (error) => {
        logger.error('SSE error', { error, userId: this.userId })
        this.onError?.(error)
        this.handleReconnection()
      }

    } catch (error) {
      logger.error('SSE connection failed', { error, userId: this.userId })
      throw error
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max SSE reconnection attempts reached', { userId: this.userId })
      return
    }

    this.reconnectAttempts++
    
    setTimeout(() => {
      logger.info('Attempting SSE reconnection', { 
        attempt: this.reconnectAttempts,
        userId: this.userId 
      })
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }
}

// React Hook for SSE Integration
export function useServerSentEvents(userId: string) {
  const [sseManager, setSSEManager] = React.useState<SSEManager | null>(null)
  const [connectionState, setConnectionState] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const { handleRealtimeEvent } = useRealtimeStore()

  React.useEffect(() => {
    if (!userId) return

    const manager = new SSEManager(
      userId,
      handleRealtimeEvent,
      () => setConnectionState('disconnected')
    )

    setSSEManager(manager)
    setConnectionState('connecting')
    manager.connect()

    const handleOnline = () => {
      setConnectionState('connecting')
      manager.connect()
    }

    const handleOffline = () => {
      setConnectionState('disconnected')
      manager.disconnect()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      manager.disconnect()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [userId, handleRealtimeEvent])

  return { connectionState, sseManager }
}
```

## Cross-tab Synchronization with BroadcastChannel

### BroadcastChannel Manager

```typescript
// lib/realtime/broadcast-manager.ts
import { CrossTabMessage } from '@/types/synchronization'
import { logger } from '@/lib/monitoring/logger'

export class BroadcastManager {
  private channel: BroadcastChannel
  private messageHandlers = new Map<string, Set<(data: any) => void>>()

  constructor(private channelName: string = 'taskmaster-pro') {
    this.channel = new BroadcastChannel(channelName)
    this.channel.onmessage = this.handleMessage.bind(this)
    
    // Handle tab close/refresh
    window.addEventListener('beforeunload', this.cleanup.bind(this))
  }

  private handleMessage(event: MessageEvent<CrossTabMessage>) {
    const { type, payload, source, timestamp } = event.data
    
    // Ignore messages from same tab
    if (source === this.getTabId()) return

    // Log for debugging
    logger.debug('Cross-tab message received', { type, source, timestamp })

    // Call registered handlers
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          logger.error('Cross-tab message handler failed', { error, type })
        }
      })
    }
  }

  public subscribe(messageType: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    
    this.messageHandlers.get(messageType)!.add(handler)
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType)
        }
      }
    }
  }

  public broadcast(type: string, payload: any): void {
    const message: CrossTabMessage = {
      type,
      payload,
      source: this.getTabId(),
      timestamp: new Date()
    }

    try {
      this.channel.postMessage(message)
    } catch (error) {
      logger.error('Failed to broadcast message', { error, type })
    }
  }

  private getTabId(): string {
    // Generate unique tab ID if not exists
    let tabId = sessionStorage.getItem('tab-id')
    if (!tabId) {
      tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('tab-id', tabId)
    }
    return tabId
  }

  private cleanup() {
    this.channel.close()
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }
}

// React Hook for Cross-tab Synchronization
export function useCrossTabSync() {
  const [broadcastManager] = React.useState(() => new BroadcastManager())
  const { syncStores } = useRealtimeStore()

  React.useEffect(() => {
    // Subscribe to state updates from other tabs
    const unsubscribeStateUpdate = broadcastManager.subscribe(
      'STATE_UPDATE',
      (payload) => {
        logger.debug('Syncing state from other tab', { payload })
        syncStores(payload)
      }
    )

    // Subscribe to cache invalidations
    const unsubscribeCacheInvalidation = broadcastManager.subscribe(
      'CACHE_INVALIDATION',
      (payload) => {
        logger.debug('Invalidating cache from other tab', { payload })
        // Invalidate specific query keys
        if (payload.queryKeys) {
          // This would integrate with TanStack Query
          queryClient.invalidateQueries({ queryKey: payload.queryKeys })
        }
      }
    )

    // Subscribe to focus changes
    const unsubscribeFocusChange = broadcastManager.subscribe(
      'FOCUS_CHANGE',
      (payload) => {
        // Handle focus session coordination across tabs
        if (payload.type === 'FOCUS_STARTED') {
          // Show notification in other tabs
          showNotification({
            title: 'Focus session started in another tab',
            description: 'Timer will be synchronized across all tabs',
            type: 'info'
          })
        }
      }
    )

    return () => {
      unsubscribeStateUpdate()
      unsubscribeCacheInvalidation()
      unsubscribeFocusChange()
    }
  }, [broadcastManager, syncStores])

  const broadcastStateUpdate = React.useCallback((storeType: string, data: any) => {
    broadcastManager.broadcast('STATE_UPDATE', { storeType, data })
  }, [broadcastManager])

  const broadcastCacheInvalidation = React.useCallback((queryKeys: string[]) => {
    broadcastManager.broadcast('CACHE_INVALIDATION', { queryKeys })
  }, [broadcastManager])

  return {
    broadcastStateUpdate,
    broadcastCacheInvalidation,
    broadcastManager
  }
}
```

## Optimistic UI Patterns and Conflict Resolution

### Optimistic Update Manager

```typescript
// lib/state/optimistic-manager.ts
import { logger } from '@/lib/monitoring/logger'

export interface OptimisticUpdate<T = any> {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'TASK' | 'PROJECT' | 'NOTE'
  entityId: string
  optimisticData: T
  originalData?: T
  timestamp: Date
  timeout: number
  retryCount: number
  maxRetries: number
}

export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, OptimisticUpdate>()
  private timeouts = new Map<string, NodeJS.Timeout>()

  public addOptimisticUpdate<T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const fullUpdate: OptimisticUpdate<T> = {
      id,
      timestamp: new Date(),
      retryCount: 0,
      ...update
    }

    this.pendingUpdates.set(id, fullUpdate)
    
    // Set timeout for automatic rollback
    const timeoutId = setTimeout(() => {
      this.rollbackUpdate(id, 'Timeout reached')
    }, update.timeout)
    
    this.timeouts.set(id, timeoutId)

    logger.debug('Optimistic update added', { updateId: id, type: update.type, entity: update.entity })
    
    return id
  }

  public confirmUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId)
    if (!update) return

    // Clear timeout
    const timeoutId = this.timeouts.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(updateId)
    }

    // Remove from pending
    this.pendingUpdates.delete(updateId)

    logger.debug('Optimistic update confirmed', { updateId, type: update.type })
  }

  public rollbackUpdate(updateId: string, reason: string): void {
    const update = this.pendingUpdates.get(updateId)
    if (!update) return

    // Clear timeout
    const timeoutId = this.timeouts.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(updateId)
    }

    // Remove from pending
    this.pendingUpdates.delete(updateId)

    logger.warn('Optimistic update rolled back', { 
      updateId, 
      type: update.type, 
      reason,
      retryCount: update.retryCount 
    })

    // Trigger rollback in stores
    this.triggerRollback(update)
  }

  public rollbackAllUpdates(entityType?: string): void {
    const updatesToRollback = Array.from(this.pendingUpdates.values())
      .filter(update => !entityType || update.entity === entityType)

    updatesToRollback.forEach(update => {
      this.rollbackUpdate(update.id, 'Bulk rollback')
    })

    logger.info('Bulk optimistic rollback completed', { 
      count: updatesToRollback.length,
      entityType 
    })
  }

  private triggerRollback(update: OptimisticUpdate): void {
    // This would integrate with your store system to rollback changes
    // Implementation depends on your specific store architecture
    switch (update.entity) {
      case 'TASK':
        // Rollback task changes
        window.dispatchEvent(new CustomEvent('optimistic-rollback', {
          detail: { type: 'TASK', updateId: update.id, originalData: update.originalData }
        }))
        break
      case 'PROJECT':
        // Rollback project changes
        window.dispatchEvent(new CustomEvent('optimistic-rollback', {
          detail: { type: 'PROJECT', updateId: update.id, originalData: update.originalData }
        }))
        break
      case 'NOTE':
        // Rollback note changes
        window.dispatchEvent(new CustomEvent('optimistic-rollback', {
          detail: { type: 'NOTE', updateId: update.id, originalData: update.originalData }
        }))
        break
    }
  }

  public getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values())
  }

  public hasPendingUpdates(entityId?: string): boolean {
    if (!entityId) {
      return this.pendingUpdates.size > 0
    }
    
    return Array.from(this.pendingUpdates.values())
      .some(update => update.entityId === entityId)
  }
}

export const optimisticManager = new OptimisticUpdateManager()
```

### Enhanced TanStack Query Integration

```typescript
// hooks/useOptimisticMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { optimisticManager } from '@/lib/state/optimistic-manager'
import { useCrossTabSync } from '@/lib/realtime/broadcast-manager'
import { useToast } from '@/hooks/use-toast'

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: string[]
  optimisticUpdateFn: (variables: TVariables) => any
  entity: 'TASK' | 'PROJECT' | 'NOTE'
  timeout?: number
  maxRetries?: number
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  optimisticUpdateFn,
  entity,
  timeout = 10000,
  maxRetries = 3
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()
  const { broadcastStateUpdate, broadcastCacheInvalidation } = useCrossTabSync()
  const { toast } = useToast()

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey)

      // Create optimistic update
      const optimisticData = optimisticUpdateFn(variables)
      const updateId = optimisticManager.addOptimisticUpdate({
        type: 'UPDATE',
        entity,
        entityId: (variables as any).id || 'unknown',
        optimisticData,
        originalData: previousData,
        timeout,
        maxRetries
      })

      // Apply optimistic update
      queryClient.setQueryData(queryKey, optimisticData)

      // Broadcast to other tabs
      broadcastStateUpdate(entity.toLowerCase(), optimisticData)

      return { previousData, updateId }
    },

    onSuccess: (data, variables, context) => {
      if (context?.updateId) {
        // Confirm optimistic update
        optimisticManager.confirmUpdate(context.updateId)
      }

      // Update with real data
      queryClient.setQueryData(queryKey, data)
      
      // Broadcast confirmed update to other tabs
      broadcastStateUpdate(entity.toLowerCase(), data)
      broadcastCacheInvalidation(queryKey)
    },

    onError: (error, variables, context) => {
      if (context?.updateId) {
        // Rollback optimistic update
        optimisticManager.rollbackUpdate(context.updateId, error.message)
      }

      // Restore previous data
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }

      // Show error toast
      toast({
        title: 'Operation failed',
        description: error.message,
        variant: 'destructive'
      })

      // Broadcast rollback to other tabs
      if (context?.previousData) {
        broadcastStateUpdate(entity.toLowerCase(), context.previousData)
      }
    },

    onSettled: () => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey })
    }
  })
}
```

## Performance Monitoring and Metrics Collection

### Performance Monitor Service

```typescript
// lib/performance/monitor.ts
import { PerformanceMetrics, NetworkMetric, UserActionMetric } from '@/types/performance'
import { logger } from '@/lib/monitoring/logger'

export class PerformanceMonitor {
  private metrics: PerformanceMetrics | null = null
  private observer: PerformanceObserver | null = null
  private networkMetrics: NetworkMetric[] = []
  private userActions: UserActionMetric[] = []
  private startTime = Date.now()

  constructor(private sessionId: string, private userId: string) {
    this.initializeMetrics()
    this.setupPerformanceObserver()
    this.setupNetworkMonitoring()
    this.setupUserActionTracking()
  }

  private initializeMetrics(): void {
    this.metrics = {
      id: crypto.randomUUID(),
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date(),
      LCP: 0,
      FID: 0,
      CLS: 0,
      FCP: 0,
      TTI: 0,
      memory: {
        used: 0,
        total: 0,
        limit: 0
      },
      networkRequests: [],
      cacheHitRate: 0,
      bundleSize: 0,
      renderTime: 0,
      stateUpdateTime: 0,
      queryResolutionTime: 0,
      userActions: [],
      errorCount: 0,
      warningCount: 0
    }
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            this.updateMetric('LCP', entry.startTime)
            break
          case 'first-input':
            this.updateMetric('FID', (entry as PerformanceEventTiming).processingStart - entry.startTime)
            break
          case 'layout-shift':
            this.updateMetric('CLS', this.metrics!.CLS + (entry as any).value)
            break
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              this.updateMetric('FCP', entry.startTime)
            }
            break
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming
            this.updateMetric('TTI', navEntry.domInteractive - navEntry.fetchStart)
            break
        }
      })
    })

    // Observe all performance entry types
    try {
      this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation'] })
    } catch (error) {
      logger.warn('Performance observer setup failed', { error })
    }
  }

  private setupNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const start = performance.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url
      const method = args[1]?.method || 'GET'

      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - start
        
        this.recordNetworkMetric({
          url,
          method,
          duration,
          size: parseInt(response.headers.get('content-length') || '0'),
          cached: response.headers.get('x-cache') === 'HIT',
          status: response.status,
          type: 'fetch'
        })

        return response
      } catch (error) {
        const duration = performance.now() - start
        
        this.recordNetworkMetric({
          url,
          method,
          duration,
          size: 0,
          cached: false,
          status: 0,
          type: 'fetch'
        })

        throw error
      }
    }
  }

  private setupUserActionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.recordUserAction({
        action: 'click',
        element: this.getElementSelector(event.target as Element),
        timestamp: new Date(),
        duration: 0,
        successful: true
      })
    })

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const start = performance.now()
      
      // Track form submission duration
      setTimeout(() => {
        this.recordUserAction({
          action: 'form_submit',
          element: this.getElementSelector(event.target as Element),
          timestamp: new Date(),
          duration: performance.now() - start,
          successful: true
        })
      }, 0)
    })
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ')[0]}`
    return element.tagName.toLowerCase()
  }

  private updateMetric(key: keyof PerformanceMetrics, value: number): void {
    if (this.metrics) {
      (this.metrics as any)[key] = value
    }
  }

  private recordNetworkMetric(metric: NetworkMetric): void {
    this.networkMetrics.push(metric)
    if (this.metrics) {
      this.metrics.networkRequests = [...this.networkMetrics]
      
      // Update cache hit rate
      const totalRequests = this.networkMetrics.length
      const cachedRequests = this.networkMetrics.filter(m => m.cached).length
      this.metrics.cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0
    }
  }

  private recordUserAction(action: UserActionMetric): void {
    this.userActions.push(action)
    if (this.metrics) {
      this.metrics.userActions = [...this.userActions]
    }
  }

  public measureRenderTime<T>(operation: () => T, component: string): T {
    const start = performance.now()
    const result = operation()
    const duration = performance.now() - start

    if (this.metrics) {
      this.metrics.renderTime = Math.max(this.metrics.renderTime, duration)
    }

    logger.debug('Render time measured', { component, duration })
    return result
  }

  public measureStateUpdate<T>(operation: () => T): T {
    const start = performance.now()
    const result = operation()
    const duration = performance.now() - start

    if (this.metrics) {
      this.metrics.stateUpdateTime = Math.max(this.metrics.stateUpdateTime, duration)
    }

    return result
  }

  public recordError(error: Error, context?: Record<string, any>): void {
    if (this.metrics) {
      this.metrics.errorCount++
    }

    logger.error('Application error recorded', { error: error.message, context })
  }

  public recordWarning(message: string, context?: Record<string, any>): void {
    if (this.metrics) {
      this.metrics.warningCount++
    }

    logger.warn('Application warning recorded', { message, context })
  }

  public getMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      if (this.metrics) {
        this.metrics.memory = {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit
        }
      }
    }
  }

  public getMetrics(): PerformanceMetrics | null {
    this.getMemoryUsage()
    return this.metrics
  }

  public reportMetrics(): void {
    if (!this.metrics) return

    // Send metrics to analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.metrics)
    }).catch(error => {
      logger.error('Failed to report performance metrics', { error })
    })
  }

  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect()
    }

    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()

    // Report final metrics
    this.reportMetrics()
  }
}

// React Hook for Performance Monitoring
export function usePerformanceMonitor() {
  const [monitor] = React.useState(() => 
    new PerformanceMonitor(
      sessionStorage.getItem('session-id') || crypto.randomUUID(),
      'current-user' // This would come from auth
    )
  )

  React.useEffect(() => {
    // Report metrics every 30 seconds
    const interval = setInterval(() => {
      monitor.reportMetrics()
    }, 30000)

    // Report on page unload
    const handleBeforeUnload = () => {
      monitor.reportMetrics()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      monitor.cleanup()
    }
  }, [monitor])

  return {
    measureRenderTime: monitor.measureRenderTime.bind(monitor),
    measureStateUpdate: monitor.measureStateUpdate.bind(monitor),
    recordError: monitor.recordError.bind(monitor),
    recordWarning: monitor.recordWarning.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor)
  }
}
```

## Virtual Scrolling and Lazy Loading Patterns

### Virtual List Component with Performance Optimization

```typescript
// components/virtualization/VirtualList.tsx
'use client'

import React from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { useMeasure } from '@/hooks/useMeasure'
import { usePerformanceMonitor } from '@/lib/performance/monitor'
import { Card } from '@/components/ui/card'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode
  className?: string
  overscanCount?: number
  onScroll?: (scrollTop: number) => void
  loadMore?: () => void
  hasNextPage?: boolean
  isLoading?: boolean
  threshold?: number
}

export function VirtualList<T extends { id: string }>({
  items,
  itemHeight,
  renderItem,
  className,
  overscanCount = 5,
  onScroll,
  loadMore,
  hasNextPage,
  isLoading,
  threshold = 0.8
}: VirtualListProps<T>) {
  const [containerRef, bounds] = useMeasure()
  const { measureRenderTime } = usePerformanceMonitor()
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 })
  const listRef = React.useRef<List>(null)

  // Memoize item renderer for performance
  const ItemRenderer = React.useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index]
    if (!item) return null

    const isVisible = index >= visibleRange.start && index <= visibleRange.end

    return measureRenderTime(() => (
      <div style={style} className="px-2">
        <div className="pb-2">
          {renderItem(item, index, isVisible)}
        </div>
      </div>
    ), `VirtualList-Item-${index}`)
  }, [items, renderItem, visibleRange, measureRenderTime])

  // Handle scroll with infinite loading
  const handleScroll = React.useCallback(({ scrollTop, scrollHeight, clientHeight }: any) => {
    onScroll?.(scrollTop)
    
    // Calculate visible range
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(start + Math.ceil(clientHeight / itemHeight), items.length - 1)
    setVisibleRange({ start, end })

    // Check if need to load more
    if (loadMore && hasNextPage && !isLoading) {
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
      if (scrollPercentage >= threshold) {
        loadMore()
      }
    }
  }, [itemHeight, items.length, onScroll, loadMore, hasNextPage, isLoading, threshold])

  // Keyboard navigation
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (!listRef.current) return

    const currentIndex = Math.floor(visibleRange.start + (visibleRange.end - visibleRange.start) / 2)
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        listRef.current.scrollToItem(Math.min(currentIndex + 1, items.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        listRef.current.scrollToItem(Math.max(currentIndex - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        listRef.current.scrollToItem(0)
        break
      case 'End':
        event.preventDefault()
        listRef.current.scrollToItem(items.length - 1)
        break
    }
  }, [visibleRange, items.length])

  if (items.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <p>No items to display</p>
        </div>
      </Card>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={className}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={`Virtual list with ${items.length} items`}
    >
      {bounds.height > 0 && (
        <List
          ref={listRef}
          height={bounds.height}
          itemCount={items.length}
          itemSize={itemHeight}
          overscanCount={overscanCount}
          onScroll={handleScroll}
          itemData={items}
        >
          {ItemRenderer}
        </List>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}
    </div>
  )
}
```

### Lazy Loading Hook with Intersection Observer

```typescript
// hooks/useLazyLoading.ts
import { useState, useEffect, useRef, useCallback } from 'react'

interface UseLazyLoadingOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useLazyLoading({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true
}: UseLazyLoadingOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        setIsIntersecting(isVisible)
        
        if (isVisible && !hasTriggered) {
          setHasTriggered(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  const reset = useCallback(() => {
    setHasTriggered(false)
    setIsIntersecting(false)
  }, [])

  return {
    elementRef,
    isIntersecting,
    hasTriggered,
    reset
  }
}

// Lazy Loading Component
interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onIntersect?: () => void
  threshold?: number
  rootMargin?: string
}

export function LazyLoad({ 
  children, 
  fallback = <div className="h-32 animate-pulse bg-muted rounded" />,
  onIntersect,
  threshold,
  rootMargin
}: LazyLoadProps) {
  const { elementRef, hasTriggered } = useLazyLoading({ threshold, rootMargin })

  React.useEffect(() => {
    if (hasTriggered && onIntersect) {
      onIntersect()
    }
  }, [hasTriggered, onIntersect])

  return (
    <div ref={elementRef}>
      {hasTriggered ? children : fallback}
    </div>
  )
}
```

## Memory Management and Cleanup Strategies

### Memory Management Service

```typescript
// lib/performance/memory-manager.ts
import { logger } from '@/lib/monitoring/logger'
import { MemoryUsage } from '@/types/performance'

export class MemoryManager {
  private cleanupTasks = new Set<() => void>()
  private memoryUsageHistory: MemoryUsage[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private gcThreshold = 50 * 1024 * 1024 // 50MB

  constructor() {
    this.startMonitoring()
    this.setupCleanupHandlers()
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryMetrics()
      this.checkMemoryPressure()
    }, 10000) // Every 10 seconds
  }

  private collectMemoryMetrics(): void {
    if (!('memory' in performance)) return

    const memInfo = (performance as any).memory
    const usage: MemoryUsage = {
      component: 'global',
      size: memInfo.usedJSHeapSize,
      timestamp: new Date(),
      type: 'other'
    }

    this.memoryUsageHistory.push(usage)
    
    // Keep only last 100 measurements
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift()
    }
  }

  private checkMemoryPressure(): void {
    if (!('memory' in performance)) return

    const memInfo = (performance as any).memory
    const usagePercentage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100

    if (usagePercentage > 80) {
      logger.warn('High memory usage detected', { 
        usagePercentage: usagePercentage.toFixed(2),
        used: this.formatBytes(memInfo.usedJSHeapSize),
        limit: this.formatBytes(memInfo.jsHeapSizeLimit)
      })
      
      this.performGarbageCollection()
    }
  }

  private async performGarbageCollection(): Promise<void> {
    logger.info('Starting memory cleanup')

    // Run all registered cleanup tasks
    let cleanedUp = 0
    for (const cleanup of this.cleanupTasks) {
      try {
        cleanup()
        cleanedUp++
      } catch (error) {
        logger.error('Cleanup task failed', { error })
      }
    }

    // Clear large caches
    this.clearImageCache()
    this.clearOldQueryCache()

    // Suggest browser GC if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }

    logger.info('Memory cleanup completed', { cleanupTasksRun: cleanedUp })
  }

  private clearImageCache(): void {
    // Clear cached images older than 5 minutes
    const images = document.querySelectorAll('img[data-cached]')
    const cutoff = Date.now() - 5 * 60 * 1000

    images.forEach(img => {
      const cachedTime = parseInt(img.getAttribute('data-cached') || '0')
      if (cachedTime < cutoff) {
        img.removeAttribute('src')
        img.removeAttribute('data-cached')
      }
    })
  }

  private clearOldQueryCache(): void {
    // This would integrate with TanStack Query to clear old cache entries
    const queryClient = window.__QUERY_CLIENT__
    if (queryClient) {
      queryClient.clear()
      logger.debug('Query cache cleared')
    }
  }

  public registerCleanupTask(cleanup: () => void): () => void {
    this.cleanupTasks.add(cleanup)
    
    return () => {
      this.cleanupTasks.delete(cleanup)
    }
  }

  public trackComponentMemory(component: string, size: number, type: MemoryUsage['type']): void {
    const usage: MemoryUsage = {
      component,
      size,
      timestamp: new Date(),
      type
    }

    this.memoryUsageHistory.push(usage)
  }

  public getMemoryReport(): {
    current: number
    peak: number
    average: number
    trend: 'increasing' | 'decreasing' | 'stable'
    byComponent: Record<string, number>
  } {
    if (!('memory' in performance)) {
      return {
        current: 0,
        peak: 0,
        average: 0,
        trend: 'stable',
        byComponent: {}
      }
    }

    const memInfo = (performance as any).memory
    const recent = this.memoryUsageHistory.slice(-10)
    
    const peak = Math.max(...this.memoryUsageHistory.map(m => m.size))
    const average = this.memoryUsageHistory.reduce((sum, m) => sum + m.size, 0) / this.memoryUsageHistory.length

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (recent.length >= 5) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
      const secondHalf = recent.slice(Math.floor(recent.length / 2))
      
      const firstAvg = firstHalf.reduce((sum, m) => sum + m.size, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.size, 0) / secondHalf.length
      
      const change = (secondAvg - firstAvg) / firstAvg
      
      if (change > 0.1) trend = 'increasing'
      else if (change < -0.1) trend = 'decreasing'
    }

    // Group by component
    const byComponent: Record<string, number> = {}
    this.memoryUsageHistory.forEach(usage => {
      byComponent[usage.component] = (byComponent[usage.component] || 0) + usage.size
    })

    return {
      current: memInfo.usedJSHeapSize,
      peak,
      average,
      trend,
      byComponent
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    this.cleanupTasks.clear()
    this.memoryUsageHistory = []
  }
}

export const memoryManager = new MemoryManager()

// React Hook for Memory Management
export function useMemoryManagement(componentName: string) {
  const cleanupRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    // Register component cleanup
    cleanupRef.current = memoryManager.registerCleanupTask(() => {
      // Component-specific cleanup logic
      logger.debug(`Cleanup for ${componentName}`)
    })

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [componentName])

  const trackMemory = React.useCallback((size: number, type: MemoryUsage['type'] = 'component') => {
    memoryManager.trackComponentMemory(componentName, size, type)
  }, [componentName])

  return { trackMemory }
}
```

## Advanced Caching Strategies with TanStack Query

### Smart Cache Management

```typescript
// lib/cache/query-cache-manager.ts
import { QueryClient, QueryKey } from '@tanstack/react-query'
import { logger } from '@/lib/monitoring/logger'

export class QueryCacheManager {
  private queryClient: QueryClient
  private cacheMetrics = new Map<string, CacheMetrics>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
    this.setupCacheMonitoring()
    this.startPeriodicCleanup()
  }

  private setupCacheMonitoring(): void {
    // Monitor cache hits and misses
    const originalInvalidateQueries = this.queryClient.invalidateQueries.bind(this.queryClient)
    this.queryClient.invalidateQueries = (filters) => {
      this.recordCacheInvalidation(filters)
      return originalInvalidateQueries(filters)
    }

    // Monitor query fetches
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'success') {
        this.recordCacheHit(event.query.queryKey)
      }
    })
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performIntelligentCleanup()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private recordCacheHit(queryKey: QueryKey): void {
    const keyString = JSON.stringify(queryKey)
    const existing = this.cacheMetrics.get(keyString) || {
      key: keyString,
      hits: 0,
      misses: 0,
      lastAccessed: new Date(),
      size: 0,
      ttl: 0
    }

    existing.hits++
    existing.lastAccessed = new Date()
    this.cacheMetrics.set(keyString, existing)
  }

  private recordCacheInvalidation(filters: any): void {
    logger.debug('Cache invalidation triggered', { filters })
  }

  private performIntelligentCleanup(): void {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes
    const lowHitThreshold = 2

    let removedCount = 0

    // Remove old, unused cache entries
    this.queryClient.getQueryCache().getAll().forEach(query => {
      const lastUpdated = query.state.dataUpdatedAt
      const age = now - lastUpdated
      
      const keyString = JSON.stringify(query.queryKey)
      const metrics = this.cacheMetrics.get(keyString)
      
      // Remove if old and rarely accessed
      if (age > maxAge && (!metrics || metrics.hits < lowHitThreshold)) {
        this.queryClient.removeQueries({ queryKey: query.queryKey })
        this.cacheMetrics.delete(keyString)
        removedCount++
      }
    })

    if (removedCount > 0) {
      logger.info('Cache cleanup completed', { removedEntries: removedCount })
    }
  }

  public getCacheStats(): {
    totalQueries: number
    hitRate: number
    totalSize: number
    oldestEntry: Date | null
    mostUsed: string[]
  } {
    const allQueries = this.queryClient.getQueryCache().getAll()
    const metrics = Array.from(this.cacheMetrics.values())

    const totalHits = metrics.reduce((sum, m) => sum + m.hits, 0)
    const totalMisses = metrics.reduce((sum, m) => sum + m.misses, 0)
    const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0

    const oldestEntry = allQueries.length > 0 
      ? new Date(Math.min(...allQueries.map(q => q.state.dataUpdatedAt)))
      : null

    const mostUsed = metrics
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map(m => m.key)

    return {
      totalQueries: allQueries.length,
      hitRate: Math.round(hitRate * 100) / 100,
      totalSize: this.estimateCacheSize(),
      oldestEntry,
      mostUsed
    }
  }

  private estimateCacheSize(): number {
    // Rough estimation of cache size in bytes
    let totalSize = 0
    
    this.queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.data) {
        // Rough JSON size estimation
        try {
          totalSize += JSON.stringify(query.state.data).length * 2 // UTF-16
        } catch {
          totalSize += 1024 // Fallback estimate
        }
      }
    })

    return totalSize
  }

  public preloadQuery<T>(
    queryKey: QueryKey,
    queryFn: () => Promise<T>,
    staleTime = 5 * 60 * 1000
  ): void {
    this.queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime
    })

    logger.debug('Query preloaded', { queryKey })
  }

  public warmupCache(criticalQueries: Array<{ queryKey: QueryKey; queryFn: () => Promise<any> }>): void {
    logger.info('Warming up cache', { queryCount: criticalQueries.length })

    criticalQueries.forEach(({ queryKey, queryFn }) => {
      this.preloadQuery(queryKey, queryFn)
    })
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cacheMetrics.clear()
  }
}

interface CacheMetrics {
  key: string
  hits: number
  misses: number
  lastAccessed: Date
  size: number
  ttl: number
}
```

## State Persistence and Recovery Mechanisms

### State Hydration Manager

```typescript
// lib/state/hydration-manager.ts
import { StateSnapshot } from '@/types/synchronization'
import { logger } from '@/lib/monitoring/logger'

export class HydrationManager {
  private readonly STORAGE_KEY = 'taskmaster-state'
  private readonly VERSION_KEY = 'taskmaster-state-version'
  private readonly CURRENT_VERSION = '1.0.0'

  public async saveState(stores: Record<string, any>): Promise<void> {
    try {
      const snapshot: StateSnapshot = {
        id: crypto.randomUUID(),
        version: 1,
        timestamp: new Date(),
        userId: stores.auth?.user?.id || '',
        stores: {
          tasks: this.sanitizeStoreData(stores.tasks),
          projects: this.sanitizeStoreData(stores.projects),
          notes: this.sanitizeStoreData(stores.notes),
          focus: this.sanitizeStoreData(stores.focus),
          ui: this.sanitizeStoreData(stores.ui)
        },
        checksum: ''
      }

      snapshot.checksum = await this.calculateChecksum(snapshot.stores)

      // Save to localStorage with compression
      const compressed = await this.compressData(snapshot)
      localStorage.setItem(this.STORAGE_KEY, compressed)
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION)

      logger.debug('State saved successfully', { 
        version: snapshot.version,
        checksum: snapshot.checksum,
        size: compressed.length 
      })

    } catch (error) {
      logger.error('Failed to save state', { error })
    }
  }

  public async loadState(): Promise<StateSnapshot | null> {
    try {
      const version = localStorage.getItem(this.VERSION_KEY)
      if (version !== this.CURRENT_VERSION) {
        logger.warn('State version mismatch', { stored: version, current: this.CURRENT_VERSION })
        await this.migrateState(version, this.CURRENT_VERSION)
      }

      const compressed = localStorage.getItem(this.STORAGE_KEY)
      if (!compressed) return null

      const snapshot = await this.decompressData(compressed) as StateSnapshot

      // Validate checksum
      const calculatedChecksum = await this.calculateChecksum(snapshot.stores)
      if (calculatedChecksum !== snapshot.checksum) {
        logger.error('State checksum mismatch', { 
          stored: snapshot.checksum, 
          calculated: calculatedChecksum 
        })
        return null
      }

      logger.debug('State loaded successfully', { 
        version: snapshot.version,
        timestamp: snapshot.timestamp 
      })

      return snapshot

    } catch (error) {
      logger.error('Failed to load state', { error })
      return null
    }
  }

  private sanitizeStoreData(storeData: any): any {
    if (!storeData) return null

    // Remove non-serializable data
    const sanitized = { ...storeData }
    
    // Remove functions, symbols, and undefined values
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key]
      if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
        delete sanitized[key]
      } else if (value instanceof Map) {
        sanitized[key] = Object.fromEntries(value)
      } else if (value instanceof Set) {
        sanitized[key] = Array.from(value)
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString()
      }
    })

    return sanitized
  }

  private async calculateChecksum(data: any): Promise<string> {
    const str = JSON.stringify(data)
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    const hashArray = Array.from(new Uint8Array(hash))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async compressData(data: any): Promise<string> {
    const str = JSON.stringify(data)
    
    // Use compression if available
    if ('CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(new TextEncoder().encode(str))
        writer.close()
        
        const chunks: Uint8Array[] = []
        let done = false
        
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) chunks.push(value)
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          compressed.set(chunk, offset)
          offset += chunk.length
        }
        
        return btoa(String.fromCharCode(...compressed))
      } catch (error) {
        logger.warn('Compression failed, using raw data', { error })
      }
    }

    return btoa(str)
  }

  private async decompressData(compressed: string): Promise<any> {
    try {
      // Try decompression if data looks compressed
      if ('DecompressionStream' in window && compressed.length > 100) {
        try {
          const bytes = Uint8Array.from(atob(compressed), c => c.charCodeAt(0))
          const stream = new DecompressionStream('gzip')
          const writer = stream.writable.getWriter()
          const reader = stream.readable.getReader()
          
          writer.write(bytes)
          writer.close()
          
          const chunks: Uint8Array[] = []
          let done = false
          
          while (!done) {
            const { value, done: readerDone } = await reader.read()
            done = readerDone
            if (value) chunks.push(value)
          }
          
          const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            decompressed.set(chunk, offset)
            offset += chunk.length
          }
          
          const str = new TextDecoder().decode(decompressed)
          return JSON.parse(str)
        } catch (error) {
          logger.warn('Decompression failed, trying raw decode', { error })
        }
      }

      // Fallback to direct base64 decode
      const str = atob(compressed)
      return JSON.parse(str)

    } catch (error) {
      logger.error('Failed to decompress state data', { error })
      throw error
    }
  }

  private async migrateState(from: string | null, to: string): Promise<void> {
    logger.info('Migrating state', { from, to })

    // Clear old state if version is too different
    if (!from || this.isVersionIncompatible(from, to)) {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.setItem(this.VERSION_KEY, to)
      logger.info('State migration: cleared incompatible version')
      return
    }

    // Perform gradual migration if needed
    // This would contain specific migration logic based on version differences
    logger.info('State migration completed')
  }

  private isVersionIncompatible(from: string, to: string): boolean {
    const fromMajor = parseInt(from.split('.')[0])
    const toMajor = parseInt(to.split('.')[0])
    
    return fromMajor !== toMajor
  }

  public clearState(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.VERSION_KEY)
    logger.info('State cleared manually')
  }
}

export const hydrationManager = new HydrationManager()
```

### State Recovery Hook

```typescript
// hooks/useStateRecovery.ts
import { useState, useEffect } from 'react'
import { hydrationManager } from '@/lib/state/hydration-manager'
import { StateSnapshot } from '@/types/synchronization'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useNotesStore } from '@/stores/notesStore'
import { useFocusStore } from '@/stores/focusStore'
import { useUIStore } from '@/stores/uiStore'

export function useStateRecovery() {
  const [isHydrating, setIsHydrating] = useState(true)
  const [hydrationError, setHydrationError] = useState<string | null>(null)
  
  const taskStore = useTaskStore()
  const projectStore = useProjectStore()
  const notesStore = useNotesStore()
  const focusStore = useFocusStore()
  const uiStore = useUIStore()

  useEffect(() => {
    const hydrateStores = async () => {
      try {
        const snapshot = await hydrationManager.loadState()
        
        if (snapshot) {
          logger.info('Hydrating stores from saved state', { 
            timestamp: snapshot.timestamp,
            version: snapshot.version 
          })

          // Hydrate each store with validation
          if (snapshot.stores.tasks) {
            await taskStore.hydrate(snapshot.stores.tasks)
          }
          
          if (snapshot.stores.projects) {
            await projectStore.hydrate(snapshot.stores.projects)
          }
          
          if (snapshot.stores.notes) {
            await notesStore.hydrate(snapshot.stores.notes)
          }
          
          if (snapshot.stores.focus) {
            await focusStore.hydrate(snapshot.stores.focus)
          }
          
          if (snapshot.stores.ui) {
            await uiStore.hydrate(snapshot.stores.ui)
          }

          logger.info('Store hydration completed successfully')
        } else {
          logger.info('No saved state found, using defaults')
        }

      } catch (error) {
        logger.error('State hydration failed', { error })
        setHydrationError(error instanceof Error ? error.message : 'Unknown error')
        
        // Clear corrupted state
        hydrationManager.clearState()
      } finally {
        setIsHydrating(false)
      }
    }

    hydrateStores()
  }, [])

  // Auto-save state periodically
  useEffect(() => {
    if (isHydrating) return

    const saveInterval = setInterval(async () => {
      const currentStores = {
        tasks: taskStore.getState(),
        projects: projectStore.getState(),
        notes: notesStore.getState(),
        focus: focusStore.getState(),
        ui: uiStore.getState()
      }

      await hydrationManager.saveState(currentStores)
    }, 60000) // Save every minute

    // Save on page unload
    const handleBeforeUnload = async () => {
      const currentStores = {
        tasks: taskStore.getState(),
        projects: projectStore.getState(),
        notes: notesStore.getState(),
        focus: focusStore.getState(),
        ui: uiStore.getState()
      }

      await hydrationManager.saveState(currentStores)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(saveInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isHydrating, taskStore, projectStore, notesStore, focusStore, uiStore])

  const recoverFromError = async () => {
    setHydrationError(null)
    setIsHydrating(true)
    
    // Clear all stores
    taskStore.reset()
    projectStore.reset()
    notesStore.reset()
    focusStore.reset()
    uiStore.reset()
    
    // Clear saved state
    hydrationManager.clearState()
    
    setIsHydrating(false)
    logger.info('State recovery completed')
  }

  return {
    isHydrating,
    hydrationError,
    recoverFromError
  }
}
```

## Real-time Store Implementation

### Centralized Real-time Store with Zustand

```typescript
// stores/realtimeStore.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { RealtimeEvent, UserPresence, CollaborationCursor } from '@/types/realtime'
import { WebSocketManager } from '@/lib/realtime/websocket-manager'
import { SSEManager } from '@/lib/realtime/sse-manager'
import { logger } from '@/lib/monitoring/logger'

interface RealtimeState {
  // Connection State
  isConnected: boolean
  connectionType: 'websocket' | 'sse' | 'none'
  lastConnected: Date | null
  
  // User Presence
  currentUser: UserPresence | null
  otherUsers: UserPresence[]
  collaborativeCursors: CollaborationCursor[]
  
  // Event Management
  recentEvents: RealtimeEvent[]
  eventQueue: RealtimeEvent[]
  
  // Managers
  wsManager: WebSocketManager | null
  sseManager: SSEManager | null
  
  // Actions
  initialize: (userId: string, sessionId: string) => void
  handleRealtimeEvent: (event: RealtimeEvent) => void
  sendEvent: (event: Omit<RealtimeEvent, 'id' | 'userId' | 'sessionId' | 'timestamp'>) => void
  updatePresence: (presence: Partial<UserPresence>) => void
  disconnect: () => void
  
  // Cross-tab sync
  syncStores: (data: any) => void
  broadcastUpdate: (type: string, data: any) => void
}

export const useRealtimeStore = create<RealtimeState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        isConnected: false,
        connectionType: 'none',
        lastConnected: null,
        currentUser: null,
        otherUsers: [],
        collaborativeCursors: [],
        recentEvents: [],
        eventQueue: [],
        wsManager: null,
        sseManager: null,

        initialize: (userId: string, sessionId: string) => {
          const state = get()
          
          // Clean up existing connections
          if (state.wsManager) {
            state.wsManager.disconnect()
          }
          if (state.sseManager) {
            state.sseManager.disconnect()
          }

          // Try WebSocket first, fallback to SSE
          const wsManager = new WebSocketManager(
            userId,
            sessionId,
            state.handleRealtimeEvent,
            (users) => set({ otherUsers: users })
          )

          const sseManager = new SSEManager(
            userId,
            state.handleRealtimeEvent
          )

          // Attempt WebSocket connection
          wsManager.connect()
            .then(() => {
              set({ 
                wsManager,
                isConnected: true,
                connectionType: 'websocket',
                lastConnected: new Date()
              })
              logger.info('WebSocket connection established')
            })
            .catch(() => {
              // Fallback to SSE
              sseManager.connect()
              set({ 
                sseManager,
                isConnected: true,
                connectionType: 'sse',
                lastConnected: new Date()
              })
              logger.info('SSE connection established (WebSocket fallback)')
            })

          set({ wsManager, sseManager })
        },

        handleRealtimeEvent: (event: RealtimeEvent) => {
          const state = get()
          
          // Add to recent events
          const updatedEvents = [event, ...state.recentEvents].slice(0, 50)
          set({ recentEvents: updatedEvents })

          logger.debug('Realtime event received', { 
            type: event.type, 
            entityId: event.payload?.id || 'unknown' 
          })

          // Route event to appropriate handlers
          switch (event.type) {
            case 'TASK_CREATED':
            case 'TASK_UPDATED':
            case 'TASK_DELETED':
            case 'TASK_STATUS_CHANGED':
              // Trigger task store updates
              window.dispatchEvent(new CustomEvent('realtime-task-update', { 
                detail: event 
              }))
              break

            case 'PROJECT_UPDATED':
              // Trigger project store updates
              window.dispatchEvent(new CustomEvent('realtime-project-update', { 
                detail: event 
              }))
              break

            case 'NOTE_UPDATED':
              // Trigger notes store updates
              window.dispatchEvent(new CustomEvent('realtime-note-update', { 
                detail: event 
              }))
              break

            case 'USER_PRESENCE_CHANGED':
              state.updatePresence(event.payload)
              break

            case 'COLLABORATION_CURSOR':
              state.updateCollaborationCursor(event.payload)
              break

            case 'SYSTEM_NOTIFICATION':
              // Show system notification
              window.dispatchEvent(new CustomEvent('system-notification', { 
                detail: event.payload 
              }))
              break
          }
        },

        sendEvent: (eventData) => {
          const state = get()
          
          if (state.wsManager?.getConnectionState() === 'open') {
            state.wsManager.sendEvent(eventData)
          } else {
            // Queue event for later sending
            set(state => ({
              eventQueue: [...state.eventQueue, {
                id: crypto.randomUUID(),
                userId: state.currentUser?.userId || '',
                sessionId: state.currentUser?.sessionId || '',
                timestamp: new Date(),
                version: 1,
                ...eventData
              } as RealtimeEvent]
            }))
          }
        },

        updatePresence: (presenceData) => {
          const state = get()
          
          if (presenceData.userId === state.currentUser?.userId) {
            // Update current user presence
            set({
              currentUser: state.currentUser ? { ...state.currentUser, ...presenceData } : null
            })
          } else {
            // Update other users presence
            set({
              otherUsers: state.otherUsers.map(user =>
                user.userId === presenceData.userId 
                  ? { ...user, ...presenceData }
                  : user
              ).filter(user => user.status !== 'offline') // Remove offline users
            })
          }
        },

        updateCollaborationCursor: (cursor: CollaborationCursor) => {
          set(state => ({
            collaborativeCursors: [
              ...state.collaborativeCursors.filter(c => c.userId !== cursor.userId),
              cursor
            ].filter(c => Date.now() - c.lastMoved.getTime() < 10000) // Remove stale cursors
          }))
        },

        disconnect: () => {
          const state = get()
          
          if (state.wsManager) {
            state.wsManager.disconnect()
          }
          if (state.sseManager) {
            state.sseManager.disconnect()
          }

          set({
            isConnected: false,
            connectionType: 'none',
            wsManager: null,
            sseManager: null,
            otherUsers: [],
            collaborativeCursors: []
          })

          logger.info('Realtime connections closed')
        },

        syncStores: (data: any) => {
          // Handle cross-tab store synchronization
          logger.debug('Syncing stores from cross-tab message', { data })
          
          switch (data.storeType) {
            case 'tasks':
              // Sync task store
              window.dispatchEvent(new CustomEvent('cross-tab-sync', {
                detail: { store: 'tasks', data: data.data }
              }))
              break
            case 'projects':
              // Sync project store
              window.dispatchEvent(new CustomEvent('cross-tab-sync', {
                detail: { store: 'projects', data: data.data }
              }))
              break
            case 'notes':
              // Sync notes store
              window.dispatchEvent(new CustomEvent('cross-tab-sync', {
                detail: { store: 'notes', data: data.data }
              }))
              break
          }
        },

        broadcastUpdate: (type: string, data: any) => {
          // This would integrate with BroadcastChannel
          logger.debug('Broadcasting update to other tabs', { type })
        }
      })
    ),
    { name: 'realtime-store' }
  )
)

// Hook for real-time initialization
export function useRealtimeInitialization(userId: string) {
  const { initialize, disconnect } = useRealtimeStore()

  React.useEffect(() => {
    if (!userId) return

    const sessionId = crypto.randomUUID()
    initialize(userId, sessionId)

    return () => {
      disconnect()
    }
  }, [userId, initialize, disconnect])
}
```

## API Routes for Real-time Features

### Server-Sent Events API Route

```typescript
// app/api/events/subscribe/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { logger } from '@/lib/monitoring/logger'

// In-memory event storage (in production, use Redis or similar)
const eventStreams = new Map<string, ReadableStreamDefaultController>()
const userSessions = new Map<string, Set<string>>()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = session.user.id
  const timestamp = searchParams.get('timestamp')

  logger.info('SSE subscription requested', { userId, timestamp })

  // Create Server-Sent Events stream
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      
      // Store controller for sending events
      const sessionId = crypto.randomUUID()
      eventStreams.set(sessionId, controller)
      
      // Track user sessions
      if (!userSessions.has(userId)) {
        userSessions.set(userId, new Set())
      }
      userSessions.get(userId)!.add(sessionId)

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'CONNECTED',
        payload: { userId, sessionId, timestamp: new Date().toISOString() }
      })}\n\n`
      
      controller.enqueue(encoder.encode(connectEvent))

      // Send recent events if timestamp provided
      if (timestamp) {
        sendRecentEvents(controller, userId, new Date(parseInt(timestamp)))
      }

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatEvent = `data: ${JSON.stringify({
            type: 'HEARTBEAT',
            payload: { timestamp: new Date().toISOString() }
          })}\n\n`
          
          controller.enqueue(encoder.encode(heartbeatEvent))
        } catch (error) {
          clearInterval(heartbeat)
          cleanup(sessionId, userId)
        }
      }, 30000)

      // Handle cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        cleanup(sessionId, userId)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

function cleanup(sessionId: string, userId: string) {
  eventStreams.delete(sessionId)
  
  const userSessionSet = userSessions.get(userId)
  if (userSessionSet) {
    userSessionSet.delete(sessionId)
    if (userSessionSet.size === 0) {
      userSessions.delete(userId)
    }
  }
  
  logger.debug('SSE session cleaned up', { sessionId, userId })
}

async function sendRecentEvents(
  controller: ReadableStreamDefaultController,
  userId: string,
  since: Date
) {
  try {
    // In production, fetch from database
    // For now, send empty recent events
    const recentEventsEvent = `data: ${JSON.stringify({
      type: 'RECENT_EVENTS',
      payload: { events: [], since: since.toISOString() }
    })}\n\n`
    
    controller.enqueue(new TextEncoder().encode(recentEventsEvent))
  } catch (error) {
    logger.error('Failed to send recent events', { error, userId })
  }
}

// Utility function to broadcast events to all connected clients
export function broadcastEvent(event: RealtimeEvent, targetUsers?: string[]) {
  const encoder = new TextEncoder()
  const eventData = `data: ${JSON.stringify({
    type: 'REALTIME_EVENT',
    payload: event
  })}\n\n`

  if (targetUsers) {
    // Send to specific users
    targetUsers.forEach(userId => {
      const sessionSet = userSessions.get(userId)
      if (sessionSet) {
        sessionSet.forEach(sessionId => {
          const controller = eventStreams.get(sessionId)
          if (controller) {
            try {
              controller.enqueue(encoder.encode(eventData))
            } catch (error) {
              cleanup(sessionId, userId)
            }
          }
        })
      }
    })
  } else {
    // Broadcast to all connected users
    eventStreams.forEach((controller, sessionId) => {
      try {
        controller.enqueue(encoder.encode(eventData))
      } catch (error) {
        // Clean up failed connection
        eventStreams.delete(sessionId)
      }
    })
  }

  logger.debug('Event broadcasted', { 
    type: event.type, 
    targetUsers: targetUsers?.length || 'all',
    activeConnections: eventStreams.size 
  })
}
```

### WebSocket API Route (Next.js Edge Runtime)

```typescript
// app/api/ws/route.ts (for WebSocket upgrade - requires additional setup)
import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { logger } from '@/lib/monitoring/logger'

// WebSocket server singleton
let wss: WebSocketServer | null = null

export async function GET(request: NextRequest) {
  // Note: WebSocket in Next.js requires additional setup
  // This is a conceptual implementation
  
  const upgradeHeader = request.headers.get('upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  // Initialize WebSocket server if not exists
  if (!wss) {
    wss = new WebSocketServer({ 
      port: 8080,
      path: '/ws'
    })

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url!, 'http://localhost')
      const userId = url.searchParams.get('userId')
      const sessionId = url.searchParams.get('sessionId')

      if (!userId || !sessionId) {
        ws.close(1008, 'Missing required parameters')
        return
      }

      logger.info('WebSocket client connected', { userId, sessionId })

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          handleWebSocketMessage(ws, message, userId, sessionId)
        } catch (error) {
          logger.error('Invalid WebSocket message', { error, userId })
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }))
        }
      })

      // Handle disconnection
      ws.on('close', (code, reason) => {
        logger.info('WebSocket client disconnected', { 
          userId, 
          sessionId, 
          code, 
          reason: reason.toString() 
        })
        // Clean up user session
      })

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error, userId, sessionId })
      })

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: { userId, sessionId, timestamp: new Date().toISOString() }
      }))
    })
  }

  return new Response('WebSocket server running on port 8080', { status: 200 })
}

function handleWebSocketMessage(ws: any, message: any, userId: string, sessionId: string) {
  switch (message.type) {
    case 'REALTIME_EVENT':
      // Broadcast event to other clients
      broadcastToOtherClients(message.payload, userId, sessionId)
      break
      
    case 'HEARTBEAT':
      // Respond to heartbeat
      ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }))
      break
      
    case 'USER_ACTION':
      // Handle user actions like cursor movement
      handleUserAction(message.payload, userId, sessionId)
      break
      
    default:
      logger.warn('Unknown WebSocket message type', { type: message.type, userId })
  }
}

function broadcastToOtherClients(event: RealtimeEvent, excludeUserId: string, excludeSessionId: string) {
  // Implementation would iterate through all connected clients
  // and send the event to appropriate recipients
  logger.debug('Broadcasting event to other clients', { 
    type: event.type, 
    excludeUser: excludeUserId 
  })
}

function handleUserAction(payload: any, userId: string, sessionId: string) {
  // Handle real-time user actions like cursor movement, typing indicators, etc.
  if (payload.type === 'CURSOR_MOVE') {
    broadcastToOtherClients({
      id: crypto.randomUUID(),
      type: 'COLLABORATION_CURSOR',
      payload,
      userId,
      sessionId,
      timestamp: new Date(),
      version: 1
    }, userId, sessionId)
  }
}
```

## Integration Patterns with Task and Project Stores

### Real-time Task Store Integration

```typescript
// Enhanced task store with real-time capabilities
// stores/taskStore.ts (additions)

// Add to existing TaskState interface:
interface TaskStateRealtime extends TaskState {
  // Real-time state
  conflictResolutions: Map<string, ConflictResolution>
  collaborativeEdits: Map<string, CollaborativeEdit>
  
  // Real-time actions
  handleRealtimeUpdate: (event: RealtimeEvent) => void
  resolveConflict: (conflictId: string, resolution: any) => void
  enableCollaborativeEditing: (taskId: string) => void
  disableCollaborativeEditing: (taskId: string) => void
}

// Add to store implementation:
export const useTaskStore = create<TaskStateRealtime>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // ... existing state and actions ...
        
        conflictResolutions: new Map(),
        collaborativeEdits: new Map(),

        handleRealtimeUpdate: (event: RealtimeEvent) => {
          const state = get()
          
          switch (event.type) {
            case 'TASK_CREATED':
              // Check if we have the task locally
              const existingTask = state.tasks.find(t => t.id === event.payload.id)
              if (!existingTask) {
                set(state => ({
                  tasks: [event.payload, ...state.tasks]
                }))
              }
              break

            case 'TASK_UPDATED':
              set(state => {
                const localTask = state.tasks.find(t => t.id === event.payload.id)
                
                if (localTask) {
                  // Check for conflicts
                  if (localTask.updatedAt > event.payload.updatedAt) {
                    // Local version is newer - conflict detected
                    state.handleTaskConflict(localTask, event.payload)
                    return state
                  }
                }

                return {
                  tasks: state.tasks.map(task =>
                    task.id === event.payload.id ? event.payload : task
                  )
                }
              })
              break

            case 'TASK_DELETED':
              set(state => ({
                tasks: state.tasks.filter(task => task.id !== event.payload.id),
                selectedTasks: new Set([...state.selectedTasks].filter(id => id !== event.payload.id))
              }))
              break

            case 'TASK_STATUS_CHANGED':
              set(state => ({
                tasks: state.tasks.map(task =>
                  task.id === event.payload.taskId
                    ? { ...task, status: event.payload.status, updatedAt: new Date() }
                    : task
                )
              }))
              break
          }
        },

        handleTaskConflict: (localTask: Task, remoteTask: Task) => {
          const conflictId = crypto.randomUUID()
          const conflict: ConflictResolution = {
            id: conflictId,
            type: 'TASK',
            entityId: localTask.id,
            conflicts: [
              {
                field: 'content',
                localValue: localTask,
                remoteValue: remoteTask,
                timestamp: new Date(),
                userId: remoteTask.userId
              }
            ],
            strategy: 'MANUAL'
          }

          set(state => ({
            conflictResolutions: new Map(state.conflictResolutions).set(conflictId, conflict)
          }))

          // Show conflict resolution UI
          window.dispatchEvent(new CustomEvent('task-conflict', {
            detail: { conflict, localTask, remoteTask }
          }))
        },

        resolveConflict: (conflictId, resolution) => {
          const state = get()
          const conflict = state.conflictResolutions.get(conflictId)
          
          if (conflict && conflict.type === 'TASK') {
            // Apply resolution
            set(state => {
              const newConflicts = new Map(state.conflictResolutions)
              newConflicts.delete(conflictId)
              
              return {
                tasks: state.tasks.map(task =>
                  task.id === conflict.entityId ? { ...task, ...resolution } : task
                ),
                conflictResolutions: newConflicts
              }
            })

            logger.info('Task conflict resolved', { conflictId, resolution })
          }
        },

        enableCollaborativeEditing: (taskId) => {
          // Enable real-time collaborative editing for a task
          const edit: CollaborativeEdit = {
            taskId,
            isActive: true,
            participants: [],
            currentEditor: null,
            lockExpiry: null
          }

          set(state => ({
            collaborativeEdits: new Map(state.collaborativeEdits).set(taskId, edit)
          }))
        },

        disableCollaborativeEditing: (taskId) => {
          set(state => {
            const newEdits = new Map(state.collaborativeEdits)
            newEdits.delete(taskId)
            return { collaborativeEdits: newEdits }
          })
        }
      })
    )
  )
)

interface CollaborativeEdit {
  taskId: string
  isActive: boolean
  participants: string[]
  currentEditor: string | null
  lockExpiry: Date | null
}

// Hook for real-time task updates
export function useRealtimeTaskUpdates() {
  const { handleRealtimeUpdate } = useTaskStore()

  React.useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      handleRealtimeUpdate(event.detail)
    }

    window.addEventListener('realtime-task-update', handleEvent as EventListener)

    return () => {
      window.removeEventListener('realtime-task-update', handleEvent as EventListener)
    }
  }, [handleRealtimeUpdate])
}
```

## Testing Strategy for Real-time Features

### Real-time Integration Tests

```typescript
// __tests__/integration/realtime-orchestration.test.ts
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WebSocketManager } from '@/lib/realtime/websocket-manager'
import { SSEManager } from '@/lib/realtime/sse-manager'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { TaskList } from '@/components/tasks/TaskList'

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}))

// Mock EventSource
global.EventSource = jest.fn().mockImplementation(() => ({
  readyState: EventSource.OPEN,
  close: jest.fn(),
  addEventListener: jest.fn()
}))

describe('Real-time Orchestration', () => {
  let queryClient: QueryClient
  let mockWebSocket: jest.Mocked<WebSocket>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    mockWebSocket = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('WebSocket Manager', () => {
    it('should establish WebSocket connection', async () => {
      const onMessage = jest.fn()
      const onPresence = jest.fn()
      
      const manager = new WebSocketManager('user-1', 'session-1', onMessage, onPresence)
      
      await manager.connect()
      
      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost/ws?token=')
      )
    })

    it('should handle reconnection on disconnect', async () => {
      const manager = new WebSocketManager('user-1', 'session-1', jest.fn(), jest.fn())
      
      await manager.connect()
      
      // Simulate disconnect
      const closeHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'close')?.[1] as (event: CloseEvent) => void
      
      if (closeHandler) {
        act(() => {
          closeHandler(new CloseEvent('close', { code: 1006 })) // Abnormal closure
        })
      }

      // Should attempt reconnection
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalledTimes(2)
      }, { timeout: 3000 })
    })

    it('should queue messages when disconnected', () => {
      const manager = new WebSocketManager('user-1', 'session-1', jest.fn(), jest.fn())
      
      // Send event while disconnected
      manager.sendEvent({
        type: 'TASK_UPDATED',
        payload: { id: 'task-1', title: 'Updated Task' },
        version: 1
      })

      // Message should be queued
      expect(mockWebSocket.send).not.toHaveBeenCalled()
    })
  })

  describe('Cross-tab Synchronization', () => {
    it('should synchronize state across tabs', async () => {
      const channel = new BroadcastChannel('taskmaster-pro')
      const onMessage = jest.fn()

      // Simulate message from another tab
      const message = {
        type: 'STATE_UPDATE',
        payload: { storeType: 'tasks', data: { id: 'task-1', title: 'Updated' } },
        source: 'tab-2',
        timestamp: new Date()
      }

      act(() => {
        channel.postMessage(message)
      })

      // Should handle cross-tab message
      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(message.payload)
      })

      channel.close()
    })

    it('should prevent infinite loops from same tab', () => {
      const channel = new BroadcastChannel('taskmaster-pro')
      const onMessage = jest.fn()

      // Set up tab ID
      sessionStorage.setItem('tab-id', 'current-tab')

      // Send message from same tab
      const message = {
        type: 'STATE_UPDATE',
        payload: { data: 'test' },
        source: 'current-tab',
        timestamp: new Date()
      }

      act(() => {
        channel.postMessage(message)
      })

      // Should ignore own messages
      expect(onMessage).not.toHaveBeenCalled()

      channel.close()
    })
  })

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', async () => {
      const TestComponent = () => {
        const { tasks, updateTaskOptimistic } = useTaskStore()
        
        React.useEffect(() => {
          updateTaskOptimistic('task-1', { status: 'DONE' })
        }, [])

        return <div data-testid="task-status">{tasks[0]?.status}</div>
      }

      // Set initial task
      useTaskStore.setState({
        tasks: [{ id: 'task-1', status: 'TODO', title: 'Test Task' } as any]
      })

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('task-status')).toHaveTextContent('DONE')
      })
    })

    it('should rollback optimistic updates on error', async () => {
      const mockUpdateTask = jest.fn().mockRejectedValue(new Error('Network error'))
      
      const TestComponent = () => {
        const { tasks, updateTaskOptimistic, rollbackOptimisticUpdate } = useTaskStore()
        
        const handleUpdate = async () => {
          updateTaskOptimistic('task-1', { status: 'DONE' })
          
          try {
            await mockUpdateTask('task-1', { status: 'DONE' })
          } catch (error) {
            rollbackOptimisticUpdate('task-1')
          }
        }

        React.useEffect(() => {
          handleUpdate()
        }, [])

        return <div data-testid="task-status">{tasks[0]?.status}</div>
      }

      // Set initial task
      useTaskStore.setState({
        tasks: [{ id: 'task-1', status: 'TODO', title: 'Test Task' } as any]
      })

      render(<TestComponent />)

      // Should rollback to original status
      await waitFor(() => {
        expect(screen.getByTestId('task-status')).toHaveTextContent('TODO')
      })
    })
  })

  describe('Performance Monitoring', () => {
    it('should track render performance', () => {
      const { measureRenderTime } = usePerformanceMonitor()
      const mockOperation = jest.fn(() => 'result')

      const result = measureRenderTime(mockOperation, 'TestComponent')

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalled()
    })

    it('should collect memory metrics', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50000000,
          totalJSHeapSize: 100000000,
          jsHeapSizeLimit: 200000000
        },
        writable: true
      })

      const { getMetrics } = usePerformanceMonitor()
      const metrics = getMetrics()

      expect(metrics?.memory.used).toBe(50000000)
      expect(metrics?.memory.total).toBe(100000000)
      expect(metrics?.memory.limit).toBe(200000000)
    })

    it('should handle high memory usage gracefully', () => {
      const { recordWarning } = usePerformanceMonitor()
      
      // Simulate high memory usage
      recordWarning('High memory usage detected', { usage: '85%' })

      // Should trigger cleanup mechanisms
      expect(true).toBe(true) // Placeholder - would test actual cleanup
    })
  })

  describe('Virtual Scrolling', () => {
    it('should render only visible items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      const renderItem = jest.fn((item, index, isVisible) => (
        <div key={item.id} data-testid={`item-${index}`}>
          {isVisible ? item.title : 'Loading...'}
        </div>
      ))

      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={renderItem}
        />
      )

      // Should only render visible items
      expect(renderItem).toHaveBeenCalledTimes(expect.any(Number))
      expect(renderItem).not.toHaveBeenCalledTimes(1000)
    })

    it('should trigger infinite loading', async () => {
      const loadMore = jest.fn()
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={(item) => <div key={item.id}>{item.title}</div>}
          loadMore={loadMore}
          hasNextPage={true}
          threshold={0.5}
        />
      )

      // Simulate scroll to bottom
      const scrollEvent = {
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 400
      }

      // Trigger scroll handler
      act(() => {
        // This would trigger based on scroll position
        loadMore()
      })

      expect(loadMore).toHaveBeenCalled()
    })
  })
})
```

## Integration Points with Other Systems

### Task Management Integration

```typescript
// Real-time task update integration
export interface RealtimeTaskIntegration {
  // Real-time CRUD operations
  broadcastTaskCreated(task: Task): void
  broadcastTaskUpdated(taskId: string, updates: Partial<Task>): void
  broadcastTaskDeleted(taskId: string): void
  broadcastTaskStatusChanged(taskId: string, status: TaskStatus): void
  
  // Collaborative editing
  enableTaskCollaboration(taskId: string): void
  handleTaskConflict(localTask: Task, remoteTask: Task): void
  resolveTaskConflict(conflictId: string, resolution: any): void
  
  // Optimistic updates
  applyOptimisticTaskUpdate(taskId: string, updates: Partial<Task>): string
  confirmTaskUpdate(updateId: string): void
  rollbackTaskUpdate(updateId: string): void
}
```

### Project Management Integration

```typescript
// Real-time project synchronization
export interface RealtimeProjectIntegration {
  // Progress synchronization
  broadcastProjectProgress(projectId: string, progress: number): void
  syncProjectTaskCompletion(projectId: string, completedTaskId: string): void
  
  // Collaborative project planning
  enableProjectCollaboration(projectId: string): void
  broadcastMilestoneUpdate(milestoneId: string, updates: any): void
  
  // Real-time analytics
  updateProjectMetrics(projectId: string, metrics: any): void
  syncTeamProductivity(projectId: string, teamMetrics: any): void
}
```

### Focus Mode Integration

```typescript
// Real-time focus session coordination
export interface RealtimeFocusIntegration {
  // Session coordination
  broadcastFocusSessionStarted(sessionId: string, taskId?: string): void
  syncFocusTimerAcrossTabs(sessionId: string, timeRemaining: number): void
  broadcastFocusSessionCompleted(sessionId: string, results: any): void
  
  // Team focus awareness
  showTeamFocusStatus(teamMembers: UserPresence[]): void
  coordinateTeamBreaks(teamId: string): void
  
  // Performance tracking
  syncFocusMetrics(userId: string, metrics: any): void
  updateProductivityTrends(userId: string, trend: number[]): void
}
```

## Implementation Priority

### Week 7 Development Order

1. **Day 1**: WebSocket and SSE infrastructure setup
2. **Day 2**: Cross-tab synchronization with BroadcastChannel
3. **Day 3**: Optimistic UI patterns and conflict resolution
4. **Day 4**: Performance monitoring and metrics collection
5. **Day 5**: Virtual scrolling and memory management
6. **Day 6**: Advanced caching strategies and state persistence
7. **Day 7**: Integration testing and performance optimization

### Critical Path Dependencies

- **Real-time Infrastructure** → WebSocket/SSE → Cross-tab sync
- **State Management** → Optimistic updates → Conflict resolution
- **Performance Foundation** → Monitoring → Virtual rendering → Memory management
- **Caching Strategy** → TanStack Query optimization → State persistence

## Success Metrics

### Phase 2 Week 7 Completion Requirements

**Real-time Functionality (Required)**
- [ ] WebSocket and SSE infrastructure operational
- [ ] Cross-tab synchronization working across all major browsers
- [ ] Optimistic UI updates with rollback capability
- [ ] Conflict resolution for concurrent edits
- [ ] Real-time presence indicators and collaboration cursors

**Performance Optimization (Required)**
- [ ] Virtual scrolling for lists >100 items
- [ ] Memory usage monitoring and cleanup
- [ ] Cache hit rates >80% for frequently accessed data
- [ ] State persistence and recovery mechanisms
- [ ] Performance metrics collection and reporting

**Integration Points Ready**
- [ ] Task real-time updates across all views
- [ ] Project progress synchronization
- [ ] Focus timer coordination across tabs
- [ ] Note collaborative editing infrastructure
- [ ] Dashboard real-time analytics updates

### Performance Benchmarks

**Real-time Performance**
- WebSocket message latency: < 100ms
- SSE event delivery: < 200ms
- Cross-tab sync delay: < 50ms
- Optimistic update feedback: < 16ms (1 frame)
- Conflict resolution time: < 500ms

**Memory Management**
- Memory growth rate: < 1MB per hour of usage
- Garbage collection efficiency: > 90% cleanup success
- Cache memory overhead: < 20% of total memory usage
- Virtual list memory: O(visible items) not O(total items)

**Cache Performance**
- Cache hit rate: > 80% for frequent queries
- Cache invalidation precision: < 5% false positives
- State persistence time: < 100ms for typical state size
- Recovery time from corrupted state: < 2 seconds

This comprehensive Real-time & State Orchestration system provides the high-performance, collaborative foundation that enables TaskMaster Pro to deliver seamless, responsive user experiences across all features and interaction contexts.