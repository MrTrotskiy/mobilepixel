# MobilePixel MCP - Setup Guide

**How to run and configure MobilePixel MCP server**

---

## Quick Start (Local Development)

### 1. Build Project
```bash
cd C:\Code\mobilepixel
npm install
npm run build
npm run fixlint
```

### 2. Configure Cursor

**Global config** (works from any project):

Edit: `C:\Users\YOUR_USERNAME\AppData\Roaming\Cursor\User\globalStorage\cursor.mcp\mcp.json`

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
    }
  }
}
```

**Project config** (works only in mobilepixel project):

Create `.cursor/mcp.json` in project root:
```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["lib/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### 3. Configure Claude Desktop

Edit config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
    }
  }
}
```

### 4. Restart & Test

1. Fully restart Cursor or Claude Desktop (not just reload)
2. Test: "Show list of apps on my device"
3. Should see `mobilepixel` in MCP servers list

---

## Configure in Other Projects

**Copy `.cursor/mcp.json` to any project root:**

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
    }
  }
}
```

Replace path with your MobilePixel location.

**Done!** Now you can use MobilePixel MCP from that project.

---

## Tool Configuration (Optional)

Create `mcp-config.json` in project root to control which tools are available:

```json
{
  "tools": {
    "mode": "essential"  // Recommended (default)
  }
}
```

**Available modes:**
- `"essential"` - ~29 core + smart tools (default, recommended)
- `"custom"` - Pick specific categories
- `"full"` - All 37+ tools enabled

**See [TOOLS.md](TOOLS.md) for complete configuration guide.**

---

## Device Setup

### Android

1. **Enable USB debugging** on device
2. **Connect device** via USB
3. **Check connection**:
   ```bash
   adb devices
   # Should show: 843b3cd3  device
   ```

4. If not working:
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### iOS

1. **Install Xcode** and command line tools
2. **Trust computer** on device
3. **Check connection**:
   ```bash
   xcrun simctl list devices
   ```

---

## Troubleshooting

### Build Errors
```bash
cd C:\Code\mobilepixel
npm run clean
npm install
npm run build
npm run fixlint
```

**Note**: `chmod` error on Windows is normal, ignore it.

### Device Not Found
```bash
# Android
adb devices
adb kill-server && adb start-server

# iOS  
xcrun simctl list devices
```

### MCP Not Working

1. **Check config path** - must point to `lib/index.js`
2. **Verify file exists**: `dir lib\index.js`
3. **Check MCP logs**: View → Output → Select "MCP"
4. **Restart completely** - don't just reload window
5. **Rebuild**: `npm run build && npm run fixlint`

### Too Many Tools Warning

Use essential mode (default) or create `mcp-config.json` with custom mode (see above).

---

## NPM Package (Future)

When published to NPM:

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

**Currently**: Use local build (see Quick Start above).

---

## Quick Test Checklist

After setup, verify:

```
"Show installed apps" - Lists apps
"Take screenshot" - Returns screenshot
"List elements on screen" - Shows UI elements
"Get app logs" - Shows logs
MCP server appears in tools list
```

---

**Setup complete! See AI_BEST_PRACTICES.md for usage guide.**

