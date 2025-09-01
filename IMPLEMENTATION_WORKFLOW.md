# TaskMaster Pro - Detailed Implementation Workflow

## Subgroup Implementation Template

This document provides the step-by-step workflow for implementing each of the 12 subgroups. Follow this EXACTLY for each subgroup to ensure quality and prevent context issues.

---

## Pre-Implementation Checklist (Start of Each Subgroup)

### Session Preparation
```bash
# 1. Check current context state
Context usage should be <10% at start

# 2. Verify previous subgroup completion
git log --oneline -5  # Should show previous subgroup commit
npm test -- --grep="previous-subgroup"  # Should pass

# 3. Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/phaseX-subgroupY-description

# 4. Document session start
echo "Starting Subgroup X: [Name] - $(date)" >> SESSION_LOG.md
```

### Documentation Loading
```markdown
LOAD ONLY THESE DOCUMENTS:
1. Primary: context_docs/phaseX/0Y_subgroup_name.md
2. Tests: PhaseX_Tests.md (specific section only)
3. Enhancements: Only if listed in IMPLEMENTATION_GUIDE.md
4. DO NOT LOAD: Future phases, unrelated subgroups, UI mockups
```

### Context Check
- [ ] Context usage <20% after loading docs
- [ ] Previous tests still passing
- [ ] Git branch created
- [ ] Session documented

---

## Implementation Phase (Core Development)

### Step 1: Project Scaffolding (First Subgroup Only)

If this is Subgroup 1, initialize the project:
```bash
# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install core dependencies
npm install prisma @prisma/client
npm install @tanstack/react-query zustand
npm install zod react-hook-form @hookform/resolvers
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Install dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D vitest @vitejs/plugin-react @testing-library/react
npm install -D @playwright/test
npm install -D eslint prettier eslint-config-prettier

# Initialize Prisma
npx prisma init
```

### Step 2: Write Failing Tests First (TDD)

```typescript
// 1. Create test file for subgroup
mkdir -p src/__tests__/phaseX
touch src/__tests__/phaseX/subgroupY.test.ts

// 2. Copy tests from PhaseX_Tests.md
// 3. Ensure all tests fail initially
npm test -- src/__tests__/phaseX/subgroupY.test.ts

// Expected: All tests should fail (red phase)
```

### Step 3: Implement Core Functionality

Follow this order for each subgroup:

#### A. Data Layer (if applicable)
```typescript
// 1. Define Prisma models
// 2. Create migrations
npx prisma migrate dev --name add_subgroup_models

// 3. Generate Prisma client
npx prisma generate

// 4. Create repository layer
mkdir -p src/lib/repositories
```

#### B. API Routes (if applicable)
```typescript
// 1. Create API route structure
mkdir -p src/app/api/subgroup-endpoint

// 2. Implement route handlers
// 3. Add validation with Zod
// 4. Include error handling
```

#### C. UI Components (if applicable)
```typescript
// 1. Create component structure
mkdir -p src/components/subgroup-name

// 2. Build with shadcn/ui patterns
// 3. Add proper TypeScript types
// 4. Include loading/error states
```

#### D. State Management (if applicable)
```typescript
// 1. Create Zustand stores
mkdir -p src/stores

// 2. Implement TanStack Query hooks
mkdir -p src/hooks

// 3. Add proper type definitions
```

### Step 4: Integration Testing

```bash
# Run subgroup-specific tests
npm test -- src/__tests__/phaseX/subgroupY.test.ts

# Run integration tests with previous subgroups
npm test -- src/__tests__/integration/

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Step 5: Fix Until Green

Iterate until:
- [ ] All subgroup tests pass
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Integration verified

---

## Post-Implementation Phase (Completion & Documentation)

### Step 1: Code Quality Check

```bash
# Check test coverage
npm run test:coverage -- src/components/subgroup-name

# Check bundle size (if frontend)
npm run build
npm run analyze

# Check for TODO comments
grep -r "TODO" src/ --exclude-dir=node_modules

# Check for console.logs
grep -r "console.log" src/ --exclude-dir=node_modules
```

### Step 2: Documentation Update

Update `SUBGROUP_PROGRESS.md`:
```markdown
## Phase X: [Name]
- [x] Subgroup Y: [Name] ✅ COMPLETE (Date)
  - Tests: X/X passing
  - Coverage: XX%
  - Integration: Verified
  - Notes: [Any important decisions or deviations]
```

### Step 3: Git Commit

```bash
# Stage all changes
git add .

# Create descriptive commit
git commit -m "feat(phaseX): Complete Subgroup Y - [Name]

- Implemented [key features]
- All X tests passing
- Integration with previous subgroups verified
- [Any special notes]

Tests: X/X passing
Coverage: XX%
Context: Used XX% before compaction"

# Push to remote
git push origin feature/phaseX-subgroupY-description
```

### Step 4: Create Pull Request (Optional)

If using PR workflow:
```bash
# Create PR to dev branch
gh pr create --title "Phase X Subgroup Y: [Name]" \
  --body "## Summary
  - Completed implementation of [subgroup name]
  - All tests passing (X/X)
  - Ready for compaction
  
  ## Checklist
  - [x] Tests passing
  - [x] TypeScript clean
  - [x] Lint clean
  - [x] Documentation updated"
```

### Step 5: Merge and Checkpoint

```bash
# Merge feature branch
git checkout dev
git merge feature/phaseX-subgroupY-description

# Create checkpoint tag
git tag -a "subgroup-Y-complete" -m "Subgroup Y implementation complete"

# Push everything
git push origin dev --tags

# Clean up feature branch
git branch -d feature/phaseX-subgroupY-description
```

---

## MANDATORY COMPACTION PHASE

### Step 1: Final Context Check

```markdown
Current context usage: [X%]
- If <60%: Good to compact
- If 60-75%: Must compact now
- If >75%: EMERGENCY - Save work immediately
```

### Step 2: Create Compaction Summary

Create/update `COMPACTION_LOG.md`:
```markdown
## Compaction #Y - Subgroup Y Complete
Date: [Date]
Context Before: X%
Subgroup: Phase X, Subgroup Y - [Name]

### Completed:
- [List key implementations]
- All tests passing (X/X)
- Integration verified

### Next Subgroup:
- Phase X, Subgroup Y+1 - [Name]
- Context doc: [path]
- Tests: [reference]

### Notes:
[Any important context for next session]
```

### Step 3: Execute Compaction

```bash
# Use the /compact command in your Claude interface
/compact

# After compaction, verify:
- Context reset to near 0%
- Session summary saved
- Ready for next subgroup
```

---

## Context Window Management During Implementation

### Monitor Usage Continuously

Check context usage:
- After loading documentation: Should be <20%
- After writing tests: Should be <30%
- After implementation: Should be <50%
- Before final testing: Should be <60%
- **NEVER exceed 75%**

### Warning Signs to Compact Early

Compact immediately if:
- Response times slow down
- Code suggestions become less accurate
- You're repeating information
- Context usage jumps significantly
- You feel "context pressure"

### Emergency Save Procedure

If approaching context limit:
```bash
# 1. STOP all work
# 2. Save current state
git add .
git commit -m "WIP: Emergency save before compaction"

# 3. Document current task
echo "EMERGENCY SAVE: Was working on [specific task]" >> RECOVERY_NOTES.md

# 4. Compact immediately
```

---

## Subgroup-Specific Workflows

### Phase 1 Subgroups (Foundation)

Focus on:
- Setting up infrastructure
- Creating reusable components
- Establishing patterns
- Building authentication

Each should be independent but build on previous.

### Phase 2 Subgroups (Core Features)

Focus on:
- Implementing business logic
- Creating user workflows
- Adding AI integration
- Building real-time features

Heavier integration with Phase 1 components.

### Phase 3 Subgroups (Production)

Focus on:
- Performance optimization
- External integrations
- PWA capabilities
- Production hardening

May require revisiting earlier code for optimization.

---

## Quality Gates

Each subgroup must pass these gates before compaction:

### Gate 1: Functionality
- [ ] All features implemented
- [ ] No placeholder code
- [ ] No TODO comments

### Gate 2: Testing
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] Integration verified

### Gate 3: Code Quality
- [ ] TypeScript clean
- [ ] Lint clean
- [ ] No console.logs

### Gate 4: Documentation
- [ ] Progress tracked
- [ ] Decisions documented
- [ ] Ready for handoff

### Gate 5: Version Control
- [ ] Changes committed
- [ ] Branch merged
- [ ] Tag created

---

## Troubleshooting Common Issues

### Issue: Tests failing after compaction
**Solution**: Load previous session summary, check integration points

### Issue: Can't remember previous decisions
**Solution**: Check COMPACTION_LOG.md and git commits

### Issue: Context growing too fast
**Solution**: Unload unnecessary docs, focus on current task only

### Issue: Unsure what's next
**Solution**: Check SUBGROUP_PROGRESS.md and IMPLEMENTATION_GUIDE.md

### Issue: Integration conflicts
**Solution**: Review previous subgroup's exports and public API

---

## Session Recovery After Break

When returning after a break:

1. **Check Progress**
   ```bash
   cat SUBGROUP_PROGRESS.md
   git log --oneline -10
   ```

2. **Verify State**
   ```bash
   npm test
   git status
   ```

3. **Load Context**
   - Previous compaction summary
   - Current subgroup documentation
   - Any RECOVERY_NOTES.md

4. **Continue Workflow**
   - Pick up from last checkpoint
   - Follow normal workflow

---

## Phase X.5 Review-and-Fix Workflow

### When to Execute Phase X.5

After completing ALL subgroups in a phase:
- Phase 1: After Subgroups 1-5 complete
- Phase 2: After Subgroups 6-8 complete  
- Phase 3: After Subgroups 9-12 complete

### Phase X.5 Implementation Steps

#### Step 1: Multi-Agent Code Review
```markdown
REVIEW PROCESS:
1. Start fresh session (after final subgroup compaction)
2. Load comprehensive project state
3. Execute multi-agent collaborative review:
   - Backend Architect
   - Frontend Architect
   - Security Specialist
   - Code Quality Auditor
   - Any other relevant specialists
4. Document all findings in PHASE_X_REVIEW_REPORT.md
```

#### Step 2: Critical Issues Identification
```markdown
CATEGORIZE FINDINGS:
- P0 Critical: Blocks next phase (MUST fix)
- P1 High: Significant issues (SHOULD fix)
- P2 Medium: Improvements (NICE to fix)
- P3 Low: Minor optimizations (CAN defer)

FOCUS: Only address P0 and critical P1 issues in Phase X.5
```

#### Step 3: Create Phase X.5 Plan
```markdown
CREATE DOCUMENTS:
- PHASE_X_5_REVIEW_FINDINGS.md (Issues discovered)
- PHASE_X_5_IMPLEMENTATION_PLAN.md (Fix roadmap)

PLAN STRUCTURE:
1. Executive Summary
2. Critical Blockers (P0)
3. High Priority Issues (P1)
4. Implementation Timeline
5. Success Criteria
```

#### Step 4: Implement Fixes
```bash
# Create Phase X.5 branch
git checkout -b phase-X.5-review-fixes

# For each critical issue:
# 1. Create focused fix
# 2. Test thoroughly
# 3. Verify integration
# 4. Document resolution

# Commit each fix
git commit -m "fix(phase-X.5): [specific issue resolved]"
```

#### Step 5: Verification & Sign-off
```markdown
FINAL VERIFICATION:
1. All P0 issues resolved
2. Critical P1 issues addressed
3. Integration tests passing
4. No new critical issues introduced
5. Phase marked production-ready

CREATE: PHASE_X_5_COMPLETION_REPORT.md
UPDATE: Main project status documents
```

#### Step 6: Phase X.5 Compaction
```bash
# Merge fixes
git checkout dev
git merge phase-X.5-review-fixes

# Tag phase completion
git tag -a "phase-X-complete" -m "Phase X fully complete with X.5 fixes"

# Push everything
git push origin dev --tags

# COMPACT for next phase
/compact
```

### Phase X.5 Benefits Realized

**From Phase 1.5 Experience**:
- ✅ Critical QueryClient Provider blocker resolved
- ✅ Mock implementations replaced with production APIs
- ✅ Authentication and security hardened
- ✅ Performance monitoring implemented
- ✅ Overall quality score improved from 8.09 to 8.5

### Phase X.5 Documentation Standards

Each Phase X.5 must create:
- `PHASE_X_5_REVIEW_FINDINGS.md` - Detailed issues list
- `PHASE_X_5_IMPLEMENTATION_PLAN.md` - Fix strategy
- `PHASE_X_5_COMPLETION_REPORT.md` - Final verification
- Updated main status documents (README, SUBGROUP_PROGRESS)

### Integration with Main Project Timeline

**Updated Project Timeline**:
- Phase 1: 5 subgroups + Phase 1.5 = 6 sessions
- Phase 2: 3 subgroups + Phase 2.5 = 4 sessions  
- Phase 3: 4 subgroups + Phase 3.5 = 5 sessions
- **Total: 15 sessions** (instead of original 12)

---

## Success Criteria Summary

A subgroup is complete when:
- ✅ 100% tests passing
- ✅ Clean code (no warnings)
- ✅ Documentation updated
- ✅ Git commit created
- ✅ Compaction completed
- ✅ Next person can start fresh

---

*Remember: Quality over speed. One complete subgroup is better than three partial ones.*