'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useTaskExtraction } from '@/hooks/use-tasks'

interface TaskExtractorProps {
  projectId?: string
  onTasksExtracted?: (tasks: any[]) => void
}

export function TaskExtractor({ projectId, onTasksExtracted }: TaskExtractorProps) {
  const [content, setContent] = React.useState('')
  const [extractedTasks, setExtractedTasks] = React.useState<any[]>([])
  
  const { mutate: extractTasks, isPending, error } = useTaskExtraction()

  const handleExtract = async () => {
    if (!content.trim()) {
      return
    }

    extractTasks({
      content,
      projectId,
      saveToDatabase: true // Automatically save for demo
    }, {
      onSuccess: (data) => {
        const tasks = data.data.extractionResult.tasks
        setExtractedTasks(tasks)
        onTasksExtracted?.(tasks)
      }
    })
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
              disabled={isPending || !content.trim()}
              className="min-w-[120px]"
            >
              {isPending ? (
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
              {error.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Extracted Tasks ({extractedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {extractedTasks.map((task, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.estimatedHours && (
                        <Badge variant="outline" className="text-xs">
                          {task.estimatedHours}h
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {Math.round(task.confidence * 100)}% confidence
                      </Badge>
                      {task.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TaskExtractor