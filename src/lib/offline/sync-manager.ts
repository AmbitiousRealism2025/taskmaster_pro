// Offline Sync Manager
// Handles synchronization between IndexedDB and server

import { indexedDB } from './indexed-db'
import { Task, Project, Note, Habit } from '@prisma/client'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingChanges: number
  errors: string[]
}

export interface SyncResult {
  success: boolean
  synced: {
    tasks: number
    projects: number
    notes: number
    habits: number
  }
  errors: string[]
}

export class OfflineSyncManager {
  private syncStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    errors: []
  }

  private syncInterval: NodeJS.Timeout | null = null
  private listeners: ((status: SyncStatus) => void)[] = []

  constructor() {
    this.initializeEventListeners()
    this.startPeriodicSync()
  }

  private initializeEventListeners() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true
        this.sync()
      })

      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false
        this.notifyListeners()
      })

      // Listen for visibility change to sync when app becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.syncStatus.isOnline) {
          this.sync()
        }
      })
    }
  }

  private startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
        this.sync()
      }
    }, 5 * 60 * 1000)
  }

  async sync(): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      return {
        success: false,
        synced: { tasks: 0, projects: 0, notes: 0, habits: 0 },
        errors: ['Sync already in progress']
      }
    }

    this.syncStatus.isSyncing = true
    this.notifyListeners()

    const result: SyncResult = {
      success: true,
      synced: { tasks: 0, projects: 0, notes: 0, habits: 0 },
      errors: []
    }

    try {
      // 1. Process offline actions first
      await this.processOfflineActions(result)

      // 2. Pull latest data from server
      await this.pullFromServer()

      // 3. Push local changes to server
      await this.pushToServer(result)

      // 4. Update sync status
      this.syncStatus.lastSyncTime = new Date()
      this.syncStatus.pendingChanges = 0
      this.syncStatus.errors = []

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
      this.syncStatus.errors = result.errors
    } finally {
      this.syncStatus.isSyncing = false
      this.notifyListeners()
    }

    return result
  }

  private async processOfflineActions(result: SyncResult): Promise<void> {
    const actions = await indexedDB.getUnsyncedActions()

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'CREATE':
            await this.createEntity(action.entity, action.data)
            break
          case 'UPDATE':
            await this.updateEntity(action.entity, action.data)
            break
          case 'DELETE':
            await this.deleteEntity(action.entity, action.data.id)
            break
        }

        await indexedDB.markActionSynced(action.id)
        result.synced[`${action.entity}s` as keyof typeof result.synced]++
      } catch (error) {
        result.errors.push(`Failed to sync ${action.type} ${action.entity}: ${error}`)
      }
    }
  }

  private async pullFromServer(): Promise<void> {
    try {
      // Fetch latest data from server
      const [tasks, projects, notes, habits] = await Promise.all([
        this.fetchFromAPI<Task[]>('/api/tasks'),
        this.fetchFromAPI<Project[]>('/api/projects'),
        this.fetchFromAPI<Note[]>('/api/notes'),
        this.fetchFromAPI<Habit[]>('/api/habits')
      ])

      // Store in IndexedDB
      await Promise.all([
        indexedDB.bulkPut('tasks', tasks),
        indexedDB.bulkPut('projects', projects),
        indexedDB.bulkPut('notes', notes),
        indexedDB.bulkPut('habits', habits)
      ])

      // Update cache
      await indexedDB.setCachedData({
        tasks,
        projects,
        notes,
        habits,
        lastSync: Date.now()
      })
    } catch (error) {
      throw new Error(`Failed to pull from server: ${error}`)
    }
  }

  private async pushToServer(result: SyncResult): Promise<void> {
    // Get all pending local changes
    const [tasks, projects, notes, habits] = await Promise.all([
      this.getPendingEntities<Task>('tasks'),
      this.getPendingEntities<Project>('projects'),
      this.getPendingEntities<Note>('notes'),
      this.getPendingEntities<Habit>('habits')
    ])

    // Push each entity type
    await Promise.all([
      this.pushEntities('tasks', tasks, result),
      this.pushEntities('projects', projects, result),
      this.pushEntities('notes', notes, result),
      this.pushEntities('habits', habits, result)
    ])
  }

  private async getPendingEntities<T>(storeName: string): Promise<T[]> {
    const all = await indexedDB.getAll<T & { syncStatus?: string }>(storeName)
    return all.filter(item => item.syncStatus === 'pending')
  }

  private async pushEntities<T extends { id: string }>(
    entityType: string,
    entities: T[],
    result: SyncResult
  ): Promise<void> {
    for (const entity of entities) {
      try {
        await this.updateEntity(entityType.slice(0, -1) as any, entity)
        result.synced[entityType as keyof typeof result.synced]++
      } catch (error) {
        result.errors.push(`Failed to push ${entityType}: ${error}`)
      }
    }
  }

  private async createEntity(entity: string, data: any): Promise<void> {
    const response = await fetch(`/api/${entity}s`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to create ${entity}`)
    }
  }

  private async updateEntity(entity: string, data: any): Promise<void> {
    const response = await fetch(`/api/${entity}s/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update ${entity}`)
    }
  }

  private async deleteEntity(entity: string, id: string): Promise<void> {
    const response = await fetch(`/api/${entity}s/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete ${entity}`)
    }
  }

  private async fetchFromAPI<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}`)
    }
    return response.json()
  }

  // Public methods
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.syncStatus))
  }

  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  async getPendingChangesCount(): Promise<number> {
    const actions = await indexedDB.getUnsyncedActions()
    return actions.length
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
  }
}

// Export singleton instance
export const syncManager = new OfflineSyncManager()