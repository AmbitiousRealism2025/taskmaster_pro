'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Note, ExtractedTask } from '@/types/note'

// Lazy load the TipTap editor to reduce bundle size
const TiptapEditorInternal = dynamic(() => import('./TiptapEditor').then(mod => ({ default: mod.TiptapEditor })), {
  loading: () => (
    <div className="w-full h-64 border border-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading editor...</p>
      </div>
    </div>
  ),
  ssr: false // Disable server-side rendering for editor
})

interface TiptapEditorProps {
  note?: Note
  placeholder?: string
  onUpdate?: (content: string, plainText: string) => void
  onTaskExtraction?: (tasks: ExtractedTask[]) => void
  className?: string
  readOnly?: boolean
}

export function TiptapEditor(props: TiptapEditorProps) {
  return (
    <Suspense fallback={
      <div className="w-full h-64 border border-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading editor...</p>
        </div>
      </div>
    }>
      <TiptapEditorInternal {...props} />
    </Suspense>
  )
}