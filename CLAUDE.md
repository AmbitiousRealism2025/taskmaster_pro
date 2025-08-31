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

### ⚠️ CRITICAL: Compaction-Based Development Workflow
**MANDATORY**: This project uses a subgroup-by-subgroup approach with compaction after EVERY subgroup:
1. Complete one subgroup fully (implementation + tests)
2. Update SUBGROUP_PROGRESS.md
3. Create git commit
4. **COMPACT SESSION** before moving to next subgroup
5. Never attempt multiple subgroups without compacting

**Total Compaction Points**: 12 (one after each subgroup)
**Context Window Limit**: Never exceed 75% usage before compacting

### TDD Methodology
1. **Tests First**: All features must have failing tests written before implementation
2. **Phase Gates**: 100% test pass rate required before advancing to next phase
3. **Test Coverage**: 165 total tests across all phases

### Phase Structure
- **Phase 1 (Weeks 1-4)**: Foundation & Infrastructure - 5 subgroups
- **Phase 2 (Weeks 5-8)**: Core Features - 3 subgroups  
- **Phase 3 (Weeks 9-12)**: Production - 4 subgroups

Each subgroup has:
- Coding context document in `context_docs/phase[1-3]/`
- Implementation notes header with dependencies
- Specific test coverage references
- Related enhancement documents when applicable

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

**Implementation Guides** (Start Here):
- `IMPLEMENTATION_GUIDE.md` - Master plan with compaction workflow
- `IMPLEMENTATION_WORKFLOW.md` - Step-by-step for each subgroup
- `SUBGROUP_PROGRESS.md` - Track progress and compaction points
- `DOCUMENTATION_MAP.md` - Document relationships
- `PRE_IMPLEMENTATION_CHECKLIST.md` - Readiness verification

**Test Files** (165 Total Tests):
- `Phase1_Foundation_Tests.md` - 32 tests for subgroups 1-5
- `Phase2_Feature_Tests.md` - 29 tests for subgroups 6-8
- `Phase3_Production_Tests_ENHANCED.md` - 104 tests for subgroups 9-12

**Context Documentation**:
- `context_docs/phase1/` - 5 foundation subgroup guides
- `context_docs/phase2/` - 3 core feature guides
- `context_docs/phase3/` - 4 production guides
- `context_docs/security_enhancements/` - Security improvements
- `context_docs/performance_optimizations/` - Performance docs
- `context_docs/architecture_improvements/` - Architecture patterns

**Reference Documentation**:
- `taskmaster_pro_docs/` - Original product specifications
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

### Subgroup Implementation Process (MUST FOLLOW):
1. **Load Documentation**: Only load the specific subgroup context doc + tests
2. **Implement Subgroup**: Complete all functionality for that subgroup
3. **Run Tests**: Ensure 100% of subgroup tests pass
4. **Update Progress**: Mark complete in SUBGROUP_PROGRESS.md
5. **Git Commit**: Create descriptive commit for the subgroup
6. **COMPACT**: Use /compact command before starting next subgroup

### TDD Cycle:
1. **Red Phase**: Write/load failing tests first
2. **Green Phase**: Minimal implementation to pass tests
3. **Refactor Phase**: Improve code quality while keeping tests green

### Context Management:
- **Green Zone (0-40%)**: Safe to continue
- **Yellow Zone (40-60%)**: Prepare for compaction
- **Red Zone (60%+)**: IMMEDIATE compaction required
- **Never exceed 75%**: Absolute maximum to prevent work loss

## MCP Server Integration

The following MCP servers are configured and available:
- **filesystem**: File system operations in the TaskMaster Pro directory
- **memory**: Persistent memory across sessions for project context
- **playwright**: Browser automation and E2E testing (globally installed)
- **context7**: Documentation patterns and library references (globally installed)
- **cerebras**: Fast code generation at 2,000 tokens/sec (globally installed)
- **sequential-thinking**: Complex analysis and debugging
- **github/gitlab**: Version control operations (requires token configuration)
- **postgres/sqlite**: Database operations for project data
- **fetch**: Web fetching capabilities for external resources
- **brave-search**: Web search functionality (requires API key)

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

### ⚠️ Critical Rules:
- **COMPACTION IS MANDATORY** - Never skip the 12 compaction points
- **One subgroup at a time** - Never attempt multiple subgroups in one session
- **Context limit is 75%** - Compact immediately if approaching this limit
- **Tests must pass 100%** - No moving forward with failing tests

### Development Guidelines:
- This is a **TDD project** - tests are already written, implement to pass them
- Follow the **12-subgroup plan** strictly - no jumping ahead
- Maintain **design system consistency** across all components
- **Agent integration** is core to the product - prioritize AI features
- **Accessibility first** - every component must meet WCAG standards

### When Starting Implementation:
1. First read `IMPLEMENTATION_GUIDE.md` for the master plan
2. Check `SUBGROUP_PROGRESS.md` to see what's next
3. Follow `IMPLEMENTATION_WORKFLOW.md` for step-by-step process
4. Reference `DOCUMENTATION_MAP.md` if unsure which docs to use
5. Always compact after completing each subgroup