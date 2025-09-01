import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { getRealtimeManager, initializeRealtime } from '@/lib/realtime/manager'
import StateOrchestrator from '@/lib/state-orchestration/orchestrator'
import { RealtimeEvent, RealtimeEventType } from '@/types/realtime'

export function useRealtime() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const realtimeManagerRef = useRef<ReturnType<typeof getRealtimeManager>>(null)
  const stateOrchestratorRef = useRef<StateOrchestrator | null>(null)

  // Initialize realtime connection
  useEffect(() => {
    if (!session?.user?.id) return

    // Initialize realtime manager
    realtimeManagerRef.current = initializeRealtime(session.user.id)
    
    // Initialize state orchestrator
    stateOrchestratorRef.current = new StateOrchestrator(queryClient)

    // Connect realtime events to state orchestrator
    const subscriptionId = realtimeManagerRef.current.subscribe(
      ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'PROJECT_UPDATED', 'NOTE_UPDATED'],
      (event: RealtimeEvent) => {
        stateOrchestratorRef.current?.handleRealtimeEvent(event)
      }
    )

    return () => {
      if (realtimeManagerRef.current) {
        realtimeManagerRef.current.unsubscribe(subscriptionId)
        realtimeManagerRef.current.disconnect()
      }
      if (stateOrchestratorRef.current) {
        stateOrchestratorRef.current.cleanup()
      }
    }
  }, [session?.user?.id, queryClient])

  const subscribe = useCallback(
    (eventTypes: RealtimeEventType[], callback: (event: RealtimeEvent) => void): string | null => {
      if (!realtimeManagerRef.current) return null
      return realtimeManagerRef.current.subscribe(eventTypes, callback)
    },
    []
  )

  const unsubscribe = useCallback((subscriptionId: string) => {
    if (!realtimeManagerRef.current || !subscriptionId) return
    realtimeManagerRef.current.unsubscribe(subscriptionId)
  }, [])

  const sendEvent = useCallback((type: RealtimeEventType, payload: any) => {
    if (!realtimeManagerRef.current) return
    realtimeManagerRef.current.sendEvent(type, payload)
  }, [])

  const performOptimisticUpdate = useCallback(
    <T>(
      entityType: 'task' | 'project' | 'note',
      entityId: string,
      operation: 'create' | 'update' | 'delete',
      optimisticData: T,
      originalData?: T
    ): string | null => {
      if (!stateOrchestratorRef.current) return null
      return stateOrchestratorRef.current.performOptimisticUpdate(
        entityType,
        entityId,
        operation,
        optimisticData,
        originalData
      )
    },
    []
  )

  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    if (!stateOrchestratorRef.current || !updateId) return
    stateOrchestratorRef.current.rollbackOptimisticUpdate(updateId)
  }, [])

  const getOfflineQueueLength = useCallback(() => {
    return stateOrchestratorRef.current?.getOfflineQueueLength() || 0
  }, [])

  const getPendingOptimisticUpdates = useCallback(() => {
    return stateOrchestratorRef.current?.getPendingOptimisticUpdates() || []
  }, [])

  return {
    subscribe,
    unsubscribe,
    sendEvent,
    performOptimisticUpdate,
    rollbackOptimisticUpdate,
    getOfflineQueueLength,
    getPendingOptimisticUpdates,
    isConnected: !!realtimeManagerRef.current
  }
}