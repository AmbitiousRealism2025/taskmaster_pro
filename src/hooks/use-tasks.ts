// Mock hook for tasks - will be implemented in later subgroups

interface Task {
  id: string
  title: string
  project?: {
    name: string
  }
}

export function useTasks() {
  // Mock data for now - will be replaced with real API calls in Phase 2
  const mockTasks: Task[] = [
    { id: '1', title: 'Set up authentication system', project: { name: 'TaskMaster Pro v2' } },
    { id: '2', title: 'Design dashboard layout', project: { name: 'TaskMaster Pro v2' } },
    { id: '3', title: 'Create project templates', project: { name: 'Client Website' } },
  ]

  return {
    tasks: mockTasks,
    isLoading: false,
    error: null,
  }
}

export function useTask(taskId: string | null) {
  if (!taskId) return { data: null, isLoading: false }
  
  // Mock task data
  const mockTask = {
    id: taskId,
    title: 'Set up authentication system',
    project: { name: 'TaskMaster Pro v2' },
  }

  return {
    data: mockTask,
    isLoading: false,
    error: null,
  }
}