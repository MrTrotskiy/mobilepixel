# MobilePixel - Open Source Edition
**Pixel-perfect mobile automation for iOS & Android**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/%40mobilepixel%2Fmcp.svg)](https://www.npmjs.com/package/@mobilepixel/mcp)
[![Node.js Version](https://img.shields.io/node/v/@mobilepixel/mcp.svg)](https://nodejs.org)

## Overview

MobilePixel Open Source provides **20 essential mobile automation tools** for iOS and Android testing. Perfect for basic automation needs, CI/CD integration, and getting started with mobile testing.

### Key Features

- **20 Core Tools** - Essential mobile automation capabilities
- **Cross-Platform** - iOS & Android support via Appium
- **Easy Integration** - Simple setup with MCP protocol
- **Apache 2.0 License** - Free for commercial and personal use
- **Community Support** - GitHub issues and discussions

---

## Installation

### Method 1: MCP Server (Recommended for Cursor/Claude Desktop)

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

### Method 2: Global Installation

```bash
npm install -g @mobilepixel/mcp
```

After installation, you can start the MCP server manually:

```bash
mcp-server-mobile
```

### Prerequisites

- Node.js 18 or higher
- Appium 2.x installed and running
- iOS Simulator or Android Emulator

### Quick Start

Once installed and configured, you can use MobilePixel tools through your AI assistant:

```
Claude, use MobilePixel to:
1. List available devices
2. Take a screenshot of the device
3. Show me what's on the screen
```

---

## What's Included

### Open Source Version (Free)

The Open Source version includes **20 essential tools** for basic mobile automation:

#### Device Discovery & Management (1 tool)
- `mobile_list_available_devices` - List all connected devices and simulators

#### App Management (2 tools)
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

#### Additional Features (4 tools)
- `mobile_open_url` - Open URL in device browser
- `mobile_save_screenshot` - Capture and save screenshot to file
- `mobile_set_orientation` - Change screen orientation (portrait/landscape)
- `mobile_get_orientation` - Get current screen orientation

#### Diagnostics & Logs (4 tools)
- `mobile_get_app_logs` - Get application logs for debugging
- `mobile_clear_app_logs` - Clear application logs (Android only)
- `mobile_get_crash_logs` - Get crash logs with stack traces
- `mobile_get_system_errors` - Get system-level error logs

**Total: 20 tools** - Everything you need for basic mobile automation and testing.

---

### Pro Version (Paid)

The Pro version includes all Open Source tools **plus** advanced features:

#### AI-Powered Tools (8 tools) - Pro Individual & Team
- `mobile_find_element_by_description` - Find elements using natural language
- `mobile_tap_element_by_description` - Tap elements by description (85% success rate)
- `mobile_hide_keyboard` - Hide soft keyboard automatically
- `mobile_smart_interact` - Intelligent element interaction
- `mobile_smart_login` - One-command auto-login (95% success rate)
- `mobile_smart_fill_form` - Auto-fill forms intelligently (90% success)
- `mobile_find_text_by_ocr` - Find text using OCR when accessibility fails
- `mobile_extract_text_from_screenshot` - Extract all text from screenshots using OCR

#### Visual Testing Tools (9 tools) - Pro Individual & Team
- `mobile_enable_touch_indicators` - Show visual feedback for taps
- `mobile_disable_touch_indicators` - Hide touch indicators
- `mobile_toggle_touch_indicators` - Toggle touch indicators on/off
- `mobile_get_touch_indicator_status` - Check if touch indicators are enabled
- `mobile_enable_demo_mode` - Enable full demo mode with visual feedback
- `mobile_disable_demo_mode` - Disable demo mode
- `mobile_annotate_screenshot` - Add markers and highlights to screenshots
- `mobile_visual_regression_test` - Compare screenshots pixel-perfect
- `mobile_visual_test_baseline` - Create baseline for visual testing

#### Enterprise Tools (57+ tools) - Pro Team Only
- **Parallel Execution** - Run tests on multiple devices simultaneously (2-8x speedup)
- **Test Sharding** - Distribute tests across device pools
- **Performance Monitoring** - CPU, Memory, FPS, Network tracking
- **Video Recording** - Record device screen during test execution
- **Test Recording** - Record user actions for test generation
- **Code Generation** - Generate test code from recorded actions
- **Flaky Test Detection** - Identify unstable tests (>20% failure rate)
- **Self-Healing Selectors** - Automatically fix broken selectors using AI
- **Accessibility Testing** - WCAG 2.1 compliance checks
- **Bug Report Generation** - Auto-generate detailed bug reports
- **Security Features** - Input sanitization, credential storage
- **CI/CD Integration** - JUnit, JSON, TAP reporters
- **Device Pool Management** - Manage device pools for parallel execution
- **Trace Recording** - Record complete test execution traces
- And many more...

**Pro Individual: 37 tools total** (20 core + 8 AI + 9 visual)  
**Pro Team: 94+ tools total** (20 core + 8 AI + 9 visual + 57+ enterprise)

---

## Usage Example

```typescript
import { MobilePixel } from '@mobilepixel/mcp';

// Initialize
const mobile = new MobilePixel();

// Connect to device
await mobile.mobile_connect_device({ platform: 'ios' });

// Launch app
await mobile.mobile_launch_app({ bundleId: 'com.example.app' });

// Take screenshot
const screenshot = await mobile.mobile_take_screenshot();

// Tap on element
await mobile.mobile_tap_at_coordinates({ x: 100, y: 200 });
```

---

## Configuration

Set up environment variables:

```bash
# Appium server URL (default: http://localhost:4723)
export APPIUM_SERVER_URL="http://localhost:4723"

# Enable debug logging
export DEBUG=mobilepixel:*
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

## Upgrade to Pro

Need more power? Upgrade to **MobilePixel Pro** for advanced features:

### Version Comparison

| Feature | Open Source | Pro | Pro+ |
|---------|------------|-----|------|
| **Total Tools** | 20 | 37 | 94+ |
| **Core Tools** | Yes (20) | Yes (20) | Yes (20) |
| **AI-Powered Tools** | No | Yes (8) | Yes (8) |
| **Visual Testing** | No | Yes (9) | Yes (9) |
| **Enterprise Tools** | No | No | Yes (57+) |
| | | | |
| **Key Features** | | | |
| AI Element Finding | No | Yes (754x faster) | Yes (754x faster) |
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

### What's Included in Pro Version

**Pro** includes everything from Open Source **plus**:

#### AI-Powered Automation (8 tools)
- **Natural Language Element Finding** - Find elements by description instead of coordinates
- **Smart Element Interaction** - Tap elements using natural language (85% success rate)
- **Smart Login** - One-command auto-login with 95% success rate
- **Smart Form Filling** - Automatically fill forms intelligently (90% success rate)
- **AI Element Finder** - 754x faster element finding with intelligent caching
- **OCR Text Recognition** - Extract text from screenshots when accessibility API fails
- **Keyboard Management** - Automatic keyboard hiding and management
- **Text Extraction** - Extract all text from screenshots using OCR (~500ms)

#### Visual Testing Suite (9 tools)
- **Touch Indicators** - Visual feedback for taps and interactions
- **Demo Mode** - Full visual feedback mode for presentations
- **Screenshot Annotations** - Add markers, highlights, and annotations to screenshots
- **Visual Regression Testing** - Pixel-perfect screenshot comparisons
- **Baseline Management** - Create and manage visual test baselines
- **Touch Indicator Controls** - Enable/disable/toggle visual touch feedback
- **Screenshot Comparison** - Automated visual diff detection
- **Visual Test Reports** - Detailed reports with visual diffs
- **Annotation Tools** - Mark and highlight areas in screenshots

**Total: 37 tools** (20 core + 8 AI + 9 visual)

### What's Included in Pro+ Version

**Pro+** includes everything from Pro **plus** enterprise-grade features:

#### Parallel Execution & Scaling (5+ tools)
- **Parallel Test Execution** - Run tests on multiple devices simultaneously (2-8x speedup)
- **Test Sharding** - Automatically distribute tests across device pools
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
- **Test Recording** - Record user actions for test generation
- **Code Generation** - Generate test code from recorded actions (Playwright, Cypress, WebDriverIO)
- **Flaky Test Detection** - Identify unstable tests with >20% failure rate
- **Self-Healing Selectors** - Automatically fix broken selectors using AI
- **Test Data Generation** - Generate realistic test data automatically
- **Test Metrics Collection** - Collect and analyze test execution metrics
- **Test Context Management** - Advanced test state and context tracking
- **Test Flakiness Analysis** - Deep analysis of test stability

#### Advanced Debugging (5+ tools)
- **Video Recording** - Record device screen during test execution
- **Trace Recording** - Record complete test execution traces with screenshots
- **Bug Report Generation** - Auto-generate detailed bug reports with screenshots and logs
- **Enhanced Logging** - Advanced logging and diagnostics
- **Error Analysis** - Intelligent error detection and analysis

#### Accessibility & Quality (3+ tools)
- **Accessibility Testing** - WCAG 2.1 compliance checks
- **Accessibility Reports** - Detailed accessibility violation reports
- **Accessibility Fix Suggestions** - Recommendations for fixing accessibility issues

#### Security & Compliance (3+ tools)
- **Input Sanitization** - Secure input handling and validation
- **Credential Management** - Secure storage and management of credentials
- **Security Auditing** - Security vulnerability detection

#### CI/CD Integration (5+ tools)
- **JUnit Reporter** - Generate JUnit XML reports for CI/CD
- **JSON Reporter** - Machine-readable JSON test reports
- **TAP Reporter** - Test Anything Protocol reports
- **CI/CD Integration** - Native integration with popular CI/CD platforms
- **Test Result Export** - Export test results in multiple formats

#### Additional Enterprise Features (20+ tools)
- **Device Lock Management** - Prevent concurrent access to devices
- **Session Management** - Advanced session handling and recovery
- **Batch Operations** - Execute multiple operations in batches
- **Auto-Retry Logic** - Intelligent retry mechanisms
- **Enhanced Loading Detection** - Smart detection of page/app loading states
- **Connection Pooling** - Optimized connection management
- **WebSocket Transport** - 6.3x faster communication protocol
- **Advanced Error Handling** - Comprehensive error recovery
- And many more enterprise-grade features...

**Total: 94+ tools** (20 core + 8 AI + 9 visual + 57+ enterprise)

### When to Choose Each Version

**Open Source** is perfect for:
- Basic mobile automation needs
- Learning and experimentation
- Simple CI/CD integration
- Personal projects

**Pro** is ideal for:
- Solo developers and small teams
- Projects requiring AI-powered element finding
- Visual testing and regression testing
- Faster test development with smart automation

**Pro+** is designed for:
- Teams and organizations
- Large-scale test execution
- Performance monitoring and optimization
- Enterprise CI/CD pipelines
- Advanced debugging and analytics
- Accessibility compliance requirements
- Complex test scenarios requiring parallel execution

[**View Pricing & Upgrade →**](https://mobilepixel.io/pricing)

---

## Documentation

- [Quick Start Guide](https://mobilepixel.io/docs/quickstart)
- [API Reference](https://mobilepixel.io/docs/api)
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

## Why Choose MobilePixel?

### Open Source Benefits
- Free forever for commercial and personal use
- Active community support
- Regular updates and improvements
- No vendor lock-in

### Pro Upgrade Path
- Seamless upgrade from Open Source to Pro
- Keep all your existing code and tests
- Add advanced features incrementally
- Pay only for what you need

---

**Made with love by the MobilePixel team**

[Website](https://mobilepixel.io) · [GitHub](https://github.com/MrTrotskiy/mobilepixel) · [NPM](https://www.npmjs.com/package/@mobilepixel/mcp) · [Twitter](https://twitter.com/mobilepixelio)
