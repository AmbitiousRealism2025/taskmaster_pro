import { useCallback, useEffect, useRef } from 'react'

// Hook for screen reader announcements
export function useScreenReader() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div')
      liveRegion.id = 'screen-reader-announcements'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
      liveRegionRef.current = liveRegion
    }

    return () => {
      // Cleanup on unmount
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current)
      }
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority)
      liveRegionRef.current.textContent = message
      
      // Clear after announcement to allow repeated announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  return announce
}

// Hook for focus management in modal dialogs
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Store current focus
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Focus first element
    firstElement.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab - focus previous
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab - focus next
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus when closing
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isOpen])

  return containerRef
}

// Hook for live region announcements
export function useLiveRegion() {
  const announce = useScreenReader()
  
  const announceStatusChange = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  const announceError = useCallback((message: string) => {
    announce(`Error: ${message}`, 'assertive')
  }, [announce])

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite')
  }, [announce])

  const announceLoading = useCallback((message: string = 'Loading') => {
    announce(message, 'polite')
  }, [announce])

  return {
    announce,
    announceStatusChange,
    announceError,
    announceSuccess,
    announceLoading
  }
}

// Hook for managing skip links
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null)

  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView()
    }
  }, [])

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav[aria-label="Main navigation"]')
    if (navigation) {
      (navigation as HTMLElement).focus()
      navigation.scrollIntoView()
    }
  }, [])

  return {
    skipLinksRef,
    skipToContent,
    skipToNavigation
  }
}

// Hook for reduced motion preferences
export function useReducedMotion() {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false

  return prefersReducedMotion
}