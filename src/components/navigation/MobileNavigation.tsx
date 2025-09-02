'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderOpen, 
  StickyNote,
  Calendar,
  BarChart3,
  Target,
  Plus,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLiveRegion } from '@/hooks/use-accessibility'
import { useTouchOptimization } from '@/hooks/use-touch-gestures'

const modules = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    shortName: 'Home'
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    shortName: 'Tasks',
    badge: 5 // Example badge count
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
    shortName: 'Projects'
  },
  {
    name: 'Notes',
    href: '/notes',
    icon: StickyNote,
    shortName: 'Notes'
  },
  {
    name: 'Focus',
    href: '/focus',
    icon: Target,
    shortName: 'Focus'
  }
]

interface MobileNavigationProps {
  className?: string
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const pathname = usePathname()
  const { announceStatusChange } = useLiveRegion()
  const { addHapticFeedback, isTouchDevice } = useTouchOptimization()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const handleNavigation = (module: typeof modules[0]) => {
    if (isTouchDevice()) {
      addHapticFeedback('light')
    }
    announceStatusChange(`Navigating to ${module.name}`)
  }

  const handleQuickAdd = () => {
    if (isTouchDevice()) {
      addHapticFeedback('medium')
    }
    setShowQuickAdd(!showQuickAdd)
    announceStatusChange(showQuickAdd ? 'Closed quick actions' : 'Opened quick actions')
  }

  return (
    <>
      {/* Bottom Tab Bar - Mobile Navigation */}
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t md:hidden",
          className
        )}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = pathname.startsWith(module.href)
            
            return (
              <Link
                key={module.name}
                href={module.href}
                onClick={() => handleNavigation(module)}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 text-xs font-medium transition-colors duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 touch-target",
                  isActive 
                    ? "text-brand-primary bg-brand-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${module.name}${module.badge ? ` (${module.badge} items)` : ''}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
                  {module.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                      aria-label={`${module.badge} new items`}
                    >
                      {module.badge}
                    </Badge>
                  )}
                </div>
                <span className="truncate max-w-full">{module.shortName}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute -top-1 left-1/2 w-1 h-1 bg-brand-primary rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    layoutId="mobile-nav-indicator"
                  />
                )}
              </Link>
            )
          })}
          
          {/* Quick Add Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickAdd}
            className={cn(
              "relative flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 text-xs font-medium transition-colors duration-200 focus-visible:ring-brand-primary touch-target",
              showQuickAdd && "text-brand-primary bg-brand-primary/10"
            )}
            aria-label="Quick add menu"
            aria-expanded={showQuickAdd}
          >
            <motion.div
              animate={{ rotate: showQuickAdd ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-5 w-5 mb-1" aria-hidden="true" />
            </motion.div>
            <span className="truncate">Add</span>
          </Button>
        </div>
      </nav>

      {/* Quick Add Menu */}
      <AnimatePresence>
        {showQuickAdd && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm md:hidden"
              onClick={() => setShowQuickAdd(false)}
            />
            
            {/* Quick Add Panel */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-4 right-4 z-50 bg-card border rounded-xl p-4 shadow-lg md:hidden"
              role="dialog"
              aria-label="Quick add menu"
            >
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 touch-target focus-visible:ring-brand-primary"
                  onClick={() => {
                    setShowQuickAdd(false)
                    if (isTouchDevice()) addHapticFeedback('light')
                    announceStatusChange('Quick add task')
                  }}
                >
                  <CheckSquare className="h-5 w-5 mb-2" />
                  <span className="text-xs">New Task</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 touch-target focus-visible:ring-brand-primary"
                  onClick={() => {
                    setShowQuickAdd(false)
                    if (isTouchDevice()) addHapticFeedback('light')
                    announceStatusChange('Quick add note')
                  }}
                >
                  <StickyNote className="h-5 w-5 mb-2" />
                  <span className="text-xs">New Note</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 touch-target focus-visible:ring-brand-primary"
                  onClick={() => {
                    setShowQuickAdd(false)
                    if (isTouchDevice()) addHapticFeedback('light')
                    announceStatusChange('Quick add project')
                  }}
                >
                  <FolderOpen className="h-5 w-5 mb-2" />
                  <span className="text-xs">New Project</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 touch-target focus-visible:ring-brand-primary"
                  onClick={() => {
                    setShowQuickAdd(false)
                    if (isTouchDevice()) addHapticFeedback('light')
                    announceStatusChange('Start focus session')
                  }}
                >
                  <Target className="h-5 w-5 mb-2" />
                  <span className="text-xs">Focus</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileNavigation