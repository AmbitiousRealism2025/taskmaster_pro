# Subgroup 7: Content & Focus Systems - Architecture

## Key Architectural Decisions

### State Management Pattern
- **Zustand**: Client-side stores (notesStore, focusStore)
- **TanStack Query**: Server state with optimistic updates
- **Separation**: Clear boundary between client/server state

### Rich Text Editor Architecture
- **Tiptap Core**: Modern rich text editor framework
- **Extensions**: StarterKit, Markdown, TaskList, Image, Link, CodeBlockLowlight
- **AI Integration**: Pattern-based task extraction from content
- **Performance**: Local useDebounce implementation for task extraction

### Focus Timer Implementation
- **Web Workers**: Precise timing with focusWorker.js
- **Multi-mode**: Pomodoro (25m), Custom, Deep Work (90m), Quick Focus (15m)
- **Analytics**: Session tracking, productivity metrics, mood logging
- **Integration**: Connected to task system for focused work sessions

### Database Schema Evolution
```prisma
model Note {
  id               String  @id @default(cuid())
  title            String
  content          String  @db.Text        // Rich text JSON
  plainTextContent String? @db.Text        // Search indexing
  folderId         String?
  folder           Folder? @relation(fields: [folderId], references: [id])
  extractedTasks   Json?                   // AI-extracted tasks
  // ... organization, sharing, timestamps
}

model Folder {
  id       String  @id @default(cuid())
  name     String
  color    String
  parentId String?
  parent   Folder? @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[] @relation("FolderHierarchy")
  notes    Note[]
  // ... user relation, timestamps
}
```

### API Design Pattern
- **Consistent CRUD**: GET, POST, PATCH, DELETE across all resources
- **Search Integration**: Full-text search with filtering
- **Optimistic Updates**: Client-side optimistic mutations
- **Error Handling**: Standardized error responses

### Component Architecture
- **Feature-based Structure**: notes/, focus/, projects/
- **Reusable UI**: shadcn/ui components with Radix primitives
- **Custom Components**: TiptapEditor, FocusTimer, enhanced project cards
- **State Integration**: Hooks pattern for component-store connection

## Integration Points
- Notes → Tasks: AI task extraction from rich text content
- Focus → Tasks: Focus sessions linked to specific tasks
- Projects → Focus: Project-based focus session tracking
- Real-time Ready: Foundation for collaborative editing (Phase 3)