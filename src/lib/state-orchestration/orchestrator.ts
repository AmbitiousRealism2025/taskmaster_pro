import { QueryClient } from '@tanstack/react-query'
import { RealtimeEvent } from '@/types/realtime'
import { OfflineQueueItem } from '@/types/realtime'

interface OptimisticUpdate {
  id: string
  entityType: string
  entityId: string
  operation: 'create' | 'update' | 'delete'
  originalData: any
  optimisticData: any
  timestamp: Date
  isRolledBack: boolean
}

interface CrossTabMessage {
  type: 'STATE_UPDATE' | 'OPTIMISTIC_UPDATE' | 'ROLLBACK' | 'SYNC_REQUEST'
  payload: any
  timestamp: Date
  sessionId: string
}

class StateOrchestrator {
  private queryClient: QueryClient
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map()
  private offlineQueue: OfflineQueueItem[] = []
  private isOnline = navigator.onLine
  private broadcastChannel?: BroadcastChannel

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
    this.setupEventListeners()
    this.setupCrossTabSync()
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Page visibility for sync optimization
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  private setupCrossTabSync(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('taskmaster-state-sync')
      this.broadcastChannel.addEventListener('message', this.handleCrossTabMessage.bind(this))
    }
  }

  private handleCrossTabMessage(event: MessageEvent<CrossTabMessage>): void {
    const { type, payload, sessionId } = event.data
    
    // Ignore messages from same session
    if (sessionId === this.getSessionId()) return

    switch (type) {
      case 'STATE_UPDATE':
        this.handleCrossTabStateUpdate(payload)
        break
      case 'OPTIMISTIC_UPDATE':
        this.handleCrossTabOptimisticUpdate(payload)
        break
      case 'ROLLBACK':
        this.handleCrossTabRollback(payload)
        break
      case 'SYNC_REQUEST':
        this.handleCrossTabSyncRequest()
        break
    }
  }

  private handleCrossTabStateUpdate(payload: any): void {
    const { queryKey, data } = payload
    
    // Update query cache across tabs
    this.queryClient.setQueryData(queryKey, data)
  }

  private handleCrossTabOptimisticUpdate(payload: OptimisticUpdate): void {
    // Apply optimistic update in other tabs
    this.optimisticUpdates.set(payload.id, payload)
    
    const queryKey = this.getQueryKeyForEntity(payload.entityType, payload.entityId)
    this.queryClient.setQueryData(queryKey, payload.optimisticData)
  }

  private handleCrossTabRollback(payload: { updateId: string }): void {
    const update = this.optimisticUpdates.get(payload.updateId)
    if (update) {
      const queryKey = this.getQueryKeyForEntity(update.entityType, update.entityId)
      this.queryClient.setQueryData(queryKey, update.originalData)
      this.optimisticUpdates.delete(payload.updateId)
    }
  }

  private handleCrossTabSyncRequest(): void {
    // Send current state to requesting tab
    this.broadcastStateUpdate('SYNC_RESPONSE', {
      optimisticUpdates: Array.from(this.optimisticUpdates.values()),
      offlineQueue: this.offlineQueue
    })
  }

  private broadcastStateUpdate(type: CrossTabMessage['type'], payload: any): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type,
        payload,
        timestamp: new Date(),
        sessionId: this.getSessionId()
      })
    }
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('taskmaster-session-id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('taskmaster-session-id', sessionId)
    }
    return sessionId
  }

  private handleOnline(): void {
    this.isOnline = true
    console.log('App is back online - processing offline queue')
    this.processOfflineQueue()
  }

  private handleOffline(): void {
    this.isOnline = false
    console.log('App is offline - queuing operations')
  }

  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // Tab became visible - sync with other tabs
      this.broadcastStateUpdate('SYNC_REQUEST', {})
    }
  }

  public handleRealtimeEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
        this.handleTaskUpdate(event)
        break
      case 'TASK_DELETED':
        this.handleTaskDelete(event)
        break
      case 'PROJECT_UPDATED':
        this.handleProjectUpdate(event)
        break
      case 'NOTE_UPDATED':
        this.handleNoteUpdate(event)
        break
      default:
        console.log('Unhandled realtime event:', event.type)
    }
  }

  private handleTaskUpdate(event: RealtimeEvent): void {
    // Cancel any pending optimistic update for this task
    this.cancelOptimisticUpdate('task', event.payload.id)
    
    // Update tasks query cache
    this.queryClient.setQueryData(
      ['tasks'], 
      (oldData: any) => {
        if (!oldData) return oldData
        
        const tasks = oldData.tasks || oldData
        const taskIndex = tasks.findIndex((t: any) => t.id === event.payload.id)
        
        if (taskIndex >= 0) {
          // Update existing task
          tasks[taskIndex] = event.payload
        } else {
          // Add new task
          tasks.unshift(event.payload)
        }
        
        return oldData.tasks ? { ...oldData, tasks } : tasks
      }
    )

    // Invalidate related queries
    this.queryClient.invalidateQueries({ queryKey: ['tasks', event.payload.id] })
    if (event.payload.projectId) {
      this.queryClient.invalidateQueries({ queryKey: ['projects', event.payload.projectId] })
    }
  }

  private handleTaskDelete(event: RealtimeEvent): void {
    // Remove from tasks query cache
    this.queryClient.setQueryData(
      ['tasks'], 
      (oldData: any) => {
        if (!oldData) return oldData
        
        const tasks = oldData.tasks || oldData
        const filteredTasks = tasks.filter((t: any) => t.id !== event.payload.id)
        
        return oldData.tasks ? { ...oldData, tasks: filteredTasks } : filteredTasks
      }
    )

    // Remove individual task cache
    this.queryClient.removeQueries({ queryKey: ['tasks', event.payload.id] })
  }

  private handleProjectUpdate(event: RealtimeEvent): void {
    this.cancelOptimisticUpdate('project', event.payload.id)
    
    this.queryClient.setQueryData(
      ['projects'],
      (oldData: any) => {
        if (!oldData) return oldData
        
        const projects = oldData.projects || oldData
        const projectIndex = projects.findIndex((p: any) => p.id === event.payload.id)
        
        if (projectIndex >= 0) {
          projects[projectIndex] = event.payload
        } else {
          projects.unshift(event.payload)
        }
        
        return oldData.projects ? { ...oldData, projects } : projects
      }
    )

    this.queryClient.invalidateQueries({ queryKey: ['projects', event.payload.id] })
  }

  private handleNoteUpdate(event: RealtimeEvent): void {
    this.cancelOptimisticUpdate('note', event.payload.id)
    
    this.queryClient.setQueryData(
      ['notes'],
      (oldData: any) => {
        if (!oldData) return oldData
        
        const notes = oldData.notes || oldData
        const noteIndex = notes.findIndex((n: any) => n.id === event.payload.id)
        
        if (noteIndex >= 0) {
          notes[noteIndex] = event.payload
        } else {
          notes.unshift(event.payload)
        }
        
        return oldData.notes ? { ...oldData, notes } : notes
      }
    )

    this.queryClient.invalidateQueries({ queryKey: ['notes', event.payload.id] })
  }

  public performOptimisticUpdate<T>(
    entityType: 'task' | 'project' | 'note',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    optimisticData: T,
    originalData?: T
  ): string {
    const updateId = crypto.randomUUID()
    const queryKey = this.getQueryKeyForEntity(entityType, entityId)
    
    // Store optimistic update info
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      entityType,
      entityId,
      operation,
      originalData: originalData || this.queryClient.getQueryData(queryKey),
      optimisticData,
      timestamp: new Date(),
      isRolledBack: false
    }
    
    this.optimisticUpdates.set(updateId, optimisticUpdate)
    
    // Apply optimistic update to query cache
    this.queryClient.setQueryData(queryKey, optimisticData)
    
    // Broadcast to other tabs
    this.broadcastStateUpdate('OPTIMISTIC_UPDATE', optimisticUpdate)
    
    // If offline, queue for later
    if (!this.isOnline) {
      this.queueOfflineAction({
        id: updateId,
        action: `${operation}_${entityType}`,
        payload: optimisticData,
        timestamp: new Date(),
        retryCount: 0
      })
    }

    return updateId
  }

  public rollbackOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId)
    if (!update || update.isRolledBack) return

    const queryKey = this.getQueryKeyForEntity(update.entityType, update.entityId)
    
    // Restore original data
    this.queryClient.setQueryData(queryKey, update.originalData)
    
    // Mark as rolled back
    update.isRolledBack = true
    this.optimisticUpdates.set(updateId, update)
    
    // Broadcast rollback to other tabs
    this.broadcastStateUpdate('ROLLBACK', { updateId })
  }

  private cancelOptimisticUpdate(entityType: string, entityId: string): void {
    // Find and cancel any pending optimistic updates for this entity
    this.optimisticUpdates.forEach(update => {
      if (update.entityType === entityType && update.entityId === entityId && !update.isRolledBack) {
        update.isRolledBack = true
        this.optimisticUpdates.set(update.id, update)
      }
    })
  }

  private getQueryKeyForEntity(entityType: string, entityId: string): string[] {
    switch (entityType) {
      case 'task':
        return ['tasks', entityId]
      case 'project':
        return ['projects', entityId]
      case 'note':
        return ['notes', entityId]
      default:
        return [entityType, entityId]
    }
  }

  private queueOfflineAction(action: OfflineQueueItem): void {
    this.offlineQueue.push(action)
    
    // Limit queue size to prevent memory issues
    if (this.offlineQueue.length > 100) {
      this.offlineQueue.shift()
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) return

    console.log(`Processing ${this.offlineQueue.length} offline actions`)
    
    const queue = [...this.offlineQueue]
    this.offlineQueue = []

    for (const action of queue) {
      try {
        await this.executeOfflineAction(action)
      } catch (error) {
        console.error('Failed to execute offline action:', error)
        
        // Retry with exponential backoff
        if (action.retryCount < 3) {
          action.retryCount++
          this.offlineQueue.push(action)
        }
      }
    }
  }

  private async executeOfflineAction(action: OfflineQueueItem): Promise<void> {
    const [operation, entityType] = action.action.split('_')
    
    // Determine the appropriate API endpoint
    let endpoint = ''
    switch (entityType) {
      case 'task':
        endpoint = '/api/tasks'
        break
      case 'project':
        endpoint = '/api/projects'
        break
      case 'note':
        endpoint = '/api/notes'
        break
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }

    // Execute the API call
    let response: Response
    switch (operation) {
      case 'create':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload)
        })
        break
      case 'update':
        response = await fetch(`${endpoint}/${action.payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload)
        })
        break
      case 'delete':
        response = await fetch(`${endpoint}/${action.payload.id}`, {
          method: 'DELETE'
        })
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
  }

  public getOfflineQueueLength(): number {
    return this.offlineQueue.length
  }

  public getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values()).filter(u => !u.isRolledBack)
  }

  public cleanup(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
    }
    
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }
}

export default StateOrchestrator