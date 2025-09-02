'use client'

import React from 'react'
import { NotesList } from '@/components/notes/NotesList'
import { TiptapEditor } from '@/components/notes/TiptapEditorLazy'
import { NoteForm } from '@/components/notes/NoteForm'
import { Button } from '@/components/ui/button'
import { useNotesStore } from '@/stores/notesStore'
import { useNotes, useFolders } from '@/hooks/use-notes'
import { Note } from '@/types/note'
import { ArrowLeft, Edit, Pin, Archive, Trash2 } from 'lucide-react'

export default function NotesPage() {
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingNote, setEditingNote] = React.useState<Note | null>(null)
  const [showEditor, setShowEditor] = React.useState(false)
  
  const { selectedNote, selectNote } = useNotesStore()
  
  // Load initial data
  useNotes()
  useFolders()

  const handleSelectNote = (note: Note) => {
    selectNote(note)
    setShowEditor(true)
  }

  const handleCreateNote = () => {
    setEditingNote(null)
    setIsFormOpen(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setIsFormOpen(true)
  }

  const handleBackToList = () => {
    setShowEditor(false)
    selectNote(null)
  }

  if (showEditor && selectedNote) {
    return (
      <div className="h-full flex flex-col">
        {/* Editor Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold truncate">{selectedNote.title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditNote(selectedNote)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={selectedNote.isPinned ? 'text-yellow-600' : ''}
            >
              <Pin className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={selectedNote.isArchived ? 'text-muted-foreground' : ''}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto">
          <TiptapEditor
            note={selectedNote}
            readOnly
            className="h-full border-0 rounded-none"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <NotesList 
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
      />
      
      <NoteForm
        note={editingNote}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  )
}