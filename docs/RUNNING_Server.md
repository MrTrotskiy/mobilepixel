# Quick Command Reference

**Fast lookup for common MobilePixel commands**

> For detailed guides, see: [SETUP.md](SETUP.md), [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md)

---

## Quick Start

```bash
npm install && npm run build  # Install & build
npm start                     # Start server
```

---

## Build

```bash
npm run build      # Build TypeScript
npm run watch      # Auto-rebuild on changes
npm run clean      # Clean build artifacts
npm run dev        # Build + start in one command
```

---

## Testing

```bash
npm test                  # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage     # With coverage report
```

> Full testing guide: [TESTING.md](TESTING.md)

---

## Linting

```bash
npm run lint       # Check linting errors
npm run fixlint    # Auto-fix errors
```

---

## Device Commands

**Android:**
```bash
adb devices              # List devices
adb kill-server          # Restart ADB
adb start-server
adb logcat               # View logs
```

**iOS:**
```bash
xcrun simctl list devices       # List simulators
xcrun simctl boot <UUID>        # Start simulator
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Device not found | `adb kill-server && adb start-server` |
| Build errors | `npm run clean && npm install && npm run build` |
| Linting errors | `npm run fixlint` |
| Test failures | Check `npm run test:coverage` for details |
| Server won't start | Verify `lib/index.js` exists, rebuild if needed |

---

## Full Documentation

- **[SETUP.md](SETUP.md)** - Initial setup & configuration
- **[TESTING.md](TESTING.md)** - Testing strategy & coverage
- **[SECURITY.md](SECURITY.md)** - Security guidelines
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Code structure
- **[TOOLS.md](TOOLS.md)** - All 37+ MCP tools
- **[AI_AGENT_GUIDELINES.md](AI_AGENT_GUIDELINES.md)** - AI agent best practices
- **[REACT_NATIVE.md](REACT_NATIVE.md)** - React Native support

---

## Windows Note

The `chmod` error during build is safe to ignore - TypeScript compiles successfully.

---

## Quick Verification

Test that server works (from Cursor/Claude):
```
"Show me connected devices"
"Take a screenshot"
```

If these work - server is running correctly!
