import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskExtractor } from '@/lib/ai/task-extractor'
import { batchTaskSchema } from '@/lib/validations/task'
import { ApiResponse } from '@/types/api'
import { z } from 'zod'

const extractTaskSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  projectId: z.string().optional(),
  saveToDatabase: z.boolean().default(true)
})

// POST /api/tasks/extract - Extract tasks from text using AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = extractTaskSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          success: false,
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { content, projectId, saveToDatabase } = validationResult.data

    // If projectId provided, verify user owns the project
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { 
          id: projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND', success: false },
          { status: 404 }
        )
      }
    }

    // Extract tasks using AI
    const extractionResult = await taskExtractor.extractTasksFromText({
      content,
      context: {
        projectId,
        userId: session.user.id
      }
    })

    // If saveToDatabase is false, just return the extracted tasks
    if (!saveToDatabase) {
      const response: ApiResponse = {
        data: {
          extractionResult,
          saved: false
        },
        success: true,
        message: `Extracted ${extractionResult.tasks.length} tasks from text`
      }

      return NextResponse.json(response)
    }

    // Convert extracted tasks to database format
    const tasksToCreate = extractionResult.tasks.map(task => ({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate?.toISOString(),
      estimatedMinutes: task.estimatedHours ? Math.round(task.estimatedHours * 60) : undefined,
      projectId,
      tags: task.tags,
      aiGenerated: true,
      aiConfidence: task.confidence,
      extractedFrom: content.slice(0, 500) // Store first 500 chars as source reference
    }))

    // Validate the batch creation
    const batchValidationResult = batchTaskSchema.safeParse({
      tasks: tasksToCreate,
      projectId,
      defaultPriority: 'MEDIUM'
    })

    if (!batchValidationResult.success) {
      return NextResponse.json(
        { 
          error: 'Batch task validation failed', 
          code: 'VALIDATION_ERROR',
          success: false,
          details: batchValidationResult.error.errors 
        },
        { status: 400 }
      )
    }

    // Create tasks in database
    const createdTasks = await Promise.all(
      tasksToCreate.map(taskData => 
        prisma.task.create({
          data: {
            ...taskData,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            userId: session.user.id
          },
          include: {
            project: {
              select: { id: true, name: true, color: true }
            }
          }
        })
      )
    )

    const response: ApiResponse = {
      data: {
        extractionResult,
        tasks: createdTasks,
        saved: true
      },
      success: true,
      message: `Successfully extracted and saved ${createdTasks.length} tasks`
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error extracting tasks:', error)
    
    // Handle specific AI extraction errors
    if (error instanceof Error) {
      if (error.message.includes('OPENROUTER_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'AI service not configured. Please check OpenRouter API key.', 
            code: 'AI_SERVICE_ERROR', 
            success: false 
          },
          { status: 503 }
        )
      }
      
      if (error.message.includes('Failed to extract tasks')) {
        return NextResponse.json(
          { 
            error: 'Task extraction failed. Please try with different content.', 
            code: 'EXTRACTION_FAILED', 
            success: false 
          },
          { status: 422 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}