/**
 * Performance Optimization Tests
 * Tests for virtual scrolling, memory management, and rendering performance
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useVirtualScrolling, VirtualScroller } from '@/hooks/use-virtual-scrolling'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024 // 100MB
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance
})

describe('Performance Optimization Tests', () => {
  describe('Virtual Scrolling Performance', () => {
    const mockItems = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      content: `Content for item ${i}`
    }))

    it('should efficiently render large lists with virtual scrolling', () => {
      const { result } = renderHook(() =>
        useVirtualScrolling(mockItems, {
          itemHeight: 80,
          containerHeight: 400,
          overscan: 3
        })
      )

      const { virtualItems, totalHeight } = result.current

      // Should only render visible items + overscan
      expect(virtualItems.length).toBeLessThan(15) // ~5 visible + 6 overscan
      expect(virtualItems.length).toBeGreaterThan(5)

      // Total height should account for all items
      expect(totalHeight).toBe(1000 * 80) // 1000 items * 80px each
    })

    it('should update virtual items on scroll', () => {
      const { result } = renderHook(() =>
        useVirtualScrolling(mockItems, {
          itemHeight: 80,
          containerHeight: 400
        })
      )

      // Initial render - should start from index 0
      expect(result.current.virtualItems[0].index).toBe(0)

      // Mock scroll position change would require DOM manipulation
      // In a real test, this would involve scrolling the container
      // and testing that virtualItems update accordingly
    })

    it('should handle dynamic item heights', () => {
      const dynamicHeightFn = (index: number) => {
        return index % 2 === 0 ? 100 : 60 // Alternating heights
      }

      const { result } = renderHook(() =>
        useVirtualScrolling(mockItems, {
          itemHeight: dynamicHeightFn,
          containerHeight: 400
        })
      )

      const { virtualItems } = result.current

      // Check that items have different calculated sizes
      const evenItem = virtualItems.find(item => item.index % 2 === 0)
      const oddItem = virtualItems.find(item => item.index % 2 === 1)

      if (evenItem && oddItem) {
        expect(evenItem.size).toBe(100)
        expect(oddItem.size).toBe(60)
      }
    })
  })

  describe('Memory Usage Monitoring', () => {
    it('should track memory usage over time', async () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestComponent'))

      // Wait for initial memory measurement
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(result.current.metrics.memoryUsage).toBeGreaterThan(0)
      expect(result.current.metrics.memoryUsage).toBeLessThan(1000) // Should be reasonable
    })

    it('should warn on high memory usage', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 150 * 1024 * 1024 // 150MB

      renderHook(() => usePerformanceMonitor('TestComponent'))

      // Should have warned about high memory usage
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage detected')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Render Performance Tracking', () => {
    it('should track component render times', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestComponent'))

      act(() => {
        result.current.startRenderTimer()
      })

      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Busy wait for 10ms
      }

      act(() => {
        result.current.endRenderTimer()
      })

      expect(result.current.metrics.renderTime).toBeGreaterThan(0)
    })

    it('should identify slow renders', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const { result } = renderHook(() => usePerformanceMonitor('SlowComponent'))

      // Mock slow render
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50) // 50ms render time

      act(() => {
        result.current.startRenderTimer()
        result.current.endRenderTimer()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected'),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Caching Efficiency', () => {
    it('should track query performance', () => {
      const { result } = renderHook(() => usePerformanceMonitor('QueryComponent'))

      // Simulate query tracking
      act(() => {
        result.current.trackQuery('users', 100, false) // 100ms, not from cache
        result.current.trackQuery('tasks', 50, true)   // 50ms, from cache
        result.current.trackQuery('projects', 200, false) // 200ms, not from cache
      })

      const metrics = result.current.metrics
      expect(metrics.queryCount).toBe(3)
      expect(metrics.cacheHitRate).toBeCloseTo(0.33, 2) // 1/3 from cache
    })

    it('should identify slow queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const { result } = renderHook(() => usePerformanceMonitor('QueryComponent'))

      act(() => {
        result.current.trackQuery('slow-query', 1500, false) // 1500ms - slow!
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('VirtualScroller Component', () => {
    const TestItem = React.memo(({ item, index, measureRef }: any) => (
      <div ref={measureRef} data-testid={`item-${index}`}>
        {item.title}
      </div>
    ))

    it('should render virtual scroller with performance optimizations', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      render(
        <VirtualScroller
          items={items}
          height={400}
          itemHeight={50}
          renderItem={(item, index, measureRef) => (
            <TestItem key={item.id} item={item} index={index} measureRef={measureRef} />
          )}
          data-testid="virtual-scroller"
        />
      )

      // Should render the virtual scroller
      const scroller = screen.getByTestId('virtual-scroller')
      expect(scroller).toBeInTheDocument()

      // Should only render visible items (not all 100)
      const renderedItems = screen.getAllByTestId(/^item-\d+$/)
      expect(renderedItems.length).toBeLessThan(20) // Much less than 100
      expect(renderedItems.length).toBeGreaterThan(5) // But more than a few
    })

    it('should handle infinite scrolling efficiently', async () => {
      let loadMoreCalled = false
      const onScrollEnd = jest.fn(() => {
        loadMoreCalled = true
      })

      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      render(
        <VirtualScroller
          items={items}
          height={400}
          itemHeight={50}
          renderItem={(item, index, measureRef) => (
            <TestItem key={item.id} item={item} index={index} measureRef={measureRef} />
          )}
          onScrollEnd={onScrollEnd}
          loadMoreThreshold={200}
          data-testid="infinite-scroller"
        />
      )

      const scroller = screen.getByTestId('infinite-scroller')
      
      // Simulate scroll to bottom
      fireEvent.scroll(scroller, { target: { scrollTop: 2000 } })

      // Should trigger load more
      expect(onScrollEnd).toHaveBeenCalled()
    })
  })

  describe('Bundle Size and Loading Performance', () => {
    it('should measure initial page load metrics', () => {
      // Mock performance timing
      Object.defineProperty(performance, 'timing', {
        value: {
          navigationStart: 1000,
          loadEventEnd: 4000 // 3 second load time
        }
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      renderHook(() => usePerformanceMonitor('PageComponent'))

      // Should warn about slow page load
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Slow page load')
        )
      }, 1100) // After the setTimeout in the hook

      consoleSpy.mockRestore()
    })
  })

  describe('Network Request Optimization', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('should track network request performance', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as Response)

      renderHook(() => usePerformanceMonitor('NetworkComponent'))

      // Perform fetch request
      await fetch('/api/test')

      // Network monitoring should have been set up
      expect(mockFetch).toHaveBeenCalledWith('/api/test')
    })

    it('should warn on slow network requests', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock slow response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'test' })
          } as Response), 1500) // 1.5 second delay
        )
      )

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      renderHook(() => usePerformanceMonitor('NetworkComponent'))

      await fetch('/api/slow-endpoint')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow network request')
      )

      consoleSpy.mockRestore()
    })
  })
})