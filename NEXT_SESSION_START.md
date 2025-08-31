# 🚀 NEXT SESSION START GUIDE

## ⚠️ IMPORTANT: Restart Claude CLI First!
You must exit and restart Claude CLI for MCP servers to activate.

---

## Session 2: Begin Implementation

### 1️⃣ Restart Claude CLI
```bash
# Exit current session (Ctrl+C or exit)
# Then start new session:
claude
```

### 2️⃣ Verify MCP Servers
Ask Claude:
```
Check if memory, playwright, context7, and serena MCP servers are available
```

Expected response should show all 4 servers operational.

### 3️⃣ Load Session Context
Ask Claude:
```
Read SESSION_NOTES.md and SUBGROUP_PROGRESS.md to understand where we left off
```

### 4️⃣ Check Git Status
```bash
git status
git branch
```

### 5️⃣ Begin Subgroup 1
Ask Claude:
```
Let's begin Subgroup 1: Infrastructure Foundation. 
Please load:
1. context_docs/phase1/01_infrastructure_foundation.md
2. Phase1_Foundation_Tests.md (Tests 1-6)
3. IMPLEMENTATION_WORKFLOW.md

Then create a todo list and start implementation.
```

---

## 📋 Quick Reference

### MCP Server Commands
```bash
claude mcp list              # Verify servers are connected
```

### Critical Files for Subgroup 1
- **Context**: `context_docs/phase1/01_infrastructure_foundation.md`
- **Tests**: `Phase1_Foundation_Tests.md` (Tests 1-6)
- **Workflow**: `IMPLEMENTATION_WORKFLOW.md`
- **Progress**: `SUBGROUP_PROGRESS.md`

### Expected Tasks for Subgroup 1
1. Create Next.js project structure
2. Set up TypeScript configuration
3. Configure ESLint and Prettier
4. Install core dependencies
5. Set up Docker configuration
6. Create CI/CD pipeline structure

### Compaction Reminder
After completing Subgroup 1:
1. Run all tests (should pass 6/32 for Phase 1)
2. Update SUBGROUP_PROGRESS.md
3. Commit to git
4. **COMPACT SESSION** before moving to Subgroup 2

---

## 🎯 Success Criteria
- [ ] MCP servers verified as working
- [ ] Session context loaded
- [ ] Git repository ready
- [ ] Subgroup 1 implementation started
- [ ] TodoWrite tool being used for task tracking
- [ ] Following TDD methodology

---

## 📝 Notes from Session 1
- MCP servers configured in Claude CLI
- Ready to begin implementation
- All documentation complete
- 165 failing tests ready for TDD
- Compaction workflow mandatory

---

**Ready to go! Just restart Claude CLI and follow the steps above.**

*Created: 2025-08-31 - End of Session 1*