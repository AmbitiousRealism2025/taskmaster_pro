import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  memoryUsage: number
  renderTime: number
  queryCount: number
  cacheHitRate: number
  networkRequests: number
  slowQueries: number
}

interface RenderMetrics {
  componentName: string
  renderTime: number
  propsChanged: string[]
  timestamp: Date
}

export function usePerformanceMonitor(componentName?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    queryCount: 0,
    cacheHitRate: 0,
    networkRequests: 0,
    slowQueries: 0
  })

  const renderStartRef = useRef<number>(0)
  const previousPropsRef = useRef<any>({})
  const renderHistoryRef = useRef<RenderMetrics[]>([])

  // Component render time tracking
  const startRenderTimer = useCallback(() => {
    renderStartRef.current = performance.now()
  }, [])

  const endRenderTimer = useCallback((props?: any) => {
    const renderTime = performance.now() - renderStartRef.current
    
    if (componentName && renderTime > 0) {
      const propsChanged = props ? getChangedProps(previousPropsRef.current, props) : []
      
      const renderMetric: RenderMetrics = {
        componentName,
        renderTime,
        propsChanged,
        timestamp: new Date()
      }
      
      renderHistoryRef.current.push(renderMetric)
      
      // Keep only last 100 renders
      if (renderHistoryRef.current.length > 100) {
        renderHistoryRef.current.shift()
      }
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        renderTime: renderTime
      }))
      
      // Log slow renders
      if (renderTime > 16.67) { // 60fps threshold
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`, {
          propsChanged,
          renderTime
        })
      }
    }
    
    if (props) {
      previousPropsRef.current = props
    }
  }, [componentName])

  // Memory usage monitoring
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage
        }))

        // Warn on high memory usage
        if (memoryUsage > 100) {
          console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`)
        }
      }
    }

    const interval = setInterval(updateMemoryUsage, 5000)
    updateMemoryUsage() // Initial check

    return () => clearInterval(interval)
  }, [])

  // Network performance monitoring
  useEffect(() => {
    let networkRequestCount = 0
    
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      networkRequestCount++
      const start = performance.now()
      
      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - start
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          networkRequests: networkRequestCount
        }))

        // Log slow network requests
        if (duration > 1000) {
          console.warn(`Slow network request: ${args[0]} took ${duration.toFixed(2)}ms`)
        }
        
        return response
      } catch (error) {
        console.error('Network request failed:', args[0], error)
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Query performance monitoring (for TanStack Query)
  const trackQuery = useCallback((queryKey: string, duration: number, fromCache: boolean) => {
    setMetrics(prev => {
      const newQueryCount = prev.queryCount + 1
      const newCacheHits = fromCache ? 1 : 0
      const totalCacheChecks = newQueryCount
      const newCacheHitRate = totalCacheChecks > 0 ? 
        ((prev.cacheHitRate * (prev.queryCount || 1)) + newCacheHits) / totalCacheChecks : 0
      
      return {
        ...prev,
        queryCount: newQueryCount,
        cacheHitRate: newCacheHitRate,
        slowQueries: duration > 1000 ? prev.slowQueries + 1 : prev.slowQueries
      }
    })

    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryKey} took ${duration.toFixed(2)}ms`)
    }
  }, [])

  // Virtual scrolling performance helper
  const trackVirtualScrolling = useCallback((visibleItems: number, totalItems: number) => {
    const efficiency = totalItems > 0 ? visibleItems / totalItems : 1
    
    if (efficiency < 0.1 && totalItems > 100) {
      console.info(`Virtual scrolling efficiency: ${(efficiency * 100).toFixed(1)}% (${visibleItems}/${totalItems})`)
    }
  }, [])

  // Bundle size monitoring
  useEffect(() => {
    const measureBundleSize = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        
        if (connection && connection.effectiveType) {
          console.info(`Network connection: ${connection.effectiveType}`, {
            downlink: connection.downlink,
            rtt: connection.rtt
          })
        }
      }

      // Measure initial page load time
      if (performance.timing) {
        const { navigationStart, loadEventEnd } = performance.timing
        const pageLoadTime = loadEventEnd - navigationStart
        
        if (pageLoadTime > 3000) {
          console.warn(`Slow page load: ${pageLoadTime}ms`)
        }
      }
    }

    // Measure after initial load
    setTimeout(measureBundleSize, 1000)
  }, [])

  const getRenderHistory = useCallback(() => {
    return renderHistoryRef.current.slice()
  }, [])

  const getSlowRenders = useCallback((threshold = 16.67) => {
    return renderHistoryRef.current.filter(render => render.renderTime > threshold)
  }, [])

  const clearMetrics = useCallback(() => {
    setMetrics({
      memoryUsage: 0,
      renderTime: 0,
      queryCount: 0,
      cacheHitRate: 0,
      networkRequests: 0,
      slowQueries: 0
    })
    renderHistoryRef.current = []
  }, [])

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    trackQuery,
    trackVirtualScrolling,
    getRenderHistory,
    getSlowRenders,
    clearMetrics
  }
}

// Utility function to compare props
function getChangedProps(prevProps: any, nextProps: any): string[] {
  if (!prevProps || !nextProps) return []
  
  const changedProps: string[] = []
  const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])
  
  for (const key of allKeys) {
    if (prevProps[key] !== nextProps[key]) {
      changedProps.push(key)
    }
  }
  
  return changedProps
}

// HOC for automatic performance tracking
// Note: This would need to be in a .tsx file to use JSX syntax
// For now, commenting out to avoid build errors
/*
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const { startRenderTimer, endRenderTimer } = usePerformanceMonitor(componentName || Component.name)
    
    useEffect(() => {
      startRenderTimer()
      return () => {
        endRenderTimer()
      }
    }, [])
    
    return <Component {...props} />
  }
  
  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.name})`
  return WrappedComponent
}
*/