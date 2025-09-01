# MCP Server Configuration for TaskMaster Pro

## ✅ STATUS: CONFIGURED AND READY (2025-08-31)
**Claude CLI**: All 4 critical MCP servers successfully configured and connected.
**Ready for**: TaskMaster Pro implementation to begin after session restart.

## Overview
This document details the Model Context Protocol (MCP) servers configured for the TaskMaster Pro project. These servers extend Claude's capabilities with specialized tools for development, testing, and project management.

**Critical MCP Servers for TaskMaster Pro**: 4 (memory, playwright, context7, serena)
**Total Available**: 13 (when all optional servers are configured)

## Configuration Locations
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude CLI**: `/Users/ambrealismwork/.claude.json` (project-specific)

## Configured MCP Servers

### Core Development Servers

#### 1. filesystem
- **Purpose**: File system operations within the project directory
- **Configuration**: Points to `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro`
- **Usage**: Enables direct file manipulation and project structure management

#### 2. memory
- **Purpose**: Persistent memory across Claude sessions
- **Replaces**: Serena MCP functionality
- **Usage**: Maintains project context, decisions, and progress between sessions
- **Key Commands**: 
  - Store context between subgroups
  - Maintain architectural decisions
  - Track implementation progress

### Testing & Browser Automation

#### 3. playwright
- **Installation**: Global (`@executeautomation/playwright-mcp-server@1.0.6`)
- **Purpose**: Browser automation and E2E testing
- **Usage**: 
  - End-to-end test execution
  - UI interaction testing
  - Cross-browser compatibility checks

### Documentation & Patterns

#### 4. context7
- **Installation**: Global (`@upstash/context7-mcp@1.0.16`)
- **Purpose**: Documentation patterns and library references
- **Usage**:
  - Access to framework documentation
  - Best practices and patterns
  - Library API references

### Code Generation

#### 5. cerebras
- **Installation**: Global (`cerebras-code-mcp@1.2.0`)
- **Purpose**: Ultra-fast code generation (2,000 tokens/sec)
- **Usage**:
  - Rapid boilerplate generation
  - Code completion
  - Pattern implementation

### Analysis & Reasoning

#### 6. sequential-thinking
- **Purpose**: Complex analysis and systematic debugging
- **Usage**:
  - Multi-step problem solving
  - Root cause analysis
  - Architectural decisions

### Code Review & Semantic Understanding

#### 7. serena
- **Installation**: Via UV (`uvx --from git+https://github.com/oraios/serena`)
- **Purpose**: Semantic code understanding and intelligent code review
- **Replaces**: Manual code navigation and analysis
- **Usage**:
  - Symbol-level code comprehension
  - Multi-language support (Python, TypeScript, Go, Rust, etc.)
  - Advanced project analysis and refactoring
  - Code review and quality assessment
- **Key Features**:
  - Language Server Protocol (LSP) integration
  - Free and open-source alternative to Cursor/Windsurf
  - Superior to text-based analysis through semantic understanding

### Database Operations

#### 8. postgres
- **Purpose**: PostgreSQL database operations
- **Configuration**: Connection string points to `postgresql://localhost/taskmaster_pro`
- **Note**: Requires PostgreSQL to be installed and running

#### 9. sqlite
- **Purpose**: SQLite database operations
- **Configuration**: Database file at `/Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro/database.db`
- **Usage**: Local development and testing

### Version Control

#### 10. github
- **Purpose**: GitHub repository operations
- **Configuration**: Requires `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable
- **Usage**: PR creation, issue management, repository operations

#### 11. gitlab
- **Purpose**: GitLab repository operations
- **Configuration**: Requires `GITLAB_PERSONAL_ACCESS_TOKEN` and `GITLAB_API_URL`
- **Usage**: Alternative version control platform support

### Web Operations

#### 12. fetch
- **Purpose**: Web content fetching and processing
- **Usage**: External API calls, web scraping, resource fetching

#### 13. brave-search
- **Purpose**: Web search functionality
- **Configuration**: Requires `BRAVE_API_KEY` environment variable
- **Usage**: Research, documentation lookup, problem solving

## Setup Instructions

### Initial Setup
1. Configuration file created at: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Global MCP servers already installed via npm (Playwright, Context7, Cerebras)
3. Serena installed via UV package manager (`uvx`)
4. Claude Desktop must be restarted after configuration changes

### Restart Process
1. Completely quit Claude Desktop (Cmd+Q on macOS)
2. Wait 5 seconds to ensure full shutdown
3. Relaunch Claude Desktop
4. MCP servers will automatically initialize on startup

### Verification
After restart, verify MCP servers are active by:
1. Checking for MCP tool availability in Claude
2. Testing memory persistence with memory MCP
3. Confirming filesystem access to project directory
4. Testing Serena code review capabilities on existing code

## Token Configuration (Optional)

To enable GitHub, GitLab, and Brave Search functionality, add your API tokens to the configuration:

1. Open `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Replace placeholder tokens:
   - `"GITHUB_PERSONAL_ACCESS_TOKEN": "your-actual-github-token"`
   - `"GITLAB_PERSONAL_ACCESS_TOKEN": "your-actual-gitlab-token"`
   - `"BRAVE_API_KEY": "your-actual-brave-api-key"`
3. Restart Claude Desktop to apply changes

## Troubleshooting

### MCP Servers Not Loading
- Ensure Claude Desktop was fully quit and restarted
- Check configuration file syntax is valid JSON
- Verify global npm packages are accessible

### Permission Issues
- Ensure filesystem MCP has access to project directory
- Check database connection strings are correct
- Verify API tokens have necessary permissions

### Memory Persistence Issues
- Memory MCP clears on Claude Desktop restart
- Use context documents for long-term persistence
- Regularly checkpoint important decisions

## Development Workflow Integration

### Phase-Based Usage
- **Phase 1**: Primarily filesystem, memory for foundation setup
- **Phase 2**: Add playwright for testing, context7 for patterns
- **Phase 3**: Full suite including database and web operations

### Subgroup Context Management
1. Start subgroup: Load context from memory MCP
2. During work: Store progress and decisions
3. End subgroup: Save context document, clear working memory
4. Next subgroup: Fresh start with preserved context

## Maintenance

### Updating MCP Servers
```bash
# Update globally installed MCP servers (npm-based)
npm update -g @executeautomation/playwright-mcp-server
npm update -g @upstash/context7-mcp
npm update -g cerebras-code-mcp

# Serena updates automatically via uvx (always pulls latest)
# No manual update needed for Serena
```

### Configuration Backup
Backup configuration before major changes:
```bash
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.backup.json
```

## Notes
- Memory MCP provides session persistence but clears on restart
- Serena provides semantic code understanding via Language Server Protocol
- Use context documents in `context_docs/` for permanent storage
- Some MCP servers require external services (PostgreSQL, API keys)
- Performance may vary based on system resources and network connectivity
- Serena is free and open-source, no API key required