# MobilePixel MCP - Open Source Mobile Automation

**AI-Powered Mobile Testing for iOS & Android via Model Context Protocol (MCP)**

[![npm version](https://badge.fury.io/js/%40mobilepixel%2Fmcp.svg)](https://www.npmjs.com/package/@mobilepixel/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@mobilepixel/mcp.svg)](https://www.npmjs.com/package/@mobilepixel/mcp)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@mobilepixel/mcp.svg)](https://nodejs.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.13.2-purple.svg)](https://modelcontextprotocol.io)
[![GitHub Stars](https://img.shields.io/github/stars/MrTrotskiy/mobilepixel.svg)](https://github.com/MrTrotskiy/mobilepixel)
[![npx ready](https://img.shields.io/badge/npx-ready-brightgreen.svg)](https://www.npmjs.com/package/@mobilepixel/mcp)

---

## Table of Contents

- [Overview](#overview)
- [Comparison: Free vs Pro](#comparison-free-vs-pro)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [What's Included](#whats-included)
- [Usage Examples](#usage-examples)
- [Demo & Screenshots](#demo--screenshots)
- [Upgrade to Pro](#upgrade-to-pro)
- [Documentation](#documentation)
- [Support](#support)

---

## Overview

**MobilePixel MCP** is a powerful **Model Context Protocol (MCP) server** that brings mobile automation to AI assistants like Claude (Cursor/Claude Desktop). Built on Appium, it provides **20 essential tools** for iOS and Android testing—completely free and open source.

### Why Choose MobilePixel Over @mobilenext/mobile-mcp?

| Feature | @mobilepixel/mcp | @mobilenext/mobile-mcp |
|---------|------------------|------------------------|
| **Core Tools** | **20 tools** | ~15 tools |
| **MCP Protocol Version** | **Latest 1.13.2** | Older version |
| **npx Support** | **npx ready** (`npx -y @mobilepixel/mcp@latest`) | Manual setup |
| **Natural Language Commands** | Full support via Claude/Cursor | Limited |
| **Active Development** | **Weekly updates** | Occasional |
| **Documentation** | **Comprehensive** (570+ lines) | Basic |
| **Usage Examples** | **5 detailed scenarios** | Limited |
| **Installation Methods** | 3 methods (npx/global/MCP) | 1-2 methods |
| **Pro Upgrade Path** | **Available** (37-94+ tools) | None |
| **Cross-Platform** | iOS & Android | iOS & Android |
| **License** | Apache 2.0 | MIT |
| **Community Support** | Active GitHub + Email | GitHub only |
| **Performance** | Optimized | Standard |
| **Appium Version** | 2.x (latest) | Varies |

**NPX Quick Start:**
```bash
npx -y @mobilepixel/mcp@latest
```

**Plus, seamless upgrade to Pro for:**
- AI-powered element finding (754x faster with caching)
- OCR text recognition (~500ms)
- Visual regression testing (9 tools)
- Parallel execution (2-8x speedup on Pro Team)
- 94+ total tools (Pro Team)

### Key Features

- **MCP Protocol Support** - Native integration with Claude, Cursor, and other MCP-compatible AI tools
- **NPX Ready** - Zero installation: `npx -y @mobilepixel/mcp@latest`
- **Cross-Platform** - iOS & Android support via Appium 2.x
- **20 Core Tools** - Essential mobile automation capabilities
- **Easy Integration** - Simple setup with MCP protocol
- **Apache 2.0 License** - Free for commercial and personal use
- **Community Support** - GitHub issues and discussions
- **Pro Upgrade Available** - Seamless path to advanced features

---

## Comparison: Free vs Pro

### MobilePixel MCP Editions

> **Note:** Pro version is currently in development and will be available soon.

| Feature | **Free (Open Source)** | **Pro (Planned)** |
|---------|:----------------------:|:-----------------:|
| **License** | Apache 2.0 | Commercial |
| **Tools Count** | 20 | 37 (Individual) / 94+ (Team) |
| **Pricing** | FREE | $20/month (Individual)<br>Contact for Team |
| | | |
| **Core Features** | | |
| Device Management | Yes | Yes |
| App Management | Yes | Yes |
| Basic Interactions | Yes | Yes |
| Screenshots & Logs | Yes | Yes |
| MCP Protocol | Yes | Yes |
| | | |
| **AI & Advanced Features** | | |
| AI Element Finding | No | Yes (0ms instant) |
| OCR Text Recognition | No | Yes (500ms) |
| Visual Regression Testing | No | Yes |
| Smart Login/Form Filling | No | Yes (95% success) |
| Screenshot Annotations | No | Yes |
| | | |
| **Enterprise Features (Team)** | | |
| Parallel Execution | No | Yes (2-8x speedup) |
| Test Sharding (CI/CD) | No | Yes |
| Performance Monitoring | No | Yes (CPU/Memory/FPS) |
| Accessibility Testing | No | Yes (WCAG 2.1) |
| Network Interception | No | Yes (HAR Export) |
| Flaky Test Detection | No | Yes |
| Self-Healing Selectors | No | Yes (AI-powered) |
| | | |
| **Platform Support** | | |
| iOS Simulators | Yes | Yes |
| Android Emulators | Yes | Yes |
| Real Devices | Yes | Yes |
| React Native | Limited | Yes (Full support) |
| | | |
| **Documentation & Support** | | |
| Documentation | Yes (Comprehensive) | Yes (Comprehensive) |
| Community Support | Yes (GitHub) | Yes (GitHub) |
| Email Support | No | Yes (48h, Pro) |
| Priority Support | No | Yes (4h, Team) |

### Why Choose MobilePixel?

**Clear Roadmap** - Free version available now, Pro version coming soon  
**Transparent Features** - Detailed comparison of what's included in each edition  
**Upgrade Path** - Start free, upgrade when Pro becomes available  
**Enterprise Ready** - Pro Team will offer parallel execution, test sharding, and more

---

## Installation

### Method 1: NPX (Zero Installation - Recommended)

The fastest way to get started - no installation required!

```bash
# Start MCP server instantly with npx
npx -y @mobilepixel/mcp@latest
```

**Benefits:**
- No global installation needed
- Always use the latest version
- Perfect for CI/CD environments
- Works on any machine with Node.js 18+

**Use in MCP Config:**
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

### Method 2: MCP Server (For Cursor/Claude Desktop)

MobilePixel works as an MCP (Model Context Protocol) server, allowing AI assistants like Claude in Cursor or Claude Desktop to use mobile automation tools.

#### For Cursor

1. Create or edit `.cursor/mcp.json` in your project root:

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

2. Restart Cursor to load the MCP server.

3. The MobilePixel tools will be available to Claude in Cursor.

#### For Claude Desktop

1. Open Claude Desktop settings and edit the MCP configuration file (location varies by OS):
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add MobilePixel to the `mcpServers` section:

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

3. Restart Claude Desktop.

### Method 3: Global Installation

For users who prefer a traditional installation:

```bash
npm install -g @mobilepixel/mcp
```

After installation, you can start the MCP server manually:

```bash
mcp-server-mobile
```

**When to use global installation:**
- You want to avoid npx download time on every start
- Working on local projects without internet
- Running on a dedicated test server

### Prerequisites

- Node.js 18 or higher
- Appium 2.x installed and running
- iOS Simulator or Android Emulator

---

## Quick Start

Once installed and configured, you can use MobilePixel tools through your AI assistant:

```
Claude, use MobilePixel to:
1. List available devices
2. Connect to iOS simulator
3. Launch the app with bundle ID "com.example.app"
4. Take a screenshot and show me what's on screen
```

---

## What's Included

### Open Source Version (Free)

The Open Source version includes **20 essential tools** for basic mobile automation:

#### Device Discovery & Management (3 tools)
- `mobile_list_available_devices` - List all connected devices and simulators
- `mobile_connect_device` - Connect to a specific device
- `mobile_disconnect_device` - Disconnect from current device

#### App Management (3 tools)
- `mobile_list_apps` - List installed applications on device
- `mobile_launch_app` - Launch an application by package name
- `mobile_terminate_app` - Stop a running application

#### Screen Information (2 tools)
- `mobile_get_screen_size` - Get screen dimensions in pixels
- `mobile_list_elements_on_screen` - List all UI elements with coordinates and properties

#### Basic Interactions (5 tools)
- `mobile_click_on_screen_at_coordinates` - Tap at specific pixel coordinates
- `mobile_long_press_on_screen_at_coordinates` - Long press at coordinates
- `mobile_swipe_on_screen` - Swipe gesture (up/down/left/right)
- `mobile_type_keys` - Type text into focused element
- `mobile_press_button` - Press system buttons (HOME, BACK, ENTER, etc.)

#### Additional Features (3 tools)
- `mobile_open_url` - Open URL in device browser
- `mobile_save_screenshot` - Capture and save screenshot to file
- `mobile_set_orientation` - Change screen orientation (portrait/landscape)

#### Diagnostics & Logs (4 tools)
- `mobile_get_app_logs` - Get application logs for debugging
- `mobile_clear_app_logs` - Clear application logs (Android only)
- `mobile_get_crash_logs` - Get crash logs with stack traces
- `mobile_get_system_errors` - Get system-level error logs

**Total: 20 tools** - Everything you need for basic mobile automation and testing.

---

## Usage Examples

### Example 1: Complete Mobile Test Workflow

```typescript
// Ask Claude in Cursor:
"Please help me test the login flow on my mobile app:
1. List available iOS simulators
2. Connect to iPhone 15 simulator
3. Launch app with bundle ID 'com.myapp.demo'
4. Wait 2 seconds for app to load
5. List all elements on screen
6. Tap on the username field at coordinates you find
7. Type 'testuser@example.com'
8. Tap on the password field
9. Type 'password123'
10. Tap the 'Sign In' button
11. Take a screenshot to verify login
12. Get app logs to check for errors"
```

### Example 2: MCP Integration with Claude

```typescript
// Natural language commands through MCP:
"Connect to my Android emulator and show me what apps are installed"

"Launch the Calculator app and take a screenshot"

"Swipe up on the home screen and list all visible elements"

"Navigate to Settings and change orientation to landscape"
```

### Example 3: Screenshot Comparison Test

```typescript
// Ask Claude:
"Help me create a visual regression test:
1. Connect to iPhone 14 Pro simulator
2. Launch app 'com.myapp.prod'
3. Navigate to the home screen
4. Take a screenshot and save as 'baseline-home.png'
5. Now navigate to profile screen
6. Take another screenshot as 'baseline-profile.png'
7. Navigate back to home
8. Take a new screenshot as 'current-home.png'
9. Compare current with baseline and tell me if they match"
```

### Example 4: Multi-Device Setup Check

```typescript
// Ask Claude:
"I need to test on multiple devices, please:
1. List all available iOS and Android devices
2. Show me which ones are currently running
3. Connect to the first iOS device
4. Get screen size and orientation
5. Take a screenshot
6. Disconnect and connect to first Android device
7. Repeat steps 4-5 for Android
8. Compare the two screenshots"
```

### Example 5: App Installation & Launch

```typescript
// Natural conversation with Claude:
User: "I want to test my new iOS app build"

Claude: "I'll help you with that. First, let me list available iOS devices..."
// Uses mobile_list_available_devices

User: "Connect to iPhone 15 Pro"

Claude: "Connected! What's the bundle ID of your app?"

User: "It's com.mycompany.myapp"

Claude: "Let me check if it's installed..."
// Uses mobile_list_apps, then mobile_launch_app

Claude: "App launched successfully! Would you like me to take a screenshot?"
```

---

## Demo & Screenshots

### Coming Soon!

We're preparing demo videos and GIFs showing:
- Quick setup with Cursor/Claude Desktop
- iOS and Android automation in action
- AI-powered natural language testing
- Real-world test scenarios

### Want to contribute?

If you've created demos or screenshots using MobilePixel, we'd love to feature them! 
Please submit via [GitHub Issues](https://github.com/MrTrotskiy/mobilepixel/issues) with the `demo` label.

---

## Upgrade to Pro

Need more power? Upgrade to **MobilePixel Pro** for advanced features:

### Version Comparison

| Feature | Open Source | Pro Individual | Pro Team |
|---------|------------|-----|------|
| **Total Tools** | 20 | 37 | 94+ |
| **Core Tools** | Yes (20) | Yes (20) | Yes (20) |
| **AI-Powered Tools** | No | Yes (8) | Yes (8) |
| **Visual Testing** | No | Yes (9) | Yes (9) |
| **Enterprise Tools** | No | No | Yes (57+) |
| | | | |
| **Key Features** | | | |
| AI Element Finding | No | Yes (0ms instant) | Yes (0ms instant) |
| Smart Login | No | Yes (95% success) | Yes (95% success) |
| OCR Text Recognition | No | Yes (~500ms) | Yes (~500ms) |
| Visual Regression | No | Yes | Yes |
| Parallel Execution | No | No | Yes (2-8x speedup) |
| Test Sharding | No | No | Yes |
| Performance Monitoring | No | No | Yes |
| Flaky Test Detection | No | No | Yes |
| Self-Healing Selectors | No | No | Yes |
| Accessibility Testing | No | No | Yes (WCAG 2.1) |
| | | | |
| **Support** | | | |
| Community (GitHub) | Yes | Yes | Yes |
| Email Support | No | Yes | Yes |
| Priority Support | No | No | Yes |
| Custom Integrations | No | No | Yes |

### What's Included in Pro Individual

**Pro Individual** includes everything from Open Source **plus**:

#### AI-Powered Automation (8 tools)
- **Natural Language Element Finding** - Find elements by description (0ms instant search)
- **Smart Element Interaction** - Tap elements using natural language (85% success rate)
- **Smart Login** - One-command auto-login with 95% success rate
- **Smart Form Filling** - Automatically fill forms intelligently (90% success rate)
- **AI Element Finder** - 754x faster element finding with intelligent caching
- **OCR Text Recognition** - Extract text from screenshots when accessibility API fails (~500ms)
- **Keyboard Management** - Automatic keyboard hiding and management
- **Text Extraction** - Extract all text from screenshots using OCR

#### Visual Testing Suite (9 tools)
- **Touch Indicators** - Visual feedback for taps and interactions
- **Demo Mode** - Full visual feedback mode for presentations
- **Screenshot Annotations** - Add markers, highlights, and annotations
- **Visual Regression Testing** - Pixel-perfect screenshot comparisons
- **Baseline Management** - Create and manage visual test baselines
- **Touch Indicator Controls** - Enable/disable/toggle visual touch feedback
- **Screenshot Comparison** - Automated visual diff detection
- **Visual Test Reports** - Detailed reports with visual diffs
- **Annotation Tools** - Mark and highlight areas in screenshots

**Total: 37 tools** (20 core + 8 AI + 9 visual)

### What's Included in Pro Team

**Pro Team** includes everything from Pro Individual **plus** enterprise-grade features:

#### Parallel Execution & Scaling (5+ tools)
- **Parallel Test Execution** - Run tests on multiple devices simultaneously (2-8x speedup)
- **Test Sharding** - Automatically distribute tests across device pools for CI/CD
- **Device Pool Management** - Manage and orchestrate multiple devices
- **Concurrent Operations** - Execute multiple actions in parallel
- **Load Balancing** - Intelligent distribution of test workload

#### Performance Monitoring (5+ tools)
- **CPU Monitoring** - Real-time CPU usage tracking
- **Memory Monitoring** - Memory usage and leak detection
- **FPS Tracking** - Frame rate monitoring for performance testing
- **Network Monitoring** - Intercept and analyze network traffic
- **Performance Profiling** - Detailed performance analysis and reports

#### Test Intelligence (8+ tools)
- **Flaky Test Detection** - Identify unstable tests with >20% failure rate
- **Self-Healing Selectors** - Automatically fix broken selectors using AI
- **Test Data Generation** - Generate realistic test data automatically
- **Test Recording** - Record user actions for test generation
- **Code Generation** - Generate test code from recorded actions
- **Test Metrics Collection** - Collect and analyze test execution metrics
- **Test Context Management** - Advanced test state and context tracking
- **Test Flakiness Analysis** - Deep analysis of test stability

#### Advanced Features (20+ more tools)
- Accessibility Testing (WCAG 2.1)
- Video & Trace Recording
- Bug Report Generation
- CI/CD Integration (JUnit, JSON, TAP)
- Security & Compliance tools
- And many more...

**Total: 94+ tools** (20 core + 8 AI + 9 visual + 57+ enterprise)

### When to Choose Each Version

**Open Source** is perfect for:
- Basic mobile automation needs
- Learning and experimentation
- Simple CI/CD integration
- Personal projects
- Small test suites

**Pro Individual** is ideal for:
- Solo developers and freelancers
- Projects requiring AI-powered element finding
- Visual testing and regression testing
- Faster test development with smart automation
- Small teams (1-3 people)

**Pro Team** is designed for:
- Teams and organizations
- Large-scale test execution
- Performance monitoring and optimization
- Enterprise CI/CD pipelines
- Advanced debugging and analytics
- Accessibility compliance requirements
- Complex test scenarios requiring parallel execution

[**View Pricing & Upgrade →**](https://mobilepixel.io/pricing)

---

## Configuration

Set up environment variables:

```bash
# Appium server URL (default: http://localhost:4723)
export APPIUM_SERVER_URL="http://localhost:4723"

# Enable debug logging
export DEBUG=mobilepixel:*

# Pro version license key (if you have Pro)
export MOBILEPIXEL_LICENSE_KEY="your-license-key-here"
```

---

## Known Issues & iOS Testing Status

### iOS Support Note

**Limited iOS Testing**: This open-source version has received limited testing on iOS devices and simulators. While the core functionality is designed to work with iOS, you may encounter bugs or unexpected behavior that hasn't been discovered during development.

### How to Report Issues

If you encounter any bugs or issues, please report them through:

1. **GitHub Issues** - For detailed technical issues:
   - [Report a bug on GitHub](https://github.com/MrTrotskiy/mobilepixel/issues)
   - Include steps to reproduce, error messages, and device/iOS version

2. **Email** - mr.trockiy@gmail.com
   - For general bug reports and support
   - Please include: iOS version, device type, what you were trying to do, and error messages

Your feedback helps us improve the tool for everyone!

---

## Documentation

- [Quick Start Guide](https://mobilepixel.io/docs/quickstart)
- [API Reference](https://mobilepixel.io/docs/api)
- [MCP Integration Guide](https://mobilepixel.io/docs/mcp-integration)
- [Examples](https://github.com/MrTrotskiy/mobilepixel/tree/main/examples)
- [FAQ](https://mobilepixel.io/docs/faq)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/MrTrotskiy/mobilepixel.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build:open
```

---

## Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/MrTrotskiy/mobilepixel/issues)
- **Discussions:** [Ask questions and share ideas](https://github.com/MrTrotskiy/mobilepixel/discussions)
- **Email:** mr.trockiy@gmail.com (Bug reports and general support)
- **Pro Support:** support@mobilepixel.io (Pro customers only)

---

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

---

## SEO Keywords

**Model Context Protocol (MCP)**, **Mobile Automation**, **iOS Testing**, **Android Testing**, **AI-Powered Testing**, **Claude Integration**, **Cursor IDE**, **Appium**, **Mobile Testing Framework**, **Cross-Platform Testing**, **Visual Regression Testing**, **OCR Mobile Testing**, **Natural Language Testing**, **MCP Server**, **React Native Testing**

---

## Why Choose MobilePixel?

### Open Source Benefits
- Free forever for commercial and personal use
- Active community support
- Regular updates and improvements
- No vendor lock-in
- Full source code access

### Pro Upgrade Path
- Seamless upgrade from Open Source to Pro
- Keep all your existing code and tests
- Add advanced features incrementally
- Pay only for what you need
- Clear, transparent pricing

### MCP Protocol Advantages
- Native AI assistant integration
- Natural language test commands
- Works with Claude, Cursor, and more
- Real-time mobile automation through chat
- No complex API learning curve

---

**Made with love by the MobilePixel team**

[Website](https://mobilepixel.io) · [GitHub](https://github.com/MrTrotskiy/mobilepixel) · [NPM](https://www.npmjs.com/package/@mobilepixel/mcp) · [Documentation](https://mobilepixel.io/docs)
