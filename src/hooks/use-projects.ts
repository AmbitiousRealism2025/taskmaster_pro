import { useQuery } from '@tanstack/react-query'
import { fetchProjects, fetchProject, ProjectQuery } from '@/lib/api/projects'

export function useProjects(query: ProjectQuery = {}) {
  return useQuery({
    queryKey: ['projects', query],
    queryFn: () => fetchProjects(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectId ? fetchProject(projectId) : Promise.resolve(null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}