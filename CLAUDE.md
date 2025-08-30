# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskMaster Pro is a full-stack productivity suite built with Test-Driven Development (TDD) methodology. The project is organized into three development phases with 12 specialized subgroups for parallel development.

## Architecture & Tech Stack

**Frontend**: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui components (Radix primitives)
**State Management**: TanStack Query (server state), Zustand (client state)  
**UI/UX**: Tiptap editor, FullCalendar, Recharts analytics, Framer Motion animations
**Backend**: Next.js API routes, Prisma ORM with PostgreSQL
**Testing**: Vitest (unit), Playwright (E2E), Testing Library (components)
**AI Integration**: OpenRouter/BYOK LLM for task extraction and planning agents

## Development Approach

### TDD Methodology
1. **Tests First**: All features must have failing tests written before implementation
2. **Phase Gates**: 100% test pass rate required before advancing to next phase
3. **Specialized Test Agents**: Each phase has dedicated test designers for different concerns

### Phase Structure
- **Phase 1 (Weeks 1-4)**: Foundation & Infrastructure - 5 subgroups
- **Phase 2 (Weeks 5-8)**: Core Features - 3 subgroups  
- **Phase 3 (Weeks 9-12)**: Production - 4 subgroups

Each subgroup has coding context documents with implementation patterns and examples.

## Design System Standards

**Colors**: Purple→teal gradient accents, neutral slate backgrounds  
**Components**: 2xl border radius, soft drop shadows, glassy gradient effects  
**Typography**: Inter/SF fonts with responsive scaling  
**Icons**: lucide-react with consistent 18/20px (lists) and 24px (cards) sizing  
**Theme**: Full light/dark parity using CSS custom properties

## Key Implementation Patterns

### Component Structure
```typescript
// Follow shadcn/ui patterns with Radix primitives
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Use consistent priority color mapping:
// high=rose, medium=amber, low=emerald
```

### State Management
- **Server State**: TanStack Query for API data, caching, mutations
- **Client State**: Zustand stores for UI state, session data
- **Form State**: React Hook Form + Zod validation

### Testing Patterns
```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright) 
npm run test:e2e

# Component tests (Testing Library)
npm run test:components

# Run single test file
npm run test -- auth.test.ts
```

## Project File Organization

**Phase Test Files**: `Phase1_Foundation_Tests.md`, `Phase2_Feature_Tests.md`, `Phase3_Production_Tests.md` contain all failing tests to implement

**Documentation**: 
- `taskmaster_pro_docs/` - Core product specifications
- `UI-examples/` - Design reference screenshots
- `Phase_Breakdown_Summary.md` - Development roadmap

**Implementation Structure** (when built):
```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                # shadcn/ui components  
│   ├── dashboard/         # Dashboard-specific components
│   ├── tasks/            # Task management components
│   └── [feature]/        # Feature-specific components
├── lib/                  # Utilities, API clients, configurations
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

## AI Integration Patterns

**Task Extraction Agent**: Convert notes/content into structured tasks with priorities and estimates
**Day Planner Agent**: Generate time-blocked daily schedules from task lists
**MCP Integration**: Model Context Protocol servers for extended capabilities

## Quality Standards

**Accessibility**: WCAG 2.1 AA compliance, full keyboard navigation, screen reader labels
**Performance**: LCP < 2.5s, optimistic UI patterns, Web Workers for timers
**Security**: Row-level security, audit trails, secret management via environment variables

## Development Workflow

1. **Start with Tests**: Reference phase test files for failing tests to implement
2. **Follow TDD Cycle**: Red (failing test) → Green (minimal implementation) → Refactor
3. **Phase Completion**: All tests must pass before moving to next phase
4. **Parallel Development**: Subgroups can work independently within phases
5. **Integration Points**: Coordinate between subgroups at defined interfaces

## MCP Server Integration

When available, leverage specialized MCP servers:
- **Context7**: Library documentation and patterns
- **Sequential Thinking**: Complex analysis and debugging
- **Playwright**: Browser automation and E2E testing
- **Magic**: UI component generation from design patterns

## Testing Commands (Future)

```bash
# Development server
npm run dev

# Build for production  
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npx prisma migrate dev
npx prisma studio
npx prisma generate
```

## Important Notes

- This is a **TDD project** - tests must be written before implementation
- Follow the **3-phase development plan** strictly - no jumping ahead
- Maintain **design system consistency** across all components
- **Agent integration** is core to the product - prioritize AI features
- **Accessibility first** - every component must meet WCAG standards