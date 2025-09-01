'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TiptapEditor } from './TiptapEditor'
import { useNotesStore } from '@/stores/notesStore'
import { useFolders, useCreateNote, useUpdateNote } from '@/hooks/use-notes'
import { Note, CreateNoteData, UpdateNoteData, ExtractedTask } from '@/types/note'
import { X, Tag, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const NoteFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  folderId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
})

interface NoteFormProps {
  note?: Note | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteForm({ note, open, onOpenChange }: NoteFormProps) {
  const [content, setContent] = React.useState(note?.content || '')
  const [newTag, setNewTag] = React.useState('')
  const [extractedTasks, setExtractedTasks] = React.useState<ExtractedTask[]>([])
  
  const { data: folders } = useFolders()
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  
  const form = useForm<z.infer<typeof NoteFormSchema>>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: {
      title: note?.title || '',
      folderId: note?.folderId || '',
      tags: note?.tags || [],
      isPinned: note?.isPinned || false,
    },
  })

  const { watch, setValue } = form
  const tags = watch('tags')

  // Reset form when note changes
  React.useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        folderId: note.folderId || '',
        tags: note.tags,
        isPinned: note.isPinned,
      })
      setContent(note.content)
    } else {
      form.reset({
        title: '',
        folderId: '',
        tags: [],
        isPinned: false,
      })
      setContent('')
    }
    setExtractedTasks([])
  }, [note, form])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue('tags', [...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove))
  }

  const handleTaskExtraction = (tasks: ExtractedTask[]) => {
    setExtractedTasks(tasks)
  }

  const handleCreateTasksFromExtracted = () => {
    // This would integrate with the task creation system
    // For now, just clear the extracted tasks
    setExtractedTasks([])
    // TODO: Create tasks from extracted data
    console.log('Creating tasks:', extractedTasks)
  }

  const onSubmit = async (data: z.infer<typeof NoteFormSchema>) => {
    try {
      const plainTextContent = content.replace(/<[^>]*>/g, '').trim()
      
      if (note) {
        // Update existing note
        const updateData: UpdateNoteData = {
          title: data.title,
          content,
          folderId: data.folderId || null,
          tags: data.tags,
          isPinned: data.isPinned,
        }
        
        await updateNoteMutation.mutateAsync({ id: note.id, data: updateData })
      } else {
        // Create new note
        const createData: CreateNoteData = {
          title: data.title,
          content,
          folderId: data.folderId || undefined,
          tags: data.tags,
          isPinned: data.isPinned,
        }
        
        await createNoteMutation.mutateAsync(createData)
      }
      
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  const handleContentUpdate = (newContent: string, plainText: string) => {
    setContent(newContent)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {note ? 'Edit Note' : 'Create New Note'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="Enter note title..."
              className={form.formState.errors.title ? 'border-destructive' : ''}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Folder and Pin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select 
                value={watch('folderId')} 
                onValueChange={(value) => setValue('folderId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No folder</SelectItem>
                  {folders?.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isPinned" className="flex items-center gap-2">
                Pin Note
              </Label>
              <Switch
                id="isPinned"
                checked={watch('isPinned')}
                onCheckedChange={(checked) => setValue('isPinned', checked)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <TiptapEditor
              note={note}
              placeholder="Start writing your note..."
              onUpdate={handleContentUpdate}
              onTaskExtraction={handleTaskExtraction}
              className="min-h-[300px]"
            />
          </div>

          {/* Extracted Tasks */}
          {extractedTasks.length > 0 && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <Label>AI Extracted Tasks ({extractedTasks.length})</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateTasksFromExtracted}
                >
                  Create Tasks
                </Button>
              </div>
              <div className="space-y-2">
                {extractedTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                    <span className="text-sm">{task.text}</span>
                    <div className="flex gap-2">
                      {task.priority && (
                        <Badge variant="outline">{task.priority}</Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline">{task.dueDate}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            >
              {note ? 'Update' : 'Create'} Note
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}