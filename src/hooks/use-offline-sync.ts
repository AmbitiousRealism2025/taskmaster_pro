// React Hook for Offline Sync Management
// Provides sync status and methods to React components

import { useState, useEffect, useCallback } from 'react'
import { syncManager, SyncStatus } from '@/lib/offline/sync-manager'

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    errors: []
  })

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status)
    })

    // Get initial pending changes count
    syncManager.getPendingChangesCount().then((count) => {
      setSyncStatus(prev => ({ ...prev, pendingChanges: count }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const sync = useCallback(async () => {
    const result = await syncManager.sync()
    return result
  }, [])

  const getTimeSinceLastSync = useCallback(() => {
    if (!syncStatus.lastSyncTime) return null
    
    const now = new Date()
    const lastSync = new Date(syncStatus.lastSyncTime)
    const diffMs = now.getTime() - lastSync.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }, [syncStatus.lastSyncTime])

  return {
    ...syncStatus,
    sync,
    getTimeSinceLastSync
  }
}