# TaskMaster Pro - Implementation Guide

## ⚠️ CRITICAL: Compaction-Based Development Workflow

**MANDATORY**: This project MUST be implemented using a subgroup-by-subgroup approach with compaction after EVERY subgroup completion. Failure to follow this workflow will result in context window overflow and potential loss of work.

## Implementation Philosophy

**Slow and Steady Wins**: We prioritize quality and stability over speed. Each of the 12 subgroups must be:
1. Fully implemented
2. Tested completely
3. Documented properly
4. **COMPACTED before proceeding**

**Never Skip Compaction**: Even if context seems manageable, compact anyway. This ensures:
- Clean start for each subgroup
- No accumulated context debt
- Clear checkpoint commits
- Easy rollback if needed

## The 15-Session Implementation Cycle (12 Subgroups + 3 Phase X.5 Reviews)

### Total Implementation Sessions: 15 (12 subgroups + 3 Phase X.5 reviews)
### Total Compaction Points: 15 
### Expected Timeline: 15 weeks (includes Phase X.5 review-and-fix sessions)

## Implementation Workflow (MUST FOLLOW)

```
FOR EACH OF THE 12 SUBGROUPS:
┌─────────────────────────────────────┐
│ 1. START FRESH SESSION              │
│    - After previous compaction      │
│    - Context usage should be <10%   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. LOAD DOCUMENTATION               │
│    - Subgroup context doc           │
│    - Related test file section      │
│    - Applicable enhancements only   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. IMPLEMENT SUBGROUP               │
│    - Follow TDD (tests first)       │
│    - Complete all functionality     │
│    - No partial implementations     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. TEST & VALIDATE                  │
│    - Run subgroup tests             │
│    - Verify integration             │
│    - Fix any failures               │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. DOCUMENT & COMMIT                │
│    - Update SUBGROUP_PROGRESS.md    │
│    - Create git commit              │
│    - Note any decisions/deviations  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 6. MANDATORY COMPACTION             │
│    - Use /compact command           │
│    - Verify clean state             │
│    - Ready for next subgroup        │
└─────────────────────────────────────┘
```

## Phase 1: Foundation (5 Compaction Points)

### Subgroup 1: Infrastructure Foundation
- **Context**: `context_docs/phase1/01_infrastructure_foundation.md`
- **Tests**: Phase1_Foundation_Tests.md (Tests 1-6)
- **Enhancements**: None
- **Dependencies**: None (first subgroup)
- **COMPACT AFTER COMPLETION**

### Subgroup 2: Authentication & Security  
- **Context**: `context_docs/phase1/02_authentication_security.md`
- **Tests**: Phase1_Foundation_Tests.md (Tests 7-11)
- **Enhancements**: 
  - `security_enhancements/SECURE_AUTH_REPLACEMENT.md`
  - `security_enhancements/SECURITY_AUDIT_REPORT.md`
- **Dependencies**: Subgroup 1 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 3: Design System & Core UI
- **Context**: `context_docs/phase1/03_design_system_core_ui.md`
- **Tests**: Phase1_Foundation_Tests.md (Tests 12-17)
- **Enhancements**: None
- **Dependencies**: Subgroups 1-2 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 4: Dashboard Layout & Navigation
- **Context**: `context_docs/phase1/04_dashboard_layout_navigation.md`
- **Tests**: Phase1_Foundation_Tests.md (Tests 18-23)
- **Enhancements**: None
- **Dependencies**: Subgroups 1-3 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 5: Core API & Data Management
- **Context**: `context_docs/phase1/05_core_api_data_management.md`
- **Tests**: Phase1_Foundation_Tests.md (Tests 24-32)
- **Enhancements**:
  - `security_enhancements/SECURE_DATABASE_REPLACEMENT.md`
  - `security_enhancements/SQL_INJECTION_FIXES.md`
- **Dependencies**: Subgroups 1-4 complete
- **COMPACT AFTER COMPLETION**

## Phase 2: Core Features (3 Compaction Points)

### Subgroup 6: Task Management Core
- **Context**: `context_docs/phase2/01_task_management_core.md`
- **Tests**: Phase2_Feature_Tests.md (Tests 1-12)
- **Enhancements**: None
- **Dependencies**: Phase 1 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 7: Content & Focus Systems
- **Context**: `context_docs/phase2/02_content_focus_systems.md`
- **Tests**: Phase2_Feature_Tests.md (Tests 13-22)
- **Enhancements**: Dashboard completion fixes included
- **Dependencies**: Subgroup 6 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 8: Real-time & State Orchestration
- **Context**: `context_docs/phase2/03_realtime_state_orchestration.md`
- **Tests**: Phase2_Feature_Tests.md (Tests 23-29)
- **Enhancements**: None
- **Dependencies**: Subgroups 6-7 complete
- **COMPACT AFTER COMPLETION**

## Phase 3: Production (4 Compaction Points)

### Subgroup 9: Data Intelligence & Analytics
- **Context**: `context_docs/phase3/01_data_intelligence_analytics.md`
- **Tests**: Phase3_Production_Tests_ENHANCED.md (Tests 1-20)
- **Enhancements**:
  - `performance_optimizations/DATABASE_INDEXING_STRATEGY.md`
  - `performance_optimizations/PRISMA_ANALYTICS_SCHEMA_OPTIMIZATIONS.md`
- **Dependencies**: Phase 2 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 10: External Integration Layer
- **Context**: `context_docs/phase3/02_external_integration_layer_ENHANCED.md`
- **Tests**: Phase3_Production_Tests_ENHANCED.md (Tests 21-35)
- **Enhancements**:
  - `architecture_improvements/CALENDAR_SERVICE_ARCHITECTURE.md`
  - `performance_optimizations/NOTIFICATION_BATCHING_ARCHITECTURE.md`
- **Dependencies**: Subgroup 9 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 11: PWA & Offline Infrastructure
- **Context**: `context_docs/phase3/03_pwa_offline_infrastructure.md`
- **Tests**: Phase3_Production_Tests_ENHANCED.md (Tests 36-50)
- **Enhancements**: None
- **Dependencies**: Subgroups 9-10 complete
- **COMPACT AFTER COMPLETION**

### Subgroup 12: Production Infrastructure & Security
- **Context**: `context_docs/phase3/04_production_infrastructure_security.md`
- **Tests**: Phase3_Production_Tests_ENHANCED.md (Tests 51-63+)
- **Enhancements**: All security patches applied
- **Dependencies**: Subgroups 9-11 complete
- **COMPACT AFTER COMPLETION**

## Phase X.5 Review-and-Fix Methodology

### ⚠️ NEW CRITICAL DISCOVERY: Post-Phase Review Pattern

Based on actual implementation experience, we've discovered that after completing each major phase (all subgroups), a structured review and fix process is essential. This becomes **Phase X.5**.

### Phase Completion Review Process

```
AFTER COMPLETING ALL SUBGROUPS IN A PHASE:
┌─────────────────────────────────────┐
│ 1. COMPREHENSIVE CODE REVIEW        │
│    - Multi-agent collaborative      │
│    - All specialists (4-6 agents)   │
│    - Document findings and scores   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. IDENTIFY CRITICAL BLOCKERS       │
│    - Issues preventing next phase   │
│    - Integration problems           │
│    - Missing core functionality     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. CREATE PHASE X.5 PLAN            │
│    - Document all required fixes    │
│    - Prioritize by severity         │
│    - Create implementation roadmap  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. IMPLEMENT PHASE X.5 FIXES        │
│    - Address all blocking issues    │
│    - Verify integration             │
│    - Re-test affected areas         │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. FINAL VERIFICATION               │
│    - All blockers resolved          │
│    - Phase marked production-ready  │
│    - Next phase approved for start  │
└─────────────────────────────────────┘
```

### Examples of Phase X.5 Issues

**Phase 1.5 (Actual Experience)**:
- Missing QueryClient Provider (Critical Blocker)
- Mock implementations not replaced with real APIs
- Authentication middleware temporarily disabled
- Rate limiting not fully implemented

**Potential Phase 2.5 Issues**:
- Real-time updates not working properly
- Task management UI/UX problems
- Performance issues with large datasets
- Integration gaps between major features

**Potential Phase 3.5 Issues**:
- PWA installation problems
- Offline sync conflicts
- Production deployment configuration
- Security hardening gaps

### Phase X.5 Benefits

1. **Quality Assurance**: Catch integration issues before they compound
2. **Risk Mitigation**: Address problems when context is fresh
3. **Clean Transitions**: Each phase truly ready for the next
4. **Technical Debt Prevention**: Fix issues immediately, not later
5. **Confidence Building**: Know the foundation is solid

### Phase X.5 Documentation

Each Phase X.5 should create:
- `PHASE_X_5_REVIEW_FINDINGS.md` - Issues discovered
- `PHASE_X_5_IMPLEMENTATION_PLAN.md` - Fix roadmap  
- `PHASE_X_5_COMPLETION_REPORT.md` - Final verification

### Integration with Main Workflow

The 12-subgroup cycle becomes:
1. **Phase 1**: Subgroups 1-5 → Phase 1.5 Review & Fix
2. **Phase 2**: Subgroups 6-8 → Phase 2.5 Review & Fix  
3. **Phase 3**: Subgroups 9-12 → Phase 3.5 Review & Fix

**Total Sessions**: 12 subgroups + 3 phase reviews = **15 sessions**

## Context Window Management Rules

### Green Zone (0-40% context usage)
- Safe to continue implementation
- Can load additional reference docs if needed

### Yellow Zone (40-60% context usage)
- Complete current task only
- Prepare for compaction
- No new major features

### Red Zone (60%+ context usage)
- IMMEDIATE COMPACTION REQUIRED
- Save all work
- Document current state
- Compact before any further work

### Never Exceed 75% Context
If approaching 75%, STOP immediately and compact. This is the absolute maximum to prevent work loss.

## Documentation Hierarchy

### Primary Documents (Always Load for Subgroup)
1. Specific subgroup context document
2. Relevant test file section
3. This implementation guide (for reference)

### Secondary Documents (Load as Needed)
1. Applicable enhancement documents
2. CLAUDE.md for coding standards
3. Previous subgroup integration points

### Reference Only (Don't Load Unless Critical)
1. Overall architecture documents
2. Future phase documentation
3. UI examples and mockups

## Git Workflow for Subgroups

Each subgroup should have:
```bash
# Before starting subgroup
git checkout -b feature/phase1-subgroup1-infrastructure

# After completing subgroup (before compaction)
git add .
git commit -m "feat(phase1): Complete infrastructure foundation subgroup

- Docker and CI/CD setup complete
- Development environment configured
- All 6 tests passing
- Ready for compaction"

git checkout dev
git merge feature/phase1-subgroup1-infrastructure
git branch -d feature/phase1-subgroup1-infrastructure

# THEN COMPACT
```

## Common Pitfalls to Avoid

### ❌ DON'T
- Try to implement multiple subgroups in one session
- Skip compaction because "context seems fine"
- Load all documentation at once
- Implement features from future subgroups
- Leave failing tests "to fix later"

### ✅ DO
- Complete one subgroup fully before moving on
- Compact after EVERY subgroup
- Load only necessary documentation
- Fix all tests before marking complete
- Document decisions and deviations

## Verification Checklist (Per Subgroup)

Before marking a subgroup complete and compacting:

- [ ] All subgroup tests passing
- [ ] Integration with previous subgroups verified
- [ ] No TODO comments in implementation
- [ ] Error handling implemented
- [ ] TypeScript types complete
- [ ] Documentation updated
- [ ] Git commit created
- [ ] SUBGROUP_PROGRESS.md updated
- [ ] Context usage checked (<60% ideal)
- [ ] Ready to compact

## Emergency Procedures

### If Context Window Exceeded
1. STOP all work immediately
2. Save any uncommitted changes
3. Document current state in RECOVERY_NOTES.md
4. Compact session
5. Resume from last git commit

### If Tests Failing After Compaction
1. Load previous session summary
2. Check integration points
3. Verify no code was lost
4. Fix issues before proceeding

### If Unclear on Next Steps
1. Check SUBGROUP_PROGRESS.md
2. Verify last completed subgroup
3. Load next subgroup documentation
4. Continue with workflow

## Success Metrics

Each subgroup is successful when:
- 100% of subgroup tests pass
- Integration with previous work verified
- Clean compaction completed
- Git commit created
- Next developer can start fresh

## Final Notes

Remember: This is a marathon, not a sprint. Taking time to properly complete and compact each subgroup ensures:
- Higher quality code
- Fewer integration issues
- Clear development history
- Maintainable codebase
- No context window problems

**The goal is not speed, but sustainable, high-quality development.**

---

*Last Updated: Before Implementation Start*
*Total Subgroups: 12*
*Phase X.5 Reviews: 3* 
*Total Sessions: 15*
*Total Compactions Required: 15*
*Estimated Timeline: 15 weeks*