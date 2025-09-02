// IndexedDB Manager for Offline Storage
// Handles offline data persistence and sync

import { Task, Project, Note, Habit } from '@prisma/client'

interface OfflineAction {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'task' | 'project' | 'note' | 'habit'
  data: any
  timestamp: number
  synced: boolean
}

interface CachedData {
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  habits: Habit[]
  lastSync: number
}

export class IndexedDBManager {
  private dbName = 'TaskMasterOfflineDB'
  private version = 1
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
          taskStore.createIndex('userId', 'userId', { unique: false })
          taskStore.createIndex('status', 'status', { unique: false })
          taskStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
          projectStore.createIndex('userId', 'userId', { unique: false })
          projectStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
          noteStore.createIndex('userId', 'userId', { unique: false })
          noteStore.createIndex('folderId', 'folderId', { unique: false })
          noteStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains('habits')) {
          const habitStore = db.createObjectStore('habits', { keyPath: 'id' })
          habitStore.createIndex('userId', 'userId', { unique: false })
          habitStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }

        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionStore = db.createObjectStore('offlineActions', { 
            keyPath: 'id',
            autoIncrement: true 
          })
          actionStore.createIndex('synced', 'synced', { unique: false })
          actionStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  // Generic CRUD operations
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put({
        ...data,
        syncStatus: 'pending',
        lastModified: Date.now()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Offline action tracking
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    const offlineAction: Omit<OfflineAction, 'id'> = {
      ...action,
      timestamp: Date.now(),
      synced: false
    }

    return this.put('offlineActions', offlineAction)
  }

  async getUnsyncedActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly')
      const store = transaction.objectStore('offlineActions')
      const index = store.index('synced')
      const request = index.getAll(false)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async markActionSynced(actionId: string): Promise<void> {
    if (!this.db) await this.initialize()
    
    const action = await this.get<OfflineAction>('offlineActions', actionId)
    if (action) {
      action.synced = true
      await this.put('offlineActions', action)
    }
  }

  // Bulk operations for sync
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      items.forEach(item => {
        store.put({
          ...item,
          syncStatus: 'synced',
          lastModified: Date.now()
        })
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Cache management
  async getCachedData(): Promise<CachedData | null> {
    const cache = await this.get<{ key: string; value: CachedData }>('cache', 'mainData')
    return cache?.value || null
  }

  async setCachedData(data: CachedData): Promise<void> {
    await this.put('cache', {
      key: 'mainData',
      value: data
    })
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize()
    
    const storeNames = ['tasks', 'projects', 'notes', 'habits', 'offlineActions', 'cache']
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite')
      
      storeNames.forEach(storeName => {
        transaction.objectStore(storeName).clear()
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Conflict resolution
  async resolveConflict<T extends { id: string; updatedAt: Date }>(
    local: T,
    remote: T,
    strategy: 'local' | 'remote' | 'latest' = 'latest'
  ): Promise<T> {
    switch (strategy) {
      case 'local':
        return local
      case 'remote':
        return remote
      case 'latest':
        return new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote
      default:
        return remote
    }
  }

  // Storage quota management
  async getStorageInfo(): Promise<{ usage: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      const percentage = quota > 0 ? (usage / quota) * 100 : 0

      return { usage, quota, percentage }
    }

    return { usage: 0, quota: 0, percentage: 0 }
  }

  // Request persistent storage
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist()
    }
    return false
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBManager()