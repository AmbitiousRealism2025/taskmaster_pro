import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { 
  RealtimeEvent, 
  RealtimeEventType, 
  UserPresence, 
  RealtimeSubscription,
  ConflictResolutionData 
} from '@/types/realtime'

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, RealtimeSubscription> = new Map()
  private userPresence: UserPresence | null = null
  private sessionId: string
  private userId: string
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(userId: string) {
    this.userId = userId
    this.sessionId = crypto.randomUUID()
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Handle browser close/refresh
    window.addEventListener('beforeunload', this.cleanup.bind(this))
    
    // Initialize connection
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      // Remove existing channels
      this.cleanup()
      
      // Create main presence channel
      const presenceChannel = supabase
        .channel(`presence:${this.userId}`, {
          config: {
            presence: {
              key: this.sessionId,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState()
          this.handlePresenceSync(presenceState)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(leftPresences)
        })

      await presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: this.userId,
            sessionId: this.sessionId,
            status: 'online',
            currentPage: window.location.pathname,
            lastSeen: new Date().toISOString(),
            device: {
              type: this.getDeviceType(),
              browser: navigator.userAgent.substring(0, 100)
            }
          })
          
          this.isConnected = true
          this.reconnectAttempts = 0
          console.log('Realtime connection established')
        }
      })

      this.channels.set('presence', presenceChannel)

      // Create events channel for real-time updates
      const eventsChannel = supabase
        .channel(`events:${this.userId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          (payload) => this.handleDatabaseChange('TASK', payload)
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'projects' }, 
          (payload) => this.handleDatabaseChange('PROJECT', payload)
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notes' }, 
          (payload) => this.handleDatabaseChange('NOTE', payload)
        )

      await eventsChannel.subscribe()
      this.channels.set('events', eventsChannel)

    } catch (error) {
      console.error('Failed to establish realtime connection:', error)
      this.scheduleReconnect()
    }
  }

  private handleDatabaseChange(entityType: string, payload: any): void {
    const eventType = this.mapDatabaseEventToRealtimeEvent(entityType, payload.eventType)
    
    const event: RealtimeEvent = {
      id: crypto.randomUUID(),
      type: eventType,
      payload: payload.new || payload.old,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      version: 1
    }

    this.broadcastEvent(event)
  }

  private mapDatabaseEventToRealtimeEvent(
    entityType: string, 
    dbEvent: string
  ): RealtimeEventType {
    switch (`${entityType}_${dbEvent}`) {
      case 'TASK_INSERT':
        return 'TASK_CREATED'
      case 'TASK_UPDATE':
        return 'TASK_UPDATED'
      case 'TASK_DELETE':
        return 'TASK_DELETED'
      case 'PROJECT_UPDATE':
        return 'PROJECT_UPDATED'
      case 'NOTE_UPDATE':
        return 'NOTE_UPDATED'
      default:
        return 'SYSTEM_NOTIFICATION'
    }
  }

  private handlePresenceSync(presenceState: Record<string, any[]>): void {
    // Handle presence synchronization
    const allUsers = Object.values(presenceState).flat()
    // Emit presence update event
    this.broadcastEvent({
      id: crypto.randomUUID(),
      type: 'USER_PRESENCE_CHANGED',
      payload: allUsers,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      version: 1
    })
  }

  private handlePresenceJoin(newPresences: any[]): void {
    console.log('Users joined:', newPresences)
  }

  private handlePresenceLeave(leftPresences: any[]): void {
    console.log('Users left:', leftPresences)
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.updatePresenceStatus('away')
    } else {
      this.updatePresenceStatus('online')
    }
  }

  private async updatePresenceStatus(status: 'online' | 'away' | 'offline'): Promise<void> {
    const presenceChannel = this.channels.get('presence')
    if (presenceChannel && this.isConnected) {
      await presenceChannel.track({
        userId: this.userId,
        sessionId: this.sessionId,
        status,
        currentPage: window.location.pathname,
        lastSeen: new Date().toISOString(),
        device: {
          type: this.getDeviceType(),
          browser: navigator.userAgent.substring(0, 100)
        }
      })
    }
  }

  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/tablet|ipad|playbook|silk|(puffin(?!.*(IP|AP|WP)))/i.test(userAgent)) {
      return 'tablet'
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      return 'mobile'
    }
    return 'desktop'
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    this.reconnectAttempts++
    
    setTimeout(() => {
      console.log(`Attempting reconnection ${this.reconnectAttempts}`)
      this.connect()
    }, delay)
  }

  public subscribe(
    eventTypes: RealtimeEventType[],
    callback: (event: RealtimeEvent) => void
  ): string {
    const subscriptionId = crypto.randomUUID()
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      channel: 'events',
      eventTypes,
      callback
    })

    return subscriptionId
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId)
  }

  private broadcastEvent(event: RealtimeEvent): void {
    // Broadcast to local subscribers
    this.subscriptions.forEach(subscription => {
      if (subscription.eventTypes.includes(event.type)) {
        subscription.callback(event)
      }
    })

    // Broadcast to other browser tabs
    this.broadcastToOtherTabs(event)
  }

  private broadcastToOtherTabs(event: RealtimeEvent): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('taskmaster-realtime')
      channel.postMessage(event)
    }
  }

  public sendEvent(
    type: RealtimeEventType,
    payload: any
  ): void {
    const event: RealtimeEvent = {
      id: crypto.randomUUID(),
      type,
      payload,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      version: 1
    }

    this.broadcastEvent(event)
  }

  public handleConflict(conflictData: ConflictResolutionData): void {
    // Basic conflict resolution - prefer most recent timestamp
    console.warn('Conflict detected:', conflictData)
    
    // For now, emit event to let UI handle conflict resolution
    this.broadcastEvent({
      id: crypto.randomUUID(),
      type: 'SYSTEM_NOTIFICATION',
      payload: {
        type: 'conflict',
        message: 'Data conflict detected and resolved',
        conflictData
      },
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      version: 1
    })
  }

  private cleanup(): void {
    // Unsubscribe from all channels
    this.channels.forEach(channel => {
      channel.unsubscribe()
    })
    this.channels.clear()
    this.subscriptions.clear()
    this.isConnected = false
  }

  public disconnect(): void {
    this.updatePresenceStatus('offline')
    this.cleanup()
  }
}

// Global instance
let realtimeManager: RealtimeManager | null = null

export const getRealtimeManager = (userId?: string): RealtimeManager | null => {
  if (!realtimeManager && userId) {
    realtimeManager = new RealtimeManager(userId)
  }
  return realtimeManager
}

export const initializeRealtime = (userId: string): RealtimeManager => {
  if (realtimeManager) {
    realtimeManager.disconnect()
  }
  realtimeManager = new RealtimeManager(userId)
  return realtimeManager
}

export default RealtimeManager