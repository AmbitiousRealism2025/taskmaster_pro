# Serena MCP Usage Guide

## Overview
Serena is a powerful semantic code understanding and review tool that integrates with Claude Code through the Model Context Protocol (MCP). It provides Language Server Protocol (LSP) based code analysis, making it superior to text-based approaches.

## Installation Status
✅ **Installed**: Added to Claude Desktop configuration
📍 **Location**: Configured in `~/Library/Application Support/Claude/claude_desktop_config.json`
🔧 **Command**: `uvx --from git+https://github.com/oraios/serena serena-mcp-server`

## Key Features
- **Semantic Understanding**: Uses LSP for true code comprehension, not just text matching
- **Multi-Language Support**: Python, TypeScript/JavaScript, Go, Rust, C/C++, Java, PHP
- **Symbol Navigation**: Navigate code like an IDE (go-to-definition, find-references)
- **Intelligent Refactoring**: Context-aware code modifications
- **Free & Open Source**: No API keys or subscription required

## How to Use Serena

### After Claude Desktop Restart

1. **Verify Serena is Available**
   - Look for Serena tools in Claude's available tools
   - Test with: "Use Serena to analyze the project structure"

2. **Code Review Requests**
   ```
   "Use Serena to review the authentication implementation"
   "Find all functions that handle user data with Serena"
   "Use Serena to analyze the relationship between these classes"
   ```

3. **Symbol-Level Operations**
   ```
   "Use Serena to find all references to the User model"
   "Show me where this function is called throughout the codebase"
   "Find the definition of this interface"
   ```

4. **Refactoring Support**
   ```
   "Use Serena to help refactor this module for better separation of concerns"
   "Rename this variable across all files where it's used"
   "Extract this logic into a separate function"
   ```

## Integration with TaskMaster Pro

### Phase 1 - Infrastructure
- Review database schema design
- Analyze authentication patterns
- Validate error handling implementation

### Phase 2 - Core Features
- Review task management architecture
- Analyze state management patterns
- Validate API endpoint implementations

### Phase 3 - Production
- Performance analysis of critical paths
- Security review of authentication flows
- Code quality assessment before deployment

## Advantages Over Other Tools

| Feature | Serena | Text-Based Tools | Paid Alternatives |
|---------|--------|------------------|-------------------|
| Semantic Understanding | ✅ LSP-based | ❌ Pattern matching | ✅ Varies |
| Multi-Language | ✅ 8+ languages | Limited | ✅ Varies |
| Cost | Free | Free | $20-30/month |
| Large Codebases | ✅ Efficient | ❌ Slow | ✅ Good |
| Symbol Navigation | ✅ Full | ❌ None | ✅ Full |

## Working with Other MCP Servers

Serena complements other MCP servers:
- **Memory MCP**: Store Serena's findings for later reference
- **Playwright MCP**: Test code reviewed by Serena
- **Context7 MCP**: Get best practices while Serena reviews implementation
- **Sequential-Thinking**: Use for complex analysis, Serena for code review

## Troubleshooting

### If Serena is Not Available
1. Ensure Claude Desktop was fully restarted (Cmd+Q, not just closed)
2. Check configuration file syntax is valid JSON
3. Verify UV is installed: `which uv` should return a path
4. Try manually testing: `uvx --from git+https://github.com/oraios/serena serena-mcp-server --help`

### Performance Tips
- Serena works best with language servers installed for your languages
- For TypeScript/JavaScript, ensure `node_modules` is present
- For Python, virtual environments help with accurate analysis
- First analysis may be slower as language servers initialize

## Example Workflows

### TDD Code Review
```
1. Write failing tests
2. Implement feature
3. "Use Serena to review the implementation against the test requirements"
4. Apply Serena's suggestions
5. Verify tests pass
```

### Refactoring Session
```
1. "Use Serena to analyze the current module structure"
2. "Find all dependencies of this class"
3. "Help me extract this into a separate service"
4. "Review the refactored code for any issues"
```

### Security Audit
```
1. "Use Serena to find all database queries in the codebase"
2. "Check for any direct SQL usage instead of Prisma"
3. "Find all authentication endpoints"
4. "Review error handling for information leakage"
```

## Notes
- Serena configuration is stored in `~/.serena/serena_config.yml`
- Logs available in `~/.serena/logs/` for troubleshooting
- Web dashboard available at `http://localhost:24282/dashboard/` when running
- Updates automatically via uvx (always uses latest version)