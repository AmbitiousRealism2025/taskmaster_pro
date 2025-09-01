'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, CheckSquare, StickyNote, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const quickActions = [
  {
    id: 'new-task',
    label: 'New Task',
    icon: CheckSquare,
    href: '/tasks/new',
    shortcut: 'T'
  },
  {
    id: 'quick-note',
    label: 'Quick Note',
    icon: StickyNote,
    href: '/notes/new',
    shortcut: 'N'
  },
  {
    id: 'start-timer',
    label: 'Start Timer',
    icon: Clock,
    action: () => {
      // Start focus timer
    },
    shortcut: 'S'
  },
  {
    id: 'focus-mode',
    label: 'Focus Mode',
    icon: Zap,
    href: '/focus',
    shortcut: 'F'
  }
]

export function QuickActions() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Don't show on certain pages
  const hiddenPaths = ['/focus', '/onboarding']
  if (hiddenPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
              "bg-gradient-to-r from-brand-primary to-brand-secondary",
              "hover:shadow-xl hover:scale-105",
              isOpen && "rotate-45"
            )}
          >
            <Plus className="h-6 w-6 text-white" />
            <span className="sr-only">Quick actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <p className="text-sm font-medium mb-2">Quick Actions</p>
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <div key={action.id}>
                  <DropdownMenuItem 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      if (action.action) {
                        action.action()
                      } else if (action.href) {
                        window.location.href = action.href
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </div>
                    <kbd className="ml-auto text-xs text-muted-foreground">
                      ⌘{action.shortcut}
                    </kbd>
                  </DropdownMenuItem>
                  {index < quickActions.length - 1 && <DropdownMenuSeparator />}
                </div>
              )
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}