'use client'

import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic import for heavy editor component
const TiptapEditor = lazy(() => import('./TiptapEditor'))

// Loading skeleton
const EditorSkeleton = () => (
  <Card className="w-full">
    <CardContent className="p-4 space-y-4">
      <div className="flex space-x-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
)

export default function TiptapEditorDynamic(props: any) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <TiptapEditor {...props} />
    </Suspense>
  )
}