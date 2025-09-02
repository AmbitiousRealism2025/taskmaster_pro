'use client'

import { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic import for heavy Kanban component
const KanbanBoard = lazy(() => import('./KanbanBoard'))

// Loading skeleton for Kanban board
const KanbanSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, colIndex) => (
      <Card key={colIndex}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, cardIndex) => (
            <Card key={cardIndex} className="p-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-3/4 mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    ))}
  </div>
)

export default function KanbanBoardDynamic(props: any) {
  return (
    <Suspense fallback={<KanbanSkeleton />}>
      <KanbanBoard {...props} />
    </Suspense>
  )
}