'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Plus, 
  Pin, 
  Archive, 
  Trash2, 
  FolderIcon, 
  Grid3X3,
  List,
  Calendar,
  Tag
} from 'lucide-react'
import { useNotesStore } from '@/stores/notesStore'
import { useNotes, useDeleteNote } from '@/hooks/use-notes'
import { Note } from '@/types/note'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotesListProps {
  onSelectNote?: (note: Note) => void
  onCreateNote?: () => void
}

export function NotesList({ onSelectNote, onCreateNote }: NotesListProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedNote,
    getFilteredNotes,
    getAllTags,
  } = useNotesStore()

  const { data: notes, isLoading } = useNotes()
  const deleteNoteMutation = useDeleteNote()

  const filteredNotes = getFilteredNotes()
  const allTags = getAllTags()

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notes</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button onClick={onCreateNote} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-')
              setSortBy(sort as any)
              setSortOrder(order as any)
            }}
            className="px-3 py-1 rounded-md border text-sm"
          >
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="createdAt-desc">Recently Created</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              {searchQuery || selectedTags.length > 0 ? 
                'No notes match your search criteria.' : 
                'No notes yet. Create your first note!'
              }
            </div>
            {!searchQuery && selectedTags.length === 0 && (
              <Button onClick={onCreateNote} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            )}
          </div>
        ) : (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'
          )}>
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedNote?.id === note.id && 'ring-2 ring-primary'
                )}
                onClick={() => onSelectNote?.(note)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{note.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {note.folder && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <FolderIcon className="h-3 w-3 mr-1" />
                            {note.folder.name}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {note.isPinned && (
                        <Pin className="h-4 w-4 text-yellow-600" />
                      )}
                      {note.isArchived && (
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {note.plainTextContent && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {note.plainTextContent}
                    </p>
                  )}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}