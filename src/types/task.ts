// Task Management Core Types
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: Date
  estimatedMinutes?: number
  actualMinutes?: number
  
  // Relationships
  userId: string
  projectId?: string
  parentTaskId?: string // For subtasks
  
  // AI Features
  aiGenerated?: boolean
  aiConfidence?: number
  extractedFrom?: string // Source content
  
  // Metadata
  tags: string[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  
  // Relations (from Prisma)
  project?: Project
  subtasks?: Task[]
  parentTask?: Task
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TaskFormData {
  title: string
  description: string
  priority: Priority
  dueDate?: Date
  estimatedMinutes?: number
  projectId?: string
  tags: string[]
}

export interface TaskFilter {
  status?: TaskStatus[]
  priority?: Priority[]
  projectId?: string
  tags?: string[]
  dueDateRange?: {
    start: Date
    end: Date
  }
  search?: string
}

export interface Project {
  id: string
  name: string
  color: string
}

export interface TasksResponse {
  tasks: Task[]
  totalCount: number
  hasMore: boolean
}

export interface TaskStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
  highPriority: number
}