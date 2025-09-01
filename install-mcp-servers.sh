#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 MCP Server Installation Script for TaskMaster Pro"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node.js installation
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install critical MCP servers
echo "📦 Installing Critical MCP Servers for TaskMaster Pro..."
echo "───────────────────────────────────────────────────────────────"

# 1. Memory server (Required for compaction workflow)
echo "1️⃣ Installing Memory MCP Server..."
npm install -g @modelcontextprotocol/server-memory

# 2. Playwright server (Required for TDD testing)
echo "2️⃣ Installing Playwright MCP Server..."
npm install -g @executeautomation/playwright-mcp-server

# 3. Context7 server (Required for documentation)
echo "3️⃣ Installing Context7 MCP Server..."
npm install -g @upstash/context7-mcp

# 4. Sequential thinking (Helpful for complex analysis)
echo "4️⃣ Installing Sequential Thinking MCP Server..."
npm install -g @modelcontextprotocol/server-sequential-thinking

# 5. Filesystem server
echo "5️⃣ Installing Filesystem MCP Server..."
npm install -g @modelcontextprotocol/server-filesystem

echo ""
echo "📦 Installing Additional MCP Servers..."
echo "───────────────────────────────────────────────────────────────"

# Additional useful servers
npm install -g @modelcontextprotocol/server-fetch
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-sqlite

# Check Python for Serena
echo ""
echo "🐍 Checking Python for Serena MCP..."
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(python3 --version)"
    
    # Install uvx for Serena
    if ! command -v uvx &> /dev/null; then
        echo "Installing uvx for Serena..."
        pip3 install uvx || pip install uvx
    else
        echo "✅ uvx already installed"
    fi
else
    echo "⚠️  Python3 not found. Serena MCP will not be available."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Verification"
echo "═══════════════════════════════════════════════════════════════"

# Verify installations
echo "Checking installed MCP servers..."
echo ""

# Check each critical server
check_server() {
    if npm list -g --depth=0 2>/dev/null | grep -q "$1"; then
        echo "✅ $2 installed"
    else
        echo "❌ $2 not found"
    fi
}

check_server "@modelcontextprotocol/server-memory" "Memory MCP"
check_server "@executeautomation/playwright-mcp-server" "Playwright MCP"
check_server "@upstash/context7-mcp" "Context7 MCP"
check_server "@modelcontextprotocol/server-sequential-thinking" "Sequential Thinking MCP"
check_server "@modelcontextprotocol/server-filesystem" "Filesystem MCP"

if command -v uvx &> /dev/null; then
    echo "✅ Serena MCP (uvx installed)"
else
    echo "⚠️  Serena MCP (uvx not installed)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 Next Steps"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. ⚠️  RESTART Claude Desktop completely:"
echo "   - Press Cmd+Q to quit Claude Desktop"
echo "   - Wait 5 seconds"
echo "   - Reopen Claude Desktop"
echo ""
echo "2. Start a NEW conversation in Claude"
echo ""
echo "3. Test MCP servers are working by asking:"
echo "   'Check if memory, playwright, context7, and serena MCP servers are available'"
echo ""
echo "4. Begin TaskMaster Pro implementation with Subgroup 1"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 Installation script complete!"
echo "═══════════════════════════════════════════════════════════════"