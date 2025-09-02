import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchTasks, 
  fetchTask, 
  createTask, 
  updateTask, 
  deleteTask, 
  extractTasks,
  batchCreateTasks,
  batchUpdateTasks,
  TasksResponse,
  TaskResponse,
  TaskExtractionResponse,
  BatchTaskResponse
} from '@/lib/api/tasks'
import { TaskQuery, Task, TaskStatus, TaskPriority } from '@/types'
// TODO: Implement proper toast notifications
const useToast = () => ({ 
  toast: ({ title, description }: { title?: string, description?: string }) => {
    console.log('Toast:', title, description)
  }
})

// Query Hooks
export function useTasks(query: TaskQuery = {}) {
  return useQuery({
    queryKey: ['tasks', query],
    queryFn: () => fetchTasks(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskId ? fetchTask(taskId) : Promise.resolve(null),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

// Mutation Hooks with Optimistic Updates
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: createTask,
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks'])

      // Optimistically update to the new value
      queryClient.setQueryData(['tasks'], (old: TasksResponse | undefined) => {
        if (!old) return old

        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          title: newTask.title,
          description: newTask.description || '',
          status: newTask.status || 'TODO',
          priority: newTask.priority || 'MEDIUM',
          dueDate: newTask.dueDate || null,
          estimatedMinutes: newTask.estimatedMinutes || null,
          actualMinutes: null,
          userId: 'current-user',
          projectId: newTask.projectId || null,
          parentTaskId: null,
          tags: newTask.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          aiGenerated: false,
          aiConfidence: null,
          extractedFrom: null,
          project: null
        }

        return {
          ...old,
          data: [optimisticTask, ...old.data]
        }
      })

      return { previousTasks }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSuccess: (data) => {
      toast({
        title: 'Task created',
        description: `"${data.data.title}" has been added to your tasks`
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Parameters<typeof updateTask>[1] }) => 
      updateTask(taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])

      queryClient.setQueryData(['tasks'], (old: TasksResponse | undefined) => {
        if (!old) return old

        return {
          ...old,
          data: old.data.map(task => 
            task.id === taskId 
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          )
        }
      })

      return { previousTasks }
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])

      queryClient.setQueryData(['tasks'], (old: TasksResponse | undefined) => {
        if (!old) return old

        return {
          ...old,
          data: old.data.filter(task => task.id !== taskId)
        }
      })

      return { previousTasks }
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSuccess: () => {
      toast({
        title: 'Task deleted',
        description: 'Task has been removed from your list'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

// AI Task Extraction Hook
export function useTaskExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: extractTasks,
    onSuccess: (data) => {
      const tasksCount = data.data.extractionResult.tasks.length
      const savedCount = data.data.tasks?.length || 0
      
      if (data.data.saved && savedCount > 0) {
        toast({
          title: 'Tasks extracted and saved',
          description: `Successfully created ${savedCount} tasks from your content`
        })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      } else {
        toast({
          title: 'Tasks extracted',
          description: `Found ${tasksCount} tasks. Review and save the ones you want.`
        })
      }
    },
    onError: (error) => {
      let description = 'Failed to extract tasks from content'
      
      if (error.message.includes('AI service not configured')) {
        description = 'AI service is not properly configured. Please check your settings.'
      } else if (error.message.includes('EXTRACTION_FAILED')) {
        description = 'Could not extract tasks from this content. Try rephrasing or adding more detail.'
      }
      
      toast({
        title: 'Extraction failed',
        description,
        variant: 'destructive'
      })
    }
  })
}

// Batch Operations
export function useBatchCreateTasks() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: batchCreateTasks,
    onSuccess: (data) => {
      toast({
        title: 'Tasks created',
        description: `Successfully created ${data.data.count} tasks`
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      toast({
        title: 'Batch creation failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

export function useBatchUpdateTasks() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: batchUpdateTasks,
    onSuccess: (data) => {
      toast({
        title: 'Tasks updated',
        description: `Successfully updated ${data.data.count} tasks`
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      toast({
        title: 'Batch update failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}