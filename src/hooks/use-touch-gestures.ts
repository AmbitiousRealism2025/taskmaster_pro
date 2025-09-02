import { useCallback, useRef, useState } from 'react'

export interface SwipeConfig {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  threshold?: number // minimum distance for swipe (default: 50px)
  longPressDelay?: number // ms for long press (default: 500ms)
}

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export interface GestureHandlers {
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  isGesturing: boolean
}

export function useSwipeGestures(config: SwipeConfig = {}): GestureHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold = 50,
    longPressDelay = 500
  } = config

  const [isGesturing, setIsGesturing] = useState(false)
  const startPointRef = useRef<TouchPoint | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout>()

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 1) return

    const touch = event.touches[0]
    startPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }

    setIsGesturing(true)

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress()
        setIsGesturing(false)
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    // Cancel long press on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }
  }, [])

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!startPointRef.current) return

    // Cancel long press
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }

    const touch = event.changedTouches[0]
    const endPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }

    const deltaX = endPoint.x - startPointRef.current.x
    const deltaY = endPoint.y - startPointRef.current.y
    const duration = endPoint.timestamp - startPointRef.current.timestamp

    // Ignore very short touches or very slow gestures
    if (duration < 50 || duration > 1000) {
      setIsGesturing(false)
      startPointRef.current = null
      return
    }

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Check if movement exceeds threshold
    if (absX > threshold || absY > threshold) {
      // Determine primary direction
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }

    setIsGesturing(false)
    startPointRef.current = null
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isGesturing
  }
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => void, threshold: number = 100) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef<number>(0)
  const isAtTopRef = useRef<boolean>(false)

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    isAtTopRef.current = scrollTop === 0
    startYRef.current = event.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isAtTopRef.current || isRefreshing) return

    const currentY = event.touches[0].clientY
    const deltaY = currentY - startYRef.current

    if (deltaY > 0) {
      // Prevent default scrolling when pulling down
      event.preventDefault()
      setPullDistance(Math.min(deltaY, threshold * 1.5))
    }
  }, [isRefreshing, threshold])

  const onTouchEnd = useCallback(() => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      onRefresh()
      
      // Auto-hide refresh indicator after 2 seconds
      setTimeout(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      }, 2000)
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRefreshing,
    pullDistance,
    shouldShowIndicator: pullDistance > 0 || isRefreshing
  }
}

// Hook for touch-optimized interactions
export function useTouchOptimization() {
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  const getOptimalTouchTarget = useCallback((baseSize: number) => {
    // iOS HIG recommends minimum 44px touch targets
    // Material Design recommends 48dp (48px at 1x density)
    const minTouchTarget = 44
    return Math.max(baseSize, minTouchTarget)
  }, [])

  const addHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    // Use Haptic API if available (iOS Safari)
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  return {
    isTouchDevice,
    getOptimalTouchTarget,
    addHapticFeedback
  }
}