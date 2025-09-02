'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// Temporarily commented out to fix build issues
// import Placeholder from '@tiptap/extension-placeholder'
// import TaskList from '@tiptap/extension-task-list'
// import TaskItem from '@tiptap/extension-task-item'  
// import Image from '@tiptap/extension-image'
// import Link from '@tiptap/extension-link'
// import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// import { lowlight } from 'lowlight'
// import { Markdown } from 'tiptap-markdown'
import { Note, ExtractedTask } from '@/types/note'
import { EditorToolbar } from './EditorToolbar'
import { useNotesStore } from '@/stores/notesStore'
// import { useDebounce } from '@/hooks/useDebounce' - using local implementation
import React from 'react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  note?: Note
  placeholder?: string
  onUpdate?: (content: string, plainText: string) => void
  onTaskExtraction?: (tasks: ExtractedTask[]) => void
  className?: string
  readOnly?: boolean
}

export function TiptapEditor({ 
  note, 
  placeholder = "Start writing...",
  onUpdate,
  onTaskExtraction,
  className,
  readOnly = false
}: TiptapEditorProps) {
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [lastContent, setLastContent] = React.useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: !readOnly,
        HTMLAttributes: {
          class: 'text-primary hover:text-primary/80 underline',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: note?.content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      
      if (html !== lastContent) {
        setLastContent(html)
        onUpdate?.(html, text)
        
        // Extract tasks if content has changed significantly
        if (onTaskExtraction && text.length > 20) {
          debouncedTaskExtraction(text)
        }
      }
    },
  })

  const debouncedTaskExtraction = useDebounce(async (text: string) => {
    if (isExtracting || text === lastContent) return
    
    setIsExtracting(true)
    try {
      // Simple task extraction - look for patterns like "TODO:", "[ ]", etc.
      const taskPatterns = [
        /TODO:\s*(.+)/gi,
        /\[ \]\s*(.+)/gi,
        /-\s*\[ \]\s*(.+)/gi,
        /need to\s+(.+)/gi,
        /must\s+(.+)/gi,
      ]
      
      const extractedTasks: ExtractedTask[] = []
      
      taskPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 3) {
            extractedTasks.push({
              text: match[1].trim(),
              priority: getPriorityFromText(match[1]),
              dueDate: getDateFromText(match[1]),
            })
          }
        }
      })
      
      if (extractedTasks.length > 0) {
        onTaskExtraction?.(extractedTasks)
      }
    } catch (error) {
      console.error('Task extraction failed:', error)
    } finally {
      setIsExtracting(false)
    }
  }, 2000)

  const getPriorityFromText = (text: string): 'low' | 'medium' | 'high' | undefined => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('urgent') || lowerText.includes('critical') || lowerText.includes('asap')) {
      return 'high'
    }
    if (lowerText.includes('important') || lowerText.includes('priority')) {
      return 'medium'
    }
    return undefined
  }

  const getDateFromText = (text: string): string | undefined => {
    // Simple date extraction patterns
    const datePatterns = [
      /due\s+(\w+)/gi,
      /by\s+(\w+\s+\d+)/gi,
      /before\s+(\w+)/gi,
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return undefined
  }

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border rounded-lg focus-within:ring-2 focus-within:ring-ring", className)}>
      {!readOnly && (
        <EditorToolbar 
          editor={editor}
          isExtracting={isExtracting}
        />
      )}
      <div className="p-4">
        <EditorContent 
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:focus:outline-none [&_.is-editor-empty]:before:text-muted-foreground [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-editor-empty]:before:pointer-events-none"
        />
      </div>
    </div>
  )
}

// Custom hook for debouncing
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout>()
  
  const debouncedCallback = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T
  
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return debouncedCallback
}