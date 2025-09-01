# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskMaster Pro is a full-stack productivity suite built with Test-Driven Development (TDD) methodology. The project is organized into three development phases with 12 specialized subgroups plus Phase X.5 review-and-fix sessions, totaling 15 development sessions.

## Architecture & Tech Stack

**Frontend**: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui components (Radix primitives)
**State Management**: TanStack Query (server state), Zustand (client state)  
**UI/UX**: Tiptap editor, FullCalendar, Recharts analytics, Framer Motion animations
**Backend**: Next.js API routes, Prisma ORM with PostgreSQL
**Testing**: Vitest (unit), Playwright (E2E), Testing Library (components)
**AI Integration**: OpenRouter/BYOK LLM for task extraction and planning agents

## Development Approach

### ⚠️ CRITICAL: MCP Server Integration Requirements
**MANDATORY**: All subgroups MUST utilize the 4 critical MCP servers for proper context management and development efficiency:

1. **Memory MCP** - Persistent project knowledge graph
2. **Serena MCP** - Semantic code analysis and architectural memory
3. **Playwright MCP** - E2E test execution for all 165 TDD tests  
4. **Context7 MCP** - Framework documentation access

**Session Startup**: ALWAYS run `/prime` command to verify MCP server operational status before beginning any subgroup.

### ⚠️ CRITICAL: Compaction-Based Development Workflow
**MANDATORY**: This project uses a subgroup-by-subgroup approach with compaction after EVERY subgroup:
1. **Initialize MCP Context**: Load previous memories and architectural context
2. Complete one subgroup fully (implementation + tests)
3. **Store MCP Context**: Update knowledge graph and architectural decisions
4. Update SUBGROUP_PROGRESS.md
5. Create git commit
6. **COMPACT SESSION** before moving to next subgroup
7. Never attempt multiple subgroups without compacting

**Total Compaction Points**: 15 (12 subgroups + 3 Phase X.5 reviews)
**Context Window Limit**: Never exceed 75% usage before compacting
**MCP Integration**: Each compaction point MUST include knowledge graph updates

### Phase X.5 Review-and-Fix Methodology
**CRITICAL DISCOVERY**: After completing all subgroups in each phase, conduct multi-agent collaborative review to identify critical blockers before advancing. This systematic approach ensures production readiness through quality gates.

#### **Phase X.5 Structure & Organization**
**Folder Structure**: `context_docs/phaseX/phaseX.5/`
- **Review Report**: `PHASE_X_COMPREHENSIVE_REVIEW_REPORT.md`
- **Overview Document**: `PHASE_X.5_OVERVIEW.md` 
- **Subgroup Context Docs**: `X.5.1_subgroup_name.md`, `X.5.2_subgroup_name.md`, etc.

#### **Phase X.5 Implementation Phases**
- **Phase 1.5**: Review after subgroups 1-5 → Infrastructure improvements → Approve Phase 2
- **Phase 2.5**: Review after subgroups 6-8 → Quality & production readiness → Approve Phase 3  
- **Phase 3.5**: Review after subgroups 9-12 → Final production hardening → Production deployment

#### **Phase X.5 Multi-Agent Review Process**
1. **Collaborative Review**: Deploy 5+ specialized agents (Frontend, Backend, Design, Security, etc.)
2. **Comprehensive Assessment**: Score each domain (0-100) with detailed findings
3. **Critical Issue Classification**: 🔴 Production Blockers, 🟡 Quality Improvements, 🟢 Future Enhancements
4. **Subgroup Structure Creation**: Break improvements into context-efficient subgroups (3-5 subgroups typical)
5. **MCP Integration Strategy**: Define specialized agent usage for each improvement subgroup
6. **Quality Transformation Plan**: Define current → target quality scores with measurable improvements

#### **Phase X.5 Subgroup Characteristics**
- **Context Efficiency**: Each subgroup designed for single-session completion
- **Domain Focus**: Focused improvements (visual design, accessibility, security, performance, etc.)
- **Estimated Effort**: 8-18 hours per subgroup with MCP integration
- **Compaction Requirements**: Mandatory compaction after each X.5 subgroup
- **Quality Gates**: Multi-agent validation before subgroup completion

#### **Phase X.5 Documentation Standards**
**Review Report Format**:
- Executive summary with composite quality scores
- Detailed agent reports with domain-specific findings
- Critical issues with impact assessment and estimated effort
- Success criteria and validation checklists

**Subgroup Context Doc Format**:
- Objectives and success metrics clearly defined
- MCP integration strategy specified
- Implementation approach with quality gates
- Testing strategy and validation requirements
- Deliverables and integration points documented

**Overview Document Format**:
- Phase X.5 mission and quality transformation goals
- Subgroup breakdown with effort estimates
- MCP utilization strategy across all subgroups
- Business impact and ROI analysis
- Success criteria and expected outcomes

#### **Phase X.5 Success Metrics**
- **Quality Score Improvement**: Minimum +5 points composite score improvement
- **Production Readiness**: Address all 🔴 critical production blockers
- **Enterprise Compliance**: Achieve accessibility, security, and performance standards
- **User Experience**: Measurable improvements in usability and engagement
- **Technical Debt**: Systematic elimination of identified technical debt

**Phase X.5 Integration**: Multi-agent review → Structured improvements → Quality transformation → Phase advancement

### TDD Methodology
1. **Tests First**: All features must have failing tests written before implementation
2. **Phase Gates**: 100% test pass rate required before advancing to next phase
3. **Test Coverage**: 165 total tests across all phases

### Phase Structure  
- **Phase 1**: Foundation & Infrastructure - 5 subgroups + Phase 1.5 review
- **Phase 2**: Core Features - 3 subgroups + Phase 2.5 review
- **Phase 3**: Production - 4 subgroups + Phase 3.5 review
- **Total**: 15 sessions (12 subgroups + 3 Phase X.5 reviews)

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

### Enterprise Branching Strategy
**Critical**: TaskMaster Pro uses a **subgroup-based branching strategy** with built-in safety nets:
- Each subgroup creates a permanent fallback branch (`feature/phase1-subgroup[N]-[name]`)
- 5 recovery points across Phase 1 development
- Zero-risk development with granular rollback capabilities
- **Full Documentation**: `BRANCHING_STRATEGY.md`

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

### Phase End Code Reviews:
1. **Collaborative Review**: Multi-agent code review at end of each phase
2. **Specialist Analysis**: Backend, Frontend, Senior Code Review, + Serena MCP
3. **Documentation**: Scribe agent generates comprehensive phase report
4. **Process**: Complete phase → Code review → Generate report → Compact → Next phase

### Context Management:
- **Green Zone (0-40%)**: Safe to continue
- **Yellow Zone (40-60%)**: Prepare for compaction
- **Red Zone (60%+)**: IMMEDIATE compaction required
- **Never exceed 75%**: Absolute maximum to prevent work loss

## MCP Server Integration

### 🚀 MANDATORY SUBGROUP WORKFLOW WITH MCP INTEGRATION

**CRITICAL**: Every subgroup MUST follow this MCP-integrated workflow:

#### Phase 1: Subgroup Initialization (REQUIRED)
1. **Session Startup**: Run `/prime` command to verify all MCP servers operational
2. **Load Context**: 
   ```javascript
   mcp__memory__search_nodes("subgroup_X") // Find related components/patterns
   mcp__serena__list_memories() // Review previous architectural decisions
   mcp__serena__read_memory("relevant_pattern") // Load specific context
   ```
3. **Framework Questions**: Use `mcp__context7__resolve-library-id()` for documentation needs

#### Phase 2: Implementation (CONTINUOUS)
1. **Store Decisions**: `mcp__serena__write_memory()` for architectural choices
2. **Update Relationships**: `mcp__memory__create_entities()` for new components
3. **Test Execution**: `mcp__playwright__*` commands for E2E test validation

#### Phase 3: Subgroup Completion (REQUIRED)
1. **Knowledge Graph Update**: 
   ```javascript
   mcp__memory__create_relations() // Component relationships
   mcp__memory__add_observations() // Implementation details
   ```
2. **Architectural Summary**: `mcp__serena__write_memory("subgroup_X_complete")`
3. **Progress Documentation**: Update SUBGROUP_PROGRESS.md
4. **Git Commit**: Create descriptive commit with MCP context preserved

### 🚀 SESSION STARTUP PROCEDURE (Run /prime command first)

When starting a new Claude session in the terminal, **always run the /prime command** which will:
1. Check git status and list all project files
2. Read key documentation files (README.md, CLAUDE.md, etc.)
3. Verify and report status of all MCP servers
4. Provide a comprehensive project understanding summary

### Critical MCP Servers Required for TaskMaster Pro

These four servers MUST be operational before starting implementation:

1. **memory** ✅ Required
   - Purpose: Persistent context across sessions and compaction points
   - Test: `write_memory("test", "Hello")` then `read_memory("test")`
   - Used for: Storing architectural decisions, progress tracking
   - **Workflow Integration**: Load context at subgroup start, update at completion

2. **playwright** ✅ Required  
   - Purpose: E2E testing for all 165 TDD tests
   - Test: Launch a browser window
   - Installation: `npm install -g @executeautomation/playwright-mcp-server`
   - **Workflow Integration**: Execute tests during implementation phase

3. **context7** ✅ Required
   - Purpose: Framework documentation and patterns
   - Test: Search for Next.js or React documentation
   - Installation: `npm install -g @upstash/context7-mcp`
   - **Workflow Integration**: Access documentation during implementation questions

4. **serena** ✅ Required
   - Purpose: Semantic code analysis and refactoring
   - Test: Will activate once first .ts/.tsx files are created
   - Config: `.serena/project.yml` already configured
   - **Workflow Integration**: Store architectural decisions throughout subgroup

### MCP Server Status Check Commands

Run these checks at session start to verify MCP availability:

```javascript
// 1. Memory Server Check
"Test memory MCP: write and read a test value"

// 2. Playwright Server Check  
"Test playwright MCP: check if browser automation tools are available"

// 3. Context7 Server Check
"Test context7 MCP: search for Next.js App Router documentation"

// 4. Serena Server Check (after creating first source file)
"Test Serena MCP: analyze project structure"
```

### Expected MCP Server Status Report Format

After running /prime, you should see:

```
MCP SERVER STATUS REPORT
========================
✅ Memory      - write_memory, read_memory, list_memories available
✅ Playwright  - Browser automation tools available
✅ Context7    - Documentation search tools available
⚠️  Serena     - Configured, awaiting source files

Ready to proceed: YES/NO
```

### If MCP Servers Are Not Available

**STOP** - Do not proceed with implementation without the 4 critical servers:

1. Ensure you're using Claude Desktop app (not VS Code extension)
2. Check configuration: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Restart Claude Desktop completely (Cmd+Q, then reopen)
4. Verify installations:
   ```bash
   npm list -g | grep -E "playwright-mcp|context7-mcp"
   which uvx  # For Serena
   ```

### Additional MCP Servers (Optional but Helpful)

- **sequential-thinking**: Complex analysis and debugging
- **cerebras**: Fast code generation at 2,000 tokens/sec
- **github/gitlab**: Version control operations (requires token)
- **postgres/sqlite**: Database operations
- **fetch**: Web fetching capabilities
- **brave-search**: Web search (requires API key)

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
- **COMPACTION IS MANDATORY** - Never skip the 15 compaction points (12 subgroups + 3 Phase X.5)
- **One subgroup at a time** - Never attempt multiple subgroups in one session
- **Phase X.5 Reviews Required** - Must conduct multi-agent review after each phase completion
- **Context limit is 75%** - Compact immediately if approaching this limit
- **Tests must pass 100%** - No moving forward with failing tests

### Development Guidelines:
- This is a **TDD project** - tests are already written, implement to pass them
- Follow the **15-session plan** strictly - 12 subgroups + 3 Phase X.5 reviews
- Maintain **design system consistency** across all components
- **Agent integration** is core to the product - prioritize AI features
- **Accessibility first** - every component must meet WCAG standards

### When Starting Implementation:
1. First read `IMPLEMENTATION_GUIDE.md` for the master plan
2. Check `SUBGROUP_PROGRESS.md` to see what's next
3. Follow `IMPLEMENTATION_WORKFLOW.md` for step-by-step process
4. Reference `DOCUMENTATION_MAP.md` if unsure which docs to use
5. Always compact after completing each subgroup