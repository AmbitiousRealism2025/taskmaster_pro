// AI Integration Types for TaskMaster Pro
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

// Import dependencies
import { Priority, Task } from './task'