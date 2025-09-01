'use client'

import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Undo,
  Redo,
  Link,
  Image,
  CodeXml,
  Loader2,
  Sparkles
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import React from 'react'

interface EditorToolbarProps {
  editor: Editor
  isExtracting?: boolean
}

export function EditorToolbar({ editor, isExtracting }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = React.useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false)
  
  const addLink = React.useCallback(() => {
    if (!linkUrl) return
    
    editor
      .chain()
      .focus()
      .setLink({ href: linkUrl })
      .run()
    
    setLinkUrl('')
    setIsLinkPopoverOpen(false)
  }, [editor, linkUrl])
  
  const removeLink = React.useCallback(() => {
    editor.chain().focus().unsetLink().run()
  }, [editor])
  
  const addImage = React.useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])
  
  if (!editor) {
    return null
  }

  return (
    <div className="border-b p-2 flex items-center gap-1 flex-wrap">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('taskList')}
          onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare className="h-4 w-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Block Elements */}
      <div className="flex items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('codeBlock')}
          onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeXml className="h-4 w-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Media & Links */}
      <div className="flex items-center gap-1">
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('link')}
            >
              <Link className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Add Link</h4>
                <Input
                  placeholder="Enter URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addLink()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addLink} disabled={!linkUrl}>
                  Add Link
                </Button>
                {editor.isActive('link') && (
                  <Button size="sm" variant="outline" onClick={removeLink}>
                    Remove Link
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* AI Status */}
      {isExtracting && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <Sparkles className="h-3 w-3" />
            Extracting tasks...
          </div>
        </>
      )}
    </div>
  )
}