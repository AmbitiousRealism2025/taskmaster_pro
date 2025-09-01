# Task Management Core Subgroup - Phase 2 Week 5

## ⚠️ Implementation Notes
- **Subgroup Number**: 6 (Task Management Core)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 7
- **Test Coverage**: docs/04-testing/Phase2_Feature_Tests.md (Tests 1-12)
- **Dependencies**: Phase 1 complete (All 5 subgroups must be finished)
- **Related Enhancements**: None
- **Estimated Context Usage**: 55-65%

---

**Subgroup**: 01 - Task Management Core  
**Phase**: Core Features (Week 5)  
**Focus**: Tasks + AI Integration Systems  

## Subgroup Overview

The Task Management Core subgroup implements the central task management functionality with AI-powered features. This combines traditional CRUD operations with intelligent task extraction, smart scheduling, and real-time collaboration features.

### Primary Responsibilities

- **Task CRUD Operations**: Complete task lifecycle management with optimistic UI updates
- **AI Task Extraction**: Convert natural language content into structured tasks using OpenRouter/LLM
- **Kanban Board System**: Drag-and-drop interface with real-time updates
- **Smart Scheduling**: AI-powered task prioritization and time estimation
- **Task Dependencies**: Subtask hierarchies and dependency management
- **Real-time Collaboration**: Live updates across multiple users
- **Performance Optimization**: Optimistic UI patterns and efficient data fetching

## Test Coverage Requirements

Based on `docs/04-testing/Phase2_Feature_Tests.md`, the following tests must pass:

### Task CRUD Tests (4 tests)
- **Task Creation** (`__tests__/modules/tasks/task-crud.test.ts`)
  - Create task with full metadata (title, description, priority, due date, project, tags)
  - Form validation and error handling
  - Optimistic UI updates with rollback capability
  - Integration with project selection and tag management

### Kanban Board Tests (4 tests)
- **Board Functionality** (`__tests__/modules/tasks/kanban-board.test.ts`)
  - Column-based task organization (TODO, IN_PROGRESS, DONE)
  - Drag-and-drop task movement between columns
  - Task counting per column
  - Real-time updates when tasks change status

### AI Integration Tests (5 tests)
- **Task Extraction** (`__tests__/ai/task-extractor.test.ts`)
  - Extract tasks from meeting notes and text content
  - AI-powered priority and deadline inference
  - Task editing before saving to database
  - Batch task creation with validation

### State Management Tests (4 tests)
- **Integration Testing** (`__tests__/integration/state-management.test.ts`)
  - TanStack Query + Zustand synchronization
  - Optimistic updates with error recovery
  - Offline queue management
  - Cross-component state consistency

## Core Data Models and Types

### Task Model Definition

```typescript
// types/task.ts
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
```

### AI Integration Types

```typescript
// types/ai.ts
export interface ExtractedTask {
  title: string
  description?: string
  priority: Priority
  dueDate?: Date
  estimatedHours?: number
  tags: string[]
  confidence: number // 0-1 AI confidence score
}

export interface TaskExtractionRequest {
  content: string
  context?: {
    projectId?: string
    defaultPriority?: Priority
    userId: string
  }
}

export interface TaskExtractionResponse {
  tasks: ExtractedTask[]
  summary: string
  confidence: number
  processingTime: number
}

export interface SmartScheduleRequest {
  tasks: Task[]
  preferences: {
    workingHours: { start: number; end: number }
    breakDuration: number
    focusBlocks: number[]
  }
  constraints: {
    fixedMeetings: TimeBlock[]
    deadlines: { taskId: string; deadline: Date }[]
  }
}

export interface TimeBlock {
  id: string
  title: string
  startTime: Date
  endTime: Date
  type: 'task' | 'meeting' | 'break'
  taskId?: string
}
```

## AI Integration Patterns

### OpenRouter/LLM Client Setup

```typescript
// lib/ai/client.ts
import { env } from '@/lib/config/env'

interface LLMRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  maxTokens?: number
}

interface LLMResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finishReason: string
  }>
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

class AIClient {
  private baseURL = env.OPENROUTER_BASE_URL
  private apiKey = env.OPENROUTER_API_KEY
  
  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'TaskMaster Pro',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async extractTasks(content: string, context?: any): Promise<ExtractedTask[]> {
    const systemPrompt = `You are an expert task extraction AI for TaskMaster Pro.
    
    Extract actionable tasks from the provided content. For each task:
    - Create a clear, specific title (max 80 characters)
    - Add helpful description if context available
    - Assign priority based on urgency indicators (URGENT/HIGH/MEDIUM/LOW)
    - Estimate completion time in hours if possible
    - Extract relevant tags from content
    - Set due date if mentioned or can be inferred
    
    Priority Guidelines:
    - URGENT: "ASAP", "urgent", "critical", "emergency", today
    - HIGH: "important", "priority", specific near deadlines, "by [date]"
    - MEDIUM: general deadlines, "should", "need to", moderate importance
    - LOW: "when possible", "eventually", "nice to have", long deadlines
    
    Return ONLY a JSON array of tasks, no explanation.`

    const request: LLMRequest = {
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract tasks from this content:\n\n${content}` }
      ],
      temperature: 0.1,
      maxTokens: 2000
    }

    const response = await this.generateCompletion(request)
    const content_text = response.choices[0]?.message?.content

    try {
      return JSON.parse(content_text)
    } catch (error) {
      throw new Error('Failed to parse AI response as JSON')
    }
  }

  async generateSmartSchedule(request: SmartScheduleRequest): Promise<TimeBlock[]> {
    const systemPrompt = `You are a smart scheduling AI for TaskMaster Pro.
    
    Create an optimal daily schedule by:
    1. Respecting working hours and fixed meetings
    2. Prioritizing high-priority tasks during peak focus times
    3. Including appropriate breaks between focus blocks
    4. Considering task estimated durations
    5. Grouping similar tasks when beneficial
    
    Return a JSON array of TimeBlock objects with realistic start/end times.`

    const userPrompt = `Schedule these tasks:
    ${JSON.stringify(request.tasks, null, 2)}
    
    Preferences: ${JSON.stringify(request.preferences, null, 2)}
    Constraints: ${JSON.stringify(request.constraints, null, 2)}`

    const llmRequest: LLMRequest = {
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      maxTokens: 3000
    }

    const response = await this.generateCompletion(llmRequest)
    return JSON.parse(response.choices[0].message.content)
  }
}

export const aiClient = new AIClient()
```

### Task Extraction Service

```typescript
// lib/ai/task-extractor.ts
import { aiClient } from './client'
import { ExtractedTask, TaskExtractionRequest, TaskExtractionResponse } from '@/types/ai'
import { logger } from '@/lib/monitoring/logger'

export class TaskExtractor {
  async extractTasksFromText(request: TaskExtractionRequest): Promise<TaskExtractionResponse> {
    const startTime = Date.now()
    
    try {
      const extractedTasks = await aiClient.extractTasks(request.content, request.context)
      
      // Post-process and validate tasks
      const validatedTasks = extractedTasks
        .filter(task => task.title && task.title.trim().length > 0)
        .map(task => this.validateAndEnhanceTask(task, request.context))

      const processingTime = Date.now() - startTime
      
      logger.info('Task extraction completed', {
        inputLength: request.content.length,
        tasksExtracted: validatedTasks.length,
        processingTime,
        userId: request.context?.userId
      })

      return {
        tasks: validatedTasks,
        summary: `Extracted ${validatedTasks.length} tasks from ${request.content.length} characters`,
        confidence: this.calculateOverallConfidence(validatedTasks),
        processingTime
      }
    } catch (error) {
      logger.error('Task extraction failed', { error, request })
      throw new Error('Failed to extract tasks from content')
    }
  }

  private validateAndEnhanceTask(task: ExtractedTask, context?: any): ExtractedTask {
    return {
      ...task,
      title: task.title.trim().slice(0, 80), // Enforce title length
      priority: task.priority || context?.defaultPriority || 'MEDIUM',
      tags: [...(task.tags || []), ...(context?.projectId ? ['ai-extracted'] : [])],
      confidence: Math.min(Math.max(task.confidence || 0.7, 0), 1), // Clamp 0-1
      estimatedHours: task.estimatedHours || this.estimateTaskDuration(task.title, task.description)
    }
  }

  private estimateTaskDuration(title: string, description?: string): number {
    const content = `${title} ${description || ''}`.toLowerCase()
    
    // Simple heuristic-based estimation
    if (content.includes('quick') || content.includes('simple')) return 0.5
    if (content.includes('review') || content.includes('check')) return 1
    if (content.includes('write') || content.includes('create')) return 2
    if (content.includes('develop') || content.includes('implement')) return 4
    if (content.includes('research') || content.includes('analyze')) return 3
    if (content.includes('design') || content.includes('plan')) return 2.5
    
    return 2 // Default estimate
  }

  private calculateOverallConfidence(tasks: ExtractedTask[]): number {
    if (tasks.length === 0) return 0
    return tasks.reduce((sum, task) => sum + task.confidence, 0) / tasks.length
  }
}

export const taskExtractor = new TaskExtractor()

// Convenience function for direct usage
export async function extractTasksFromText(content: string, context?: any): Promise<ExtractedTask[]> {
  const response = await taskExtractor.extractTasksFromText({ content, context })
  return response.tasks
}
```

## Task CRUD Operations

### Task API Routes

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/client'
import { taskSchema } from '@/lib/validations/task'
import { withErrorHandling } from '@/lib/errors/handlers'
import { authOptions } from '@/lib/auth/config'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const search = searchParams.get('search')
  const tags = searchParams.get('tags')?.split(',')

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(projectId && { projectId }),
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(tags && { tags: { hasSome: tags } })
    },
    include: {
      project: {
        select: { id: true, name: true, color: true }
      },
      subtasks: {
        select: { id: true, title: true, status: true }
      }
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  return NextResponse.json({ tasks })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validatedData = taskSchema.parse(body)

  const task = await prisma.task.create({
    data: {
      ...validatedData,
      userId: session.user.id,
    },
    include: {
      project: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  return NextResponse.json({ task }, { status: 201 })
})

// app/api/tasks/[taskId]/route.ts
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { taskId: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validatedData = taskSchema.partial().parse(body)

  const task = await prisma.task.update({
    where: {
      id: params.taskId,
      userId: session.user.id
    },
    data: validatedData,
    include: {
      project: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  return NextResponse.json({ task })
})

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { taskId: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.task.delete({
    where: {
      id: params.taskId,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
})
```

### Task Validation Schema

```typescript
// lib/validations/task.ts
import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or less'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
    .default('TODO'),
  
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .default('MEDIUM'),
  
  dueDate: z.coerce.date()
    .optional()
    .refine(date => !date || date > new Date(), {
      message: 'Due date must be in the future'
    }),
  
  estimatedMinutes: z.number()
    .int()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(480, 'Estimated time cannot exceed 8 hours')
    .optional(),
  
  projectId: z.string().optional(),
  
  parentTaskId: z.string().optional(),
  
  tags: z.array(z.string().trim().min(1))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
  
  aiGenerated: z.boolean().default(false),
  
  aiConfidence: z.number()
    .min(0)
    .max(1)
    .optional(),
  
  extractedFrom: z.string().optional()
})

export type TaskInput = z.infer<typeof taskSchema>

// Validation for batch task creation
export const batchTaskSchema = z.object({
  tasks: z.array(taskSchema).min(1).max(50), // Limit batch size
  projectId: z.string().optional(),
  defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
})
```

## React Query Hooks for Tasks

### Task Data Fetching Hooks

```typescript
// hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Task, TaskFilter, TaskFormData } from '@/types/task'
import { useToast } from '@/hooks/use-toast'

interface TasksResponse {
  tasks: Task[]
  totalCount: number
  hasMore: boolean
}

export function useTasks(filter?: TaskFilter) {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: async (): Promise<TasksResponse> => {
      const params = new URLSearchParams()
      
      if (filter?.status?.length) {
        filter.status.forEach(s => params.append('status', s))
      }
      if (filter?.priority?.length) {
        filter.priority.forEach(p => params.append('priority', p))
      }
      if (filter?.projectId) params.set('projectId', filter.projectId)
      if (filter?.search) params.set('search', filter.search)
      if (filter?.tags?.length) params.set('tags', filter.tags.join(','))

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      
      return response.json()
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: async (): Promise<Task> => {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (!response.ok) throw new Error('Failed to fetch task')
      
      const data = await response.json()
      return data.task
    },
    enabled: !!taskId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (taskData: TaskFormData): Promise<Task> => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create task')
      }

      const data = await response.json()
      return data.task
    },

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
          ...newTask,
          status: 'TODO',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'current-user',
          tags: newTask.tags || []
        }

        return {
          ...old,
          tasks: [optimisticTask, ...old.tasks]
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
        description: `"${data.title}" has been added to your tasks`
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
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<TaskFormData> }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update task')
      
      const data = await response.json()
      return data.task
    },

    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])

      queryClient.setQueryData(['tasks'], (old: TasksResponse | undefined) => {
        if (!old) return old

        return {
          ...old,
          tasks: old.tasks.map(task => 
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
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete task')
    },

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])

      queryClient.setQueryData(['tasks'], (old: TasksResponse | undefined) => {
        if (!old) return old

        return {
          ...old,
          tasks: old.tasks.filter(task => task.id !== taskId)
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
```

## Task Board UI Components

### Kanban Board Implementation

```typescript
// components/tasks/KanbanBoard.tsx
'use client'

import React from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types/task'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { useUpdateTask } from '@/hooks/useTasks'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'DONE', title: 'Done', color: 'bg-green-50 dark:bg-green-950' }
]

export function KanbanBoard({ tasks, onTaskMove }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const updateTaskMutation = useUpdateTask()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to activate drag
      },
    })
  )

  // Group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
      CANCELLED: []
    }

    tasks.forEach(task => {
      if (task.status in grouped) {
        grouped[task.status].push(task)
      }
    })

    return grouped
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistic update
    if (onTaskMove) {
      onTaskMove(taskId, newStatus)
    }

    // Update via API
    updateTaskMutation.mutate({
      taskId,
      updates: { 
        status: newStatus,
        ...(newStatus === 'DONE' && { completedAt: new Date() })
      }
    })
  }

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              data-testid={`column-${column.id}`}
            >
              <SortableContext
                items={tasksByStatus[column.id].map(task => task.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasksByStatus[column.id].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    data-testid={`task-card-${task.id}`}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-5 opacity-80">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
```

### Kanban Column Component

```typescript
// components/tasks/KanbanColumn.tsx
'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Task, TaskStatus } from '@/types/task'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  color: string
  tasks: Task[]
  children: React.ReactNode
}

export function KanbanColumn({ id, title, color, tasks, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div className="flex flex-col min-w-[300px] max-w-[350px] h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-foreground">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Drop Zone */}
      <Card
        ref={setNodeRef}
        className={cn(
          'flex-1 p-4 transition-colors duration-200',
          color,
          isOver && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        <div className="space-y-3 h-full">
          {children}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No tasks in {title.toLowerCase()}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
```

### Task Card Component

```typescript
// components/tasks/TaskCard.tsx
'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/types/task'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  Tag, 
  MoreVertical, 
  Edit,
  Trash2,
  Star
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTask } from '@/hooks/useTasks'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onEdit?: (task: Task) => void
}

const PRIORITY_COLORS = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

export function TaskCard({ task, isDragging, onEdit }: TaskCardProps) {
  const deleteTask = useDeleteTask()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTask.mutate(task.id)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 rotate-5',
        isOverdue && 'ring-2 ring-red-200 dark:ring-red-800'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-snug mb-2 line-clamp-2">
              {task.title}
            </h4>
            
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {task.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
                data-testid={`delete-task-${task.id}`}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className={cn('text-xs', PRIORITY_COLORS[task.priority])}
          >
            {task.priority}
          </Badge>
          
          {task.project && (
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: task.project.color }}
            >
              {task.project.name}
            </Badge>
          )}

          {task.aiGenerated && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-2 w-2 mr-1" />
              AI
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Due Date */}
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Estimated Time */}
          {task.estimatedMinutes && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{Math.round(task.estimatedMinutes / 60 * 10) / 10}h</span>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Subtasks Indicator */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {task.subtasks.filter(s => s.status === 'DONE').length} of {task.subtasks.length} subtasks completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

## AI Task Extraction UI

### Task Extractor Component

```typescript
// components/ai/TaskExtractor.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sparkles, 
  Loader2, 
  Edit2, 
  Save,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useTaskExtraction } from '@/hooks/useTaskExtraction'
import { ExtractedTask } from '@/types/ai'
import { TaskFormFields } from '../tasks/TaskFormFields'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function TaskExtractor() {
  const [content, setContent] = React.useState('')
  const [editingTaskIndex, setEditingTaskIndex] = React.useState<number | null>(null)
  const [selectedTasks, setSelectedTasks] = React.useState<Set<number>>(new Set())
  
  const { toast } = useToast()
  const { extractTasks, saveExtractedTasks, isExtracting, isSaving, extractedTasks, error } = useTaskExtraction()

  const handleExtract = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please paste some text to extract tasks from',
        variant: 'destructive'
      })
      return
    }

    try {
      await extractTasks(content)
      // Select all tasks by default
      setSelectedTasks(new Set(Array.from({ length: extractedTasks.length }, (_, i) => i)))
    } catch (error) {
      toast({
        title: 'Extraction failed',
        description: 'Failed to extract tasks. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleSaveSelected = async () => {
    const tasksToSave = extractedTasks.filter((_, index) => selectedTasks.has(index))
    
    if (tasksToSave.length === 0) {
      toast({
        title: 'No tasks selected',
        description: 'Please select at least one task to save',
        variant: 'destructive'
      })
      return
    }

    try {
      await saveExtractedTasks(tasksToSave)
      toast({
        title: 'Tasks saved',
        description: `${tasksToSave.length} tasks have been added to your list`
      })
      
      // Reset form
      setContent('')
      setSelectedTasks(new Set())
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save tasks. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const toggleTaskSelection = (index: number) => {
    const newSelection = new Set(selectedTasks)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedTasks(newSelection)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Task Extractor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content-input" className="text-sm font-medium">
              Paste your text content
            </label>
            <Textarea
              id="content-input"
              placeholder="Paste meeting notes, emails, or any text containing tasks..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
              aria-label="Paste text content to extract tasks from"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {content.length > 0 && `${content.length} characters`}
            </div>
            <Button 
              onClick={handleExtract}
              disabled={isExtracting || !content.trim()}
              className="min-w-[120px]"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Tasks
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Extracted Tasks ({extractedTasks.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTasks(new Set(Array.from({ length: extractedTasks.length }, (_, i) => i)))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTasks(new Set())}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {extractedTasks.map((task, index) => (
                <ExtractedTaskCard
                  key={index}
                  task={task}
                  index={index}
                  isSelected={selectedTasks.has(index)}
                  isEditing={editingTaskIndex === index}
                  onToggleSelect={() => toggleTaskSelection(index)}
                  onEdit={() => setEditingTaskIndex(index)}
                  onSaveEdit={(updatedTask) => {
                    // Update the extracted task
                    const updatedTasks = [...extractedTasks]
                    updatedTasks[index] = updatedTask
                    setEditingTaskIndex(null)
                  }}
                  onCancelEdit={() => setEditingTaskIndex(null)}
                />
              ))}

              {selectedTasks.size > 0 && (
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={handleSaveSelected}
                    disabled={isSaving}
                    className="min-w-[140px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Selected ({selectedTasks.size})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface ExtractedTaskCardProps {
  task: ExtractedTask
  index: number
  isSelected: boolean
  isEditing: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSaveEdit: (task: ExtractedTask) => void
  onCancelEdit: () => void
}

function ExtractedTaskCard({
  task,
  index,
  isSelected,
  isEditing,
  onToggleSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit
}: ExtractedTaskCardProps) {
  const [editedTask, setEditedTask] = React.useState<ExtractedTask>(task)

  React.useEffect(() => {
    setEditedTask(task)
  }, [task])

  const handleSave = () => {
    onSaveEdit(editedTask)
  }

  return (
    <Card className={cn(
      'transition-all duration-200',
      isSelected && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
            data-testid={`select-task-${index}`}
          />
          
          <div className="flex-1 space-y-3">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-3">
                <TaskFormFields
                  values={editedTask}
                  onChange={setEditedTask}
                  compact
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm leading-snug mb-1">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={onEdit}
                    data-testid={`edit-task-${index}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {task.priority}
                  </Badge>
                  
                  {task.estimatedHours && (
                    <Badge variant="outline" className="text-xs">
                      {task.estimatedHours}h
                    </Badge>
                  )}

                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      task.confidence > 0.8 ? 'text-green-600' :
                      task.confidence > 0.6 ? 'text-yellow-600' :
                      'text-red-600'
                    )}
                  >
                    {Math.round(task.confidence * 100)}% confidence
                  </Badge>

                  {task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{task.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## State Management with Zustand

### Task Store Implementation

```typescript
// stores/taskStore.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { Task, TaskFilter, TaskFormData } from '@/types/task'

interface TaskState {
  // State
  tasks: Task[]
  filter: TaskFilter
  selectedTasks: Set<string>
  isLoading: boolean
  error: string | null
  
  // Optimistic updates
  optimisticTasks: Map<string, Task>
  isOptimistic: (taskId: string) => boolean
  
  // Offline support
  isOnline: boolean
  offlineQueue: OfflineAction[]
  
  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Partial<Task>) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  deleteTask: (taskId: string) => void
  updateTaskOptimistic: (taskId: string, updates: Partial<Task>) => void
  commitOptimisticUpdate: (taskId: string) => void
  rollbackOptimisticUpdate: (taskId: string) => void
  
  // Filtering and selection
  setFilter: (filter: Partial<TaskFilter>) => void
  clearFilter: () => void
  selectTask: (taskId: string) => void
  deselectTask: (taskId: string) => void
  clearSelection: () => void
  
  // Offline support
  setOnline: (online: boolean) => void
  addToOfflineQueue: (action: OfflineAction) => void
  syncOfflineChanges: () => Promise<void>
  
  // Computed
  getFilteredTasks: () => Task[]
  getTasksByStatus: () => Record<string, Task[]>
  getTaskStats: () => TaskStats
}

interface OfflineAction {
  id: string
  action: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'
  data: any
  timestamp: Date
}

interface TaskStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
  highPriority: number
}

export const useTaskStore = create<TaskState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        tasks: [],
        filter: {},
        selectedTasks: new Set(),
        isLoading: false,
        error: null,
        optimisticTasks: new Map(),
        isOnline: true,
        offlineQueue: [],

        // Optimistic update helpers
        isOptimistic: (taskId: string) => get().optimisticTasks.has(taskId),

        // Basic CRUD actions
        setTasks: (tasks) => 
          set({ tasks, error: null }, false, 'setTasks'),

        addTask: (taskData) =>
          set((state) => {
            const newTask: Task = {
              id: `temp-${Date.now()}`,
              title: taskData.title || '',
              description: taskData.description,
              status: taskData.status || 'TODO',
              priority: taskData.priority || 'MEDIUM',
              userId: 'current-user', // This would come from auth
              tags: taskData.tags || [],
              createdAt: new Date(),
              updatedAt: new Date(),
              ...taskData
            } as Task

            if (!state.isOnline) {
              state.addToOfflineQueue({
                id: newTask.id,
                action: 'CREATE_TASK',
                data: newTask,
                timestamp: new Date()
              })
            }

            return {
              tasks: [newTask, ...state.tasks]
            }
          }, false, 'addTask'),

        updateTask: (taskId, updates) =>
          set((state) => {
            if (!state.isOnline) {
              state.addToOfflineQueue({
                id: taskId,
                action: 'UPDATE_TASK',
                data: updates,
                timestamp: new Date()
              })
            }

            return {
              tasks: state.tasks.map(task =>
                task.id === taskId
                  ? { ...task, ...updates, updatedAt: new Date() }
                  : task
              )
            }
          }, false, 'updateTask'),

        deleteTask: (taskId) =>
          set((state) => {
            if (!state.isOnline) {
              state.addToOfflineQueue({
                id: taskId,
                action: 'DELETE_TASK',
                data: { taskId },
                timestamp: new Date()
              })
            }

            return {
              tasks: state.tasks.filter(task => task.id !== taskId),
              selectedTasks: new Set([...state.selectedTasks].filter(id => id !== taskId))
            }
          }, false, 'deleteTask'),

        // Optimistic updates
        updateTaskOptimistic: (taskId, updates) =>
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId)
            if (!task) return state

            const optimisticTask = { ...task, ...updates, updatedAt: new Date() }
            
            return {
              tasks: state.tasks.map(t => t.id === taskId ? optimisticTask : t),
              optimisticTasks: new Map(state.optimisticTasks).set(taskId, task) // Store original
            }
          }, false, 'updateTaskOptimistic'),

        commitOptimisticUpdate: (taskId) =>
          set((state) => {
            const newOptimisticTasks = new Map(state.optimisticTasks)
            newOptimisticTasks.delete(taskId)
            return { optimisticTasks: newOptimisticTasks }
          }, false, 'commitOptimisticUpdate'),

        rollbackOptimisticUpdate: (taskId) =>
          set((state) => {
            const originalTask = state.optimisticTasks.get(taskId)
            if (!originalTask) return state

            const newOptimisticTasks = new Map(state.optimisticTasks)
            newOptimisticTasks.delete(taskId)

            return {
              tasks: state.tasks.map(t => t.id === taskId ? originalTask : t),
              optimisticTasks: newOptimisticTasks
            }
          }, false, 'rollbackOptimisticUpdate'),

        // Filter and selection
        setFilter: (filter) =>
          set((state) => ({
            filter: { ...state.filter, ...filter }
          }), false, 'setFilter'),

        clearFilter: () =>
          set({ filter: {} }, false, 'clearFilter'),

        selectTask: (taskId) =>
          set((state) => ({
            selectedTasks: new Set([...state.selectedTasks, taskId])
          }), false, 'selectTask'),

        deselectTask: (taskId) =>
          set((state) => {
            const newSelection = new Set(state.selectedTasks)
            newSelection.delete(taskId)
            return { selectedTasks: newSelection }
          }, false, 'deselectTask'),

        clearSelection: () =>
          set({ selectedTasks: new Set() }, false, 'clearSelection'),

        // Offline support
        setOnline: (online) =>
          set((state) => {
            if (online && !state.isOnline && state.offlineQueue.length > 0) {
              // Trigger sync when coming back online
              setTimeout(() => state.syncOfflineChanges(), 1000)
            }
            return { isOnline: online }
          }, false, 'setOnline'),

        addToOfflineQueue: (action) =>
          set((state) => ({
            offlineQueue: [...state.offlineQueue, action]
          }), false, 'addToOfflineQueue'),

        syncOfflineChanges: async () => {
          const state = get()
          if (!state.isOnline || state.offlineQueue.length === 0) return

          try {
            // Process each queued action
            for (const action of state.offlineQueue) {
              switch (action.action) {
                case 'CREATE_TASK':
                  await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(action.data)
                  })
                  break
                case 'UPDATE_TASK':
                  await fetch(`/api/tasks/${action.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(action.data)
                  })
                  break
                case 'DELETE_TASK':
                  await fetch(`/api/tasks/${action.id}`, {
                    method: 'DELETE'
                  })
                  break
              }
            }

            // Clear queue on success
            set({ offlineQueue: [] }, false, 'syncOfflineChanges')
          } catch (error) {
            console.error('Failed to sync offline changes:', error)
          }
        },

        // Computed getters
        getFilteredTasks: () => {
          const { tasks, filter } = get()
          
          return tasks.filter(task => {
            if (filter.status?.length && !filter.status.includes(task.status)) return false
            if (filter.priority?.length && !filter.priority.includes(task.priority)) return false
            if (filter.projectId && task.projectId !== filter.projectId) return false
            if (filter.search) {
              const search = filter.search.toLowerCase()
              if (!task.title.toLowerCase().includes(search) && 
                  !task.description?.toLowerCase().includes(search)) return false
            }
            if (filter.tags?.length) {
              if (!filter.tags.some(tag => task.tags.includes(tag))) return false
            }
            if (filter.dueDateRange) {
              if (!task.dueDate) return false
              const dueDate = new Date(task.dueDate)
              if (dueDate < filter.dueDateRange.start || dueDate > filter.dueDateRange.end) return false
            }
            
            return true
          })
        },

        getTasksByStatus: () => {
          const tasks = get().getFilteredTasks()
          const grouped: Record<string, Task[]> = {
            TODO: [],
            IN_PROGRESS: [],
            DONE: [],
            CANCELLED: []
          }
          
          tasks.forEach(task => {
            if (task.status in grouped) {
              grouped[task.status].push(task)
            }
          })
          
          return grouped
        },

        getTaskStats: () => {
          const tasks = get().tasks
          const now = new Date()
          
          return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'DONE').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            overdue: tasks.filter(t => 
              t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
            ).length,
            highPriority: tasks.filter(t => 
              ['HIGH', 'URGENT'].includes(t.priority) && t.status !== 'DONE'
            ).length
          }
        }
      })
    ),
    { name: 'task-store' }
  )
)

// Utility hook for task statistics
export const useTaskStats = () => useTaskStore(state => state.getTaskStats())

// Utility hook for filtered tasks
export const useFilteredTasks = () => useTaskStore(state => state.getFilteredTasks())
```

## Real-time Updates with Server-Sent Events

### Real-time Task Updates

```typescript
// hooks/useTaskRealtime.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTaskStore } from '@/stores/taskStore'
import { Task } from '@/types/task'

export function useTaskRealtime(userId: string) {
  const queryClient = useQueryClient()
  const updateTask = useTaskStore(state => state.updateTask)

  useEffect(() => {
    if (!userId) return

    // Create SSE connection
    const eventSource = new EventSource(`/api/tasks/subscribe?userId=${userId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'TASK_CREATED':
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            break
            
          case 'TASK_UPDATED':
            // Update local store
            updateTask(data.task.id, data.task)
            // Update React Query cache
            queryClient.setQueryData(['tasks', data.task.id], data.task)
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            break
            
          case 'TASK_DELETED':
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            break
            
          case 'TASK_STATUS_CHANGED':
            updateTask(data.taskId, { status: data.status })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            break
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
    }

    // Cleanup on unmount
    return () => {
      eventSource.close()
    }
  }, [userId, queryClient, updateTask])
}

// API route for SSE subscription
// app/api/tasks/subscribe/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId || userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 })
  }

  // Create SSE response
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'CONNECTED', userId })}\n\n`
      controller.enqueue(encoder.encode(message))

      // Set up database change listeners (pseudo-code)
      // In a real app, you'd use database triggers or Redis pub/sub
      const interval = setInterval(() => {
        try {
          const keepAlive = `data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`
          controller.enqueue(encoder.encode(keepAlive))
        } catch (error) {
          clearInterval(interval)
          controller.close()
        }
      }, 30000) // Send heartbeat every 30 seconds

      // Store cleanup function
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

## Performance Optimization Patterns

### Virtual Scrolling for Large Task Lists

```typescript
// components/tasks/VirtualTaskList.tsx
'use client'

import React from 'react'
import { FixedSizeList as List } from 'react-window'
import { Task } from '@/types/task'
import { TaskCard } from './TaskCard'
import { Card } from '@/components/ui/card'

interface VirtualTaskListProps {
  tasks: Task[]
  height: number
  itemHeight?: number
  onTaskClick?: (task: Task) => void
}

const ITEM_HEIGHT = 120 // Height of each task card

export function VirtualTaskList({ 
  tasks, 
  height, 
  itemHeight = ITEM_HEIGHT,
  onTaskClick 
}: VirtualTaskListProps) {
  const Row = React.useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index]
    
    return (
      <div style={style} className="px-2">
        <div className="pb-3">
          <TaskCard
            task={task}
            onEdit={onTaskClick}
          />
        </div>
      </div>
    )
  }, [tasks, onTaskClick])

  if (tasks.length === 0) {
    return (
      <Card className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">No tasks found</p>
      </Card>
    )
  }

  return (
    <List
      height={height}
      itemCount={tasks.length}
      itemSize={itemHeight}
      overscanCount={5} // Render 5 extra items outside viewport
    >
      {Row}
    </List>
  )
}
```

### Memoized Components for Performance

```typescript
// components/tasks/MemoizedTaskCard.tsx
import React from 'react'
import { Task } from '@/types/task'
import { TaskCard } from './TaskCard'

interface MemoizedTaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  isDragging?: boolean
}

export const MemoizedTaskCard = React.memo<MemoizedTaskCardProps>(
  ({ task, onEdit, isDragging }) => {
    return (
      <TaskCard
        task={task}
        onEdit={onEdit}
        isDragging={isDragging}
      />
    )
  },
  (prevProps, nextProps) => {
    // Custom equality check for better performance
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.task.updatedAt?.getTime() === nextProps.task.updatedAt?.getTime() &&
      prevProps.isDragging === nextProps.isDragging
    )
  }
)

MemoizedTaskCard.displayName = 'MemoizedTaskCard'
```

## Integration Points with Other Systems

### Projects Integration

```typescript
// Integration with Project Management subgroup
export interface ProjectTaskIntegration {
  // Project selection in task creation
  getProjectsForTaskForm(): Promise<ProjectOption[]>
  
  // Task progress updates to projects
  updateProjectProgress(projectId: string): Promise<void>
  
  // Project-filtered task views
  getTasksByProject(projectId: string): Promise<Task[]>
}

interface ProjectOption {
  id: string
  name: string
  color: string
  taskCount: number
}
```

### Notes Integration

```typescript
// Integration with Notes subgroup for task extraction
export interface NotesTaskIntegration {
  // Extract tasks from note content
  extractTasksFromNote(noteId: string, content: string): Promise<ExtractedTask[]>
  
  // Link tasks back to source notes
  linkTaskToNote(taskId: string, noteId: string): Promise<void>
  
  // Get tasks created from a specific note
  getTasksFromNote(noteId: string): Promise<Task[]>
}
```

### Focus Mode Integration

```typescript
// Integration with Focus Mode for time tracking
export interface FocusTaskIntegration {
  // Get tasks suitable for focus sessions
  getFocusableTasks(): Promise<Task[]>
  
  // Update task with focus time
  recordFocusTime(taskId: string, minutes: number): Promise<void>
  
  // Get time tracking for tasks
  getTaskTimeTracking(taskId: string): Promise<TimeEntry[]>
}

interface TimeEntry {
  id: string
  taskId: string
  startTime: Date
  endTime: Date
  duration: number
  type: 'focus' | 'break' | 'interruption'
}
```

## Testing Strategy

### Component Testing Examples

```typescript
// __tests__/components/tasks/TaskCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Task } from '@/types/task'

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'TODO',
  priority: 'HIGH',
  userId: 'user-1',
  tags: ['test', 'ui'],
  createdAt: new Date(),
  updatedAt: new Date(),
  project: {
    id: 'proj-1',
    name: 'Test Project',
    color: '#3b82f6'
  }
}

describe('TaskCard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  const renderTaskCard = (task: Task = mockTask) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskCard task={task} />
      </QueryClientProvider>
    )
  }

  it('should display task information correctly', () => {
    renderTaskCard()
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('ui')).toBeInTheDocument()
  })

  it('should handle delete action with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    renderTaskCard()
    
    // Click delete button
    fireEvent.click(screen.getByTestId('delete-task-1'))
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Task"?')
    
    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('should show overdue styling for overdue tasks', () => {
    const overdueTask = {
      ...mockTask,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    }
    
    renderTaskCard(overdueTask)
    
    const card = screen.getByText('Test Task').closest('.ring-red-200')
    expect(card).toBeInTheDocument()
  })
})
```

### Integration Testing

```typescript
// __tests__/integration/task-ai-integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskExtractor } from '@/components/ai/TaskExtractor'
import { extractTasksFromText } from '@/lib/ai/task-extractor'

jest.mock('@/lib/ai/task-extractor', () => ({
  extractTasksFromText: jest.fn()
}))

describe('Task AI Integration', () => {
  const mockExtractTasksFromText = extractTasksFromText as jest.MockedFunction<typeof extractTasksFromText>

  beforeEach(() => {
    mockExtractTasksFromText.mockClear()
  })

  it('should extract tasks from text and display them', async () => {
    mockExtractTasksFromText.mockResolvedValue([
      {
        title: 'Review quarterly reports',
        priority: 'HIGH',
        tags: ['review', 'reports'],
        confidence: 0.9,
        estimatedHours: 2
      }
    ])

    render(<TaskExtractor />)
    
    const textArea = screen.getByLabelText(/paste text/i)
    fireEvent.change(textArea, {
      target: { value: 'Need to review quarterly reports by end of week' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /extract tasks/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Review quarterly reports')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
      expect(screen.getByText('90% confidence')).toBeInTheDocument()
    })
  })
})
```

## Implementation Priority

### Week 5 Development Order

1. **Day 1**: Core data models and API routes
2. **Day 2**: Basic CRUD operations and React Query hooks
3. **Day 3**: Task card and list components
4. **Day 4**: Kanban board with drag-and-drop
5. **Day 5**: AI task extraction integration
6. **Day 6**: State management with Zustand
7. **Day 7**: Real-time updates and performance optimization

### Critical Path Dependencies

- **Database Models** → API Routes → React Query Hooks
- **Basic Components** → Kanban Board → Drag-and-Drop
- **AI Client** → Task Extraction → UI Components
- **State Management** → Real-time Updates → Performance Optimization

## Success Metrics

### Phase 2 Week 5 Completion Requirements

**Core Functionality (Required)**
- [ ] Complete task CRUD operations with validation
- [ ] Kanban board with drag-and-drop functionality  
- [ ] AI task extraction from text content
- [ ] Real-time updates across multiple clients
- [ ] Optimistic UI updates with rollback capability

**Performance Benchmarks**
- Task creation: < 200ms response time
- Kanban drag-drop: < 100ms visual feedback
- AI extraction: < 3 seconds for typical content
- Real-time updates: < 500ms propagation delay

**Integration Points Ready**
- Project assignment in task creation
- Task time tracking for Focus Mode
- Note content extraction for AI features
- Dashboard metrics and analytics data

This comprehensive Task Management Core system provides the foundation for intelligent, collaborative task management with AI-enhanced productivity features.