import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface VirtualScrollingOptions {
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  overscan?: number // Number of items to render outside viewport
  scrollingDelay?: number // Debounce delay for scroll events
}

interface VirtualScrollingResult {
  virtualItems: VirtualItem[]
  totalHeight: number
  scrollElementRef: React.RefObject<HTMLElement>
  measureElement: (index: number, element: HTMLElement) => void
}

interface VirtualItem {
  index: number
  start: number
  size: number
  end: number
  measureRef: React.RefCallback<HTMLElement>
}

export function useVirtualScrolling<T>(
  items: T[],
  options: VirtualScrollingOptions
): VirtualScrollingResult {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    scrollingDelay = 150
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollElementRef = useRef<HTMLElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Store measured heights for dynamic sizing
  const [measuredSizes, setMeasuredSizes] = useState<Map<number, number>>(new Map())

  const getItemSize = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return itemHeight
    }
    
    // Check if we have a measured size
    const measured = measuredSizes.get(index)
    if (measured !== undefined) {
      return measured
    }
    
    // Fall back to function
    return itemHeight(index)
  }, [itemHeight, measuredSizes])

  const totalHeight = useMemo(() => {
    let height = 0
    for (let i = 0; i < items.length; i++) {
      height += getItemSize(i)
    }
    return height
  }, [items.length, getItemSize])

  const virtualItems = useMemo(() => {
    if (!items.length) return []

    const startIndex = Math.max(0, 
      Math.floor(scrollTop / (typeof itemHeight === 'number' ? itemHeight : 50)) - overscan
    )
    
    let endIndex = startIndex
    let accumulatedHeight = 0
    
    // Calculate visible items
    for (let i = startIndex; i < items.length; i++) {
      const size = getItemSize(i)
      accumulatedHeight += size
      endIndex = i
      
      if (accumulatedHeight >= containerHeight + (overscan * 2 * size)) {
        break
      }
    }

    endIndex = Math.min(items.length - 1, endIndex + overscan)

    const virtualItems: VirtualItem[] = []
    let start = 0

    // Calculate start position for first visible item
    for (let i = 0; i < startIndex; i++) {
      start += getItemSize(i)
    }

    // Create virtual items
    for (let i = startIndex; i <= endIndex; i++) {
      const size = getItemSize(i)
      
      virtualItems.push({
        index: i,
        start,
        size,
        end: start + size,
        measureRef: (element) => measureElement(i, element)
      })
      
      start += size
    }

    return virtualItems
  }, [scrollTop, items.length, containerHeight, overscan, getItemSize])

  const measureElement = useCallback((index: number, element: HTMLElement | null) => {
    if (!element) return

    const { height } = element.getBoundingClientRect()
    
    setMeasuredSizes(prev => {
      const newSizes = new Map(prev)
      const currentSize = newSizes.get(index)
      
      // Only update if size changed significantly
      if (!currentSize || Math.abs(currentSize - height) > 1) {
        newSizes.set(index, height)
        return newSizes
      }
      
      return prev
    })
  }, [])

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement
    if (!target) return

    const newScrollTop = target.scrollTop
    setScrollTop(newScrollTop)
    setIsScrolling(true)

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Set scrolling to false after delay
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, scrollingDelay)
  }, [scrollingDelay])

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])

  // Performance tracking
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const visibleItems = virtualItems.length
      const efficiency = items.length > 0 ? visibleItems / items.length : 1
      
      if (efficiency < 0.2 && items.length > 50) {
        console.info(`Virtual scrolling efficiency: ${(efficiency * 100).toFixed(1)}%`, {
          visible: visibleItems,
          total: items.length,
          scrollTop,
          isScrolling
        })
      }
    }
  }, [virtualItems.length, items.length, scrollTop, isScrolling])

  return {
    virtualItems,
    totalHeight,
    scrollElementRef,
    measureElement
  }
}

// Component wrapper for virtual scrolling
interface VirtualScrollerProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number, measureRef: React.RefCallback<HTMLElement>) => React.ReactNode
  className?: string
  overscan?: number
  onScrollEnd?: () => void
  loadMoreThreshold?: number
}

export function VirtualScroller<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscan = 3,
  onScrollEnd,
  loadMoreThreshold = 100
}: VirtualScrollerProps<T>) {
  const { virtualItems, totalHeight, scrollElementRef } = useVirtualScrolling(items, {
    itemHeight,
    containerHeight: height,
    overscan
  })

  const [scrollTop, setScrollTop] = useState(0)

  // Handle infinite loading
  useEffect(() => {
    if (!onScrollEnd || !loadMoreThreshold) return

    const shouldLoadMore = totalHeight - (scrollTop + height) < loadMoreThreshold
    
    if (shouldLoadMore) {
      onScrollEnd()
    }
  }, [scrollTop, totalHeight, height, loadMoreThreshold, onScrollEnd])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return (
    <div
      ref={scrollElementRef as React.RefObject<HTMLDivElement>}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          if (!item) return null

          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                left: 0,
                right: 0,
                height: virtualItem.size
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem.measureRef)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Hook for infinite scrolling with virtual scrolling
export function useInfiniteVirtualScrolling<T>(
  fetchMore: () => Promise<T[]>,
  options: VirtualScrollingOptions & {
    threshold?: number
    enabled?: boolean
  }
) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const { threshold = 100, enabled = true, ...virtualOptions } = options

  const { virtualItems, totalHeight, scrollElementRef, measureElement } = useVirtualScrolling(
    items,
    virtualOptions
  )

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !enabled) return

    setIsLoading(true)
    
    try {
      const newItems = await fetchMore()
      
      if (newItems.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...newItems])
      }
    } catch (error) {
      console.error('Failed to load more items:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchMore, isLoading, hasMore, enabled])

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget
    const shouldLoadMore = 
      target.scrollHeight - target.scrollTop - target.clientHeight < threshold

    if (shouldLoadMore && !isLoading && hasMore) {
      loadMore()
    }
  }, [loadMore, threshold, isLoading, hasMore])

  return {
    items,
    setItems,
    virtualItems,
    totalHeight,
    scrollElementRef,
    measureElement,
    isLoading,
    hasMore,
    loadMore,
    handleScroll
  }
}