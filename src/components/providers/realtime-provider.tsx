'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeEvent, RealtimeEventType, UserPresence } from '@/types/realtime'
import { getRealtimeManager, initializeRealtime } from '@/lib/realtime/manager'
import StateOrchestrator from '@/lib/state-orchestration/orchestrator'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

interface RealtimeContextValue {
  isConnected: boolean
  userPresence: UserPresence[]
  subscribe: (
    eventTypes: RealtimeEventType[], 
    callback: (event: RealtimeEvent) => void
  ) => string | null
  unsubscribe: (subscriptionId: string) => void
  sendEvent: (type: RealtimeEventType, payload: any) => void
  performOptimisticUpdate: <T>(
    entityType: 'task' | 'project' | 'note',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    optimisticData: T,
    originalData?: T
  ) => string | null
  rollbackOptimisticUpdate: (updateId: string) => void
  getOfflineQueueLength: () => number
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  metrics: {
    latency: number
    packetsLost: number
    reconnectCount: number
  }
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { trackQuery, metrics: perfMetrics } = usePerformanceMonitor('RealtimeProvider')
  
  const [isConnected, setIsConnected] = useState(false)
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [connectionMetrics, setConnectionMetrics] = useState({
    latency: 0,
    packetsLost: 0,
    reconnectCount: 0
  })
  
  const [realtimeManager, setRealtimeManager] = useState<ReturnType<typeof getRealtimeManager>>(null)
  const [stateOrchestrator, setStateOrchestrator] = useState<StateOrchestrator | null>(null)

  // Initialize realtime connection when user session is available
  useEffect(() => {
    if (!session?.user?.id) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')
    
    try {
      // Initialize realtime manager
      const manager = initializeRealtime(session.user.id)
      setRealtimeManager(manager)
      
      // Initialize state orchestrator
      const orchestrator = new StateOrchestrator(queryClient)
      setStateOrchestrator(orchestrator)

      // Subscribe to system events for connection status
      const systemSubscriptionId = manager.subscribe(
        ['USER_PRESENCE_CHANGED', 'SYSTEM_NOTIFICATION'],
        (event: RealtimeEvent) => {
          switch (event.type) {
            case 'USER_PRESENCE_CHANGED':
              setUserPresence(event.payload as UserPresence[])
              setIsConnected(true)
              setConnectionStatus('connected')
              break
            case 'SYSTEM_NOTIFICATION':
              if (event.payload.type === 'connection_error') {
                setConnectionStatus('error')
                setIsConnected(false)
              }
              break
          }
        }
      )

      // Connect realtime events to state orchestrator
      const dataSubscriptionId = manager.subscribe(
        ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'PROJECT_UPDATED', 'NOTE_UPDATED'],
        (event: RealtimeEvent) => {
          const queryStart = performance.now()
          orchestrator.handleRealtimeEvent(event)
          const queryEnd = performance.now()
          
          trackQuery(`realtime-${event.type}`, queryEnd - queryStart, false)
        }
      )

      // Connection health monitoring
      const healthInterval = setInterval(() => {
        // Simulate latency check (in real implementation, this would ping the server)
        const latency = Math.random() * 100 + 20 // 20-120ms
        setConnectionMetrics(prev => ({
          ...prev,
          latency
        }))
      }, 10000)

      return () => {
        if (manager) {
          manager.unsubscribe(systemSubscriptionId)
          manager.unsubscribe(dataSubscriptionId)
          manager.disconnect()
        }
        if (orchestrator) {
          orchestrator.cleanup()
        }
        clearInterval(healthInterval)
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Failed to initialize realtime connection:', error)
      setConnectionStatus('error')
      setIsConnected(false)
    }
  }, [session?.user?.id, queryClient, trackQuery])

  // Context value
  const contextValue: RealtimeContextValue = {
    isConnected,
    userPresence,
    connectionStatus,
    metrics: connectionMetrics,
    
    subscribe: (eventTypes: RealtimeEventType[], callback: (event: RealtimeEvent) => void) => {
      if (!realtimeManager) return null
      return realtimeManager.subscribe(eventTypes, callback)
    },
    
    unsubscribe: (subscriptionId: string) => {
      if (!realtimeManager) return
      realtimeManager.unsubscribe(subscriptionId)
    },
    
    sendEvent: (type: RealtimeEventType, payload: any) => {
      if (!realtimeManager) return
      realtimeManager.sendEvent(type, payload)
    },
    
    performOptimisticUpdate: <T>(
      entityType: 'task' | 'project' | 'note',
      entityId: string,
      operation: 'create' | 'update' | 'delete',
      optimisticData: T,
      originalData?: T
    ) => {
      if (!stateOrchestrator) return null
      return stateOrchestrator.performOptimisticUpdate(
        entityType,
        entityId,
        operation,
        optimisticData,
        originalData
      )
    },
    
    rollbackOptimisticUpdate: (updateId: string) => {
      if (!stateOrchestrator) return
      stateOrchestrator.rollbackOptimisticUpdate(updateId)
    },
    
    getOfflineQueueLength: () => {
      return stateOrchestrator?.getOfflineQueueLength() || 0
    }
  }

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            px-3 py-2 rounded-lg text-sm font-medium
            ${connectionStatus === 'connecting' ? 'bg-amber-100 text-amber-800' : ''}
            ${connectionStatus === 'error' ? 'bg-red-100 text-red-800' : ''}
            ${connectionStatus === 'disconnected' ? 'bg-gray-100 text-gray-800' : ''}
          `}>
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'disconnected' && 'Offline'}
          </div>
        </div>
      )}
      
      {/* Performance metrics in development */}
      {process.env.NODE_ENV === 'development' && perfMetrics.memoryUsage > 0 && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs font-mono">
          <div>Memory: {perfMetrics.memoryUsage.toFixed(1)}MB</div>
          <div>Queries: {perfMetrics.queryCount}</div>
          <div>Cache Hit: {(perfMetrics.cacheHitRate * 100).toFixed(1)}%</div>
          <div>Latency: {connectionMetrics.latency.toFixed(0)}ms</div>
          {contextValue.getOfflineQueueLength() > 0 && (
            <div>Offline Queue: {contextValue.getOfflineQueueLength()}</div>
          )}
        </div>
      )}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

// Helper hook for presence awareness
export function usePresence() {
  const { userPresence, isConnected } = useRealtime()
  
  return {
    onlineUsers: userPresence.filter(user => user.status === 'online'),
    awayUsers: userPresence.filter(user => user.status === 'away'),
    totalUsers: userPresence.length,
    isConnected
  }
}

// Helper hook for optimistic updates
export function useOptimisticMutation<T>(
  entityType: 'task' | 'project' | 'note'
) {
  const { performOptimisticUpdate, rollbackOptimisticUpdate } = useRealtime()
  
  const mutateOptimistically = (
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    optimisticData: T,
    originalData?: T
  ) => {
    const updateId = performOptimisticUpdate(
      entityType,
      entityId,
      operation,
      optimisticData,
      originalData
    )
    
    return {
      updateId,
      rollback: () => updateId && rollbackOptimisticUpdate(updateId)
    }
  }
  
  return { mutateOptimistically }
}