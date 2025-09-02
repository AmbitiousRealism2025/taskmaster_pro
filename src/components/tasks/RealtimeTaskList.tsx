'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRealtime, useOptimisticMutation } from '@/components/providers/realtime-provider'
import { VirtualScroller } from '@/hooks/use-virtual-scrolling'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { Task } from '@/types/task'
import { RealtimeEvent } from '@/types/realtime'
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'

interface RealtimeTaskListProps {
  initialTasks: Task[]
  onTaskUpdate?: (task: Task) => void
}

function RealtimeTaskListComponent({ initialTasks, onTaskUpdate }: RealtimeTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isLoading, setIsLoading] = useState(false)
  const [realtimeUpdates, setRealtimeUpdates] = useState<Map<string, Date>>(new Map())
  
  const { subscribe, unsubscribe, sendEvent, getOfflineQueueLength } = useRealtime()
  const { mutateOptimistically } = useOptimisticMutation<Task>('task')
  const { trackVirtualScrolling, metrics } = usePerformanceMonitor('RealtimeTaskList')

  // Subscribe to real-time task updates
  useEffect(() => {
    const subscriptionId = subscribe(
      ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_STATUS_CHANGED'],
      handleRealtimeUpdate
    )

    return () => {
      if (subscriptionId) {
        unsubscribe(subscriptionId)
      }
    }
  }, [])

  const handleRealtimeUpdate = useCallback((event: RealtimeEvent) => {
    const taskId = event.payload.id
    const timestamp = new Date()

    // Track realtime updates for visual feedback
    setRealtimeUpdates(prev => new Map(prev).set(taskId, timestamp))
    
    // Remove update indicator after 2 seconds
    setTimeout(() => {
      setRealtimeUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(taskId)
        return newMap
      })
    }, 2000)

    switch (event.type) {
      case 'TASK_CREATED':
        setTasks(prev => [event.payload, ...prev])
        break
      
      case 'TASK_UPDATED':
      case 'TASK_STATUS_CHANGED':
        setTasks(prev => 
          prev.map(task => 
            task.id === event.payload.id ? { ...task, ...event.payload } : task
          )
        )
        if (onTaskUpdate) {
          onTaskUpdate(event.payload)
        }
        break
      
      case 'TASK_DELETED':
        setTasks(prev => prev.filter(task => task.id !== event.payload.id))
        break
    }
  }, [onTaskUpdate])

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Perform optimistic update
    const optimisticTask = { ...task, status: newStatus, updatedAt: new Date() }
    const { updateId, rollback } = mutateOptimistically(
      taskId,
      'update',
      optimisticTask,
      task
    )

    try {
      setIsLoading(true)
      
      // Simulate API call
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask = await response.json()
      
      // Send real-time event to notify other clients
      sendEvent('TASK_STATUS_CHANGED', updatedTask)
      
    } catch (error) {
      console.error('Failed to update task status:', error)
      // Rollback optimistic update on error
      rollback()
    } finally {
      setIsLoading(false)
    }
  }, [tasks, mutateOptimistically, sendEvent])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-amber-600" />
      case 'TODO':
        return <AlertCircle className="w-4 h-4 text-slate-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700'
      case 'LOW':
        return 'bg-emerald-100 text-emerald-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const renderTask = useCallback((task: Task, index: number, measureRef: React.RefCallback<HTMLElement>) => {
    const hasRealtimeUpdate = realtimeUpdates.has(task.id)
    
    return (
      <div ref={measureRef} className="p-2">
        <Card className={`
          transition-all duration-200
          ${hasRealtimeUpdate ? 'ring-2 ring-blue-500 shadow-lg' : ''}
          ${isLoading ? 'opacity-75' : ''}
        `}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(task.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {task.priority && (
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                )}
                
                {hasRealtimeUpdate && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    Updated
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                {task.status !== 'TODO' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, 'TODO')}
                    disabled={isLoading}
                  >
                    To Do
                  </Button>
                )}
                {task.status !== 'IN_PROGRESS' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                    disabled={isLoading}
                  >
                    In Progress
                  </Button>
                )}
                {task.status !== 'DONE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, 'DONE')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Done'
                    )}
                  </Button>
                )}
              </div>
              
              {task.dueDate && (
                <span className="text-xs text-slate-500">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [realtimeUpdates, isLoading, updateTaskStatus])

  // Track virtual scrolling performance
  useEffect(() => {
    trackVirtualScrolling(Math.min(10, tasks.length), tasks.length)
  }, [tasks.length, trackVirtualScrolling])

  const offlineQueueLength = getOfflineQueueLength()

  return (
    <div className="space-y-4">
      {/* Status indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {tasks.length} tasks
          </span>
          
          {offlineQueueLength > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {offlineQueueLength} pending sync
            </Badge>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <span className="text-xs text-slate-500">
              Render: {metrics.renderTime.toFixed(1)}ms
            </span>
          )}
        </div>
        
        {realtimeUpdates.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {realtimeUpdates.size} live update{realtimeUpdates.size > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Virtual scrolled task list */}
      <VirtualScroller
        items={tasks}
        height={600}
        itemHeight={120}
        renderItem={renderTask}
        className="border rounded-lg"
        overscan={5}
      />
    </div>
  )
}

export const RealtimeTaskList = RealtimeTaskListComponent