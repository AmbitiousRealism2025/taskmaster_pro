import { useCallback, useEffect, useRef } from 'react'

export interface NavigationConfig {
  direction?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
  enableSearch?: boolean
  onSelect?: (index: number) => void
  onActivate?: (index: number) => void
  onEscape?: () => void
}

export interface KeyHandlers {
  currentIndex: number
  setCurrentIndex: (index: number) => void
  handleKeyDown: (event: React.KeyboardEvent) => void
  itemProps: (index: number) => {
    tabIndex: number
    'aria-selected': boolean
    onKeyDown: (event: React.KeyboardEvent) => void
  }
}

export function useKeyboardNavigation(
  itemCount: number,
  config: NavigationConfig = {}
): KeyHandlers {
  const {
    direction = 'both',
    wrap = true,
    enableSearch = false,
    onSelect,
    onActivate,
    onEscape
  } = config

  const currentIndexRef = useRef(0)
  const searchQueryRef = useRef('')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const setCurrentIndex = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      currentIndexRef.current = index
      onSelect?.(index)
    }
  }, [itemCount, onSelect])

  const moveIndex = useCallback((delta: number) => {
    let newIndex = currentIndexRef.current + delta
    
    if (wrap) {
      newIndex = ((newIndex % itemCount) + itemCount) % itemCount
    } else {
      newIndex = Math.max(0, Math.min(newIndex, itemCount - 1))
    }
    
    setCurrentIndex(newIndex)
  }, [itemCount, wrap, setCurrentIndex])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = event

    // Handle escape
    if (key === 'Escape') {
      onEscape?.()
      return
    }

    // Handle navigation keys
    switch (key) {
      case 'ArrowDown':
        if (direction !== 'horizontal') {
          event.preventDefault()
          moveIndex(1)
        }
        break

      case 'ArrowUp':
        if (direction !== 'horizontal') {
          event.preventDefault()
          moveIndex(-1)
        }
        break

      case 'ArrowRight':
        if (direction !== 'vertical') {
          event.preventDefault()
          moveIndex(1)
        }
        break

      case 'ArrowLeft':
        if (direction !== 'vertical') {
          event.preventDefault()
          moveIndex(-1)
        }
        break

      case 'Home':
        event.preventDefault()
        setCurrentIndex(0)
        break

      case 'End':
        event.preventDefault()
        setCurrentIndex(itemCount - 1)
        break

      case 'PageDown':
        event.preventDefault()
        moveIndex(10)
        break

      case 'PageUp':
        event.preventDefault()
        moveIndex(-10)
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        onActivate?.(currentIndexRef.current)
        break

      default:
        // Handle type-ahead search
        if (enableSearch && !ctrlKey && !metaKey && !altKey && key.length === 1) {
          searchQueryRef.current += key.toLowerCase()
          
          // Clear previous timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
          }
          
          // Clear search after 1 second
          searchTimeoutRef.current = setTimeout(() => {
            searchQueryRef.current = ''
          }, 1000)
          
          // TODO: Implement search functionality
          // This would require search data to be passed in
        }
        break
    }
  }, [direction, moveIndex, setCurrentIndex, itemCount, onActivate, onEscape, enableSearch])

  const itemProps = useCallback((index: number) => ({
    tabIndex: index === currentIndexRef.current ? 0 : -1,
    'aria-selected': index === currentIndexRef.current,
    onKeyDown: handleKeyDown
  }), [handleKeyDown])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    currentIndex: currentIndexRef.current,
    setCurrentIndex,
    handleKeyDown,
    itemProps
  }
}