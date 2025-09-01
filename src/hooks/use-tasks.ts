import { useQuery } from '@tanstack/react-query'
import { fetchTasks, fetchTask } from '@/lib/api/tasks'
import { TaskQuery } from '@/types'

export function useTasks(query: TaskQuery = {}) {
  return useQuery({
    queryKey: ['tasks', query],
    queryFn: () => fetchTasks(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
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