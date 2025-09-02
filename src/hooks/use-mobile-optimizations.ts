// Mobile Optimizations Hook
// Handles touch gestures, viewport management, and mobile-specific features

import { useEffect, useState, useCallback } from 'react'

export interface MobileState {
  isMobile: boolean
  isTablet: boolean
  orientation: 'portrait' | 'landscape'
  hasTouch: boolean
  viewportSize: {
    width: number
    height: number
  }
}

export function useMobileOptimizations() {
  const [mobileState, setMobileState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    orientation: 'portrait',
    hasTouch: false,
    viewportSize: {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0
    }
  })

  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true)
  const [isPullToRefreshEnabled, setIsPullToRefreshEnabled] = useState(true)

  // Detect device type and capabilities
  const detectDevice = useCallback(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    const height = window.innerHeight
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    setMobileState({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      orientation: width > height ? 'landscape' : 'portrait',
      hasTouch,
      viewportSize: { width, height }
    })
  }, [])

  // Handle viewport changes
  useEffect(() => {
    detectDevice()

    const handleResize = () => {
      detectDevice()
    }

    const handleOrientationChange = () => {
      setTimeout(detectDevice, 100) // Small delay for accurate dimensions
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [detectDevice])

  // Prevent bounce scroll on iOS
  useEffect(() => {
    if (!mobileState.isMobile) return

    const preventBounce = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const scrollable = target.closest('.scrollable')
      
      if (!scrollable) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchmove', preventBounce, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventBounce)
    }
  }, [mobileState.isMobile])

  // Add viewport meta tag for proper mobile rendering
  useEffect(() => {
    if (typeof document === 'undefined') return

    let metaViewport = document.querySelector('meta[name="viewport"]')
    
    if (!metaViewport) {
      metaViewport = document.createElement('meta')
      metaViewport.setAttribute('name', 'viewport')
      document.head.appendChild(metaViewport)
    }

    metaViewport.setAttribute('content', 
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    )
  }, [])

  // Swipe gesture handler
  const useSwipeGesture = useCallback(({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50
  }: {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    onSwipeUp?: () => void
    onSwipeDown?: () => void
    threshold?: number
  }) => {
    useEffect(() => {
      if (!isSwipeEnabled || !mobileState.hasTouch) return

      let touchStartX = 0
      let touchStartY = 0
      let touchEndX = 0
      let touchEndY = 0

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.changedTouches[0].screenX
        touchStartY = e.changedTouches[0].screenY
      }

      const handleTouchEnd = (e: TouchEvent) => {
        touchEndX = e.changedTouches[0].screenX
        touchEndY = e.changedTouches[0].screenY
        handleSwipe()
      }

      const handleSwipe = () => {
        const deltaX = touchEndX - touchStartX
        const deltaY = touchEndY - touchStartY
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        if (absX > absY && absX > threshold) {
          if (deltaX > 0 && onSwipeRight) onSwipeRight()
          if (deltaX < 0 && onSwipeLeft) onSwipeLeft()
        } else if (absY > threshold) {
          if (deltaY > 0 && onSwipeDown) onSwipeDown()
          if (deltaY < 0 && onSwipeUp) onSwipeUp()
        }
      }

      document.addEventListener('touchstart', handleTouchStart)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }, [isSwipeEnabled, mobileState.hasTouch, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])
  }, [isSwipeEnabled, mobileState.hasTouch])

  // Pull to refresh handler
  const usePullToRefresh = useCallback((onRefresh: () => Promise<void>) => {
    useEffect(() => {
      if (!isPullToRefreshEnabled || !mobileState.hasTouch) return

      let touchStartY = 0
      let touchEndY = 0
      let isRefreshing = false

      const handleTouchStart = (e: TouchEvent) => {
        if (window.scrollY === 0) {
          touchStartY = e.touches[0].clientY
        }
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStartY || isRefreshing) return
        
        touchEndY = e.touches[0].clientY
        const pullDistance = touchEndY - touchStartY

        if (pullDistance > 100 && window.scrollY === 0) {
          isRefreshing = true
          onRefresh().finally(() => {
            isRefreshing = false
            touchStartY = 0
            touchEndY = 0
          })
        }
      }

      const handleTouchEnd = () => {
        touchStartY = 0
        touchEndY = 0
      }

      document.addEventListener('touchstart', handleTouchStart)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }, [isPullToRefreshEnabled, mobileState.hasTouch, onRefresh])
  }, [isPullToRefreshEnabled, mobileState.hasTouch])

  // Double tap handler
  const useDoubleTap = useCallback((onDoubleTap: () => void, delay = 300) => {
    useEffect(() => {
      if (!mobileState.hasTouch) return

      let lastTap = 0

      const handleTap = () => {
        const now = Date.now()
        if (now - lastTap < delay) {
          onDoubleTap()
        }
        lastTap = now
      }

      document.addEventListener('touchend', handleTap)

      return () => {
        document.removeEventListener('touchend', handleTap)
      }
    }, [mobileState.hasTouch, onDoubleTap, delay])
  }, [mobileState.hasTouch])

  return {
    ...mobileState,
    isSwipeEnabled,
    setIsSwipeEnabled,
    isPullToRefreshEnabled,
    setIsPullToRefreshEnabled,
    useSwipeGesture,
    usePullToRefresh,
    useDoubleTap
  }
}