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
            data-testid="mobile-menu-button"
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
                  data-testid={`nav-${module.name.toLowerCase()}`}
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
            aria-label="Search"
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
            aria-label="Search"
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
      <div className="md:hidden border-t bg-background" data-testid="mobile-nav">
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