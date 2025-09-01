import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRealtime } from '@/components/providers/realtime-provider'
import StateOrchestrator from '@/lib/state-orchestration/orchestrator'
import { Task } from '@/types/task'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue('SUBSCRIBED'),
      unsubscribe: jest.fn(),
      track: jest.fn()
    }))
  }
}))

// Mock session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user-1' } }
  })
}))

describe('State Management Integration', () => {
  let queryClient: QueryClient
  let orchestrator: StateOrchestrator

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    orchestrator = new StateOrchestrator(queryClient)
  })

  afterEach(() => {
    orchestrator.cleanup()
    queryClient.clear()
  })

  it('should sync Zustand store with TanStack Query', async () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'TODO',
      priority: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    // Set initial query data
    queryClient.setQueryData(['tasks'], [mockTask])
    
    // Verify data is accessible
    const tasksData = queryClient.getQueryData(['tasks'])
    expect(tasksData).toEqual([mockTask])
    
    // Test optimistic update
    const updateId = orchestrator.performOptimisticUpdate(
      'task',
      'task-1',
      'update',
      { ...mockTask, status: 'DONE' },
      mockTask
    )

    // Verify optimistic update applied
    const updatedData = queryClient.getQueryData(['tasks', 'task-1'])
    expect((updatedData as Task).status).toBe('DONE')
    
    // Test rollback
    orchestrator.rollbackOptimisticUpdate(updateId)
    
    const rolledBackData = queryClient.getQueryData(['tasks', 'task-1'])
    expect((rolledBackData as Task).status).toBe('TODO')
  })

  it('should handle offline queue management', async () => {
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    const mockTask: Task = {
      id: 'task-2',
      title: 'Offline Task',
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    // Perform optimistic update while offline
    orchestrator.performOptimisticUpdate(
      'task',
      'task-2',
      'create',
      mockTask
    )

    // Check offline queue length
    expect(orchestrator.getOfflineQueueLength()).toBe(1)

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })

    // Mock successful API call
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockTask
    })

    // Trigger online event
    const onlineEvent = new Event('online')
    window.dispatchEvent(onlineEvent)

    // Wait for queue processing
    await new Promise(resolve => setTimeout(resolve, 100))

    // Queue should be processed
    expect(orchestrator.getOfflineQueueLength()).toBe(0)
  })

  it('should handle cross-tab synchronization', async () => {
    const mockBroadcastChannel = {
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      close: jest.fn()
    }

    // Mock BroadcastChannel
    global.BroadcastChannel = jest.fn(() => mockBroadcastChannel) as any

    // Create new orchestrator (should set up broadcast channel)
    const orchestrator2 = new StateOrchestrator(queryClient)

    const mockTask: Task = {
      id: 'task-3',
      title: 'Cross-tab Task',
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    // Perform optimistic update
    orchestrator2.performOptimisticUpdate(
      'task',
      'task-3',
      'update',
      mockTask
    )

    // Verify broadcast message was sent
    expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'OPTIMISTIC_UPDATE',
        payload: expect.objectContaining({
          entityType: 'task',
          entityId: 'task-3'
        })
      })
    )

    orchestrator2.cleanup()
  })

  it('should process realtime events correctly', async () => {
    const mockTask: Task = {
      id: 'task-4',
      title: 'Realtime Task',
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    // Set initial query data
    queryClient.setQueryData(['tasks'], [mockTask])

    // Simulate realtime update event
    const realtimeEvent = {
      id: 'event-1',
      type: 'TASK_UPDATED' as const,
      payload: { ...mockTask, status: 'DONE', title: 'Updated Task' },
      userId: 'test-user-1',
      sessionId: 'session-1',
      timestamp: new Date(),
      version: 1
    }

    orchestrator.handleRealtimeEvent(realtimeEvent)

    // Verify query cache was updated
    const updatedTasks = queryClient.getQueryData(['tasks']) as Task[]
    expect(updatedTasks[0].status).toBe('DONE')
    expect(updatedTasks[0].title).toBe('Updated Task')
  })

  it('should handle conflict resolution', async () => {
    const originalTask: Task = {
      id: 'task-5',
      title: 'Conflict Task',
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    const localUpdate: Task = {
      ...originalTask,
      status: 'IN_PROGRESS',
      updatedAt: new Date()
    }

    const remoteUpdate: Task = {
      ...originalTask,
      status: 'DONE',
      updatedAt: new Date(Date.now() + 1000) // Later timestamp
    }

    // Set initial data
    queryClient.setQueryData(['tasks'], [originalTask])

    // Apply optimistic update
    const updateId = orchestrator.performOptimisticUpdate(
      'task',
      'task-5',
      'update',
      localUpdate,
      originalTask
    )

    // Simulate remote update (conflict)
    const conflictEvent = {
      id: 'conflict-event',
      type: 'TASK_UPDATED' as const,
      payload: remoteUpdate,
      userId: 'other-user',
      sessionId: 'other-session',
      timestamp: new Date(),
      version: 2
    }

    orchestrator.handleRealtimeEvent(conflictEvent)

    // Remote update should take precedence (later timestamp)
    const finalTasks = queryClient.getQueryData(['tasks']) as Task[]
    expect(finalTasks[0].status).toBe('DONE')

    // Optimistic update should be cancelled
    const pendingUpdates = orchestrator.getPendingOptimisticUpdates()
    const pendingUpdate = pendingUpdates.find(u => u.id === updateId)
    expect(pendingUpdate?.isRolledBack).toBe(true)
  })

  it('should track performance metrics', async () => {
    const startTime = performance.now()
    
    const mockTask: Task = {
      id: 'perf-task',
      title: 'Performance Task',
      status: 'TODO',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-1'
    }

    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      orchestrator.performOptimisticUpdate(
        'task',
        `task-${i}`,
        'create',
        { ...mockTask, id: `task-${i}` }
      )
    }

    const endTime = performance.now()
    const operationTime = endTime - startTime

    // Operations should be fast (under 100ms for 10 operations)
    expect(operationTime).toBeLessThan(100)

    // All optimistic updates should be tracked
    expect(orchestrator.getPendingOptimisticUpdates()).toHaveLength(10)
  })
})