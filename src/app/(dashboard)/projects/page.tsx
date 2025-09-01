'use client'

import React from 'react'
import { useProjects } from '@/hooks/use-projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  FolderIcon, 
  Calendar, 
  CheckCircle,
  Clock,
  MoreVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const { data: projectsResponse, isLoading } = useProjects({ 
    search: searchQuery || undefined,
    limit: 50 
  })

  const projects = projectsResponse?.data || []

  const handleCreateProject = () => {
    // TODO: Implement project creation dialog
    console.log('Create project')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Organize and manage your projects with tasks, notes, and milestones.
          </p>
        </div>
        <Button onClick={handleCreateProject}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-lg font-medium mb-2">No projects yet</div>
          <div className="text-muted-foreground mb-4">
            Create your first project to get started organizing your work.
          </div>
          <Button onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">
                      {project.name}
                    </CardTitle>
                    <div 
                      className="w-6 h-6 rounded-full mt-2" 
                      style={{ backgroundColor: project.color }}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Task Count */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{project._count?.tasks || 0} tasks</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium">Total Projects</div>
              </div>
              <div className="text-2xl font-bold mt-1">{projects.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium">Total Tasks</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {projects.reduce((total, p) => total + (p._count?.tasks || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium">Active Projects</div>
              </div>
              <div className="text-2xl font-bold mt-1">{projects.length}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}