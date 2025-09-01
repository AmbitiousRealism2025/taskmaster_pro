# MCP Server Activation Guide for TaskMaster Pro

## 🚨 Current Issue
The MCP servers are configured but not loaded into the current Claude Desktop session. This requires a full restart of Claude Desktop to activate them.

## Critical MCP Servers Status

### 1. Context7 MCP ✅ Installed
- **Status**: Installed globally but not accessible in Claude
- **Binary**: `/opt/homebrew/bin/context7-mcp`
- **Process**: Running (PID: 54434) but not connected to Claude

### 2. Playwright MCP ✅ Installed
- **Status**: Installed globally but not accessible in Claude
- **Binary**: `/opt/homebrew/bin/playwright-mcp-server`
- **Note**: Server hangs when accessed via CLI (normal behavior for stdio transport)

### 3. Memory MCP ⚠️ Needs Installation
- **Status**: Not installed, will use npx on-demand
- **Command**: Uses `npx -y @modelcontextprotocol/server-memory`

### 4. Serena MCP ✅ Configured
- **Status**: Configured and ready
- **Project Config**: `.serena/project.yml` created
- **Note**: Will activate once source files exist

## 🔧 Activation Steps

### Step 1: Install Missing Memory Server (Optional)
The Memory server will work via npx, but for better performance you can install it globally:
```bash
npm install -g @modelcontextprotocol/server-memory
```

### Step 2: Restart Claude Desktop
**IMPORTANT**: You must fully quit and restart Claude Desktop, not just close the window.

1. **Mac**: Press `Cmd + Q` or use Menu Bar → Claude → Quit Claude
2. Wait 5 seconds
3. Reopen Claude Desktop
4. Open this project again

### Step 3: Verify MCP Servers Are Loaded
After restart, you should see new tools available:
- Memory tools: `write_memory`, `read_memory`, `list_memories`
- Playwright tools: Browser automation tools
- Context7 tools: Documentation access tools
- Serena tools: Code analysis tools (once source files exist)

## 📊 Expected After Restart

| MCP Server | Expected Tools |
|------------|----------------|
| **Memory** | `write_memory`, `read_memory`, `list_memories`, `delete_memory` |
| **Playwright** | `launch_browser`, `navigate`, `click`, `fill`, `screenshot` |
| **Context7** | `search_docs`, `get_patterns`, `find_examples` |
| **Serena** | `find_symbol`, `get_symbols_overview`, `search_for_pattern` |

## 🎯 Quick Test Commands
After restart, test each server:

```javascript
// Test Memory MCP
"Use memory tools to write a test memory"

// Test Playwright MCP  
"Use playwright to open a test browser window"

// Test Context7 MCP
"Use context7 to find Next.js documentation"

// Test Serena (after creating first .ts file)
"Use Serena to analyze the project structure"
```

## ⚠️ Troubleshooting

### If servers still don't appear after restart:

1. **Check Claude logs**:
   ```bash
   tail -f ~/Library/Logs/Claude/*.log
   ```

2. **Validate config syntax**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. **Check for port conflicts**:
   ```bash
   lsof -i :3000  # Context7 default port
   ```

4. **Manual test of servers**:
   ```bash
   echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | context7-mcp
   ```

## 📝 Notes
- MCP servers are loaded once at Claude Desktop startup
- Configuration changes require full restart to take effect
- Some servers (Memory, Sequential-thinking) use npx and may have initial delay
- Serena requires actual source files to provide full functionality

## Next Steps
1. **Restart Claude Desktop** (Cmd+Q, then reopen)
2. Return to this conversation
3. We'll verify all 4 critical MCP servers are working
4. Begin TaskMaster Pro implementation with full MCP support