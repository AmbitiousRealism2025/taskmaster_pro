/**
 * Performance Optimization Configuration
 * 
 * Central configuration for all performance optimizations
 */

export const PERFORMANCE_CONFIG = {
  // Virtual scrolling thresholds
  virtualScrolling: {
    enabled: true,
    minItemsForVirtualization: 50,
    overscan: 5, // Number of items to render outside viewport
    itemHeight: {
      task: 120,
      note: 200,
      project: 150,
      habit: 100,
    },
  },
  
  // Image optimization
  images: {
    lazyLoading: true,
    placeholderBlur: true,
    quality: 85,
    formats: ['webp', 'avif'],
    breakpoints: [640, 768, 1024, 1280, 1536],
  },
  
  // Code splitting
  codeSplitting: {
    enabled: true,
    prefetchDelay: 2000, // ms after page load
    chunkSizeLimit: 244, // KB
    vendorChunks: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'recharts',
      '@tiptap/react',
    ],
  },
  
  // Caching strategies
  caching: {
    apiCacheTime: 5 * 60 * 1000, // 5 minutes
    staticCacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    imageCacheTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    staleWhileRevalidate: true,
  },
  
  // Debounce/throttle timings
  timing: {
    searchDebounce: 300,
    saveDebounce: 1000,
    scrollThrottle: 100,
    resizeThrottle: 250,
    typeaheadDelay: 150,
  },
  
  // Bundle optimization
  bundle: {
    treeshaking: true,
    minify: true,
    sourceMaps: false,
    gzip: true,
    brotli: true,
  },
  
  // Monitoring thresholds
  monitoring: {
    slowApiThreshold: 3000, // ms
    slowRenderThreshold: 16, // ms (60fps)
    memoryWarningThreshold: 100, // MB
    bundleSizeWarning: 500, // KB
  },
  
  // Prefetching strategy
  prefetch: {
    enabled: true,
    strategy: 'viewport', // 'viewport' | 'hover' | 'none'
    linkPrefetchDelay: 100,
    routePrefetchDelay: 2000,
  },
  
  // Web Workers
  workers: {
    enabled: true,
    heavyComputationThreshold: 100, // ms
    workerPoolSize: 4,
  },
}

/**
 * Performance budgets for monitoring
 */
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  vitals: {
    LCP: 2500, // Largest Contentful Paint
    FID: 100, // First Input Delay  
    CLS: 0.1, // Cumulative Layout Shift
    FCP: 1800, // First Contentful Paint
    TTFB: 800, // Time to First Byte
  },
  
  // Bundle size budgets (KB)
  bundles: {
    main: 200,
    vendor: 300,
    total: 600,
    perRoute: 100,
  },
  
  // Resource budgets
  resources: {
    scripts: 500,
    styles: 100,
    images: 1000,
    fonts: 100,
    total: 2000,
  },
  
  // Performance metrics
  metrics: {
    pageLoadTime: 3000,
    apiResponseTime: 1000,
    renderTime: 16,
    memoryUsage: 100,
  },
}

/**
 * Get optimization level based on device capabilities
 */
export function getOptimizationLevel(): 'low' | 'medium' | 'high' {
  if (typeof window === 'undefined') return 'medium'
  
  // Check connection speed
  const connection = (navigator as any).connection
  if (connection) {
    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'low'
    if (effectiveType === '3g') return 'medium'
  }
  
  // Check device memory
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory) {
    if (deviceMemory < 4) return 'low'
    if (deviceMemory < 8) return 'medium'
  }
  
  // Check hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency) {
    if (navigator.hardwareConcurrency < 4) return 'low'
    if (navigator.hardwareConcurrency < 8) return 'medium'
  }
  
  return 'high'
}

/**
 * Adaptive performance configuration based on device
 */
export function getAdaptiveConfig() {
  const level = getOptimizationLevel()
  
  switch (level) {
    case 'low':
      return {
        ...PERFORMANCE_CONFIG,
        virtualScrolling: {
          ...PERFORMANCE_CONFIG.virtualScrolling,
          overscan: 2,
        },
        images: {
          ...PERFORMANCE_CONFIG.images,
          quality: 70,
        },
        prefetch: {
          ...PERFORMANCE_CONFIG.prefetch,
          enabled: false,
        },
        workers: {
          ...PERFORMANCE_CONFIG.workers,
          enabled: false,
        },
      }
    
    case 'medium':
      return {
        ...PERFORMANCE_CONFIG,
        virtualScrolling: {
          ...PERFORMANCE_CONFIG.virtualScrolling,
          overscan: 3,
        },
        images: {
          ...PERFORMANCE_CONFIG.images,
          quality: 80,
        },
      }
    
    case 'high':
    default:
      return PERFORMANCE_CONFIG
  }
}