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
  device?: {
    type: 'desktop' | 'tablet' | 'mobile'
    browser: string
  }
}

export interface CollaborationCursor {
  userId: string
  userName: string
  position: {
    x: number
    y: number
    elementId?: string
  }
  color: string
}

export interface ConflictResolutionData {
  entityId: string
  entityType: string
  conflicts: {
    field: string
    localValue: any
    remoteValue: any
    timestamp: Date
  }[]
  resolution?: 'local' | 'remote' | 'merge'
}

export interface RealtimeSubscription {
  id: string
  channel: string
  eventTypes: RealtimeEventType[]
  callback: (event: RealtimeEvent) => void
}

export interface OfflineQueueItem {
  id: string
  action: string
  payload: any
  timestamp: Date
  retryCount: number
}