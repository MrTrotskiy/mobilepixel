# MobilePixel MCP - Installation Guide

**Quick guide for adding MobilePixel MCP to your project**

---

## Prerequisites

- Node.js v18+ installed
- Android SDK (for Android testing)
- Xcode (for iOS testing, macOS only)
- MCP-compatible client (Cursor, Claude Desktop, Cline, etc.)

---

## Installation Steps

### Step 1: Install Package

#### Option A: NPX (Recommended)
```bash
npx -y @mobilepixel/mcp@latest
```

#### Option B: Local Development
```bash
git clone <repository-url>
cd mobilepixel
npm install
npm run build
```

---

### Step 2: Configure MCP Client

#### For Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "npx",
      "args": ["-y", "@mobilepixel/mcp@latest"]
    }
  }
}
```

**For local development:**
```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["lib/index.js"],
      "cwd": "/absolute/path/to/mobilepixel",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### For Claude Desktop

Edit config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "npx",
      "args": ["-y", "@mobilepixel/mcp@latest"]
    }
  }
}
```

#### For Cline (VS Code)

Add to Cline MCP settings:
```json
{
  "mobilepixel": {
    "command": "npx",
    "args": ["-y", "@mobilepixel/mcp@latest"]
  }
}
```

---

### Step 3: Restart Your Client

**Important:** Completely restart your MCP client (Cursor, Claude Desktop, etc.) for changes to take effect.

---

## Verification

Test the installation by asking your AI agent:

```
List available mobile devices
```

or

```
Show installed apps on device
```

If you see device information, MobilePixel is working!

---

## Configuration

After installation, you can configure tool modes. See **[CONFIGURATION.md](CONFIGURATION.md)** for details.

---

## Troubleshooting

### MCP server not found
- Restart your client **completely** (not just reload)
- Check that Node.js v18+ is installed: `node --version`

### No devices found
- **Android**: Ensure `adb devices` shows your device
- **iOS**: Ensure `xcrun simctl list` shows simulators

### Permission denied
- **Android**: Enable USB debugging on device
- **iOS**: Accept trust dialog on simulator

---

## Next Steps

- **[CONFIGURATION.md](CONFIGURATION.md)** - Configure tool modes and settings
- **[AI_QUICK_START.md](AI_QUICK_START.md)** - Quick reference for AI agents
- **[../TOOLS.md](../TOOLS.md)** - Complete tool reference

---

**Need help?** Check main documentation in `/docs` folder.


