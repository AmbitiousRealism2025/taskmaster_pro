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

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  return (
    <CommandDialog open={isOpen} onOpenChange={close} data-testid="command-dialog">
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