# PWA & Offline Infrastructure Subgroup - Phase 3 Week 11

## ⚠️ Implementation Notes
- **Subgroup Number**: 11 (PWA & Offline Infrastructure)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 12
- **Test Coverage**: Phase3_Production_Tests.md (Tests 36-50 Enhanced)
- **Dependencies**: External Integration Layer (Subgroup 10) must be complete
- **Related Enhancements**: None
- **Estimated Context Usage**: 80-90%

---

**Subgroup**: 03 - PWA & Offline Infrastructure  
**Phase**: Production (Week 11)  
**Focus**: PWA + Offline capabilities + Mobile optimization  

## Subgroup Overview

The PWA & Offline Infrastructure subgroup transforms TaskMaster Pro into a fully capable Progressive Web App with offline-first capabilities. This enables users to continue working productively even without internet connectivity, with automatic sync when connection is restored.

### Primary Responsibilities

- **Service Worker Implementation**: Advanced caching strategies with Workbox for offline functionality
- **PWA Manifest & Installation**: Native app-like experience with install prompts and app metadata
- **Offline Data Management**: IndexedDB storage with conflict resolution and sync queues
- **Background Sync**: Automatic data synchronization when connectivity returns
- **Mobile Optimization**: Touch-friendly UI, responsive design, and mobile-specific features
- **Push Notifications**: Background notifications for habit reminders and task deadlines
- **Network Resilience**: Graceful degradation and connectivity status management
- **Performance Optimization**: Lighthouse score optimization and Core Web Vitals compliance

## Test Coverage Requirements

Based on `Phase3_Production_Tests.md`, the following tests must pass:

### Service Worker Tests (4 tests)
- **SW Registration & Caching** (`__tests__/pwa/service-worker.test.ts`)
  - Service worker registration and lifecycle management
  - Essential resource caching with versioning strategies
  - Offline serving with cache-first and network-first patterns
  - Background sync queue for failed requests

### PWA Installation Tests (5 tests)  
- **Installation Flow** (`__tests__/pwa/installation.test.ts`)
  - Install prompt display and user interaction handling
  - Web app manifest validation and configuration
  - Installation state detection and update notifications
  - App update handling with user consent

### Background Sync Tests (3 tests)
- **Offline Sync** (`__tests__/pwa/background-sync.test.ts`)
  - Queue management for offline actions
  - Conflict resolution for concurrent edits
  - Automatic retry with exponential backoff

### Push Notifications Tests (2 tests)
- **Notification System** (`__tests__/pwa/push-notifications.test.ts`)
  - Push subscription management
  - Notification display and interaction handling

## Core Data Models and Types

### PWA Configuration Types

```typescript
// types/pwa.ts
export interface PWAConfig {
  name: string
  shortName: string
  description: string
  startUrl: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  themeColor: string
  backgroundColor: string
  icons: PWAIcon[]
  scope: string
  orientation?: 'portrait' | 'landscape' | 'any'
}

export interface PWAIcon {
  src: string
  sizes: string
  type: string
  purpose?: 'any' | 'maskable' | 'monochrome'
}

export interface InstallPromptState {
  isInstallable: boolean
  isInstalled: boolean
  hasUpdate: boolean
  canUpdate: boolean
  deferredPrompt: any | null
}

export interface NetworkStatus {
  isOnline: boolean
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
  saveData: boolean
}

// Offline data models
export interface OfflineAction {
  id: string
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_HABIT'
  data: any
  url: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  timestamp: Date
  retryCount: number
  maxRetries: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
}

export interface SyncConflict {
  id: string
  resourceType: 'task' | 'habit' | 'project'
  resourceId: string
  localData: any
  serverData: any
  conflictFields: string[]
  resolvedData?: any
  resolution: 'MANUAL' | 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGED'
  timestamp: Date
}

export interface CacheStrategy {
  strategy: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
  maxAge?: number
  maxEntries?: number
  purgeOnQuotaError?: boolean
}

export interface ServiceWorkerMessage {
  type: 'SYNC_STATUS' | 'CACHE_UPDATE' | 'OFFLINE_ACTION' | 'CONFLICT_DETECTED'
  payload: any
  timestamp: Date
}
```

### Offline Storage Schema

```typescript
// lib/offline/storage.ts
export interface OfflineStorageSchema {
  tasks: {
    key: string // task.id
    value: Task & { _syncStatus: SyncStatus }
    indexes: 'projectId' | 'status' | 'dueDate'
  }
  habits: {
    key: string // habit.id  
    value: Habit & { _syncStatus: SyncStatus }
    indexes: 'userId' | 'frequency' | 'isActive'
  }
  habitEntries: {
    key: string // entry.id
    value: HabitEntry & { _syncStatus: SyncStatus }
    indexes: 'habitId' | 'date' | 'completed'
  }
  projects: {
    key: string // project.id
    value: Project & { _syncStatus: SyncStatus }
    indexes: 'userId' | 'status'
  }
  syncQueue: {
    key: string // action.id
    value: OfflineAction
    indexes: 'status' | 'timestamp' | 'type'
  }
  conflicts: {
    key: string // conflict.id
    value: SyncConflict
    indexes: 'resourceType' | 'resolution' | 'timestamp'
  }
}

export type SyncStatus = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED'

export interface StorageQuota {
  usage: number
  quota: number
  usagePercentage: number
  canStore: boolean
}
```

## Key Components Implementation

### Service Worker with Workbox

```typescript
// public/sw.js (Service Worker)
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

// Clean up old caches
cleanupOutdatedCaches()

// Precache static resources
precacheAndRoute(self.__WB_MANIFEST)

// API routes - Network First with offline fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      new BackgroundSyncPlugin('api-background-sync', {
        maxRetentionTime: 24 * 60 // 24 hours
      })
    ]
  })
)

// Static resources - Cache First
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      })
    ]
  })
)

// Navigation requests - Stale While Revalidate
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'navigation-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      })
    ]
  })
)

// Background Sync for offline actions
const bgSync = new BackgroundSyncPlugin('offline-actions', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async ({ queue }) => {
    let entry
    while ((entry = await queue.shiftRequest())) {
      try {
        // Replay the failed request
        const response = await fetch(entry.request.clone())
        
        if (response.ok) {
          // Notify client of successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                url: entry.request.url,
                method: entry.request.method
              })
            })
          })
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        // Re-add to queue for retry or handle failure
        console.error('Sync failed:', error)
        
        // Notify client of sync failure
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_FAILED',
              url: entry.request.url,
              error: error.message
            })
          })
        })
        
        throw error // Re-throw to trigger retry
      }
    }
  }
})

// Handle offline form submissions
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST' && 
      event.request.url.includes('/api/')) {
    
    // Try network first, then queue for background sync
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Store in IndexedDB for background sync
        await storeOfflineAction(event.request)
        
        // Return a success response to prevent UI errors
        return new Response(JSON.stringify({ 
          success: true, 
          offline: true,
          message: 'Action queued for sync when online'
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
  }
})

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Task',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('TaskMaster Pro', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'explore') {
    // Open the app at specific task
    event.waitUntil(
      clients.openWindow('/dashboard?notification=true')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper function to store offline actions
async function storeOfflineAction(request) {
  const data = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  }

  // Store in IndexedDB (implementation would use idb library)
  const db = await openDB('taskmaster-offline', 1)
  await db.add('offline-actions', data)
}
```

### PWA Installation Hook

```typescript
// hooks/usePWA.ts
'use client'

import { useState, useEffect } from 'react'
import { InstallPromptState, ServiceWorkerMessage } from '@/types'

interface UsePWAReturn extends InstallPromptState {
  install: () => Promise<boolean>
  updateApp: () => Promise<boolean>
  checkForUpdates: () => Promise<boolean>
  dismissInstallPrompt: () => void
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    hasUpdate: false,
    canUpdate: false,
    deferredPrompt: null
  })

  useEffect(() => {
    // Check if already installed
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInstalled = (window.navigator as any).standalone === true || isStandalone
      
      setState(prev => ({ ...prev, isInstalled }))
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e
      }))
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null
      }))
      
      // Track installation in analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install', {
          method: 'install_prompt'
        })
      }
    }

    checkInstallation()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Service Worker update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent<ServiceWorkerMessage>) => {
        if (event.data.type === 'CACHE_UPDATE') {
          setState(prev => ({
            ...prev,
            hasUpdate: true,
            canUpdate: true
          }))
        }
      })

      // Check for existing service worker updates
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          setState(prev => ({
            ...prev,
            hasUpdate: true,
            canUpdate: true
          }))
        }
      })
    }
  }, [])

  const install = async (): Promise<boolean> => {
    if (!state.deferredPrompt) return false

    try {
      // Show the install prompt
      const result = await state.deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const choiceResult = await result.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          deferredPrompt: null
        }))
        return true
      }
      
      return false
    } catch (error) {
      console.error('Installation failed:', error)
      return false
    }
  }

  const updateApp = async (): Promise<boolean> => {
    if (!state.canUpdate) return false

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration?.waiting) {
        // Tell the waiting SW to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Reload to activate new version
        window.location.reload()
        return true
      }
      
      return false
    } catch (error) {
      console.error('App update failed:', error)
      return false
    }
  }

  const checkForUpdates = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Update check failed:', error)
      return false
    }
  }

  const dismissInstallPrompt = () => {
    setState(prev => ({
      ...prev,
      isInstallable: false,
      deferredPrompt: null
    }))
  }

  return {
    ...state,
    install,
    updateApp,
    checkForUpdates,
    dismissInstallPrompt
  }
}
```

### InstallPrompt Component

```typescript
// components/pwa/InstallPrompt.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Smartphone, Download, RefreshCw, CheckCircle } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'
import { motion, AnimatePresence } from 'framer-motion'

export function InstallPrompt() {
  const { 
    isInstallable, 
    isInstalled, 
    hasUpdate, 
    install, 
    updateApp, 
    dismissInstallPrompt 
  } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Show prompt after a delay to avoid being intrusive
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setIsVisible(true), 10000) // Show after 10 seconds
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  // Don't show if already installed and no update available
  if (isInstalled && !hasUpdate) return null
  if (!isInstallable && !hasUpdate) return null
  if (!isVisible && !hasUpdate) return null

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await install()
      if (success) {
        setIsVisible(false)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateApp()
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    dismissInstallPrompt()
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  return (
    <AnimatePresence>
      {(isVisible || hasUpdate) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
        >
          <Card className="shadow-lg border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {hasUpdate ? (
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {hasUpdate ? 'New Version Available' : 'Install TaskMaster Pro'}
                    </h3>
                    {hasUpdate && (
                      <Badge variant="secondary" className="text-xs">
                        Update
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {hasUpdate 
                      ? 'A new version with improvements is ready to install.'
                      : 'Add TaskMaster to your home screen for quick access and offline use.'
                    }
                  </p>
                  
                  <div className="flex space-x-2">
                    {hasUpdate ? (
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="flex items-center space-x-1 text-xs"
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            <span>Update</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className="flex items-center space-x-1 text-xs"
                      >
                        {isInstalling ? (
                          <>
                            <Download className="h-3 w-3 animate-pulse" />
                            <span>Installing...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            <span>Install</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="text-xs"
                    >
                      Not Now
                    </Button>
                  </div>
                </div>
                
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Installation success feedback
export function InstallationSuccess() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsVisible(true)
      
      // Hide after 5 seconds
      setTimeout(() => setIsVisible(false), 5000)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    return () => window.removeEventListener('appinstalled', handleAppInstalled)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-4 right-4 z-50"
        >
          <Card className="shadow-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                    App Installed Successfully!
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    TaskMaster Pro is now available on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Offline Storage Manager

```typescript
// lib/offline/storage-manager.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Task, Habit, HabitEntry, Project } from '@/types'
import { OfflineStorageSchema, OfflineAction, SyncConflict, SyncStatus } from '@/types/pwa'

class OfflineStorageManager {
  private db: IDBPDatabase<OfflineStorageSchema> | null = null
  private readonly DB_NAME = 'taskmaster-offline'
  private readonly DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<OfflineStorageSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Tasks store
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' })
          tasksStore.createIndex('projectId', 'projectId')
          tasksStore.createIndex('status', 'status')
          tasksStore.createIndex('dueDate', 'dueDate')
          
          // Habits store
          const habitsStore = db.createObjectStore('habits', { keyPath: 'id' })
          habitsStore.createIndex('userId', 'userId')
          habitsStore.createIndex('frequency', 'frequency')
          habitsStore.createIndex('isActive', 'isActive')
          
          // Habit entries store
          const entriesStore = db.createObjectStore('habitEntries', { keyPath: 'id' })
          entriesStore.createIndex('habitId', 'habitId')
          entriesStore.createIndex('date', 'date')
          entriesStore.createIndex('completed', 'completed')
          
          // Projects store
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' })
          projectsStore.createIndex('userId', 'userId')
          projectsStore.createIndex('status', 'status')
          
          // Sync queue store
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
          syncStore.createIndex('status', 'status')
          syncStore.createIndex('timestamp', 'timestamp')
          syncStore.createIndex('type', 'type')
          
          // Conflicts store
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' })
          conflictsStore.createIndex('resourceType', 'resourceType')
          conflictsStore.createIndex('resolution', 'resolution')
          conflictsStore.createIndex('timestamp', 'timestamp')
        }
      })
      
      console.log('Offline storage initialized successfully')
    } catch (error) {
      console.error('Failed to initialize offline storage:', error)
      throw error
    }
  }

  // Task operations
  async storeTasks(tasks: Task[]): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('tasks', 'readwrite')
    const promises = tasks.map(task => 
      tx.store.put({ ...task, _syncStatus: 'SYNCED' as SyncStatus })
    )
    
    await Promise.all([...promises, tx.done])
  }

  async getTask(id: string): Promise<Task | undefined> {
    if (!this.db) await this.initialize()
    
    const result = await this.db!.get('tasks', id)
    return result ? { ...result, _syncStatus: undefined } : undefined
  }

  async getAllTasks(): Promise<Task[]> {
    if (!this.db) await this.initialize()
    
    const results = await this.db!.getAll('tasks')
    return results.map(task => ({ ...task, _syncStatus: undefined }))
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('tasks', 'readwrite')
    const existing = await tx.store.get(id)
    
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        _syncStatus: 'PENDING' as SyncStatus,
        updatedAt: new Date()
      }
      await tx.store.put(updated)
    }
    
    await tx.done
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) await this.initialize()
    
    await this.db!.delete('tasks', id)
  }

  // Habit operations
  async storeHabits(habits: Habit[]): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('habits', 'readwrite')
    const promises = habits.map(habit => 
      tx.store.put({ ...habit, _syncStatus: 'SYNCED' as SyncStatus })
    )
    
    await Promise.all([...promises, tx.done])
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    if (!this.db) await this.initialize()
    
    const result = await this.db!.get('habits', id)
    return result ? { ...result, _syncStatus: undefined } : undefined
  }

  async getAllHabits(): Promise<Habit[]> {
    if (!this.db) await this.initialize()
    
    const results = await this.db!.getAll('habits')
    return results.map(habit => ({ ...habit, _syncStatus: undefined }))
  }

  // Habit entry operations
  async storeHabitEntries(entries: HabitEntry[]): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('habitEntries', 'readwrite')
    const promises = entries.map(entry => 
      tx.store.put({ ...entry, _syncStatus: 'SYNCED' as SyncStatus })
    )
    
    await Promise.all([...promises, tx.done])
  }

  async getHabitEntriesByHabit(habitId: string): Promise<HabitEntry[]> {
    if (!this.db) await this.initialize()
    
    const results = await this.db!.getAllFromIndex('habitEntries', 'habitId', habitId)
    return results.map(entry => ({ ...entry, _syncStatus: undefined }))
  }

  async getHabitEntriesByDate(date: string): Promise<HabitEntry[]> {
    if (!this.db) await this.initialize()
    
    const results = await this.db!.getAllFromIndex('habitEntries', 'date', date)
    return results.map(entry => ({ ...entry, _syncStatus: undefined }))
  }

  // Sync queue operations
  async addToSyncQueue(action: Omit<OfflineAction, 'id'>): Promise<string> {
    if (!this.db) await this.initialize()
    
    const actionWithId: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      status: 'PENDING'
    }
    
    await this.db!.put('syncQueue', actionWithId)
    return actionWithId.id
  }

  async getSyncQueue(): Promise<OfflineAction[]> {
    if (!this.db) await this.initialize()
    
    return await this.db!.getAllFromIndex('syncQueue', 'status', 'PENDING')
  }

  async updateSyncAction(id: string, status: OfflineAction['status']): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('syncQueue', 'readwrite')
    const action = await tx.store.get(id)
    
    if (action) {
      action.status = status
      if (status === 'FAILED') {
        action.retryCount++
      }
      await tx.store.put(action)
    }
    
    await tx.done
  }

  async clearSuccessfulSyncActions(): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('syncQueue', 'readwrite')
    const actions = await tx.store.getAllFromIndex('status', 'SUCCESS')
    
    const promises = actions.map(action => tx.store.delete(action.id))
    await Promise.all([...promises, tx.done])
  }

  // Conflict management
  async storeConflict(conflict: SyncConflict): Promise<void> {
    if (!this.db) await this.initialize()
    
    await this.db!.put('conflicts', conflict)
  }

  async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    if (!this.db) await this.initialize()
    
    return await this.db!.getAllFromIndex('conflicts', 'resolution', 'MANUAL')
  }

  async resolveConflict(id: string, resolution: SyncConflict['resolution'], resolvedData?: any): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction('conflicts', 'readwrite')
    const conflict = await tx.store.get(id)
    
    if (conflict) {
      conflict.resolution = resolution
      conflict.resolvedData = resolvedData
      await tx.store.put(conflict)
    }
    
    await tx.done
  }

  // Storage quota management
  async getStorageQuota(): Promise<{usage: number, quota: number, usagePercentage: number}> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      
      return {
        usage,
        quota,
        usagePercentage: quota > 0 ? (usage / quota) * 100 : 0
      }
    }
    
    return { usage: 0, quota: 0, usagePercentage: 0 }
  }

  async clearOldData(daysToKeep: number = 30): Promise<void> {
    if (!this.db) await this.initialize()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    // Clear old habit entries
    const tx = this.db!.transaction('habitEntries', 'readwrite')
    const cursor = await tx.store.openCursor()
    
    while (cursor) {
      const entry = cursor.value
      if (new Date(entry.date) < cutoffDate) {
        await cursor.delete()
      }
      await cursor.continue()
    }
    
    await tx.done
  }

  // Utility methods
  async getAll<T extends keyof OfflineStorageSchema>(
    storeName: T
  ): Promise<OfflineStorageSchema[T]['value'][]> {
    if (!this.db) await this.initialize()
    
    return await this.db!.getAll(storeName)
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize()
    
    const tx = this.db!.transaction(
      ['tasks', 'habits', 'habitEntries', 'projects', 'syncQueue', 'conflicts'], 
      'readwrite'
    )
    
    const promises = [
      tx.objectStore('tasks').clear(),
      tx.objectStore('habits').clear(),
      tx.objectStore('habitEntries').clear(),
      tx.objectStore('projects').clear(),
      tx.objectStore('syncQueue').clear(),
      tx.objectStore('conflicts').clear()
    ]
    
    await Promise.all([...promises, tx.done])
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager()

// Utility functions for common operations
export async function storeOfflineAction(
  type: OfflineAction['type'],
  data: any,
  url: string,
  method: OfflineAction['method'] = 'POST'
): Promise<string> {
  return await offlineStorage.addToSyncQueue({
    type,
    data,
    url,
    method,
    timestamp: new Date(),
    retryCount: 0,
    maxRetries: 3,
    status: 'PENDING'
  })
}

export async function processOfflineActions(): Promise<void> {
  const actions = await offlineStorage.getSyncQueue()
  
  for (const action of actions) {
    if (action.retryCount >= action.maxRetries) {
      await offlineStorage.updateSyncAction(action.id, 'FAILED')
      continue
    }

    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      })

      if (response.ok) {
        await offlineStorage.updateSyncAction(action.id, 'SUCCESS')
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      await offlineStorage.updateSyncAction(action.id, 'FAILED')
      console.error(`Sync failed for action ${action.id}:`, error)
    }
  }

  // Clean up successful actions
  await offlineStorage.clearSuccessfulSyncActions()
}
```

### Network Status Hook

```typescript
// hooks/useNetworkStatus.ts
'use client'

import { useState, useEffect } from 'react'
import { NetworkStatus } from '@/types/pwa'

interface UseNetworkStatusReturn extends NetworkStatus {
  isSlowConnection: boolean
  isDataSaverMode: boolean
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  })

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      setNetworkStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 100,
        saveData: connection?.saveData || false
      })
    }

    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }))
      
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync?.register('background-sync')
        })
      }
    }

    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: false }))
    }

    // Initial check
    updateNetworkStatus()

    // Event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Connection change listener
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  const isSlowConnection = networkStatus.effectiveType === 'slow-2g' || 
                          networkStatus.effectiveType === '2g' ||
                          networkStatus.downlink < 1.5

  const isDataSaverMode = networkStatus.saveData

  return {
    ...networkStatus,
    isSlowConnection,
    isDataSaverMode
  }
}

// Network status indicator component
export function NetworkStatusIndicator() {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus()

  if (isOnline && !isSlowConnection) return null

  return (
    <div className={`px-2 py-1 text-xs rounded-md ${
      !isOnline 
        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
    }`}>
      {!isOnline ? 'Offline' : `Slow connection (${effectiveType})`}
    </div>
  )
}
```

### Mobile Optimization Components

```typescript
// components/mobile/TouchOptimized.tsx
'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TouchOptimizedProps {
  children: ReactNode
  onTap?: () => void
  onLongPress?: () => void
  className?: string
  disabled?: boolean
  hapticFeedback?: boolean
}

export function TouchOptimized({ 
  children, 
  onTap, 
  onLongPress, 
  className,
  disabled = false,
  hapticFeedback = true
}: TouchOptimizedProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [pressStart, setPressStart] = useState<number | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const LONG_PRESS_DURATION = 500 // ms

  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !('vibrate' in navigator)) return
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    }
    
    navigator.vibrate(patterns[type])
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    
    setIsPressed(true)
    setPressStart(Date.now())
    
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        triggerHapticFeedback('medium')
        onLongPress()
        setIsPressed(false)
      }, LONG_PRESS_DURATION)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return
    
    setIsPressed(false)
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    const pressDuration = pressStart ? Date.now() - pressStart : 0
    
    if (pressDuration < LONG_PRESS_DURATION && onTap) {
      triggerHapticFeedback('light')
      onTap()
    }
    
    setPressStart(null)
  }

  const handleTouchCancel = () => {
    setIsPressed(false)
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    setPressStart(null)
  }

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <div
      className={cn(
        'touch-manipulation select-none transition-transform duration-75',
        isPressed && 'transform scale-95',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        minHeight: '44px', // iOS accessibility guideline
        minWidth: '44px'
      }}
    >
      {children}
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  threshold?: number
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startY.current || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault()
      setIsPulling(true)
      setPullDistance(Math.min(diff, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setIsPulling(false)
    setPullDistance(0)
    startY.current = null
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 z-10"
        style={{
          transform: `translateY(${isPulling ? pullDistance - threshold : -threshold}px)`,
          height: `${threshold}px`
        }}
      >
        <div className={cn(
          "flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg",
          pullDistance >= threshold && "bg-green-50 dark:bg-green-900/20"
        )}>
          <div className={cn(
            "w-6 h-6 border-2 border-gray-300 rounded-full",
            isRefreshing && "animate-spin border-t-green-500",
            pullDistance >= threshold && "border-green-500"
          )}>
            {!isRefreshing && pullDistance >= threshold && (
              <div className="w-full h-full bg-green-500 rounded-full" />
            )}
          </div>
          <span className="text-sm font-medium">
            {isRefreshing ? 'Refreshing...' : 
             pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: isPulling ? `${Math.max(0, pullDistance - threshold)}px` : 0 }}>
        {children}
      </div>
    </div>
  )
}

// Safe area provider for mobile devices
export function SafeAreaProvider({ children }: { children: ReactNode }) {
  return (
    <div 
      className="min-h-screen"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {children}
    </div>
  )
}

// Responsive navigation for mobile
export function MobileNavigation() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false) // Hide on scroll down
      } else {
        setIsVisible(true) // Show on scroll up
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300",
      !isVisible && "translate-y-full"
    )}>
      <div className="grid grid-cols-4 h-16">
        {/* Navigation items would go here */}
      </div>
    </nav>
  )
}
```

## PWA Manifest Configuration

```json
// public/manifest.json
{
  "name": "TaskMaster Pro",
  "short_name": "TaskMaster",
  "description": "Advanced productivity suite with habit tracking, task management, and analytics",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "categories": ["productivity", "utilities", "lifestyle"],
  "lang": "en",
  "dir": "ltr",
  "prefer_related_applications": false,
  "shortcuts": [
    {
      "name": "Add Task",
      "short_name": "Add Task",
      "description": "Quickly add a new task",
      "url": "/tasks/new",
      "icons": [
        {
          "src": "/icons/add-task-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Check Habits",
      "short_name": "Habits",
      "description": "View and complete your habits",
      "url": "/habits",
      "icons": [
        {
          "src": "/icons/habits-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Analytics",
      "short_name": "Analytics",
      "description": "View your productivity insights",
      "url": "/analytics",
      "icons": [
        {
          "src": "/icons/analytics-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    }
  ],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "platform": "wide",
      "label": "Dashboard view on desktop"
    },
    {
      "src": "/screenshots/mobile-tasks.png",
      "sizes": "375x812",
      "type": "image/png",
      "platform": "narrow",
      "label": "Task management on mobile"
    },
    {
      "src": "/screenshots/mobile-habits.png",
      "sizes": "375x812",
      "type": "image/png",
      "platform": "narrow",
      "label": "Habit tracking interface"
    }
  ],
  "edge_side_panel": {
    "preferred_width": 400
  },
  "file_handlers": [
    {
      "action": "/import",
      "accept": {
        "text/csv": [".csv"],
        "application/json": [".json"]
      }
    }
  ]
}
```

## Integration Points with Other Subgroups

### Data Intelligence & Analytics Integration
- **Offline Analytics**: Cache productivity metrics and habit data for offline analysis
- **Sync Priority**: Prioritize habit completions and productivity data for background sync
- **Conflict Resolution**: Handle analytics data conflicts when multiple devices sync

### External Integration Layer
- **Calendar Sync**: Queue calendar synchronization for offline processing
- **API Resilience**: Graceful handling of external API failures
- **Background Refresh**: Update external data during background sync cycles

### Security & Performance Integration
- **Secure Storage**: Encrypt sensitive offline data in IndexedDB
- **Performance Monitoring**: Track PWA performance metrics offline
- **Cache Security**: Implement secure caching strategies for authenticated content

### Task Management Integration
- **Offline Task Management**: Full CRUD operations for tasks without connectivity
- **Optimistic Updates**: Immediate UI feedback with background sync
- **Conflict Resolution**: Handle concurrent task edits across devices

## Testing Strategies for PWA

### Service Worker Testing
```typescript
// __tests__/pwa/service-worker-integration.test.ts
describe('Service Worker Integration', () => {
  beforeEach(() => {
    // Mock service worker environment
    global.self = {
      addEventListener: jest.fn(),
      registration: {
        showNotification: jest.fn()
      },
      clients: {
        matchAll: jest.fn(() => Promise.resolve([]))
      }
    } as any
  })

  it('should cache essential resources on install', async () => {
    const mockCache = {
      addAll: jest.fn(() => Promise.resolve()),
      match: jest.fn(() => Promise.resolve(new Response('cached')))
    }
    
    global.caches = {
      open: jest.fn(() => Promise.resolve(mockCache))
    } as any

    // Simulate install event
    const installEvent = new Event('install')
    self.dispatchEvent(installEvent)

    expect(global.caches.open).toHaveBeenCalledWith('taskmaster-v1')
    expect(mockCache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining(['/', '/dashboard', '/offline.html'])
    )
  })

  it('should handle offline POST requests', async () => {
    const postRequest = new Request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'New task' })
    })

    const fetchEvent = new Event('fetch') as any
    fetchEvent.request = postRequest
    fetchEvent.respondWith = jest.fn()

    // Mock offline scenario
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))
    
    self.dispatchEvent(fetchEvent)

    expect(fetchEvent.respondWith).toHaveBeenCalled()
  })
})
```

### Installation Flow Testing
```typescript
// __tests__/pwa/installation-flow.test.ts
describe('PWA Installation Flow', () => {
  it('should show install prompt after delay', async () => {
    const { result } = renderHook(() => usePWA())

    // Simulate beforeinstallprompt event
    const mockEvent = {
      prompt: jest.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
      preventDefault: jest.fn()
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', { detail: mockEvent }))
    })

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true)
    })

    const success = await act(async () => {
      return result.current.install()
    })

    expect(success).toBe(true)
    expect(mockEvent.prompt).toHaveBeenCalled()
  })

  it('should handle installation cancellation', async () => {
    const { result } = renderHook(() => usePWA())

    const mockEvent = {
      prompt: jest.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
      preventDefault: jest.fn()
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', { detail: mockEvent }))
    })

    const success = await act(async () => {
      return result.current.install()
    })

    expect(success).toBe(false)
  })
})
```

### Offline Functionality Testing
```typescript
// __tests__/pwa/offline-functionality.test.ts
describe('Offline Functionality', () => {
  beforeEach(async () => {
    await offlineStorage.initialize()
    await offlineStorage.clear()
  })

  it('should store tasks offline', async () => {
    const mockTask = {
      id: '1',
      title: 'Test task',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      userId: 'user1',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await offlineStorage.storeTasks([mockTask])
    const retrieved = await offlineStorage.getTask('1')

    expect(retrieved).toMatchObject(mockTask)
  })

  it('should queue actions for sync when offline', async () => {
    const actionId = await storeOfflineAction(
      'CREATE_TASK',
      { title: 'New task' },
      '/api/tasks',
      'POST'
    )

    const queue = await offlineStorage.getSyncQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(actionId)
    expect(queue[0].status).toBe('PENDING')
  })

  it('should handle sync conflicts', async () => {
    const conflict: SyncConflict = {
      id: 'conflict-1',
      resourceType: 'task',
      resourceId: 'task-1',
      localData: { title: 'Local version' },
      serverData: { title: 'Server version' },
      conflictFields: ['title'],
      resolution: 'MANUAL',
      timestamp: new Date()
    }

    await offlineStorage.storeConflict(conflict)
    const conflicts = await offlineStorage.getUnresolvedConflicts()

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].id).toBe('conflict-1')
  })
})
```

### Performance Testing
```typescript
// __tests__/pwa/performance.test.ts
describe('PWA Performance', () => {
  it('should load quickly on first visit', async () => {
    const startTime = performance.now()
    
    render(<InstallPrompt />)
    
    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(100) // 100ms budget
  })

  it('should handle large offline datasets efficiently', async () => {
    const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      userId: 'user1',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    const startTime = performance.now()
    await offlineStorage.storeTasks(largeTasks)
    const storageTime = performance.now()
    
    const allTasks = await offlineStorage.getAllTasks()
    const retrievalTime = performance.now()

    expect(storageTime - startTime).toBeLessThan(500) // 500ms for storage
    expect(retrievalTime - storageTime).toBeLessThan(200) // 200ms for retrieval
    expect(allTasks).toHaveLength(1000)
  })

  it('should maintain reasonable memory usage', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // Create large amount of offline data
    for (let i = 0; i < 100; i++) {
      await storeOfflineAction(
        'CREATE_TASK',
        { title: `Task ${i}`, data: 'x'.repeat(1000) }, // 1KB per action
        '/api/tasks'
      )
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory

    // Should not exceed 10MB increase
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})
```

## Performance Optimizations

### Caching Strategies
- **Critical Resource Cache**: Immediate caching of essential app shell resources
- **Runtime Caching**: Smart caching based on usage patterns and available storage
- **Background Refresh**: Update cached resources during idle time
- **Cache Prioritization**: Prioritize frequently accessed data for retention

### Mobile Performance
- **Touch Optimization**: 44px minimum touch targets, haptic feedback
- **Viewport Optimization**: Proper meta viewport configuration for mobile
- **Image Optimization**: Responsive images with WebP format support
- **Critical CSS**: Inline critical CSS for above-the-fold content

### Storage Optimization
- **Quota Management**: Monitor storage usage and automatically clean old data
- **Compression**: Compress offline data to maximize storage efficiency
- **Selective Sync**: Only sync data that has changed to minimize bandwidth

This comprehensive PWA & Offline Infrastructure implementation transforms TaskMaster Pro into a fully-featured Progressive Web App with robust offline capabilities, mobile optimization, and seamless synchronization across devices.