'use client'

import React, { useState, useEffect } from 'react'
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
            'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            isActive 
              ? 'gradient-subtle-bg text-foreground font-semibold shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105',
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
      )} data-testid="sidebar">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex"
            onClick={closeSidebar}
            data-testid="sidebar-toggle"
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
              <Button variant="gradient" className="w-full justify-start" size="sm">
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