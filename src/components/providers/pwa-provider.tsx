'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register'
import { indexedDB } from '@/lib/offline/indexed-db'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Initialize IndexedDB
    indexedDB.initialize().catch(console.error)

    // Request persistent storage
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist().then((persistent) => {
        console.log('Persistent storage:', persistent ? 'granted' : 'denied')
      })
    }
  }, [])

  return <>{children}</>
}