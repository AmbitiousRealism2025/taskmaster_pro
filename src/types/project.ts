import { Task, Priority } from './task'
import { Note } from './note'

export interface Project {
  id: string
  name: string
  description?: string
  
  // Hierarchy
  parentId?: string
  level: number // 0 = top level, 1 = sub-project, etc.
  path: string[] // Array of ancestor IDs for breadcrumb
  
  // Status & Progress
  status: ProjectStatus
  priority: Priority
  progress: number // 0-100 calculated from tasks/milestones
  
  // Timeline
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  
  // Visual
  color: string
  icon?: string
  coverImage?: string
  
  // Resources
  budget?: number
  assignedUsers: string[]
  
  // Metadata
  userId: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  archivedAt?: Date
  
  // Relations
  children?: Project[]
  parent?: Project
  tasks?: Task[]
  milestones?: Milestone[]
  notes?: Note[]
  documents?: Document[]
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'

export interface Milestone {
  id: string
  projectId: string
  title: string
  description?: string
  dueDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  progress: number
  dependsOn: string[] // Other milestone IDs
  tasks: string[] // Associated task IDs
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: string
  structure: ProjectTemplateStructure
  defaultTasks: TaskTemplate[]
  defaultMilestones: MilestoneTemplate[]
  estimatedDuration: number // In days
  isPublic: boolean
  createdBy: string
  useCount: number
}

export interface ProjectTemplateStructure {
  phases: ProjectPhase[]
  dependencies: PhaseDependency[]
}

export interface ProjectPhase {
  id: string
  name: string
  description: string
  estimatedDuration: number
  order: number
  tasks: TaskTemplate[]
  milestones: MilestoneTemplate[]
}

export interface PhaseDependency {
  fromPhaseId: string
  toPhaseId: string
  type: 'START_TO_START' | 'FINISH_TO_START' | 'START_TO_FINISH' | 'FINISH_TO_FINISH'
  lag?: number // Days
}

export interface TaskTemplate {
  title: string
  description?: string
  priority: Priority
  estimatedDuration?: number
  tags?: string[]
  dependsOn?: string[]
}

export interface MilestoneTemplate {
  title: string
  description?: string
  daysFromStart: number
  dependsOn?: string[]
}

// Create and update types
export interface CreateProjectData {
  name: string
  description?: string
  parentId?: string
  status?: ProjectStatus
  priority?: Priority
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  color?: string
  icon?: string
  budget?: number
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: ProjectStatus
  priority?: Priority
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  color?: string
  icon?: string
  budget?: number
  progress?: number
}

export interface ProjectSearchOptions {
  query?: string
  status?: ProjectStatus[]
  priority?: Priority[]
  parentId?: string
  includeArchived?: boolean
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'dueDate' | 'progress'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Analytics and reporting
export interface ProjectAnalytics {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  overDueProjects: number
  averageCompletionTime: number
  productivityTrend: number[]
  statusDistribution: Record<ProjectStatus, number>
  priorityDistribution: Record<Priority, number>
}

export interface ProjectProgress {
  tasksCompleted: number
  totalTasks: number
  milestonesCompleted: number
  totalMilestones: number
  hoursSpent: number
  estimatedHours: number
  daysRemaining: number
  isOnTrack: boolean
  completionPercentage: number
}

// Team collaboration
export interface ProjectMember {
  userId: string
  role: 'OWNER' | 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER'
  joinedAt: Date
  permissions: ProjectPermission[]
}

export interface ProjectPermission {
  resource: 'TASKS' | 'MILESTONES' | 'NOTES' | 'DOCUMENTS' | 'SETTINGS'
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
}

// Document management
export interface ProjectDocument {
  id: string
  projectId: string
  name: string
  type: 'PDF' | 'DOC' | 'SPREADSHEET' | 'IMAGE' | 'OTHER'
  url: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  version: number
  isLatestVersion: boolean
}