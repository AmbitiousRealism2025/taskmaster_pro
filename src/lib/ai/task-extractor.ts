// Task Extraction Service for TaskMaster Pro
import { aiClient } from './client'
import { ExtractedTask, TaskExtractionRequest, TaskExtractionResponse } from '@/types/ai'

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
      
      // Log for monitoring (in a real app, use proper logging service)
      console.log('Task extraction completed', {
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
      console.error('Task extraction failed', { error, request: { ...request, content: request.content.substring(0, 100) + '...' } })
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