// Mock hook for projects - will be implemented in later subgroups

interface Project {
  id: string
  name: string
  taskCount: number
}

export function useProjects() {
  // Mock data for now - will be replaced with real API calls in Phase 2
  const mockProjects: Project[] = [
    { id: '1', name: 'TaskMaster Pro v2', taskCount: 12 },
    { id: '2', name: 'Client Website', taskCount: 8 },
    { id: '3', name: 'Team Onboarding', taskCount: 5 },
  ]

  return {
    projects: mockProjects,
    isLoading: false,
    error: null,
  }
}

export function useProject(projectId: string | null) {
  if (!projectId) return { data: null, isLoading: false }
  
  // Mock project data
  const mockProject = {
    id: projectId,
    name: 'TaskMaster Pro v2',
    taskCount: 12,
  }

  return {
    data: mockProject,
    isLoading: false,
    error: null,
  }
}