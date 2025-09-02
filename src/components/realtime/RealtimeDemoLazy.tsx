'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Lazy load the realtime components to reduce bundle size
const RealtimeTaskList = dynamic(() => import('../tasks/RealtimeTaskList').then(mod => ({ default: mod.RealtimeTaskList })), {
  loading: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  ),
  ssr: false
})

export { RealtimeTaskList }