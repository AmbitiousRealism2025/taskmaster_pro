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
import { useProject } from '@/hooks/use-projects'
import { useTask } from '@/hooks/use-tasks'

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