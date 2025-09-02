'use client'

import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ArrowDown } from 'lucide-react'
import { usePullToRefresh, useTouchOptimization } from '@/hooks/use-touch-gestures'
import { useLiveRegion } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  threshold?: number
  disabled?: boolean
  className?: string
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80, 
  disabled = false,
  className 
}: PullToRefreshProps) {
  const { announceStatusChange } = useLiveRegion()
  const { addHapticFeedback, isTouchDevice } = useTouchOptimization()

  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRefreshing,
    pullDistance,
    shouldShowIndicator
  } = usePullToRefresh(async () => {
    if (disabled) return
    
    if (isTouchDevice()) {
      addHapticFeedback('medium')
    }
    
    announceStatusChange('Refreshing content')
    
    try {
      await onRefresh()
      announceStatusChange('Content refreshed successfully')
    } catch (error) {
      announceStatusChange('Failed to refresh content')
    }
  }, threshold)

  const refreshProgress = Math.min(pullDistance / threshold, 1)
  const shouldTrigger = pullDistance >= threshold

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {shouldShowIndicator && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ 
              y: Math.min(pullDistance - 40, 20), 
              opacity: refreshProgress 
            }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-0 left-1/2 z-10 flex items-center justify-center w-12 h-12 bg-brand-primary text-white rounded-full shadow-lg transform -translate-x-1/2"
            role="status"
            aria-label={isRefreshing ? "Refreshing content" : shouldTrigger ? "Release to refresh" : "Pull to refresh"}
          >
            {isRefreshing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ 
                  rotate: shouldTrigger ? 180 : 0,
                  scale: refreshProgress * 0.3 + 0.7
                }}
                transition={{ duration: 0.2 }}
              >
                <ArrowDown className="h-5 w-5" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator text */}
      <AnimatePresence>
        {shouldShowIndicator && !isRefreshing && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ 
              y: Math.min(pullDistance - 10, 50), 
              opacity: refreshProgress 
            }}
            exit={{ y: -30, opacity: 0 }}
            className="absolute top-16 left-1/2 z-10 transform -translate-x-1/2"
          >
            <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
              {shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading message for screen readers */}
      {isRefreshing && (
        <div className="sr-only" aria-live="polite">
          Refreshing content, please wait
        </div>
      )}

      {/* Content */}
      <motion.div
        animate={{ 
          y: isRefreshing ? 20 : 0,
          scale: isRefreshing ? 0.98 : 1
        }}
        transition={{ duration: 0.3 }}
        style={{
          transform: !isRefreshing && pullDistance > 0 
            ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` 
            : undefined
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export default PullToRefresh