# Phase 1: Dashboard Layout & Navigation Coding Context

## ⚠️ Implementation Notes
- **Subgroup Number**: 4 (Dashboard Layout & Navigation)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 5
- **Test Coverage**: docs/04-testing/Phase1_Foundation_Tests.md (Tests 18-23)
- **Dependencies**: Design System & Core UI (Subgroup 3) must be complete
- **Related Enhancements**: None
- **Estimated Context Usage**: 50-60%

---

**Subgroup**: 04 - Dashboard Layout & Navigation  
**Phase**: Foundation & Infrastructure (Week 3)  
**Focus**: Frontend + Fullstack  

## Subgroup Overview

The Dashboard Layout & Navigation subgroup is responsible for creating the primary navigation interface and layout system for TaskMaster Pro. This includes implementing the top navigation bar with module switching, collapsible sidebar navigation, responsive mobile layouts, command palette, and quick actions system.

### Primary Responsibilities

- **Top Navigation**: Create module switching interface with active states and user controls
- **Sidebar Navigation**: Implement collapsible navigation with project/context switching
- **Command Palette**: Build ⌘K command interface for keyboard-driven navigation
- **Mobile Navigation**: Create responsive navigation drawer with hamburger menu
- **Quick Actions**: Implement context-aware quick action buttons and floating action menus
- **Breadcrumb System**: Build hierarchical navigation breadcrumbs
- **Layout State**: Manage navigation state with Zustand for persistence across sessions
- **Performance**: Implement lazy loading and code splitting for navigation modules

## Test Coverage Requirements

Based on `docs/04-testing/Phase1_Foundation_Tests.md`, the following tests must pass:

### Layout Component Tests (2 core tests)
- **Top Navigation** (`__tests__/components/layout/navigation.test.ts`)
  - Module switching functionality
  - Active state management
  - User menu and settings integration
  - Theme toggle integration

- **Sidebar Navigation** (`__tests__/components/layout/sidebar.test.ts`)
  - Collapsible state management
  - Project/workspace switching
  - Navigation item active states
  - Mobile responsive behavior

### Dashboard Integration Tests (5 tests)
- **Dashboard Page** (`__tests__/dashboard/dashboard-page.test.ts`)
  - Navigation layout rendering
  - Quick actions functionality
  - Responsive layout behavior
  - Loading and error states
  - Navigation state persistence

### E2E Navigation Tests (1 test)
- **Cross-Module Navigation** (`__tests__/e2e/navigation.spec.ts`)
  - Module switching workflows
  - Sidebar navigation flows
  - Mobile navigation drawer
  - Command palette functionality

## Next.js App Router Layout Patterns

### Root Layout Structure

```typescript
// app/layout.tsx - Root layout with theme and navigation
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { NavigationProvider } from '@/components/navigation/NavigationProvider'
import { Toaster } from '@/components/ui/toaster'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'TaskMaster Pro',
  description: 'Complete productivity suite with advanced features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationProvider>
            {children}
            <Toaster />
          </NavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Dashboard Layout Structure

```typescript
// app/(dashboard)/layout.tsx - Dashboard with navigation
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { SideNavigation } from '@/components/navigation/SideNavigation'
import { CommandPalette } from '@/components/navigation/CommandPalette'
import { QuickActions } from '@/components/navigation/QuickActions'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation - Fixed header */}
      <TopNavigation />
      
      <div className="flex">
        {/* Sidebar Navigation - Collapsible */}
        <SideNavigation />
        
        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <Breadcrumbs />
            
            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
      
      {/* Global Components */}
      <CommandPalette />
      <QuickActions />
    </div>
  )
}
```

### Nested Route Layout

```typescript
// app/(dashboard)/tasks/layout.tsx - Module-specific layout
import { TasksNavigation } from '@/components/tasks/TasksNavigation'
import { TasksQuickActions } from '@/components/tasks/TasksQuickActions'

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <TasksNavigation />
      
      {/* Module Content */}
      <div className="relative">
        {children}
        
        {/* Module-specific Quick Actions */}
        <TasksQuickActions />
      </div>
    </div>
  )
}
```

## Top Navigation Implementation

### Component Structure

```typescript
// components/navigation/TopNavigation.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderOpen, 
  StickyNote,
  Calendar,
  BarChart3,
  Target,
  Menu,
  Search,
  Bell,
  Settings,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useSidebar } from '@/hooks/use-sidebar'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { cn } from '@/lib/utils'

const modules = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and metrics'
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    description: 'Task management'
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
    description: 'Project organization'
  },
  {
    name: 'Notes',
    href: '/notes',
    icon: StickyNote,
    description: 'Note taking'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'Schedule planning'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance insights'
  },
  {
    name: 'Focus Mode',
    href: '/focus',
    icon: Target,
    description: 'Distraction-free mode'
  },
] as const

export function TopNavigation() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const { open: openCommandPalette } = useCommandPalette()

  const currentModule = modules.find(module => 
    pathname.startsWith(module.href)
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left Section - Logo, Mobile Menu, Modules */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-semibold text-lg sm:block">
              TaskMaster Pro
            </span>
          </Link>

          {/* Module Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = pathname.startsWith(module.href)
              
              return (
                <Link
                  key={module.name}
                  href={module.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:block">{module.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Section - Search, Notifications, User */}
        <div className="flex items-center space-x-3">
          {/* Search / Command Palette */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center space-x-2 text-muted-foreground"
            onClick={openCommandPalette}
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:block">Search...</span>
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Quick Search - Mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden"
            onClick={openCommandPalette}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                >
                  3
                </Badge>
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4">
                <h4 className="text-sm font-medium">Notifications</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  You have 3 unread notifications
                </p>
              </div>
              <DropdownMenuSeparator />
              {/* Notification items would go here */}
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm">Task deadline approaching</p>
                  <p className="text-xs text-muted-foreground">
                    "Review quarterly report" is due in 2 hours
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatar.jpg" alt="User avatar" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">
                    john@example.com
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Module Navigation */}
      <div className="md:hidden border-t bg-background">
        <nav className="flex items-center space-x-1 p-2 overflow-x-auto">
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = pathname.startsWith(module.href)
            
            return (
              <Link
                key={module.name}
                href={module.href}
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{module.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
```

## Sidebar Navigation Implementation

### Component Structure

```typescript
// components/navigation/SideNavigation.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  FolderOpen, 
  Plus, 
  ChevronRight,
  ChevronDown,
  Hash,
  Calendar,
  Users,
  Settings,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useSidebar } from '@/hooks/use-sidebar'
import { useProjects } from '@/hooks/use-projects'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string | number
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    title: 'Recent Projects',
    href: '/projects/recent',
    icon: FolderOpen,
    children: [
      { title: 'TaskMaster Pro v2', href: '/projects/taskmaster-v2', icon: Hash },
      { title: 'Client Website', href: '/projects/client-website', icon: Hash },
      { title: 'Team Onboarding', href: '/projects/onboarding', icon: Hash },
    ]
  },
  {
    title: 'Today',
    href: '/today',
    icon: Calendar,
    badge: 5
  },
  {
    title: 'Assigned to Me',
    href: '/assigned',
    icon: Users,
    badge: 12
  }
]

export function SideNavigation() {
  const pathname = usePathname()
  const { isOpen, isMobile, closeSidebar } = useSidebar()
  const { projects, isLoading } = useProjects()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Recent Projects'])

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      closeSidebar()
    }
  }, [pathname, isMobile, closeSidebar])

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev =>
      prev.includes(itemTitle)
        ? prev.filter(item => item !== itemTitle)
        : [...prev, itemTitle]
    )
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = pathname === item.href
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0
    const Icon = item.icon

    return (
      <div key={item.title} className={cn('space-y-1', level > 0 && 'ml-6')}>
        <div
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive 
              ? 'bg-accent text-accent-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            'group cursor-pointer'
          )}
        >
          <Link 
            href={item.href}
            className="flex items-center space-x-3 flex-1 min-w-0"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Link>
          
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => toggleExpanded(item.title)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen && !isMobile) {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        'fixed top-16 left-0 z-50 flex h-[calc(100vh-4rem)] w-64 flex-col border-r bg-background',
        'lg:static lg:z-0',
        !isOpen && 'hidden lg:flex'
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex"
            onClick={closeSidebar}
          >
            <Minimize2 className="h-4 w-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="space-y-2">
              <Button className="w-full justify-start" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>

            <Separator />

            {/* Navigation Items */}
            <nav className="space-y-2">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            <Separator />

            {/* Projects Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Projects
                </h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="h-8 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {projects?.slice(0, 5).map(project => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={cn(
                        'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        pathname === `/projects/${project.id}`
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="truncate">{project.name}</span>
                      {project.taskCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {project.taskCount}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            size="sm"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </>
  )
}
```

## Command Palette Implementation

### Component Structure

```typescript
// components/navigation/CommandPalette.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search,
  Hash,
  Calendar,
  CheckSquare,
  FolderOpen,
  StickyNote,
  Settings,
  User,
  Plus,
  Command
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { Badge } from '@/components/ui/badge'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  href: string
  icon: React.ElementType
  group: string
  keywords?: string[]
  action?: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const { isOpen, close } = useCommandPalette()
  const { projects } = useProjects()
  const { tasks } = useTasks()
  const [search, setSearch] = useState('')

  // Navigation commands
  const navigationCommands: CommandItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Overview and metrics',
      href: '/dashboard',
      icon: Hash,
      group: 'Navigation'
    },
    {
      id: 'tasks',
      title: 'Tasks',
      subtitle: 'Manage your tasks',
      href: '/tasks',
      icon: CheckSquare,
      group: 'Navigation'
    },
    {
      id: 'projects',
      title: 'Projects',
      subtitle: 'Organize your projects',
      href: '/projects',
      icon: FolderOpen,
      group: 'Navigation'
    },
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Schedule and planning',
      href: '/calendar',
      icon: Calendar,
      group: 'Navigation'
    },
    {
      id: 'notes',
      title: 'Notes',
      subtitle: 'Take and organize notes',
      href: '/notes',
      icon: StickyNote,
      group: 'Navigation'
    }
  ]

  // Quick action commands
  const actionCommands: CommandItem[] = [
    {
      id: 'new-task',
      title: 'New Task',
      subtitle: 'Create a new task',
      href: '/tasks/new',
      icon: Plus,
      group: 'Quick Actions',
      keywords: ['create', 'add', 'new', 'task']
    },
    {
      id: 'new-project',
      title: 'New Project',
      subtitle: 'Create a new project',
      href: '/projects/new',
      icon: Plus,
      group: 'Quick Actions',
      keywords: ['create', 'add', 'new', 'project']
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Manage preferences',
      href: '/settings',
      icon: Settings,
      group: 'Account',
      keywords: ['preferences', 'config', 'profile']
    },
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'View your profile',
      href: '/profile',
      icon: User,
      group: 'Account'
    }
  ]

  // Dynamic project commands
  const projectCommands: CommandItem[] = useMemo(() => {
    if (!projects) return []
    return projects.slice(0, 10).map(project => ({
      id: `project-${project.id}`,
      title: project.name,
      subtitle: `${project.taskCount} tasks`,
      href: `/projects/${project.id}`,
      icon: Hash,
      group: 'Projects',
      keywords: [project.name.toLowerCase()]
    }))
  }, [projects])

  // Dynamic task commands
  const taskCommands: CommandItem[] = useMemo(() => {
    if (!tasks) return []
    return tasks.slice(0, 10).map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: task.project?.name || 'No project',
      href: `/tasks/${task.id}`,
      icon: CheckSquare,
      group: 'Recent Tasks',
      keywords: [task.title.toLowerCase()]
    }))
  }, [tasks])

  // Combine all commands
  const allCommands = [
    ...navigationCommands,
    ...actionCommands,
    ...projectCommands,
    ...taskCommands
  ]

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return allCommands

    const searchLower = search.toLowerCase()
    return allCommands.filter(command => {
      const titleMatch = command.title.toLowerCase().includes(searchLower)
      const subtitleMatch = command.subtitle?.toLowerCase().includes(searchLower)
      const keywordMatch = command.keywords?.some(keyword => 
        keyword.includes(searchLower)
      )
      
      return titleMatch || subtitleMatch || keywordMatch
    })
  }, [allCommands, search])

  // Group filtered commands
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    filteredCommands.forEach(command => {
      if (!groups[command.group]) {
        groups[command.group] = []
      }
      groups[command.group].push(command)
    })
    return groups
  }, [filteredCommands])

  // Handle command selection
  const handleSelect = (command: CommandItem) => {
    close()
    if (command.action) {
      command.action()
    } else {
      router.push(command.href)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isOpen) {
          close()
        } else {
          // Will be handled by useCommandPalette hook
        }
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, close])

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  return (
    <CommandDialog open={isOpen} onOpenChange={close}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          No results found for "{search}"
        </CommandEmpty>

        {Object.entries(groupedCommands).map(([group, commands], index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {commands.map(command => {
                const Icon = command.icon
                return (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center space-x-3"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium">{command.title}</span>
                      {command.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {command.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
```

## Responsive Navigation Patterns

### Mobile Navigation Hook

```typescript
// hooks/use-sidebar.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

interface SidebarState {
  isOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      openSidebar: () => set({ isOpen: true }),
      closeSidebar: () => set({ isOpen: false }),
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)

export function useSidebar() {
  const store = useSidebarStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Auto-close sidebar on desktop, auto-open on mobile navigation
  useEffect(() => {
    if (!isMobile && !store.isOpen) {
      store.openSidebar()
    }
  }, [isMobile, store])

  return {
    ...store,
    isMobile,
  }
}
```

### Mobile Navigation Drawer

```typescript
// components/navigation/MobileNavigation.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { useSidebar } from '@/hooks/use-sidebar'
import { SideNavigation } from './SideNavigation'

export function MobileNavigation() {
  const pathname = usePathname()
  const { isOpen, closeSidebar, openSidebar } = useSidebar()

  // Close drawer when route changes
  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => open ? openSidebar() : closeSidebar()}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SideNavigation />
      </SheetContent>
    </Sheet>
  )
}
```

## Quick Actions Implementation

### Floating Action Button

```typescript
// components/navigation/QuickActions.tsx
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
```

## Breadcrumb Navigation Implementation

### Component Structure

```typescript
// components/navigation/Breadcrumbs.tsx
'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useProject } from '@/hooks/use-project'
import { useTask } from '@/hooks/use-task'

interface BreadcrumbSegment {
  label: string
  href?: string
  isCurrentPage?: boolean
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  // Extract IDs from pathname for dynamic content
  const pathSegments = pathname.split('/').filter(Boolean)
  const projectId = pathSegments.includes('projects') 
    ? pathSegments[pathSegments.indexOf('projects') + 1] 
    : null
  const taskId = pathSegments.includes('tasks') 
    ? pathSegments[pathSegments.indexOf('tasks') + 1] 
    : null

  // Fetch dynamic content for breadcrumbs
  const { data: project } = useProject(projectId)
  const { data: task } = useTask(taskId)

  const breadcrumbs = useMemo(() => {
    const segments: BreadcrumbSegment[] = []

    // Always start with Dashboard
    segments.push({
      label: 'Dashboard',
      href: '/dashboard'
    })

    // Build breadcrumbs based on current path
    if (pathname.startsWith('/tasks')) {
      segments.push({
        label: 'Tasks',
        href: '/tasks'
      })
      
      if (taskId) {
        if (taskId === 'new') {
          segments.push({
            label: 'New Task',
            isCurrentPage: true
          })
        } else if (task) {
          segments.push({
            label: task.title,
            isCurrentPage: true
          })
        }
      }
    } else if (pathname.startsWith('/projects')) {
      segments.push({
        label: 'Projects',
        href: '/projects'
      })
      
      if (projectId) {
        if (projectId === 'new') {
          segments.push({
            label: 'New Project',
            isCurrentPage: true
          })
        } else if (project) {
          segments.push({
            label: project.name,
            href: `/projects/${project.id}`,
          })
          
          // Handle project sub-routes
          const subRoute = pathSegments[pathSegments.indexOf(projectId) + 1]
          if (subRoute) {
            const subRouteLabels: Record<string, string> = {
              tasks: 'Tasks',
              settings: 'Settings',
              members: 'Members',
              analytics: 'Analytics'
            }
            
            segments.push({
              label: subRouteLabels[subRoute] || subRoute,
              isCurrentPage: true
            })
          }
        }
      }
    } else if (pathname.startsWith('/notes')) {
      segments.push({
        label: 'Notes',
        href: '/notes'
      })
      
      const noteId = pathSegments[1]
      if (noteId === 'new') {
        segments.push({
          label: 'New Note',
          isCurrentPage: true
        })
      } else if (noteId) {
        // Would fetch note title here
        segments.push({
          label: 'Note Title',
          isCurrentPage: true
        })
      }
    } else if (pathname.startsWith('/calendar')) {
      segments.push({
        label: 'Calendar',
        isCurrentPage: pathname === '/calendar'
      })
    } else if (pathname.startsWith('/analytics')) {
      segments.push({
        label: 'Analytics',
        isCurrentPage: pathname === '/analytics'
      })
    } else if (pathname.startsWith('/focus')) {
      segments.push({
        label: 'Focus Mode',
        isCurrentPage: true
      })
    } else if (pathname.startsWith('/settings')) {
      segments.push({
        label: 'Settings',
        href: '/settings'
      })
      
      const settingsSection = pathSegments[1]
      if (settingsSection) {
        const sectionLabels: Record<string, string> = {
          profile: 'Profile',
          preferences: 'Preferences',
          notifications: 'Notifications',
          integrations: 'Integrations',
          billing: 'Billing'
        }
        
        segments.push({
          label: sectionLabels[settingsSection] || settingsSection,
          isCurrentPage: true
        })
      }
    }

    return segments
  }, [pathname, project, task, projectId, taskId])

  // Don't show breadcrumbs on dashboard root
  if (pathname === '/dashboard') {
    return null
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {breadcrumbs.map((segment, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {segment.isCurrentPage ? (
                <BreadcrumbPage className="font-medium">
                  {segment.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={segment.href!} className="hover:text-foreground">
                    {segment.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

## Layout State Management

### Navigation State Store

```typescript
// stores/navigation-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NavigationState {
  // Sidebar state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Command palette state
  commandPaletteOpen: boolean
  
  // Quick actions state
  quickActionsOpen: boolean
  
  // Navigation history
  navigationHistory: string[]
  
  // Current context
  currentModule: string
  currentProject: string | null
  
  // Actions
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  
  setQuickActionsOpen: (open: boolean) => void
  
  addToHistory: (path: string) => void
  setCurrentModule: (module: string) => void
  setCurrentProject: (projectId: string | null) => void
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      quickActionsOpen: false,
      navigationHistory: [],
      currentModule: 'dashboard',
      currentProject: null,
      
      // Sidebar actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Command palette actions
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((state) => ({ 
        commandPaletteOpen: !state.commandPaletteOpen 
      })),
      
      // Quick actions
      setQuickActionsOpen: (open) => set({ quickActionsOpen: open }),
      
      // Navigation tracking
      addToHistory: (path) => set((state) => ({
        navigationHistory: [
          path,
          ...state.navigationHistory.filter(p => p !== path)
        ].slice(0, 10) // Keep last 10 paths
      })),
      
      setCurrentModule: (module) => set({ currentModule: module }),
      setCurrentProject: (projectId) => set({ currentProject: projectId }),
    }),
    {
      name: 'navigation-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        navigationHistory: state.navigationHistory,
        currentProject: state.currentProject,
      }),
    }
  )
)

// Command palette hook
export function useCommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useNavigationStore()
  
  return {
    isOpen: commandPaletteOpen,
    open: () => setCommandPaletteOpen(true),
    close: () => setCommandPaletteOpen(false),
    toggle: () => setCommandPaletteOpen(!commandPaletteOpen),
  }
}

// Sidebar hook
export function useSidebar() {
  const { 
    sidebarOpen, 
    sidebarCollapsed, 
    setSidebarOpen, 
    setSidebarCollapsed, 
    toggleSidebar 
  } = useNavigationStore()
  
  return {
    isOpen: sidebarOpen,
    isCollapsed: sidebarCollapsed,
    open: () => setSidebarOpen(true),
    close: () => setSidebarOpen(false),
    toggle: toggleSidebar,
    setCollapsed: setSidebarCollapsed,
  }
}
```

## Performance Optimization

### Lazy Loading Navigation Components

```typescript
// components/navigation/index.ts - Lazy loaded exports
import { lazy } from 'react'

// Core navigation components - loaded immediately
export { TopNavigation } from './TopNavigation'
export { SideNavigation } from './SideNavigation'

// Secondary components - lazy loaded
export const CommandPalette = lazy(() => 
  import('./CommandPalette').then(mod => ({ default: mod.CommandPalette }))
)

export const QuickActions = lazy(() => 
  import('./QuickActions').then(mod => ({ default: mod.QuickActions }))
)

export const Breadcrumbs = lazy(() => 
  import('./Breadcrumbs').then(mod => ({ default: mod.Breadcrumbs }))
)

export const MobileNavigation = lazy(() => 
  import('./MobileNavigation').then(mod => ({ default: mod.MobileNavigation }))
)
```

### Code Splitting by Module

```typescript
// app/(dashboard)/layout.tsx - Module-based code splitting
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { SideNavigation } from '@/components/navigation/SideNavigation'
import { NavigationSkeleton } from '@/components/ui/navigation-skeleton'

// Dynamically import secondary navigation components
const CommandPalette = dynamic(
  () => import('@/components/navigation/CommandPalette'),
  { ssr: false }
)

const QuickActions = dynamic(
  () => import('@/components/navigation/QuickActions'),
  { ssr: false }
)

const Breadcrumbs = dynamic(
  () => import('@/components/navigation/Breadcrumbs'),
  {
    loading: () => <NavigationSkeleton type="breadcrumbs" />,
    ssr: false
  }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <div className="flex">
        <SideNavigation />
        
        <main className="flex-1 lg:pl-64">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<NavigationSkeleton type="breadcrumbs" />}>
              <Breadcrumbs />
            </Suspense>
            
            {children}
          </div>
        </main>
      </div>
      
      <Suspense>
        <CommandPalette />
      </Suspense>
      
      <Suspense>
        <QuickActions />
      </Suspense>
    </div>
  )
}
```

## Integration with Other Subgroups

### Authentication Integration

```typescript
// components/navigation/TopNavigation.tsx - Auth integration
import { useSession, signOut } from 'next-auth/react'

export function TopNavigation() {
  const { data: session, status } = useSession()

  // Show loading state during auth check
  if (status === 'loading') {
    return <NavigationSkeleton type="topnav" />
  }

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/auth/login')
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      {/* Navigation content with user session */}
      <div className="flex items-center justify-between px-4">
        {/* User menu with session data */}
        <DropdownMenuContent align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {session.user?.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </header>
  )
}
```

### Design System Integration

```typescript
// components/navigation/NavigationProvider.tsx - Design system integration
import { NavigationProvider as BaseNavigationProvider } from '@/components/navigation/NavigationProvider'
import { useTheme } from '@/components/theme/ThemeProvider'

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <BaseNavigationProvider>
      <div 
        className={cn(
          "min-h-screen bg-background transition-colors duration-300",
          theme === 'dark' && "dark"
        )}
      >
        {children}
      </div>
    </BaseNavigationProvider>
  )
}
```

## Testing Implementation

### Navigation Component Tests

```typescript
// __tests__/components/layout/navigation.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { NavigationProvider } from '@/components/navigation/NavigationProvider'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'John Doe', email: 'john@example.com' } },
    status: 'authenticated'
  })
}))

describe('TopNavigation', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard')
  })

  it('should render module navigation', () => {
    render(
      <NavigationProvider>
        <TopNavigation />
      </NavigationProvider>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('should highlight active module', () => {
    (usePathname as jest.Mock).mockReturnValue('/tasks')
    
    render(
      <NavigationProvider>
        <TopNavigation />
      </NavigationProvider>
    )

    const tasksLink = screen.getByRole('link', { name: /tasks/i })
    expect(tasksLink).toHaveClass('bg-accent')
  })

  it('should open command palette on search click', () => {
    render(
      <NavigationProvider>
        <TopNavigation />
      </NavigationProvider>
    )

    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Command palette should be opened (would need to test the hook)
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument()
  })

  it('should show user menu', () => {
    render(
      <NavigationProvider>
        <TopNavigation />
      </NavigationProvider>
    )

    const userButton = screen.getByRole('button', { name: /user avatar/i })
    fireEvent.click(userButton)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

### E2E Navigation Tests

```typescript
// __tests__/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    await page.goto('/dashboard')
  })

  test('should navigate between modules', async ({ page }) => {
    // Click Tasks module
    await page.click('text=Tasks')
    await expect(page).toHaveURL('/tasks')
    
    // Verify active state
    await expect(page.locator('[data-testid="nav-tasks"]')).toHaveClass(/bg-accent/)
    
    // Click Projects module
    await page.click('text=Projects')
    await expect(page).toHaveURL('/projects')
  })

  test('should open command palette with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+KeyK')
    
    await expect(page.locator('[data-testid="command-dialog"]')).toBeVisible()
    
    // Search for tasks
    await page.fill('[placeholder="Type a command or search..."]', 'tasks')
    await page.click('text=Tasks')
    
    await expect(page).toHaveURL('/tasks')
  })

  test('should toggle sidebar', async ({ page }) => {
    // Click sidebar toggle
    await page.click('[data-testid="sidebar-toggle"]')
    
    // Verify sidebar is hidden
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
    
    // Click toggle again
    await page.click('[data-testid="sidebar-toggle"]')
    
    // Verify sidebar is shown
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })

  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Mobile navigation should be visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    
    // Click hamburger menu
    await page.click('[data-testid="mobile-menu-button"]')
    
    // Sidebar drawer should open
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible()
    
    // Click Tasks
    await page.click('text=Tasks')
    
    // Should navigate and close drawer
    await expect(page).toHaveURL('/tasks')
    await expect(page.locator('[data-testid="mobile-sidebar"]')).not.toBeVisible()
  })
})
```

## Summary

This coding context provides comprehensive guidance for implementing the Dashboard Layout & Navigation subgroup of TaskMaster Pro. The implementation focuses on:

1. **Intuitive Navigation**: Clean, responsive navigation with clear module switching and active states
2. **Performance**: Lazy loading, code splitting, and optimized rendering patterns
3. **Accessibility**: WCAG 2.1 AA compliant navigation with proper keyboard support
4. **Mobile Experience**: Responsive navigation drawer with smooth animations
5. **Developer Experience**: Comprehensive testing coverage and integration patterns

The navigation system serves as the backbone of the application, providing users with fast, intuitive access to all TaskMaster Pro modules while maintaining excellent performance and accessibility standards.