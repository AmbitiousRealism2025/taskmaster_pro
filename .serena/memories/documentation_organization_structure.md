# TaskMaster Pro Documentation Organization Structure

## CRITICAL: New Numbered Directory System (Implemented 2025-09-01)

All TaskMaster Pro documentation has been reorganized from scattered root directory files into a professional numbered directory structure in `docs/`. This is now the STANDARD for all file references.

## Directory Structure and Purposes

```
docs/
├── 01-getting-started/     # Entry point documentation - start here for new users
│   ├── README.md           # Project overview and current status  
│   ├── CLAUDE.md           # Coding standards and conventions
│   ├── PRE_IMPLEMENTATION_CHECKLIST.md # Readiness verification
│   └── DOCUMENTATION_MAP.md # Navigation guide (source of truth)
│
├── 02-implementation/      # Active development workflow guides
│   ├── IMPLEMENTATION_GUIDE.md # Master implementation strategy
│   ├── IMPLEMENTATION_WORKFLOW.md # Step-by-step process  
│   └── SUBGROUP_PROGRESS.md # Current progress and next steps
│
├── 03-methodology/         # Development philosophy and approaches
│   ├── PROJECT_PLANNING_METHODOLOGY.md # Complete methodology
│   ├── PHASE_X.5_METHODOLOGY.md # Quality assurance approach
│   ├── BRANCHING_STRATEGY.md # Git workflow patterns
│   ├── TaskMaster_Pro_TDD_Development_Plan.md # TDD planning
│   └── DOCUMENTATION_ORGANIZATION_PHILOSOPHY.md # This system's rationale
│
├── 04-testing/            # All test specifications  
│   ├── Phase1_Foundation_Tests.md # Foundation tests (32 tests)
│   └── Phase2_Feature_Tests.md # Core feature tests (29 tests)
│
├── 05-technical-setup/    # Configuration and tool setup
│   ├── MCP_SERVER_SETUP.md # MCP installation/config
│   ├── MCP_ACTIVATION_GUIDE.md # MCP troubleshooting
│   ├── SERENA_USAGE_GUIDE.md # Serena MCP patterns
│   ├── SUPABASE_INTEGRATION_PLAN.md # Database setup
│   └── TASKMASTER_PRO_CLI_ADAPTATION.md # CLI integration
│
├── 06-sessions/           # Progress tracking and session history
│   ├── SESSION_NOTES.md # Active session tracking
│   ├── SESSION_SUMMARY_SUBGROUP_8.md # Subgroup 8 completion
│   └── NEXT_SESSION_START.md # Next session prep
│
├── 07-phases/             # Phase-specific docs and reviews  
│   ├── Phase_Breakdown_Summary.md # Phase overview
│   ├── PHASE_1_REVIEW_RECOMMENDATIONS.md # Phase 1 assessment
│   └── PHASE_1_5_SUPABASE_MIGRATION_GUIDE.md # Migration guide
│
└── 08-misc/               # Miscellaneous documents
    └── Alternatives to Magic MCP for UI-UX (Free or Low-Cost) copy.md
```

## CRITICAL FILE PATH REFERENCES

When referencing documentation files, ALWAYS use the new paths:

### Most Important Files:
- **Implementation Guide**: `docs/02-implementation/IMPLEMENTATION_GUIDE.md`
- **Subgroup Progress**: `docs/02-implementation/SUBGROUP_PROGRESS.md`  
- **Documentation Map**: `docs/01-getting-started/DOCUMENTATION_MAP.md`
- **Methodology**: `docs/03-methodology/PROJECT_PLANNING_METHODOLOGY.md`
- **Test Files**: `docs/04-testing/Phase1_Foundation_Tests.md`, `docs/04-testing/Phase2_Feature_Tests.md`

### For Agents and References:
- Use relative paths from project root: `docs/XX-category/FILE.md`
- Update any hardcoded file paths in scripts or automation
- Navigation should follow numbered progression: 01 → 02 → 03 → etc.

## Architectural Decision Record

**Decision**: Implement numbered directory system for documentation organization
**Date**: 2025-09-01  
**Rationale**: 
- Professional enterprise-grade organization
- Clear learning progression for methodology teaching
- Reduced cognitive load for developers
- Supports systematic methodology instruction

**Impact**: All file references must be updated to reflect new structure
**Status**: Implemented, system-wide updates in progress

## Integration Points

### Context Documents (Unchanged):
- `context_docs/phase1/` - Implementation contexts (critical, unchanged)
- `context_docs/phase2/` - Core feature contexts  
- `context_docs/phase3/` - Production contexts

### MCP Integration:
- Memory MCP: Store this organizational knowledge in knowledge graph
- Serena MCP: This memory provides navigation for agents
- All agents should reference new docs/ structure

## Future Evolution

This organizational system is designed to scale and can accommodate:
- New numbered directories if major categories emerge
- Subdirectories within existing categories for growth
- Consistent patterns for new documentation types

**Key Principle**: Always organize around user learning progression, not technical architecture.