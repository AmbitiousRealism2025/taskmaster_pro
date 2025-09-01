# Prime Command for TaskMaster Pro

Run the commands under the `Execute` section to gather information about the project, verify MCP servers, and then review the files listed under `Read` to understand the project's purpose and functionality then `Report` your findings.

## Execute
- `git status`
- `git branch`
- `git log --oneline -5`
- `ls -la | head -20`

## MCP Server Verification
Test each critical MCP server and report status:

### 1. Memory MCP Test
- Try: write_memory("session_test", "TaskMaster Pro session started")
- Then: read_memory("session_test")
- Report: ✅ Working or ❌ Not Available

### 2. Playwright MCP Test  
- Check if playwright browser automation tools are available
- Report: ✅ Working or ❌ Not Available

### 3. Context7 MCP Test
- Try to search for Next.js App Router documentation
- Report: ✅ Working or ❌ Not Available

### 4. Serena MCP Test
- Check configuration at `.serena/project.yml`
- Note: Will fully activate once source files exist
- Report: ✅ Configured or ❌ Not Configured

## Read
- README.md
- CLAUDE.md (especially MCP Server Integration section)
- SUBGROUP_PROGRESS.md
- IMPLEMENTATION_GUIDE.md

## Report

Provide a comprehensive status report with these sections:

### 1. Project Understanding
- Current phase and progress
- Next implementation steps
- Any blockers or issues

### 2. MCP Server Status
```
MCP SERVER STATUS REPORT
========================
Memory      : [✅/❌] [Status details]
Playwright  : [✅/❌] [Status details]
Context7    : [✅/❌] [Status details]
Serena      : [✅/⚠️] [Status details]

Ready to proceed: [YES/NO]
```

### 3. Git Status
- Current branch
- Uncommitted changes
- Recent commits

### 4. Recommendations
- If MCP servers missing: Stop and switch to Claude Desktop app
- If all green: Ready to begin/continue implementation
- Specific next steps based on SUBGROUP_PROGRESS.md