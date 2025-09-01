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

export function KanbanColumn({ id, title, color, tasks, children, ...props }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div className="flex flex-col min-w-[300px] max-w-[350px] h-full" {...props}>
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

export default KanbanColumn