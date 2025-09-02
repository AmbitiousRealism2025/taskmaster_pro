'use client'

import React, { memo, useMemo, useCallback } from 'react'
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
import { useDeleteTask } from '@/hooks/use-tasks'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useLiveRegion } from '@/hooks/use-accessibility'
import { useSwipeGestures, useTouchOptimization } from '@/hooks/use-touch-gestures'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onEdit?: (task: Task) => void
}

const PRIORITY_COLORS = {
  LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  HIGH: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

const CARD_VARIANTS = {
  LOW: 'default',
  MEDIUM: 'default', 
  HIGH: 'gradient-border',
  URGENT: 'gradient-subtle'
} as const

export const TaskCard = memo(function TaskCard({ task, isDragging, onEdit }: TaskCardProps) {
  const deleteTask = useDeleteTask()
  const { announceStatusChange, announceSuccess, announceError } = useLiveRegion()
  const { addHapticFeedback, isTouchDevice } = useTouchOptimization()

  // Memoized callbacks for performance
  const handleSwipeLeft = useCallback(() => {
    // Quick complete action
    if (task.status !== 'DONE') {
      addHapticFeedback('medium')
      announceSuccess(`Marked ${task.title} as complete`)
      // Could trigger status update here
    }
  }, [task.status, task.title, addHapticFeedback, announceSuccess])

  const handleSwipeRight = useCallback(() => {
    // Quick edit action
    if (onEdit) {
      addHapticFeedback('light')
      onEdit(task)
      announceStatusChange(`Opened ${task.title} for editing`)
    }
  }, [onEdit, task, addHapticFeedback, announceStatusChange])

  const handleLongPress = useCallback(() => {
    // Context menu or more actions
    addHapticFeedback('heavy')
    announceStatusChange(`Long press on ${task.title} - showing more options`)
  }, [task.title, addHapticFeedback, announceStatusChange])

  // Touch gestures for task actions
  const { onTouchStart, onTouchMove, onTouchEnd, isGesturing } = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onLongPress: handleLongPress,
    threshold: 60
  })

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

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTask.mutate(task.id)
      announceSuccess(`Deleted task: ${task.title}`)
    }
  }

  const handleEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(task)
      announceStatusChange(`Editing task: ${task.title}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        announceStatusChange(`Opened task: ${task.title}`)
        break
      case 'Delete':
      case 'Backspace':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          handleDelete(e)
        }
        break
      case 'e':
      case 'E':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          handleEdit(e)
        }
        break
    }
  }



  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      variant={CARD_VARIANTS[task.priority]}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        isDragging && 'opacity-50 rotate-5',
        isGesturing && 'scale-[1.05] shadow-lg',
        isOverdue && 'ring-2 ring-red-200 dark:ring-red-800',
        task.priority === 'HIGH' && 'hover:shadow-purple-100 dark:hover:shadow-purple-900/20',
        task.priority === 'URGENT' && 'hover:shadow-purple-200 dark:hover:shadow-purple-800/30',
        isTouchDevice() && 'touch-manipulation'
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label={`Task: ${task.title}. Priority: ${task.priority}. Status: ${task.status}${task.dueDate ? `. Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}${isOverdue ? '. Overdue' : ''}. ${isTouchDevice() ? 'Swipe left to complete, right to edit, long press for options' : 'Press Enter to open, Ctrl+E to edit, Ctrl+Delete to remove'}`}
      aria-describedby={`task-${task.id}-details`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={cn(
              "font-semibold text-sm leading-tight mb-2 line-clamp-2 tracking-tight",
              task.priority === 'HIGH' && "text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-teal-600 dark:from-violet-400 dark:to-teal-400",
              task.priority === 'URGENT' && "text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-teal-700 dark:from-violet-300 dark:to-teal-300"
            )}>
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
        </div>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.updatedAt === nextProps.task.updatedAt &&
    prevProps.isDragging === nextProps.isDragging
  )
})

export default TaskCard