import { TaskQuery, Task, TaskStatus, TaskPriority } from '@/types'

export interface TasksResponse {
  data: Task[]
  success: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface TaskResponse {
  data: Task
  success: boolean
  message?: string
}

export async function fetchTasks(query: TaskQuery = {}): Promise<TasksResponse> {
  const params = new URLSearchParams()
  
  if (query.page) params.set('page', query.page.toString())
  if (query.limit) params.set('limit', query.limit.toString())
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.projectId) params.set('projectId', query.projectId)
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortOrder) params.set('sortOrder', query.sortOrder)

  const response = await fetch(`/api/tasks?${params}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchTask(taskId: string): Promise<TaskResponse> {
  const response = await fetch(`/api/tasks/${taskId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch task: ${response.statusText}`)
  }
  
  return response.json()
}

export async function createTask(data: {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  projectId?: string
  dueDate?: Date
  estimatedMinutes?: number
  tags?: string[]
}): Promise<TaskResponse> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`)
  }
  
  return response.json()
}

export async function updateTask(taskId: string, data: Partial<{
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  projectId?: string
  dueDate?: Date
  completedAt?: Date
  estimatedMinutes?: number
  tags: string[]
}>): Promise<TaskResponse> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.statusText}`)
  }
  
  return response.json()
}

export async function deleteTask(taskId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.statusText}`)
  }
  
  return response.json()
}

// AI Task Extraction
export interface TaskExtractionResponse {
  data: {
    extractionResult: {
      tasks: Array<{
        title: string
        description?: string
        priority: string
        dueDate?: Date
        estimatedHours?: number
        tags: string[]
        confidence: number
      }>
      summary: string
      confidence: number
      processingTime: number
    }
    tasks?: Task[]
    saved: boolean
  }
  success: boolean
  message: string
}

export async function extractTasks(data: {
  content: string
  projectId?: string
  saveToDatabase?: boolean
}): Promise<TaskExtractionResponse> {
  const response = await fetch('/api/tasks/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to extract tasks: ${response.statusText}`)
  }
  
  return response.json()
}

// Batch Operations
export interface BatchTaskResponse {
  data: {
    count: number
    tasks: Task[]
  }
  success: boolean
  message: string
}

export async function batchCreateTasks(data: {
  tasks: Array<{
    title: string
    description?: string
    priority?: string
    dueDate?: string
    estimatedMinutes?: number
    projectId?: string
    tags?: string[]
    aiGenerated?: boolean
    aiConfidence?: number
    extractedFrom?: string
  }>
  projectId?: string
}): Promise<BatchTaskResponse> {
  const response = await fetch('/api/tasks/batch', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to batch create tasks: ${response.statusText}`)
  }
  
  return response.json()
}

export async function batchUpdateTasks(data: {
  taskIds: string[]
  updates: Partial<{
    status?: TaskStatus
    priority?: TaskPriority
    projectId?: string
    tags?: string[]
  }>
}): Promise<BatchTaskResponse> {
  const response = await fetch('/api/tasks/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to batch update tasks: ${response.statusText}`)
  }
  
  return response.json()
}