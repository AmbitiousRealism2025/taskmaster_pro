// AI Client for TaskMaster Pro - OpenRouter Integration
import { ExtractedTask, TaskExtractionRequest, SmartScheduleRequest, TimeBlock } from '@/types/ai'

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
  private baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  private apiKey = process.env.OPENROUTER_API_KEY
  
  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set')
    }

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
      const errorText = await response.text()
      throw new Error(`AI request failed: ${response.statusText} - ${errorText}`)
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
    
    Return ONLY a JSON array of tasks with this exact structure:
    [{
      "title": "string",
      "description": "string (optional)",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "dueDate": "ISO date string (optional)",
      "estimatedHours": number (optional),
      "tags": ["string array"],
      "confidence": number (0-1)
    }]`

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

    if (!content_text) {
      throw new Error('No content returned from AI')
    }

    try {
      const parsed = JSON.parse(content_text)
      
      // Validate the response is an array
      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array')
      }

      // Validate each task has required fields
      return parsed.map((task, index) => ({
        title: task.title || `Extracted Task ${index + 1}`,
        description: task.description || undefined,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(task.priority) 
          ? task.priority 
          : 'MEDIUM',
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        estimatedHours: typeof task.estimatedHours === 'number' 
          ? Math.max(0.1, Math.min(8, task.estimatedHours))
          : 1,
        tags: Array.isArray(task.tags) ? task.tags.slice(0, 5) : [],
        confidence: typeof task.confidence === 'number' 
          ? Math.max(0, Math.min(1, task.confidence))
          : 0.7
      }))
    } catch (error) {
      console.error('Failed to parse AI response:', content_text)
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
    const content_text = response.choices[0]?.message?.content

    if (!content_text) {
      throw new Error('No scheduling content returned from AI')
    }

    try {
      return JSON.parse(content_text)
    } catch (error) {
      throw new Error('Failed to parse scheduling response as JSON')
    }
  }
}

export const aiClient = new AIClient()