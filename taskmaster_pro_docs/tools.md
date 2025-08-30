# TaskMaster Pro — Tools, Tech & Building Blocks

## Frontend (Next.js + React, TypeScript)
- **Next.js (App Router), TypeScript, Tailwind CSS**
- **shadcn/ui** (Radix primitives): `Card`, `Button`, `Badge`, `DropdownMenu`, `Command`, `Dialog`, `Sheet`, `Tabs`, `Calendar`, `Tooltip`, `Switch`, `Progress`  
- **State & data**: TanStack Query (server cache), Zustand (UI state), React Hook Form + Zod (forms & validation)
- **Charts**: Recharts (analytics + progress sparklines)
- **Calendar**: FullCalendar or React Big Calendar (drag-drop tasks, resource view)
- **Editor**: Tiptap (Markdown mode) or MDX + Remark plugins
- **Motion & polish**: Framer Motion micro-interactions, day/night token theming
- **Accessibility**: Radix + testing with axe-core; focus rings, reduced motion mode
- **PWA**: offline capture, installable app, background sync of queued mutations

## Backend & Infra
- **API**: Next.js Route Handlers (REST) or tRPC; WebSocket events for live updates
- **DB**: Postgres (Supabase) + **Prisma**; **pgvector** for embeddings; **Redis** for jobs/session cache
- **Auth**: Auth.js (NextAuth) with OAuth + email magic link
- **Scheduling**: Temporal.io or BullMQ (recurring tasks, reminders, streak rollups)
- **Search**: Postgres full-text + vector hybrid; optional Pinecone for scale
- **Files**: S3-compatible storage (R2/S3) for attachments & note images
- **Observability**: Sentry (errors), OpenTelemetry, PostHog (product analytics)
- **Testing**: Vitest + **Playwright** (also exposed via MCP—see below)
- **Security**: Row-level security (Supabase), secret vaulting (Doppler/1Password), audit trails

## AI & MCP (Model Context Protocol) layer
- **LLM routing**: OpenRouter (BYOK compatible—Chutes, Cerebras, DeepSeek, etc.)
- **Embeddings**: pluggable (OpenAI, Voyage, E5-Mistral, or Chutes embeddings)
- **MCP servers (useful starters):**
  - **Playwright MCP**: browse/workflows—capture tasks from Jira/Trello/Email UIs, check due dates, verify shipped pages; regression test UI.
  - **Context7 MCP**: context indexer across docs, Obsidian vault, Drive, and calendar; enables semantic search + “next best action.”
  - **Calendar MCP** (Google/Microsoft): read/write events, detect conflicts, propose time slots.
  - **Notifications MCP**: send email/Slack/Push summaries (daily plan, session recap).
  - **Filesystem/Obsidian MCP**: round-trip Markdown notes, maintain backlinks.
- **House agents**:
  - *Task Extractor*: notes → tasks (+estimates, priority)
  - *Day Planner*: composes time-blocked daily plan
  - *Nudge Coach*: habit nudges, streak recovery
  - *Analyst*: weekly retro & insights
