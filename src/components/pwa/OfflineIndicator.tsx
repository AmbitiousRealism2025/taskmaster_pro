'use client'

import { useOfflineSync } from '@/hooks/use-offline-sync'
import { cn } from '@/lib/utils'
import { WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react'

export function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingChanges,
    errors,
    sync,
    getTimeSinceLastSync
  } = useOfflineSync()

  // Don't show if online and no pending changes
  if (isOnline && pendingChanges === 0 && errors.length === 0) {
    return null
  }

  const handleSync = async () => {
    if (!isSyncing) {
      await sync()
    }
  }

  return (
    <div className="fixed top-16 right-4 z-40">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg shadow-md transition-all",
        !isOnline && "bg-orange-500/10 border border-orange-500/20",
        isOnline && pendingChanges > 0 && "bg-blue-500/10 border border-blue-500/20",
        errors.length > 0 && "bg-red-500/10 border border-red-500/20"
      )}>
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">Offline Mode</span>
            {pendingChanges > 0 && (
              <span className="text-xs text-orange-500/80">
                ({pendingChanges} pending)
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-blue-500">Syncing...</span>
          </>
        ) : errors.length > 0 ? (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Sync Error</span>
            <button
              onClick={handleSync}
              className="text-xs text-red-500 underline hover:no-underline"
            >
              Retry
            </button>
          </>
        ) : pendingChanges > 0 ? (
          <>
            <RefreshCw className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">
              {pendingChanges} change{pendingChanges === 1 ? '' : 's'} pending
            </span>
            <button
              onClick={handleSync}
              className="text-xs text-blue-500 underline hover:no-underline"
            >
              Sync now
            </button>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">All synced</span>
            <span className="text-xs text-green-500/80">
              {getTimeSinceLastSync()}
            </span>
          </>
        )}
      </div>
    </div>
  )
}