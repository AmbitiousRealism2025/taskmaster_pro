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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types/task'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { useUpdateTask } from '@/hooks/use-tasks'
import { Card } from '@/components/ui/card'
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation'
import { useLiveRegion } from '@/hooks/use-accessibility'

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
  const [selectedTaskIndex, setSelectedTaskIndex] = React.useState(0)
  const [selectedColumnIndex, setSelectedColumnIndex] = React.useState(0)
  const updateTaskMutation = useUpdateTask()
  const { announceStatusChange, announceSuccess } = useLiveRegion()

  // Get all tasks for keyboard navigation
  const allTasks = React.useMemo(() => tasks.filter(task => task.status !== 'CANCELLED'), [tasks])
  
  // Keyboard navigation for tasks
  const { handleKeyDown: handleTaskKeyDown, itemProps: taskItemProps } = useKeyboardNavigation(
    allTasks.length,
    {
      direction: 'both',
      wrap: true,
      onSelect: (index) => {
        setSelectedTaskIndex(index)
        const task = allTasks[index]
        announceStatusChange(`Selected task: ${task.title}`)
      },
      onActivate: (index) => {
        const task = allTasks[index]
        announceStatusChange(`Activated task: ${task.title}`)
        // Could open task details or edit mode
      },
      onEscape: () => {
        announceStatusChange('Escaped from task selection')
      }
    }
  )

  // Keyboard navigation for columns
  const { handleKeyDown: handleColumnKeyDown, itemProps: columnItemProps } = useKeyboardNavigation(
    COLUMNS.length,
    {
      direction: 'horizontal',
      wrap: true,
      onSelect: (index) => {
        setSelectedColumnIndex(index)
        const column = COLUMNS[index]
        announceStatusChange(`Selected column: ${column.title}`)
      },
      onActivate: (index) => {
        // Move selected task to this column
        if (allTasks[selectedTaskIndex]) {
          const task = allTasks[selectedTaskIndex]
          const newStatus = COLUMNS[index].id
          if (task.status !== newStatus) {
            handleTaskMove(task.id, newStatus)
            announceSuccess(`Moved ${task.title} to ${COLUMNS[index].title}`)
          }
        }
      }
    }
  )

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistic update callback
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

    // Optimistic update callback
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

  if (tasks.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No tasks found</p>
          <p className="text-sm text-muted-foreground">Create your first task to get started</p>
        </div>
      </Card>
    )
  }

  const handleBoardKeyDown = (event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey } = event

    // Handle task movement between columns
    if ((ctrlKey || metaKey) && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      event.preventDefault()
      const task = allTasks[selectedTaskIndex]
      if (!task) return

      const currentColumnIndex = COLUMNS.findIndex(col => col.id === task.status)
      let newColumnIndex = currentColumnIndex

      if (key === 'ArrowLeft' && currentColumnIndex > 0) {
        newColumnIndex = currentColumnIndex - 1
      } else if (key === 'ArrowRight' && currentColumnIndex < COLUMNS.length - 1) {
        newColumnIndex = currentColumnIndex + 1
      }

      if (newColumnIndex !== currentColumnIndex) {
        const newStatus = COLUMNS[newColumnIndex].id
        handleTaskMove(task.id, newStatus)
        announceSuccess(`Moved ${task.title} to ${COLUMNS[newColumnIndex].title}`)
      }
      return
    }

    // Default task navigation
    handleTaskKeyDown(event)
  }

  return (
    <div 
      className="h-full flex flex-col focus:outline-none"
      tabIndex={0}
      onKeyDown={handleBoardKeyDown}
      role="application"
      aria-label="Task kanban board - use arrow keys to navigate, Ctrl+Left/Right to move tasks between columns"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full overflow-x-auto pb-4" role="grid" aria-label="Task board columns">
          {COLUMNS.map((column, columnIndex) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              data-testid={`column-${column.id}`}
              aria-label={`${column.title} column with ${tasksByStatus[column.id].length} tasks`}
              role="gridcell"
              {...columnItemProps(columnIndex)}
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
              <TaskCard task={activeTask} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoard