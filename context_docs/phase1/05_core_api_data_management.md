# Phase 1.5: Core API Layer & Data Management - Coding Context

## ⚠️ Implementation Notes
- **Subgroup Number**: 5 (Core API Layer & Data Management)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 6
- **Test Coverage**: Phase1_Foundation_Tests.md (Tests 24-32)
- **Dependencies**: Dashboard Layout & Navigation (Subgroup 4) must be complete
- **Related Enhancements**: security_enhancements/SECURE_DATABASE_REPLACEMENT.md, SQL_INJECTION_FIXES.md
- **Estimated Context Usage**: 60-70%

---

**Subgroup**: Backend + Database  
**Timeline**: Weeks 3-4 (Phase 1)  
**Focus**: RESTful APIs, Database Schema, Data Validation, Query Optimization

## 1. Subgroup Overview

### Primary Responsibilities
- **API Architecture**: Design and implement RESTful API endpoints using Next.js App Router
- **Database Design**: Create comprehensive Prisma schema with relationships and constraints
- **Data Validation**: Implement robust validation using Zod schemas
- **Query Optimization**: Implement efficient database queries with proper indexing
- **Caching Strategy**: Integrate TanStack Query for server-state management
- **Error Handling**: Comprehensive error boundaries and response formatting
- **Performance**: Implement pagination, filtering, sorting, and batch operations

### Integration Points
- **Authentication**: Uses auth middleware from subgroup 2 for protected routes
- **Frontend State**: Provides data contracts for TanStack Query integration
- **Design System**: Follows error/loading states from UI components
- **Dashboard**: Supplies metrics and dashboard data endpoints

## 2. Test Coverage Requirements

Based on Phase1_Foundation_Tests.md, this subgroup must implement:

### Database Schema Tests
- User model with email uniqueness constraints
- Project model with user relationships
- Task model with project and user relationships
- Proper foreign key relationships and cascade behaviors

### API Endpoint Tests
- CRUD operations for all models
- Proper HTTP status codes and error responses
- Request/response validation
- Authentication middleware integration
- Pagination and filtering functionality

## 3. Next.js API Route Architecture

### File Structure
```
src/app/api/
├── auth/                    # Auth-related endpoints
│   └── [...nextauth]/
├── users/
│   ├── route.ts            # GET /api/users, POST /api/users
│   └── [id]/
│       ├── route.ts        # GET, PUT, DELETE /api/users/[id]
│       └── projects/
│           └── route.ts    # GET /api/users/[id]/projects
├── projects/
│   ├── route.ts            # GET /api/projects, POST /api/projects
│   └── [id]/
│       ├── route.ts        # GET, PUT, DELETE /api/projects/[id]
│       └── tasks/
│           └── route.ts    # GET /api/projects/[id]/tasks
├── tasks/
│   ├── route.ts            # GET /api/tasks, POST /api/tasks
│   ├── batch/
│   │   └── route.ts        # POST /api/tasks/batch
│   └── [id]/
│       └── route.ts        # GET, PUT, DELETE /api/tasks/[id]
└── dashboard/
    ├── metrics/
    │   └── route.ts        # GET /api/dashboard/metrics
    └── recent-activity/
        └── route.ts        # GET /api/dashboard/recent-activity
```

### Route Implementation Pattern
```typescript
// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validations/task'
import { ApiResponse } from '@/types/api'
import { Task, Prisma } from '@prisma/client'

// GET /api/tasks - List tasks with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      userId: session.user.id,
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
      ...(projectId && { projectId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // Execute queries in parallel
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, color: true }
          },
          tags: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    const response: ApiResponse<Task[]> = {
      data: tasks,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      meta: {
        filters: { status, priority, projectId, search },
        sort: { sortBy, sortOrder }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = taskSchema.parse({
      ...body,
      userId: session.user.id
    })

    // Check if project exists and user has access
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        tags: validatedData.tagIds ? {
          connect: validatedData.tagIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        },
        tags: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('POST /api/tasks error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Pattern
```typescript
// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskUpdateSchema } from '@/lib/validations/task'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        },
        tags: {
          select: { id: true, name: true, color: true }
        },
        timeEntries: {
          select: {
            id: true,
            duration: true,
            startedAt: true,
            endedAt: true
          },
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error(`GET /api/tasks/${params.id} error:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = taskUpdateSchema.parse(body)

    // Verify task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Handle project change validation
    if (validatedData.projectId && validatedData.projectId !== existingTask.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        tags: validatedData.tagIds ? {
          set: validatedData.tagIds.map(id => ({ id }))
        } : undefined,
        updatedAt: new Date()
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        },
        tags: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({ data: task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error(`PUT /api/tasks/${params.id} error:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Verify task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Soft delete to preserve audit trail
    await prisma.task.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      data: { message: 'Task deleted successfully' }
    })
  } catch (error) {
    console.error(`DELETE /api/tasks/${params.id} error:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

## 4. Prisma Schema Design

### Complete Database Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Core Models
model User {
  id                String      @id @default(cuid())
  email             String      @unique
  name              String?
  image             String?
  emailVerified     DateTime?
  
  // Preferences
  timezone          String      @default("UTC")
  theme             String      @default("system")
  workingHours      Json?       // { start: "09:00", end: "17:00", days: [1,2,3,4,5] }
  notifications     Json?       // Notification preferences
  
  // Relationships
  accounts          Account[]
  sessions          Session[]
  projects          Project[]
  tasks             Task[]
  notes             Note[]
  focusSessions     FocusSession[]
  timeEntries       TimeEntry[]
  habits            Habit[]
  habitEntries      HabitEntry[]
  tags              Tag[]
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?   // Soft delete

  @@map("users")
}

// NextAuth.js required models
model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?  @db.Text
  access_token      String?  @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?  @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificationtokens")
}

// Project Management
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  color       String    @default("#3b82f6") // Hex color for UI
  icon        String?   // Icon identifier
  
  // Status and visibility
  status      ProjectStatus @default(ACTIVE)
  isArchived  Boolean   @default(false)
  isFavorite  Boolean   @default(false)
  
  // Relationships
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       Task[]
  notes       Note[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Soft delete
  
  @@index([userId, status])
  @@index([userId, isArchived])
  @@map("projects")
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

// Task Management
model Task {
  id           String      @id @default(cuid())
  title        String
  description  String?
  
  // Task properties
  status       TaskStatus  @default(TODO)
  priority     TaskPriority @default(MEDIUM)
  
  // Time tracking
  estimatedMinutes Int?     // Estimated effort
  actualMinutes    Int?     // Actual time spent
  dueDate      DateTime?
  completedAt  DateTime?
  
  // Relationships
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  projectId    String?
  project      Project?    @relation(fields: [projectId], references: [id], onDelete: SetNull)
  
  parentId     String?     // Subtasks
  parent       Task?       @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  subtasks     Task[]      @relation("TaskHierarchy")
  
  tags         Tag[]       @relation("TaskTags")
  timeEntries  TimeEntry[]
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?   // Soft delete
  
  @@index([userId, status])
  @@index([userId, priority])
  @@index([userId, dueDate])
  @@index([projectId])
  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ON_HOLD
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Tagging System
model Tag {
  id        String   @id @default(cuid())
  name      String
  color     String   @default("#6b7280")
  
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tasks     Task[]   @relation("TaskTags")
  notes     Note[]   @relation("NoteTags")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, name]) // Unique tag names per user
  @@index([userId])
  @@map("tags")
}

// Notes System
model Note {
  id        String   @id @default(cuid())
  title     String?
  content   String   @db.Text // Rich text content
  
  // Note properties
  type      NoteType @default(NOTE)
  isFavorite Boolean @default(false)
  isPinned  Boolean  @default(false)
  
  // Relationships
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  
  tags      Tag[]    @relation("NoteTags")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  @@index([userId, type])
  @@index([userId, isPinned])
  @@map("notes")
}

enum NoteType {
  NOTE
  QUICK_NOTE
  MEETING_NOTES
  JOURNAL
}

// Time Tracking
model TimeEntry {
  id        String    @id @default(cuid())
  
  startedAt DateTime
  endedAt   DateTime?
  duration  Int?      // Duration in minutes
  
  description String?
  
  // Relationships
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  taskId    String?
  task      Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@index([userId, startedAt])
  @@index([taskId])
  @@map("time_entries")
}

// Focus Sessions
model FocusSession {
  id           String         @id @default(cuid())
  
  duration     Int            // Session length in minutes
  breakDuration Int           // Break length in minutes  
  type         FocusType      @default(POMODORO)
  
  startedAt    DateTime
  endedAt      DateTime?
  completedAt  DateTime?
  
  // Session data
  focusMinutes    Int?        // Actual focus time
  distractions    Int?        // Number of interruptions
  
  // Relationships
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@index([userId, startedAt])
  @@map("focus_sessions")
}

enum FocusType {
  POMODORO      // 25min focus, 5min break
  DEEP_WORK     // 90min focus, 20min break
  SHORT_BURST   // 15min focus, 5min break
  CUSTOM        // User-defined
}

// Habits Tracking
model Habit {
  id          String      @id @default(cuid())
  name        String
  description String?
  
  // Habit configuration
  frequency   HabitFrequency @default(DAILY)
  targetValue Int         @default(1) // How many times per frequency
  unit        String?     // "minutes", "pages", "glasses", etc.
  
  color       String      @default("#10b981")
  icon        String?
  
  isActive    Boolean     @default(true)
  
  // Relationships
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries     HabitEntry[]
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  deletedAt   DateTime?
  
  @@index([userId, isActive])
  @@map("habits")
}

enum HabitFrequency {
  DAILY
  WEEKLY
  MONTHLY
}

model HabitEntry {
  id        String   @id @default(cuid())
  
  date      DateTime @db.Date // Date of completion
  value     Int      @default(1) // Number of completions
  notes     String?
  
  // Relationships
  habitId   String
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([habitId, date]) // One entry per habit per day
  @@index([habitId, date])
  @@map("habit_entries")
}
```

### Schema Relationships and Indexes
```prisma
// Additional indexes for performance optimization
model Task {
  // ... existing fields

  @@index([userId, createdAt])
  @@index([userId, updatedAt])
  @@index([userId, completedAt])
  @@index([status, priority])
  @@index([dueDate]) where: { dueDate IS NOT NULL }
}

model TimeEntry {
  // ... existing fields
  
  @@index([userId, createdAt])
  @@index([startedAt, endedAt])
}

model Note {
  // ... existing fields
  
  @@index([userId, createdAt])
  @@index([userId, updatedAt])
  @@fulltext([title, content]) // Full-text search
}
```

## 5. Data Validation with Zod

### Schema Definitions
```typescript
// src/lib/validations/task.ts
import { z } from 'zod'

export const taskStatus = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
export const taskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  status: taskStatus.default('TODO'),
  priority: taskPriority.default('MEDIUM'),
  
  estimatedMinutes: z.number()
    .int()
    .positive('Estimated minutes must be positive')
    .max(10080, 'Estimated minutes cannot exceed a week') // 7 * 24 * 60
    .optional(),
  
  dueDate: z.string()
    .datetime('Invalid date format')
    .transform(str => new Date(str))
    .optional(),
  
  projectId: z.string().cuid('Invalid project ID').optional(),
  parentId: z.string().cuid('Invalid parent task ID').optional(),
  tagIds: z.array(z.string().cuid('Invalid tag ID')).optional(),
  
  userId: z.string().cuid('Invalid user ID') // Added by middleware
})

export const taskUpdateSchema = taskSchema.partial().omit({ userId: true })

export const taskQuerySchema = z.object({
  page: z.string().transform(str => parseInt(str)).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(str => parseInt(str)).pipe(z.number().int().positive().max(100)).default('20'),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  projectId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'dueDate', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dueBefore: z.string().datetime().transform(str => new Date(str)).optional(),
  dueAfter: z.string().datetime().transform(str => new Date(str)).optional(),
  completedBetween: z.object({
    start: z.string().datetime().transform(str => new Date(str)),
    end: z.string().datetime().transform(str => new Date(str))
  }).optional()
})

export const taskBatchSchema = z.object({
  operation: z.enum(['update', 'delete', 'move']),
  taskIds: z.array(z.string().cuid()).min(1, 'At least one task ID required'),
  data: z.object({
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    projectId: z.string().cuid().nullable().optional(),
    tagIds: z.array(z.string().cuid()).optional()
  }).optional()
})

export type Task = z.infer<typeof taskSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type TaskQuery = z.infer<typeof taskQuerySchema>
export type TaskBatch = z.infer<typeof taskBatchSchema>
```

### Project Validation
```typescript
// src/lib/validations/project.ts
import { z } from 'zod'

export const projectStatus = z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])

export const projectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format')
    .default('#3b82f6'),
  
  icon: z.string()
    .max(50, 'Icon identifier too long')
    .optional(),
  
  status: projectStatus.default('ACTIVE'),
  isArchived: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  
  userId: z.string().cuid('Invalid user ID') // Added by middleware
})

export const projectUpdateSchema = projectSchema.partial().omit({ userId: true })

export const projectQuerySchema = z.object({
  page: z.string().transform(str => parseInt(str)).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(str => parseInt(str)).pipe(z.number().int().positive().max(50)).default('20'),
  status: projectStatus.optional(),
  isArchived: z.string().transform(str => str === 'true').default('false'),
  isFavorite: z.string().transform(str => str === 'true').optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type Project = z.infer<typeof projectSchema>
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>
export type ProjectQuery = z.infer<typeof projectQuerySchema>
```

### User Validation
```typescript
// src/lib/validations/user.ts
import { z } from 'zod'

export const userPreferencesSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  
  workingHours: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    days: z.array(z.number().int().min(0).max(6)).min(1, 'At least one working day required')
  }).optional(),
  
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    taskReminders: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
    weeklyReport: z.boolean().default(false)
  }).optional()
})

export const userUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  
  preferences: userPreferencesSchema.optional()
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
```

## 6. Error Handling and Response Formatting

### Standard Error Response Types
```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  code?: string
  message?: string
  details?: any[]
  pagination?: PaginationMeta
  meta?: Record<string, any>
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface ApiError {
  error: string
  code: string
  message?: string
  details?: any[]
  statusCode: number
}

// Standard error codes
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Operations
  OPERATION_FAILED: 'OPERATION_FAILED',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```

### Error Handler Utility
```typescript
// src/lib/api/error-handler.ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { ApiError, ErrorCodes } from '@/types/api'

export class ApiException extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any[]
  ) {
    super(message)
    this.name = 'ApiException'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Validation errors (Zod)
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Validation error',
      code: ErrorCodes.VALIDATION_ERROR,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    }, { status: 400 })
  }

  // Custom API exceptions
  if (error instanceof ApiException) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details
    }, { status: error.statusCode })
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error)
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({
      error: 'Database validation error',
      code: ErrorCodes.VALIDATION_ERROR,
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 400 })
  }

  // Generic errors
  if (error instanceof Error) {
    return NextResponse.json({
      error: 'Internal server error',
      code: ErrorCodes.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }

  // Unknown errors
  return NextResponse.json({
    error: 'Unknown error occurred',
    code: ErrorCodes.INTERNAL_ERROR
  }, { status: 500 })
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      const field = error.meta?.target as string[] | undefined
      return NextResponse.json({
        error: 'Resource already exists',
        code: ErrorCodes.ALREADY_EXISTS,
        details: field ? [{ field: field[0], message: `${field[0]} already exists` }] : undefined
      }, { status: 409 })

    case 'P2025': // Record not found
      return NextResponse.json({
        error: 'Resource not found',
        code: ErrorCodes.NOT_FOUND
      }, { status: 404 })

    case 'P2003': // Foreign key constraint violation
      return NextResponse.json({
        error: 'Invalid reference',
        code: ErrorCodes.DEPENDENCY_ERROR,
        message: 'Referenced resource does not exist'
      }, { status: 400 })

    case 'P2014': // Required relation missing
      return NextResponse.json({
        error: 'Required relationship missing',
        code: ErrorCodes.VALIDATION_ERROR
      }, { status: 400 })

    default:
      return NextResponse.json({
        error: 'Database operation failed',
        code: ErrorCodes.OPERATION_FAILED,
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
  }
}

// Async error wrapper for route handlers
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
```

### Rate Limiting
```typescript
// src/lib/api/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: NextRequest) => string
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; reset: number; remaining: number }> {
  const key = config.keyGenerator ? config.keyGenerator(req) : getClientKey(req)
  const window = Math.floor(Date.now() / config.windowMs)
  const redisKey = `rate_limit:${key}:${window}`

  const current = await redis.incr(redisKey)
  
  if (current === 1) {
    await redis.expire(redisKey, Math.ceil(config.windowMs / 1000))
  }

  const reset = (window + 1) * config.windowMs
  const remaining = Math.max(0, config.maxRequests - current)

  return {
    allowed: current <= config.maxRequests,
    reset,
    remaining
  }
}

function getClientKey(req: NextRequest): string {
  // Try to get user ID from session
  const userId = req.headers.get('x-user-id')
  if (userId) return `user:${userId}`

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

// Rate limiting middleware
export function withRateLimit(config: RateLimitConfig) {
  return async function(req: NextRequest) {
    const { allowed, reset, remaining } = await rateLimit(req, config)

    if (!allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      })
    }

    return null // Continue to next middleware/handler
  }
}
```

## 7. Pagination, Filtering, and Sorting

### Query Builder Utility
```typescript
// src/lib/api/query-builder.ts
import { Prisma } from '@prisma/client'

export interface QueryOptions {
  // Pagination
  page?: number
  limit?: number
  
  // Filtering
  where?: Record<string, any>
  search?: {
    fields: string[]
    query: string
  }
  
  // Sorting
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  
  // Relations
  include?: Record<string, any>
  select?: Record<string, any>
}

export class QueryBuilder<T> {
  private options: QueryOptions = {}

  constructor(private defaultOptions: Partial<QueryOptions> = {}) {
    this.options = { ...defaultOptions }
  }

  paginate(page: number, limit: number = 20): this {
    this.options.page = Math.max(1, page)
    this.options.limit = Math.min(100, Math.max(1, limit)) // Cap at 100
    return this
  }

  filter(where: Record<string, any>): this {
    this.options.where = { ...this.options.where, ...where }
    return this
  }

  search(fields: string[], query: string): this {
    if (query.trim()) {
      this.options.search = { fields, query: query.trim() }
    }
    return this
  }

  sort(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): this {
    this.options.sortBy = sortBy
    this.options.sortOrder = sortOrder
    return this
  }

  include(include: Record<string, any>): this {
    this.options.include = { ...this.options.include, ...include }
    return this
  }

  select(select: Record<string, any>): this {
    this.options.select = select
    return this
  }

  build(): {
    findManyArgs: any
    countArgs: any
    pagination: { skip: number; take: number; page: number; limit: number }
  } {
    const { page = 1, limit = 20, where = {}, search, sortBy, sortOrder, include, select } = this.options

    // Build where clause
    let whereClause = { ...where }

    // Add search conditions
    if (search && search.query) {
      const searchConditions = search.fields.map(field => ({
        [field]: {
          contains: search.query,
          mode: 'insensitive' as const
        }
      }))

      whereClause = {
        ...whereClause,
        OR: searchConditions
      }
    }

    // Build orderBy
    const orderBy = sortBy ? { [sortBy]: sortOrder } : undefined

    // Pagination
    const skip = (page - 1) * limit
    const take = limit

    const findManyArgs: any = {
      where: whereClause,
      ...(orderBy && { orderBy }),
      skip,
      take,
      ...(include && { include }),
      ...(select && { select })
    }

    const countArgs = { where: whereClause }

    return {
      findManyArgs,
      countArgs,
      pagination: { skip, take, page, limit }
    }
  }
}

// Usage example
export async function getTasks(userId: string, query: QueryOptions) {
  const builder = new QueryBuilder({
    where: { userId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, color: true } },
      tags: { select: { id: true, name: true, color: true } }
    }
  })

  const { findManyArgs, countArgs, pagination } = builder
    .paginate(query.page || 1, query.limit || 20)
    .filter(query.where || {})
    .search(['title', 'description'], query.search?.query || '')
    .sort(query.sortBy || 'createdAt', query.sortOrder || 'desc')
    .build()

  const [items, total] = await Promise.all([
    prisma.task.findMany(findManyArgs),
    prisma.task.count(countArgs)
  ])

  return {
    data: items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1
    }
  }
}
```

### Advanced Filtering
```typescript
// src/lib/api/filters.ts
import { Prisma } from '@prisma/client'

export interface DateRange {
  start?: Date
  end?: Date
}

export interface TaskFilters {
  status?: string[]
  priority?: string[]
  projectId?: string[]
  tagIds?: string[]
  dueDate?: DateRange
  completedAt?: DateRange
  hasProject?: boolean
  hasTag?: boolean
  estimatedMinutes?: {
    min?: number
    max?: number
  }
}

export function buildTaskWhereClause(
  userId: string,
  filters: TaskFilters
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    userId,
    deletedAt: null
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status as any[] }
  }

  // Priority filter
  if (filters.priority && filters.priority.length > 0) {
    where.priority = { in: filters.priority as any[] }
  }

  // Project filter
  if (filters.projectId && filters.projectId.length > 0) {
    where.projectId = { in: filters.projectId }
  }

  // Tag filter
  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        id: { in: filters.tagIds }
      }
    }
  }

  // Date range filters
  if (filters.dueDate) {
    where.dueDate = {}
    if (filters.dueDate.start) {
      where.dueDate.gte = filters.dueDate.start
    }
    if (filters.dueDate.end) {
      where.dueDate.lte = filters.dueDate.end
    }
  }

  if (filters.completedAt) {
    where.completedAt = {}
    if (filters.completedAt.start) {
      where.completedAt.gte = filters.completedAt.start
    }
    if (filters.completedAt.end) {
      where.completedAt.lte = filters.completedAt.end
    }
  }

  // Boolean filters
  if (filters.hasProject !== undefined) {
    where.projectId = filters.hasProject ? { not: null } : null
  }

  if (filters.hasTag !== undefined) {
    if (filters.hasTag) {
      where.tags = { some: {} }
    } else {
      where.tags = { none: {} }
    }
  }

  // Estimated minutes range
  if (filters.estimatedMinutes) {
    where.estimatedMinutes = {}
    if (filters.estimatedMinutes.min !== undefined) {
      where.estimatedMinutes.gte = filters.estimatedMinutes.min
    }
    if (filters.estimatedMinutes.max !== undefined) {
      where.estimatedMinutes.lte = filters.estimatedMinutes.max
    }
  }

  return where
}

// Advanced search with multiple conditions
export interface SearchQuery {
  query?: string
  exact?: boolean
  fields?: string[]
}

export function buildSearchConditions(search: SearchQuery): any[] {
  if (!search.query || !search.fields) return []

  const mode = search.exact ? 'default' : 'insensitive'
  const contains = search.exact ? search.query : search.query

  return search.fields.map(field => ({
    [field]: {
      contains,
      mode
    }
  }))
}
```

## 8. TanStack Query Integration Patterns

### Query Key Factory
```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  all: ['tasks'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...queryKeys.lists(), filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  dashboard: {
    all: ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recent-activity'] as const,
  },

  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
  }
} as const
```

### API Client
```typescript
// src/lib/api/client.ts
import { ApiResponse, PaginationMeta } from '@/types/api'

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(data.error, data.code, response.status, data.details)
    }

    return data
  }

  // Tasks API
  async getTasks(params: Record<string, any> = {}): Promise<ApiResponse<Task[]>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    return this.request(`/tasks?${searchParams.toString()}`)
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request(`/tasks/${id}`)
  }

  async createTask(data: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateTask(id: string, data: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    })
  }

  async batchUpdateTasks(data: TaskBatch): Promise<ApiResponse<Task[]>> {
    return this.request('/tasks/batch', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Projects API
  async getProjects(params: Record<string, any> = {}): Promise<ApiResponse<Project[]>> {
    const searchParams = new URLSearchParams(params)
    return this.request(`/projects?${searchParams.toString()}`)
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`)
  }

  async createProject(data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Project>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    })
  }

  // Dashboard API
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    return this.request('/dashboard/metrics')
  }

  async getRecentActivity(limit = 10): Promise<ApiResponse<Activity[]>> {
    return this.request(`/dashboard/recent-activity?limit=${limit}`)
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any[]
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Singleton instance
export const apiClient = new ApiClient()
```

### React Query Hooks
```typescript
// src/hooks/api/use-tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import { Task, TaskQuery, TaskBatch } from '@/types/task'
import { toast } from 'sonner'

// Queries
export function useTasks(params: TaskQuery = {}) {
  return useQuery({
    queryKey: queryKeys.list(params),
    queryFn: () => apiClient.getTasks(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => apiClient.getTask(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Mutations
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiClient.createTask,
    onSuccess: (response) => {
      // Invalidate task lists
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
      
      // Add task to cache
      queryClient.setQueryData(
        queryKeys.detail(response.data.id),
        response
      )

      toast.success('Task created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create task')
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      apiClient.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.detail(id) })

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(queryKeys.detail(id))

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.detail(id),
        (old: any) => old ? {
          ...old,
          data: { ...old.data, ...data, updatedAt: new Date() }
        } : old
      )

      return { previousTask }
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.detail(id), context.previousTask)
      }
      toast.error(error.message || 'Failed to update task')
    },
    onSettled: (data, error, { id }) => {
      // Refetch task and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
    },
    onSuccess: () => {
      toast.success('Task updated successfully')
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiClient.deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.detail(id) })
      const previousTask = queryClient.getQueryData(queryKeys.detail(id))
      
      // Remove from all lists optimistically
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists() },
        (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.filter((task: Task) => task.id !== id)
          }
        }
      )

      return { previousTask }
    },
    onError: (error, id, context) => {
      // Rollback
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.detail(id), context.previousTask)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
      toast.error(error.message || 'Failed to delete task')
    },
    onSuccess: () => {
      toast.success('Task deleted successfully')
    }
  })
}

export function useBatchUpdateTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiClient.batchUpdateTasks,
    onSuccess: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: queryKeys.all })
      toast.success('Tasks updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update tasks')
    }
  })
}

// Infinite queries for large lists
export function useInfiniteTasks(params: Omit<TaskQuery, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.lists(), 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.getTasks({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage
      return pagination && pagination.hasNext ? pagination.page + 1 : undefined
    },
    staleTime: 1000 * 60 * 5,
  })
}
```

## 9. Optimistic Update Patterns

### Optimistic Task Updates
```typescript
// src/hooks/api/use-optimistic-tasks.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Task } from '@/types/task'
import { queryKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/api/client'

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  rollbackOnError?: boolean
}

export function useOptimisticTaskUpdate<T extends Partial<Task>>(
  taskId: string,
  options: OptimisticUpdateOptions<Task> = {}
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: T) => apiClient.updateTask(taskId, updates),
    
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.detail(taskId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() })

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(queryKeys.detail(taskId))
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.lists() })

      // Optimistically update task detail
      queryClient.setQueryData(
        queryKeys.detail(taskId),
        (old: any) => old ? {
          ...old,
          data: { 
            ...old.data, 
            ...updates, 
            updatedAt: new Date().toISOString() 
          }
        } : old
      )

      // Optimistically update in all task lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists() },
        (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((task: Task) => 
              task.id === taskId 
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            )
          }
        }
      )

      return { previousTask, previousLists }
    },

    onError: (error, updates, context) => {
      // Rollback optimistic updates
      if (options.rollbackOnError !== false && context) {
        if (context.previousTask) {
          queryClient.setQueryData(queryKeys.detail(taskId), context.previousTask)
        }
        
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }

      options.onError?.(error)
    },

    onSuccess: (data) => {
      options.onSuccess?.(data.data)
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
    }
  })
}

// Specific optimistic operations
export function useOptimisticTaskStatus(taskId: string) {
  return useOptimisticTaskUpdate(taskId, {
    onSuccess: (task) => {
      if (task.status === 'COMPLETED') {
        // Update dashboard metrics
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.dashboard.metrics() 
        })
      }
    }
  })
}

export function useOptimisticTaskPriority(taskId: string) {
  return useOptimisticTaskUpdate(taskId)
}

// Batch optimistic updates
export function useOptimisticBatchUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batch: TaskBatch) => apiClient.batchUpdateTasks(batch),
    
    onMutate: async (batch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() })
      
      const previousLists = queryClient.getQueriesData({ 
        queryKey: queryKeys.lists() 
      })

      // Apply optimistic updates
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists() },
        (old: any) => {
          if (!old?.data) return old
          
          return {
            ...old,
            data: old.data.map((task: Task) => {
              if (batch.taskIds.includes(task.id)) {
                return {
                  ...task,
                  ...batch.data,
                  updatedAt: new Date().toISOString()
                }
              }
              return task
            })
          }
        }
      )

      return { previousLists }
    },

    onError: (error, batch, context) => {
      // Rollback
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all })
    }
  })
}
```

## 10. Batch Operations and Transactions

### Batch API Endpoints
```typescript
// src/app/api/tasks/batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskBatchSchema } from '@/lib/validations/task'
import { withErrorHandler } from '@/lib/api/error-handler'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new ApiException('UNAUTHORIZED', 401, 'Authentication required')
  }

  const body = await request.json()
  const { operation, taskIds, data } = taskBatchSchema.parse(body)

  // Verify all tasks belong to the user
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      userId: session.user.id,
      deletedAt: null
    },
    select: { id: true }
  })

  const foundIds = tasks.map(t => t.id)
  const missingIds = taskIds.filter(id => !foundIds.includes(id))

  if (missingIds.length > 0) {
    throw new ApiException(
      'NOT_FOUND',
      404,
      'Some tasks not found',
      missingIds.map(id => ({ taskId: id, message: 'Task not found' }))
    )
  }

  let result
  
  switch (operation) {
    case 'update':
      if (!data) {
        throw new ApiException('VALIDATION_ERROR', 400, 'Update data required')
      }
      
      result = await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
      break

    case 'delete':
      // Soft delete
      result = await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      })
      break

    case 'move':
      if (!data?.projectId) {
        throw new ApiException('VALIDATION_ERROR', 400, 'Project ID required for move operation')
      }

      // Verify project exists and user has access
      if (data.projectId) {
        const project = await prisma.project.findFirst({
          where: {
            id: data.projectId,
            userId: session.user.id
          }
        })

        if (!project) {
          throw new ApiException('NOT_FOUND', 404, 'Target project not found')
        }
      }

      result = await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: {
          projectId: data.projectId,
          updatedAt: new Date()
        }
      })
      break

    default:
      throw new ApiException('VALIDATION_ERROR', 400, 'Invalid batch operation')
  }

  // Fetch updated tasks for response
  const updatedTasks = await prisma.task.findMany({
    where: { 
      id: { in: taskIds },
      deletedAt: operation === 'delete' ? { not: null } : null
    },
    include: {
      project: {
        select: { id: true, name: true, color: true }
      },
      tags: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  return NextResponse.json({
    data: updatedTasks,
    meta: {
      operation,
      affected: result.count,
      requested: taskIds.length
    }
  })
})
```

### Transaction Patterns
```typescript
// src/lib/api/transactions.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface CreateTaskWithProjectOptions {
  userId: string
  task: {
    title: string
    description?: string
    priority?: TaskPriority
    estimatedMinutes?: number
  }
  project: {
    name: string
    description?: string
    color?: string
  }
  tagNames?: string[]
}

// Complex transaction: Create project, task, and tags atomically
export async function createTaskWithProject({
  userId,
  task,
  project,
  tagNames = []
}: CreateTaskWithProjectOptions) {
  return await prisma.$transaction(async (tx) => {
    // Create or find tags
    const tags = await Promise.all(
      tagNames.map(async (name) => {
        return await tx.tag.upsert({
          where: {
            userId_name: {
              userId,
              name: name.toLowerCase().trim()
            }
          },
          create: {
            name: name.toLowerCase().trim(),
            userId,
            color: generateTagColor()
          },
          update: {}
        })
      })
    )

    // Create project
    const createdProject = await tx.project.create({
      data: {
        ...project,
        userId
      }
    })

    // Create task with relationships
    const createdTask = await tx.task.create({
      data: {
        ...task,
        userId,
        projectId: createdProject.id,
        tags: {
          connect: tags.map(tag => ({ id: tag.id }))
        }
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        },
        tags: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return {
      task: createdTask,
      project: createdProject,
      tags
    }
  }, {
    maxWait: 5000, // Maximum time to wait for a transaction slot (default 2000)
    timeout: 10000, // Maximum time for the transaction to run (default 5000)
  })
}

// Move tasks between projects with validation
export async function moveTasksToProject(
  userId: string,
  taskIds: string[],
  targetProjectId: string | null
) {
  return await prisma.$transaction(async (tx) => {
    // Verify target project (if not null)
    if (targetProjectId) {
      const targetProject = await tx.project.findFirst({
        where: {
          id: targetProjectId,
          userId
        }
      })

      if (!targetProject) {
        throw new Error('Target project not found')
      }
    }

    // Verify all tasks belong to user
    const tasks = await tx.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
        deletedAt: null
      }
    })

    if (tasks.length !== taskIds.length) {
      throw new Error('Some tasks not found or inaccessible')
    }

    // Update tasks
    const updateResult = await tx.task.updateMany({
      where: {
        id: { in: taskIds }
      },
      data: {
        projectId: targetProjectId,
        updatedAt: new Date()
      }
    })

    // Log the move operation
    await tx.$executeRaw`
      INSERT INTO activity_log (user_id, action, resource_type, resource_ids, metadata)
      VALUES (${userId}, 'MOVE_TASKS', 'Task', ${JSON.stringify(taskIds)}, ${JSON.stringify({
        targetProjectId,
        count: updateResult.count
      })})
    `

    return {
      movedCount: updateResult.count,
      taskIds,
      targetProjectId
    }
  })
}

// Delete project with task handling
export interface DeleteProjectOptions {
  userId: string
  projectId: string
  taskAction: 'delete' | 'unassign' // What to do with tasks
}

export async function deleteProjectWithTasks({
  userId,
  projectId,
  taskAction
}: DeleteProjectOptions) {
  return await prisma.$transaction(async (tx) => {
    // Verify project ownership
    const project = await tx.project.findFirst({
      where: {
        id: projectId,
        userId
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Handle tasks based on action
    if (taskAction === 'delete') {
      // Soft delete all tasks
      await tx.task.updateMany({
        where: { projectId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      })
    } else {
      // Unassign tasks from project
      await tx.task.updateMany({
        where: { projectId },
        data: {
          projectId: null,
          updatedAt: new Date()
        }
      })
    }

    // Delete project
    await tx.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      project: project.name,
      taskCount: project._count.tasks,
      taskAction
    }
  })
}

// Utility function for tag color generation
function generateTagColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
```

## 11. API Versioning and Documentation

### API Versioning Strategy
```typescript
// src/app/api/v1/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiVersion } from '@/lib/api/versioning'

export const GET = withApiVersion('v1', async (request: NextRequest) => {
  // V1 implementation
  return NextResponse.json({ version: 'v1', data: [] })
})

// src/lib/api/versioning.ts
export function withApiVersion(version: string, handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    // Add version to response headers
    const response = await handler(request, ...args)
    response.headers.set('API-Version', version)
    response.headers.set('Supported-Versions', 'v1')
    return response
  }
}

// Version detection middleware
export function getApiVersion(request: NextRequest): string {
  // Check header first
  const headerVersion = request.headers.get('API-Version')
  if (headerVersion) return headerVersion

  // Check URL path
  const pathMatch = request.nextUrl.pathname.match(/^\/api\/(v\d+)\//)
  if (pathMatch) return pathMatch[1]

  // Default to latest
  return 'v1'
}
```

### OpenAPI Documentation
```typescript
// src/lib/api/openapi.ts
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TaskMaster Pro API',
    version: '1.0.0',
    description: 'RESTful API for TaskMaster Pro productivity suite',
    contact: {
      name: 'API Support',
      email: 'api-support@taskmasterpro.com'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Development server'
    }
  ],
  paths: {
    '/tasks': {
      get: {
        summary: 'List tasks',
        description: 'Retrieve a paginated list of tasks with filtering and sorting',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page'
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']
            },
            description: 'Filter by task status'
          },
          {
            name: 'priority',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
            },
            description: 'Filter by task priority'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 100 },
            description: 'Search in task title and description'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Task' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    meta: {
                      type: 'object',
                      properties: {
                        filters: { type: 'object' },
                        sort: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        summary: 'Create task',
        description: 'Create a new task',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskCreate' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Task created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Task' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    }
  },
  components: {
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 2000, nullable: true },
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
          },
          estimatedMinutes: { type: 'integer', minimum: 1, nullable: true },
          actualMinutes: { type: 'integer', minimum: 0, nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          projectId: { type: 'string', format: 'cuid', nullable: true },
          userId: { type: 'string', format: 'cuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          project: { $ref: '#/components/schemas/ProjectSummary', nullable: true },
          tags: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tag' }
          }
        },
        required: ['id', 'title', 'status', 'priority', 'userId', 'createdAt', 'updatedAt']
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1 },
          total: { type: 'integer', minimum: 0 },
          pages: { type: 'integer', minimum: 0 },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        },
        required: ['page', 'limit', 'total', 'pages']
      }
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Unauthorized' },
                code: { type: 'string', example: 'UNAUTHORIZED' }
              }
            }
          }
        }
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Validation error' },
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      code: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      InternalError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Internal server error' },
                code: { type: 'string', example: 'INTERNAL_ERROR' }
              }
            }
          }
        }
      }
    },
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token'
      }
    }
  },
  security: [
    { sessionAuth: [] }
  ]
}

// Generate documentation endpoint
// src/app/api/docs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/api/openapi'

export async function GET() {
  return NextResponse.json(openApiSpec)
}
```

## 12. Performance Optimization

### Database Query Optimization
```typescript
// src/lib/api/performance.ts
import { Prisma } from '@prisma/client'

// Optimized query patterns
export const optimizedIncludes = {
  task: {
    minimal: {
      project: {
        select: { id: true, name: true, color: true }
      },
      tags: {
        select: { id: true, name: true, color: true }
      }
    },
    detailed: {
      project: {
        select: { 
          id: true, 
          name: true, 
          color: true, 
          status: true 
        }
      },
      tags: {
        select: { 
          id: true, 
          name: true, 
          color: true 
        }
      },
      timeEntries: {
        select: {
          id: true,
          duration: true,
          startedAt: true,
          endedAt: true
        },
        orderBy: { startedAt: 'desc' as const },
        take: 5
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
          completedAt: true
        },
        where: { deletedAt: null }
      }
    }
  },
  
  project: {
    withTaskCounts: {
      _count: {
        select: {
          tasks: {
            where: { deletedAt: null }
          }
        }
      },
      tasks: {
        where: { 
          deletedAt: null,
          status: { in: ['TODO', 'IN_PROGRESS'] }
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true
        },
        orderBy: [
          { priority: 'desc' as const },
          { dueDate: 'asc' as const }
        ],
        take: 5
      }
    }
  }
}

// Batch loading to reduce N+1 queries
export async function loadTasksWithRelations(taskIds: string[]) {
  const [tasks, projects, tags, timeEntries] = await Promise.all([
    // Load tasks
    prisma.task.findMany({
      where: { id: { in: taskIds } },
      orderBy: { updatedAt: 'desc' }
    }),
    
    // Load related projects
    prisma.project.findMany({
      where: {
        tasks: {
          some: { id: { in: taskIds } }
        }
      },
      select: { id: true, name: true, color: true }
    }),
    
    // Load related tags
    prisma.tag.findMany({
      where: {
        tasks: {
          some: { id: { in: taskIds } }
        }
      },
      select: { id: true, name: true, color: true }
    }),
    
    // Load recent time entries
    prisma.timeEntry.findMany({
      where: { taskId: { in: taskIds } },
      select: {
        id: true,
        taskId: true,
        duration: true,
        startedAt: true
      },
      orderBy: { startedAt: 'desc' },
      take: 50 // Limit to prevent memory issues
    })
  ])

  // Build lookup maps
  const projectsMap = new Map(projects.map(p => [p.id, p]))
  const tagsMap = new Map()
  const timeEntriesMap = new Map()

  // Group time entries by task
  timeEntries.forEach(entry => {
    if (!timeEntriesMap.has(entry.taskId)) {
      timeEntriesMap.set(entry.taskId, [])
    }
    timeEntriesMap.get(entry.taskId).push(entry)
  })

  // Attach relations to tasks
  return tasks.map(task => ({
    ...task,
    project: task.projectId ? projectsMap.get(task.projectId) : null,
    timeEntries: timeEntriesMap.get(task.id) || []
  }))
}

// Query optimization hints
export const queryHints = {
  // Use raw queries for complex aggregations
  getTaskMetrics: async (userId: string) => {
    return await prisma.$queryRaw<Array<{
      status: string
      priority: string
      count: bigint
      totalEstimated: bigint | null
      totalActual: bigint | null
    }>>`
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        SUM(estimated_minutes) as totalEstimated,
        SUM(actual_minutes) as totalActual
      FROM tasks 
      WHERE user_id = ${userId} 
        AND deleted_at IS NULL
      GROUP BY status, priority
      ORDER BY 
        CASE priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
        END,
        CASE status 
          WHEN 'TODO' THEN 1 
          WHEN 'IN_PROGRESS' THEN 2 
          WHEN 'COMPLETED' THEN 3 
          WHEN 'ON_HOLD' THEN 4 
          WHEN 'CANCELLED' THEN 5 
        END
    `
  },

  // Efficient pagination for large datasets
  getCursorPagination: async (
    userId: string, 
    cursor?: string, 
    limit: number = 20
  ) => {
    return await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(cursor && {
          OR: [
            { createdAt: { lt: new Date(cursor) } },
            {
              createdAt: new Date(cursor),
              id: { lt: cursor }
            }
          ]
        })
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: limit + 1, // Get one extra to check if there's more
      ...optimizedIncludes.task.minimal
    })
  }
}
```

### Caching Strategies
```typescript
// src/lib/api/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Cache tags for invalidation
  compression?: boolean
}

export class ApiCache {
  private static instance: ApiCache
  
  private constructor() {}
  
  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache()
    }
    return ApiCache.instance
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = 300, tags = [] } = options // Default 5 minutes TTL
      
      await Promise.all([
        // Store the data
        redis.setex(key, ttl, JSON.stringify(data)),
        
        // Store tags for invalidation
        ...tags.map(tag => redis.sadd(`tag:${tag}`, key))
      ])
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        await Promise.all([
          redis.del(...keys),
          redis.del(`tag:${tag}`)
        ])
      }
    } catch (error) {
      console.error('Cache tag invalidation error:', error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error)
    }
  }
}

// Cache middleware for API routes
export function withCache(options: CacheOptions = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      const cache = ApiCache.getInstance()
      const cacheKey = generateCacheKey(request, propertyKey)
      
      // Try to get from cache
      const cached = await cache.get(cacheKey)
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' }
        })
      }

      // Execute original method
      const response = await originalMethod.call(this, request, ...args)
      const data = await response.json()

      // Cache the response
      if (response.ok) {
        await cache.set(cacheKey, data, options)
      }

      return NextResponse.json(data, {
        headers: { 'X-Cache': 'MISS' }
      })
    }
  }
}

function generateCacheKey(request: NextRequest, method: string): string {
  const url = new URL(request.url)
  const searchParams = url.searchParams.toString()
  const userId = request.headers.get('x-user-id') || 'anonymous'
  
  return `api:${method}:${userId}:${searchParams || 'no-params'}`
}

// Cache warming strategies
export async function warmupCache(userId: string) {
  const cache = ApiCache.getInstance()
  
  // Warm up common queries
  const [tasks, projects, dashboardMetrics] = await Promise.all([
    // Recent tasks
    prisma.task.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      ...optimizedIncludes.task.minimal
    }),
    
    // Active projects
    prisma.project.findMany({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
      ...optimizedIncludes.project.withTaskCounts
    }),
    
    // Dashboard metrics
    queryHints.getTaskMetrics(userId)
  ])

  // Cache the results
  await Promise.all([
    cache.set(`tasks:recent:${userId}`, { data: tasks }, { 
      ttl: 300, 
      tags: [`user:${userId}`, 'tasks'] 
    }),
    cache.set(`projects:active:${userId}`, { data: projects }, { 
      ttl: 600, 
      tags: [`user:${userId}`, 'projects'] 
    }),
    cache.set(`dashboard:metrics:${userId}`, { data: dashboardMetrics }, { 
      ttl: 180, 
      tags: [`user:${userId}`, 'dashboard'] 
    })
  ])
}
```

## 13. Integration with Auth and Other Subgroups

### Auth Middleware Integration
```typescript
// src/lib/api/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // From auth subgroup
import { ApiException } from '@/lib/api/error-handler'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    name?: string
    role?: string
  }
}

export function withAuth(handler: (req: AuthenticatedRequest, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    // Attach user info to request
    const authenticatedRequest = Object.assign(request, {
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name,
        role: session.user.role || 'user'
      }
    })

    return handler(authenticatedRequest, ...args)
  }
}

// Role-based access control
export function withRole(roles: string[]) {
  return function(handler: (req: AuthenticatedRequest, ...args: any[]) => Promise<Response>) {
    return withAuth(async (req: AuthenticatedRequest, ...args: any[]) => {
      if (!roles.includes(req.user.role || 'user')) {
        return NextResponse.json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN'
        }, { status: 403 })
      }

      return handler(req, ...args)
    })
  }
}

// Resource ownership verification
export async function verifyTaskOwnership(taskId: string, userId: string): Promise<boolean> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
      deletedAt: null
    },
    select: { id: true }
  })

  return !!task
}

export async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      deletedAt: null
    },
    select: { id: true }
  })

  return !!project
}
```

### Dashboard Data Integration
```typescript
// src/app/api/dashboard/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/auth-middleware'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export interface DashboardMetrics {
  tasksCompletedToday: number
  activeProjects: number
  timeTrackedToday: number // minutes
  upcomingDeadlines: Array<{
    taskId: string
    title: string
    dueDate: string
    priority: string
  }>
  productivityScore: number
  streakDays: number
  weeklyProgress: Array<{
    date: string
    completed: number
    created: number
  }>
}

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const userId = request.user.id
  const today = new Date()
  const startToday = startOfDay(today)
  const endToday = endOfDay(today)

  // Execute all metrics queries in parallel
  const [
    tasksCompletedToday,
    activeProjects,
    timeTrackedToday,
    upcomingDeadlines,
    weeklyData,
    currentStreak
  ] = await Promise.all([
    // Tasks completed today
    prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startToday,
          lte: endToday
        },
        deletedAt: null
      }
    }),

    // Active projects count
    prisma.project.count({
      where: {
        userId,
        status: 'ACTIVE',
        isArchived: false,
        deletedAt: null
      }
    }),

    // Time tracked today
    prisma.timeEntry.aggregate({
      where: {
        userId,
        startedAt: {
          gte: startToday,
          lte: endToday
        }
      },
      _sum: {
        duration: true
      }
    }),

    // Upcoming deadlines (next 7 days)
    prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: {
          gte: today,
          lte: endOfDay(subDays(today, -7))
        },
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 5
    }),

    // Weekly progress data
    getWeeklyProgressData(userId),

    // Current streak
    getCurrentStreak(userId)
  ])

  // Calculate productivity score
  const productivityScore = calculateProductivityScore({
    completedToday: tasksCompletedToday,
    timeTracked: timeTrackedToday._sum.duration || 0,
    weeklyData
  })

  const metrics: DashboardMetrics = {
    tasksCompletedToday,
    activeProjects,
    timeTrackedToday: timeTrackedToday._sum.duration || 0,
    upcomingDeadlines: upcomingDeadlines.map(task => ({
      taskId: task.id,
      title: task.title,
      dueDate: task.dueDate!.toISOString(),
      priority: task.priority
    })),
    productivityScore,
    streakDays: currentStreak,
    weeklyProgress: weeklyData
  }

  return NextResponse.json({ data: metrics })
})

async function getWeeklyProgressData(userId: string) {
  const weeklyData = []
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const startOfDate = startOfDay(date)
    const endOfDate = endOfDay(date)

    const [completed, created] = await Promise.all([
      prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: startOfDate,
            lte: endOfDate
          },
          deletedAt: null
        }
      }),
      prisma.task.count({
        where: {
          userId,
          createdAt: {
            gte: startOfDate,
            lte: endOfDate
          },
          deletedAt: null
        }
      })
    ])

    weeklyData.push({
      date: date.toISOString().split('T')[0],
      completed,
      created
    })
  }

  return weeklyData
}

async function getCurrentStreak(userId: string): Promise<number> {
  let streak = 0
  let checkDate = new Date()

  // Check each day backwards until we find a day with no completed tasks
  while (true) {
    const startOfDate = startOfDay(checkDate)
    const endOfDate = endOfDay(checkDate)

    const completedCount = await prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startOfDate,
          lte: endOfDate
        },
        deletedAt: null
      }
    })

    if (completedCount === 0) {
      break
    }

    streak++
    checkDate = subDays(checkDate, 1)

    // Prevent infinite loops - max 365 days
    if (streak >= 365) break
  }

  return streak
}

function calculateProductivityScore({
  completedToday,
  timeTracked,
  weeklyData
}: {
  completedToday: number
  timeTracked: number
  weeklyData: Array<{ completed: number; created: number }>
}): number {
  // Base score from today's completions (0-40 points)
  const completionScore = Math.min(completedToday * 8, 40)
  
  // Time tracking score (0-30 points, target 4 hours = 240 minutes)
  const timeScore = Math.min((timeTracked / 240) * 30, 30)
  
  // Weekly consistency score (0-30 points)
  const weeklyCompletions = weeklyData.reduce((sum, day) => sum + day.completed, 0)
  const avgDaily = weeklyCompletions / 7
  const consistencyScore = Math.min(avgDaily * 5, 30)

  return Math.round(completionScore + timeScore + consistencyScore)
}
```

### UI Component Integration
```typescript
// src/lib/api/ui-helpers.ts
// Integration points with Design System subgroup

export interface ComponentDataContract {
  // Task card data structure
  taskCard: {
    id: string
    title: string
    status: TaskStatus
    priority: TaskPriority
    dueDate?: string
    project?: {
      id: string
      name: string
      color: string
    }
    tags: Array<{
      id: string
      name: string
      color: string
    }>
    progress?: {
      completed: number
      total: number
    }
  }

  // Project card data structure
  projectCard: {
    id: string
    name: string
    description?: string
    color: string
    status: ProjectStatus
    taskCounts: {
      total: number
      completed: number
      inProgress: number
    }
    recentTasks: Array<{
      id: string
      title: string
      status: TaskStatus
    }>
  }

  // Metric card data structure
  metricCard: {
    label: string
    value: string | number
    trend?: {
      direction: 'up' | 'down' | 'neutral'
      percentage: number
      period: string
    }
    icon?: string
    color?: string
  }
}

// Transform API data for UI components
export class DataTransformer {
  static toTaskCard(task: any): ComponentDataContract['taskCard'] {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: task.project ? {
        id: task.project.id,
        name: task.project.name,
        color: task.project.color
      } : undefined,
      tags: task.tags || [],
      progress: task.subtasks ? {
        completed: task.subtasks.filter((t: any) => t.status === 'COMPLETED').length,
        total: task.subtasks.length
      } : undefined
    }
  }

  static toProjectCard(project: any): ComponentDataContract['projectCard'] {
    const tasks = project.tasks || []
    const completed = tasks.filter((t: any) => t.status === 'COMPLETED').length
    const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      taskCounts: {
        total: tasks.length,
        completed,
        inProgress
      },
      recentTasks: tasks
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status
        }))
    }
  }

  static toMetricCards(metrics: DashboardMetrics): ComponentDataContract['metricCard'][] {
    return [
      {
        label: 'Tasks Completed Today',
        value: metrics.tasksCompletedToday,
        icon: 'check-circle',
        color: 'emerald'
      },
      {
        label: 'Active Projects',
        value: metrics.activeProjects,
        icon: 'folder',
        color: 'blue'
      },
      {
        label: 'Time Tracked',
        value: `${Math.floor(metrics.timeTrackedToday / 60)}h ${metrics.timeTrackedToday % 60}m`,
        icon: 'clock',
        color: 'purple'
      },
      {
        label: 'Productivity Score',
        value: `${metrics.productivityScore}%`,
        trend: {
          direction: metrics.productivityScore >= 70 ? 'up' : 'down',
          percentage: Math.abs(metrics.productivityScore - 70),
          period: 'vs target'
        },
        icon: 'trending-up',
        color: metrics.productivityScore >= 70 ? 'emerald' : 'amber'
      },
      {
        label: 'Current Streak',
        value: `${metrics.streakDays} ${metrics.streakDays === 1 ? 'day' : 'days'}`,
        icon: 'fire',
        color: 'orange'
      }
    ]
  }
}

// Status color mapping for UI consistency
export const statusColors = {
  task: {
    TODO: 'slate',
    IN_PROGRESS: 'blue',
    COMPLETED: 'emerald',
    ON_HOLD: 'amber',
    CANCELLED: 'red'
  },
  priority: {
    LOW: 'slate',
    MEDIUM: 'blue',
    HIGH: 'amber',
    URGENT: 'red'
  },
  project: {
    ACTIVE: 'emerald',
    ON_HOLD: 'amber',
    COMPLETED: 'blue',
    CANCELLED: 'red'
  }
}
```

This comprehensive coding context document provides the Core API Layer & Data Management subgroup with all the necessary patterns, examples, and integration points to build a robust, performant backend system for TaskMaster Pro. The document covers everything from basic CRUD operations to advanced optimization techniques, ensuring the API layer can support the full productivity suite's requirements.

The key files created will be:
- **API Routes**: `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/src/app/api/` directory structure
- **Database Schema**: `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/prisma/schema.prisma`
- **Validation Schemas**: `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/src/lib/validations/`
- **API Client & Hooks**: `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/src/lib/api/` and `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/src/hooks/api/`