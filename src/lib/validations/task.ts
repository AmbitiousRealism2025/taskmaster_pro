import { z } from 'zod'
import { TaskStatus, Priority } from '@prisma/client'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(80, 'Title must be 80 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().min(1).max(480, 'Estimated time cannot exceed 8 hours').optional(),
  projectId: z.string().optional(),
  parentTaskId: z.string().optional(),
  tags: z.array(z.string().trim().min(1)).max(10, 'Maximum 10 tags allowed').default([]),
  aiGenerated: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
  extractedFrom: z.string().optional()
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().min(1).optional(),
  actualMinutes: z.number().min(1).optional(),
  projectId: z.string().optional(),
  completedAt: z.string().datetime().optional()
})

export const taskQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Validation for batch task creation (AI extraction)
export const batchTaskSchema = z.object({
  tasks: z.array(createTaskSchema).min(1).max(50), // Limit batch size
  projectId: z.string().optional(),
  defaultPriority: z.nativeEnum(Priority).optional()
})

// Task filter schema for advanced filtering
export const taskFilterSchema = z.object({
  status: z.array(z.nativeEnum(TaskStatus)).optional(),
  priority: z.array(z.nativeEnum(Priority)).optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  dueDateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
}).optional()

export type CreateTask = z.infer<typeof createTaskSchema>
export type UpdateTask = z.infer<typeof updateTaskSchema>
export type TaskQuery = z.infer<typeof taskQuerySchema>
export type BatchTask = z.infer<typeof batchTaskSchema>
export type TaskFilter = z.infer<typeof taskFilterSchema>