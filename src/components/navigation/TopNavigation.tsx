'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation'
import { useLiveRegion } from '@/hooks/use-accessibility'
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
    description: 'Project management'
  },
  {
    name: 'Notes',
    href: '/notes',
    icon: StickyNote,
    description: 'Note-taking'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'Schedule and events'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance metrics'
  },
  {
    name: 'Focus',
    href: '/focus',
    icon: Target,
    description: 'Focus timer and productivity'
  }
]

export function TopNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen, toggleSidebar } = useSidebar()
  const { openCommandPalette } = useCommandPalette()
  const { announceStatusChange } = useLiveRegion()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Keyboard navigation for main modules
  const { currentIndex: moduleIndex, handleKeyDown: handleModuleKeyDown, itemProps: moduleItemProps } = useKeyboardNavigation(
    modules.length,
    {
      direction: 'horizontal',
      wrap: true,
      onActivate: (index) => {
        const module = modules[index]
        announceStatusChange(`Navigating to ${module.name}`)
        window.location.href = module.href
      }
    }
  )

  const handleSidebarToggle = () => {
    toggleSidebar()
    announceStatusChange(isOpen ? 'Sidebar closed' : 'Sidebar opened')
  }

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    announceStatusChange(isMobileMenuOpen ? 'Mobile menu closed' : 'Mobile menu opened')
  }

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' })
      announceStatusChange('Successfully logged out')
    } catch (error) {
      console.error('Logout error:', error)
      announceStatusChange('Error logging out')
    }
  }

  // Generate user initials from name or email
  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header 
      className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left Section - Logo, Mobile Menu, Modules */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={handleSidebarToggle}
            data-testid="mobile-menu-button"
            aria-label="Toggle sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label="TaskMaster Pro - Go to dashboard"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="hidden font-semibold text-lg sm:block">
              TaskMaster Pro
            </span>
          </Link>

          {/* Module Navigation - Desktop */}
          <nav 
            className="hidden md:flex items-center space-x-1"
            role="navigation"
            aria-label="Main navigation"
            onKeyDown={handleModuleKeyDown}
          >
            {modules.map((module, index) => {
              const Icon = module.icon
              const isActive = pathname.startsWith(module.href)
              
              return (
                <Link
                  key={module.name}
                  href={module.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive 
                      ? "bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 text-brand-primary border border-brand-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-describedby={`module-${index}-desc`}
                  {...moduleItemProps(index)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden lg:block">{module.name}</span>
                  <span id={`module-${index}-desc`} className="sr-only">{module.description}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Section - Search, Connection Status, Actions, User */}
        <div className="flex items-center space-x-2">
          {/* Search Button - Desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openCommandPalette}
            className="hidden sm:flex items-center space-x-2 text-muted-foreground"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:block">Search...</span>
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Search Button - Mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openCommandPalette}
            className="sm:hidden"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Connection Status - Demo placeholder */}
          <div className="hidden sm:flex items-center" role="status" aria-label="Connection status">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
              <span>Connected</span>
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="sm" aria-label="View notifications">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-2 w-2 p-0"
              aria-label="2 new notifications"
            />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-8 w-8 rounded-full"
                aria-label={`Open user menu for ${session?.user?.name || session?.user?.email || 'user'}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={session?.user?.image || undefined} 
                    alt={`${session?.user?.name || session?.user?.email || 'User'} avatar`} 
                  />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {session?.user && (
                <>
                  <div className="flex items-center gap-3 p-2 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={session.user.image || undefined} 
                        alt={`${session.user.name || session.user.email || 'User'} avatar`} 
                      />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      {session.user.name && (
                        <p className="font-medium leading-none">{session.user.name}</p>
                      )}
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <Badge variant="secondary" className="ml-auto">Soon</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <Badge variant="secondary" className="ml-auto">Soon</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 dark:text-red-400 focus:dark:text-red-400"
                onClick={handleLogout}
              >
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div 
        className={cn(
          "md:hidden border-t bg-background transition-all duration-200",
          isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )} 
        data-testid="mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="px-4 py-2 space-y-1">
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = pathname.startsWith(module.href)
            
            return (
              <Link
                key={module.name}
                href={module.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive 
                    ? "bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 text-brand-primary border border-brand-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <div>
                  <div>{module.name}</div>
                  <div className="text-xs text-muted-foreground">{module.description}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}