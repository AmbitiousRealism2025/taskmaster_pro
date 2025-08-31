#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Activating MCP Servers for Claude CLI"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Add critical MCP servers for TaskMaster Pro
echo "Adding Memory MCP server..."
claude mcp add memory npx -y @modelcontextprotocol/server-memory

echo "Adding Filesystem MCP server..."
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /Users/ambrealismwork/Desktop/Coding-Projects/TaskMaster_Pro

echo "Adding Playwright MCP server..."
claude mcp add playwright playwright-mcp-server

echo "Adding Context7 MCP server..."
claude mcp add context7 context7-mcp

echo "Adding Cerebras MCP server..."
claude mcp add cerebras cerebras-code-mcp

echo "Adding Sequential Thinking MCP server..."
claude mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking

echo "Adding Serena MCP server..."
claude mcp add serena uvx --from git+https://github.com/oraios/serena serena-mcp-server

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📋 Verifying MCP Server Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

claude mcp list

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ MCP Servers Configured!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: You need to restart your Claude CLI session:"
echo ""
echo "1. Exit this conversation (Ctrl+C or exit)"
echo "2. Start a new Claude session: claude"
echo "3. The MCP servers should now be available"
echo ""
echo "To verify after restart, ask Claude:"
echo "'Check if memory, playwright, context7, and serena MCP servers are available'"
echo ""
echo "═══════════════════════════════════════════════════════════════"