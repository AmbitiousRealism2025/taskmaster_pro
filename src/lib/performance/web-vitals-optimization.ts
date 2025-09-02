/**
 * Core Web Vitals Optimization Configuration
 * Implements performance optimizations to achieve "good" ratings
 */

// Core Web Vitals target thresholds for "good" rating
export const CORE_WEB_VITALS_TARGETS = {
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms) 
  CLS: 0.1,   // Cumulative Layout Shift
  FCP: 1800,  // First Contentful Paint (ms)
  TTFB: 600,  // Time to First Byte (ms)
  INP: 200    // Interaction to Next Paint (ms)
}

/**
 * Preload critical resources for faster loading
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  // Preload critical CSS
  const criticalStyles = [
    '/globals.css'
  ]

  criticalStyles.forEach(href => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })

  // DNS prefetch for external domains
  const domains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ]

  domains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = `//${domain}`
    document.head.appendChild(link)
  })
}

/**
 * Optimize images for better LCP
 */
export function optimizeImages() {
  if (typeof window === 'undefined') return

  const images = document.querySelectorAll('img')
  
  images.forEach(img => {
    // Add loading="lazy" for non-critical images
    if (!img.hasAttribute('priority')) {
      img.loading = 'lazy'
    }
    
    // Add decoding="async" for non-blocking image decoding
    img.decoding = 'async'
  })
}

/**
 * Reduce Cumulative Layout Shift
 */
export function reduceLayoutShift() {
  if (typeof window === 'undefined') return

  // Add aspect ratio containers for images and videos
  const mediaElements = document.querySelectorAll('img, video, iframe')
  
  mediaElements.forEach(element => {
    const parent = element.parentElement
    if (parent && !parent.style.aspectRatio) {
      // Calculate aspect ratio if dimensions are available
      const width = element.getAttribute('width')
      const height = element.getAttribute('height')
      
      if (width && height) {
        parent.style.aspectRatio = `${width} / ${height}`
      }
    }
  })

  // Reserve space for dynamic content
  const dynamicContainers = document.querySelectorAll('[data-dynamic-content]')
  dynamicContainers.forEach(container => {
    if (!container.style.minHeight) {
      container.style.minHeight = container.getAttribute('data-min-height') || '100px'
    }
  })
}

/**
 * Improve First Input Delay through code splitting
 */
export function improveResponsiveness() {
  if (typeof window === 'undefined') return

  // Use scheduler.postTask if available for better task scheduling
  const scheduleTask = (callback: () => void, priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible') => {
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      ;(window as any).scheduler.postTask(callback, { priority })
    } else if ('requestIdleCallback' in window) {
      requestIdleCallback(callback)
    } else {
      setTimeout(callback, 0)
    }
  }

  // Defer non-critical JavaScript execution
  const deferredTasks = [
    () => console.log('Deferred: Analytics initialization'),
    () => console.log('Deferred: Third-party widgets'),
    () => console.log('Deferred: Non-essential features')
  ]

  deferredTasks.forEach(task => {
    scheduleTask(task, 'background')
  })
}

/**
 * Optimize Time to First Byte
 */
export function optimizeTTFB() {
  // Enable service worker for caching
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration.scope)
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  }
}

/**
 * Initialize all Core Web Vitals optimizations
 */
export function initCoreWebVitalsOptimizations() {
  if (typeof window === 'undefined') return

  // Run immediately
  preloadCriticalResources()

  // Run on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeImages()
      reduceLayoutShift()
      improveResponsiveness()
    })
  } else {
    optimizeImages()
    reduceLayoutShift()
    improveResponsiveness()
  }

  // Run on window load
  window.addEventListener('load', () => {
    optimizeTTFB()
  })
}

/**
 * Performance observer for monitoring Core Web Vitals
 */
export function monitorCoreWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  // Monitor LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number }
      
      const lcp = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime
      
      if (lcp > CORE_WEB_VITALS_TARGETS.LCP) {
        console.warn(`LCP optimization needed: ${Math.round(lcp)}ms > ${CORE_WEB_VITALS_TARGETS.LCP}ms`)
      }
    })
    
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (error) {
    console.log('LCP observation not supported')
  }

  // Monitor CLS
  try {
    const clsObserver = new PerformanceObserver((list) => {
      let cumulativeScore = 0
      
      list.getEntries().forEach((entry: any) => {
        if (entry.hadRecentInput) return
        cumulativeScore += entry.value
      })
      
      if (cumulativeScore > CORE_WEB_VITALS_TARGETS.CLS) {
        console.warn(`CLS optimization needed: ${cumulativeScore.toFixed(3)} > ${CORE_WEB_VITALS_TARGETS.CLS}`)
      }
    })
    
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch (error) {
    console.log('CLS observation not supported')
  }

  // Monitor long tasks that affect FID/INP
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn(`Long task detected: ${Math.round(entry.duration)}ms`)
        }
      })
    })
    
    longTaskObserver.observe({ type: 'longtask', buffered: true })
  } catch (error) {
    console.log('Long task observation not supported')
  }
}