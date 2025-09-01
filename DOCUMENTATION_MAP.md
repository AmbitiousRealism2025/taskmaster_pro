# TaskMaster Pro - Documentation Map

## Document Hierarchy & Relationships

This map shows the relationship between all documentation files and their purpose in the implementation process.

---

## 🎯 Primary Implementation Documents

These are your main guides for implementation:

### Core Guides
1. **IMPLEMENTATION_GUIDE.md** - Master implementation plan with compaction workflow
2. **IMPLEMENTATION_WORKFLOW.md** - Detailed step-by-step for each subgroup
3. **SUBGROUP_PROGRESS.md** - Track progress and compaction points
4. **DOCUMENTATION_MAP.md** - This file, showing all relationships

### Development Standards & Methodology
1. **CLAUDE.md** - Coding standards and project conventions
2. **README.md** - Project overview and current status
3. **PHASE_X.5_METHODOLOGY.md** - Comprehensive quality assurance methodology

---

## 📚 Phase Context Documents (Primary Implementation References)

### Phase 1: Foundation (5 Documents)
```
context_docs/phase1/
├── 01_infrastructure_foundation.md     [Subgroup 1]
├── 02_authentication_security.md       [Subgroup 2] → Enhanced by: security_enhancements/*
├── 03_design_system_core_ui.md        [Subgroup 3]
├── 04_dashboard_layout_navigation.md   [Subgroup 4]
└── 05_core_api_data_management.md     [Subgroup 5] → Enhanced by: security_enhancements/SQL_*
```

### Phase 2: Core Features (3 Documents)
```
context_docs/phase2/
├── 01_task_management_core.md          [Subgroup 6]
├── 02_content_focus_systems.md         [Subgroup 7] → Includes dashboard fixes
└── 03_realtime_state_orchestration.md  [Subgroup 8]
```

### Phase 3: Production (4 Documents)
```
context_docs/phase3/
├── 01_data_intelligence_analytics.md        [Subgroup 9]  → Enhanced by: performance_optimizations/DATABASE_*
├── 02_external_integration_layer_ENHANCED.md [Subgroup 10] → Enhanced by: architecture_improvements/CALENDAR_*
├── 03_pwa_offline_infrastructure.md         [Subgroup 11]
└── 04_production_infrastructure_security.md  [Subgroup 12] → Uses all security_enhancements
```

---

## 🔒 Security Enhancements

Located in `context_docs/security_enhancements/`

| File | Purpose | Applies To |
|------|---------|------------|
| SECURE_AUTH_REPLACEMENT.md | httpOnly cookies, CSRF protection | Subgroup 2 |
| SECURE_DATABASE_REPLACEMENT.md | Type-safe Prisma queries | Subgroup 5 |
| SECURITY_AUDIT_REPORT.md | Complete vulnerability assessment | Subgroups 2, 5, 12 |
| SECURITY_PATCH_SUMMARY.md | Executive summary of fixes | Reference only |
| SECURITY_TEST_SUITE.md | Security validation tests | Subgroups 2, 5, 12 |
| SQL_INJECTION_FIXES.md | Safe query patterns | Subgroup 5 |

---

## 🔍 Phase X.5 Review & Improvement Documents

Phase X.5 implements systematic quality assurance through multi-agent review and structured improvements.

### Phase 2.5 (Post-Core Features Review)
Located in `context_docs/phase2/phase2.5/`

| File | Purpose | Focus Area |
|------|---------|------------|
| PHASE_2_COMPREHENSIVE_REVIEW_REPORT.md | Multi-agent quality assessment | Complete Phase 2 evaluation |
| PHASE_2.5_OVERVIEW.md | Quality transformation strategy | Improvement roadmap |
| 2.5.1_visual_design_brand_identity.md | Purple-to-teal gradient system | Visual design transformation |
| 2.5.2_accessibility_mobile_experience.md | WCAG 2.1 AA & mobile optimization | User experience enhancement |
| 2.5.3_security_performance_production.md | RLS policies & monitoring | Production readiness |

### Future Phase X.5 Structure (Template)
- **Phase 1.5**: Post-foundation infrastructure improvements
- **Phase 3.5**: Post-production final hardening and deployment

### Phase X.5 Integration Pattern
1. **Multi-Agent Review**: Deploy 5+ specialized agents for comprehensive assessment
2. **Issue Classification**: 🔴 Production Blockers, 🟡 Quality Improvements, 🟢 Future Enhancements  
3. **Subgroup Creation**: Break improvements into context-efficient subgroups (3-5 typical)
4. **Quality Transformation**: Target minimum +5 point composite quality score improvement
5. **Production Readiness**: Systematic elimination of all critical production blockers

---

## ⚡ Performance Optimizations

Located in `context_docs/performance_optimizations/`

| File | Purpose | Applies To |
|------|---------|------------|
| DATABASE_INDEXING_STRATEGY.md | Analytics query optimization | Subgroup 9 |
| PRISMA_ANALYTICS_SCHEMA_OPTIMIZATIONS.md | Schema performance patterns | Subgroup 9 |
| ANALYTICS_QUERY_OPTIMIZATION.md | Query performance patterns | Subgroup 9 |
| NOTIFICATION_BATCHING_ARCHITECTURE.md | High-volume notification handling | Subgroup 10 |

---

## 🏗️ Architecture Improvements

Located in `context_docs/architecture_improvements/`

| File | Purpose | Applies To |
|------|---------|------------|
| CALENDAR_SERVICE_ARCHITECTURE.md | Clean service layer for calendar | Subgroup 10 |
| CALENDAR_REFACTORING_SUMMARY.md | Refactoring details | Subgroup 10 |
| NOTIFICATION_TYPES_ENHANCED.md | Enhanced notification types | Subgroup 10 |

---

## 🧪 Test Files

Test-Driven Development test specifications:

| File | Tests | Coverage |
|------|-------|----------|
| Phase1_Foundation_Tests.md | 32 tests | Subgroups 1-5 |
| Phase2_Feature_Tests.md | 29 tests | Subgroups 6-8 |
| Phase3_Production_Tests_ENHANCED.md | 104 tests | Subgroups 9-12 |
| **Total** | **165 tests** | **All 12 subgroups** |

### Test Distribution by Subgroup

- **Subgroup 1**: Tests 1-6 (6 tests)
- **Subgroup 2**: Tests 7-11 (5 tests)
- **Subgroup 3**: Tests 12-17 (6 tests)
- **Subgroup 4**: Tests 18-23 (6 tests)
- **Subgroup 5**: Tests 24-32 (9 tests)
- **Subgroup 6**: Tests 1-12 (12 tests)
- **Subgroup 7**: Tests 13-22 (10 tests)
- **Subgroup 8**: Tests 23-29 (7 tests)
- **Subgroup 9**: Tests 1-20 (20 tests)
- **Subgroup 10**: Tests 21-35 (15 tests)
- **Subgroup 11**: Tests 36-50 (15 tests)
- **Subgroup 12**: Tests 51-104 (54 tests)

---

## 📋 Planning & Tracking Documents

| File | Purpose | When to Use |
|------|---------|-------------|
| Phase_Breakdown_Summary.md | Overview of all phases and subgroups | Planning reference |
| TaskMaster_Pro_TDD_Development_Plan.md | Original TDD development plan | Historical reference |
| MCP_SERVER_SETUP.md | MCP server configuration | If using MCP servers |

---

## 📁 Original Product Documentation

Located in `taskmaster_pro_docs/` - Original product specifications (reference only during implementation)

Located in `UI-examples/` - UI mockups and design references (reference only during implementation)

---

## 🔄 Document Usage Flow

### For Each Subgroup Implementation:

1. **Start**: Check SUBGROUP_PROGRESS.md for next subgroup
2. **Load Primary**: Load specific phase context document
3. **Load Tests**: Load relevant test file section
4. **Check Enhancements**: Load any applicable enhancement documents
5. **Implement**: Follow IMPLEMENTATION_WORKFLOW.md
6. **Track**: Update SUBGROUP_PROGRESS.md
7. **Compact**: Follow IMPLEMENTATION_GUIDE.md compaction process

### Document Priority During Implementation:

**Must Load** (for each subgroup):
- Specific subgroup context document
- Relevant test specifications
- IMPLEMENTATION_WORKFLOW.md (for process)

**Load if Listed** (in IMPLEMENTATION_GUIDE.md):
- Applicable security enhancements
- Applicable performance optimizations
- Applicable architecture improvements

**Reference Only** (don't load unless needed):
- Original product documentation
- UI examples
- Historical planning documents

---

## ⚠️ Important Notes

1. **Enhanced Files**: Always use the enhanced version if it exists (e.g., Phase3_Production_Tests_ENHANCED.md)
2. **Supplementary Docs**: Only load those specifically listed for your current subgroup
3. **Context Management**: Loading too many documents will require early compaction
4. **Documentation Updates**: Update tracking documents BEFORE compaction

---

## 🎯 Quick Reference by Subgroup

### Subgroup 1 (Infrastructure)
- Primary: `phase1/01_infrastructure_foundation.md`
- Tests: Phase1 Tests 1-6
- Enhancements: None

### Subgroup 2 (Auth & Security)
- Primary: `phase1/02_authentication_security.md`
- Tests: Phase1 Tests 7-11
- Enhancements: All files in `security_enhancements/`

### Subgroup 3 (Design System)
- Primary: `phase1/03_design_system_core_ui.md`
- Tests: Phase1 Tests 12-17
- Enhancements: None

### Subgroup 4 (Dashboard Layout)
- Primary: `phase1/04_dashboard_layout_navigation.md`
- Tests: Phase1 Tests 18-23
- Enhancements: None

### Subgroup 5 (API & Data)
- Primary: `phase1/05_core_api_data_management.md`
- Tests: Phase1 Tests 24-32
- Enhancements: `security_enhancements/SECURE_DATABASE_REPLACEMENT.md`, `security_enhancements/SQL_INJECTION_FIXES.md`

### Subgroup 6 (Task Management)
- Primary: `phase2/01_task_management_core.md`
- Tests: Phase2 Tests 1-12
- Enhancements: None

### Subgroup 7 (Content & Focus)
- Primary: `phase2/02_content_focus_systems.md`
- Tests: Phase2 Tests 13-22
- Enhancements: Dashboard completion fixes included

### Subgroup 8 (Real-time)
- Primary: `phase2/03_realtime_state_orchestration.md`
- Tests: Phase2 Tests 23-29
- Enhancements: None

### Subgroup 9 (Analytics)
- Primary: `phase3/01_data_intelligence_analytics.md`
- Tests: Phase3 Tests 1-20
- Enhancements: All files in `performance_optimizations/`

### Subgroup 10 (Integrations)
- Primary: `phase3/02_external_integration_layer_ENHANCED.md`
- Tests: Phase3 Tests 21-35
- Enhancements: All files in `architecture_improvements/`

### Subgroup 11 (PWA)
- Primary: `phase3/03_pwa_offline_infrastructure.md`
- Tests: Phase3 Tests 36-50
- Enhancements: None

### Subgroup 12 (Production)
- Primary: `phase3/04_production_infrastructure_security.md`
- Tests: Phase3 Tests 51-104
- Enhancements: Review all security patches

---

*This map is the source of truth for document relationships. Always refer here if unsure which documents to use.*