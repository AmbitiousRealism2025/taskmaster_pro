'use client'

/**
 * Performance Provider Component
 * 
 * Initializes and manages performance monitoring across the application
 */

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { 
  initWebVitals, 
  observeLongTasks, 
  observeResourceTiming,
  performanceTracker 
} from '@/lib/performance/web-vitals'
import { 
  initPerformanceMonitoring, 
  performanceMonitor 
} from '@/lib/performance/monitoring'
import { initCaching } from '@/lib/performance/caching'

interface PerformanceContextType {
  performanceTracker: typeof performanceTracker
  performanceMonitor: typeof performanceMonitor
}

const PerformanceContext = createContext<PerformanceContextType | null>(null)

export function usePerformance() {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider')
  }
  return context
}

interface PerformanceProviderProps {
  children: ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize all performance monitoring systems
    initWebVitals()
    initPerformanceMonitoring()
    initCaching()

    // Start observing performance metrics
    observeLongTasks()
    observeResourceTiming()

    // Mark application startup
    performanceTracker.mark('app-startup')

    // Track initial page load performance
    if (document.readyState === 'complete') {
      performanceTracker.mark('app-ready')
      performanceTracker.measure('app-load-time', 'navigationStart', 'app-ready')
    } else {
      const handleLoad = () => {
        performanceTracker.mark('app-ready')
        performanceTracker.measure('app-load-time', 'navigationStart', 'app-ready')
        window.removeEventListener('load', handleLoad)
      }
      window.addEventListener('load', handleLoad)
    }

    // Track route changes for SPA navigation
    let lastUrl = window.location.href
    const handleRouteChange = () => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        performanceTracker.mark('route-change-start')
        lastUrl = currentUrl
        
        // Measure route change performance after a short delay
        setTimeout(() => {
          performanceTracker.mark('route-change-end')
          performanceTracker.measure('route-change-time', 'route-change-start', 'route-change-end')
        }, 100)
      }
    }

    // Use MutationObserver for better route change detection in Next.js
    const observer = new MutationObserver(handleRouteChange)
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    })

    // Also listen to popstate for browser navigation
    window.addEventListener('popstate', handleRouteChange)

    // Performance monitoring for user interactions
    const trackUserInteraction = (eventType: string) => {
      return (event: Event) => {
        performanceTracker.mark(`${eventType}-start`)
        
        // Use requestIdleCallback to measure after interaction completes
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            performanceTracker.mark(`${eventType}-end`)
            performanceTracker.measure(`${eventType}-duration`, `${eventType}-start`, `${eventType}-end`)
          })
        }
      }
    }

    // Track key user interactions
    document.addEventListener('click', trackUserInteraction('click'))
    document.addEventListener('input', trackUserInteraction('input'))
    document.addEventListener('scroll', trackUserInteraction('scroll'))

    // Cleanup function
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', handleRouteChange)
      document.removeEventListener('click', trackUserInteraction('click'))
      document.removeEventListener('input', trackUserInteraction('input'))
      document.removeEventListener('scroll', trackUserInteraction('scroll'))
    }
  }, [])

  const contextValue: PerformanceContextType = {
    performanceTracker,
    performanceMonitor
  }

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  )
}