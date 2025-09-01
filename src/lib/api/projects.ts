import { Project, ProjectWithTaskCount } from '@/types'

export interface ProjectsResponse {
  data: ProjectWithTaskCount[]
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

export interface ProjectResponse {
  data: ProjectWithTaskCount
  success: boolean
  message?: string
}

export interface ProjectQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export async function fetchProjects(query: ProjectQuery = {}): Promise<ProjectsResponse> {
  const params = new URLSearchParams()
  
  if (query.page) params.set('page', query.page.toString())
  if (query.limit) params.set('limit', query.limit.toString())
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortOrder) params.set('sortOrder', query.sortOrder)

  const response = await fetch(`/api/projects?${params}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchProject(projectId: string): Promise<ProjectResponse> {
  const response = await fetch(`/api/projects/${projectId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`)
  }
  
  return response.json()
}

export async function createProject(data: {
  name: string
  description?: string
  color?: string
  status?: string
}): Promise<ProjectResponse> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`)
  }
  
  return response.json()
}

export async function updateProject(projectId: string, data: Partial<{
  name: string
  description?: string
  color?: string
  status: string
}>): Promise<ProjectResponse> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.statusText}`)
  }
  
  return response.json()
}

export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`)
  }
  
  return response.json()
}