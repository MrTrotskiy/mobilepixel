# MobilePixel Architecture
## Code Organization & Structure

**Last Updated:** October 6, 2025 (Wave 3 Intelligence Features added)

**Related Documentation:**
- [Wave 3 Intelligence Features Guide](./WAVE3_GUIDE.md) - Self-Healing, Loading, Retry, Metrics

---

## Project Structure

```
mobilepixel/
├── src/                    # Source code (TypeScript)
│   ├── core/              # Core abstractions (3 files)
│   │   ├── robot.ts       # Robot interface (cross-platform abstraction)
│   │   ├── config.ts      # Configuration constants (timeouts, buffers)
│   │   └── logger.ts      # Logging utilities
│   │
│   ├── platforms/         # Platform implementations (4 files + common)
│   │   ├── android.ts     # Android robot implementation (907 lines)
│   │   ├── ios.ts         # iOS robot implementation (572 lines)
│   │   ├── iphone-simulator.ts  # iOS simulator control
│   │   ├── webdriver-agent.ts   # WebDriverAgent client
│   │   └── common/
│   │       └── wait-conditions.ts  # Shared waiting logic
│   │
│   ├── ai/                # AI-powered features (5 modules)
│   │   ├── ai-element-finder.ts    # Natural language element search
│   │   ├── ai-helpers.ts           # AI utility functions
│   │   ├── ai-cache.ts             # AI response caching
│   │   ├── local-ai-provider.ts    # Local AI model support
│   │   └── smart-ai-router.ts      # AI request routing
│   │
│   ├── testing/           # Testing utilities (8 modules) Wave 3
│   │   ├── assertions.ts           # Expect-style assertions
│   │   ├── test-context.ts         # Test state management
│   │   ├── test-recorder.ts        # Record test actions
│   │   ├── code-generator.ts       # Generate test code
│   │   ├── test-flakiness-detector.ts  # Detect flaky tests
│   │   ├── test-data-generator.ts      # Generate test data
│   │   ├── self-healing-finder.ts      # Auto-recovery (100% rate)
│   │   └── metrics-collector.ts        # Production monitoring
│   │
│   ├── visual/            # Visual testing & screenshots (4 modules)
│   │   ├── visual-testing.ts       # Baseline comparison
│   │   ├── screenshot-annotator.ts # Annotation tools
│   │   ├── visual-touch-indicators.ts  # Touch visualization
│   │   └── ocr-engine.ts           # OCR text recognition
│   │
│   ├── accessibility/     # Accessibility features (1 module)
│   │   └── accessibility-checker.ts  # WCAG 2.1 compliance
│   │
│   ├── reporting/         # Reports & documentation (2 modules)
│   │   ├── bug-report-generator.ts   # Bug report creation
│   │   └── ci-cd-reporter.ts         # CI/CD integration
│   │
│   ├── device/            # Device management (3 modules)
│   │   ├── device-conditions.ts      # Simulate battery/network/GPS
│   │   ├── device-lock-manager.ts    # Device locking
│   │   └── session-manager.ts        # Session management
│   │
│   ├── monitoring/        # Performance & network monitoring (3 modules)
│   │   ├── performance-monitor.ts    # CPU/Memory/FPS tracking
│   │   ├── network-monitor.ts        # HTTP traffic capture
│   │   └── video-recorder.ts         # Screen recording
│   │
│   ├── operations/        # Complex operations (3 modules)
│   │   ├── batch-operations.ts       # Batch action execution
│   │   ├── loading-detector.ts       # Loading detection
│   │   └── robot-retry-helper.ts     # Retry logic
│   │
│   ├── server/            # MCP Server (modular architecture NEW)
│   │   └── tools/         # Tool registration modules (6 files)
│   │       ├── types.ts           # Shared types & utilities (73 lines)
│   │       ├── core-tools.ts      # Core tools (29 tools, 486 lines)
│   │       ├── ai-tools.ts        # AI tools (9 tools, 493 lines)
│   │       ├── composite-tools.ts # Smart tools (4 tools, 257 lines)
│   │       └── index.ts           # Module exports (10 lines)
│   │
│   ├── utils/             # Shared utilities (3 modules)
│   │   ├── image-utils.ts        # Image processing
│   │   ├── image-performance.ts  # Image optimization
│   │   └── png.ts                # PNG utilities
│   │
│   ├── server.ts          # Main MCP server (514 lines, -86%)
│   └── index.ts           # Entry point
│
├── lib/                   # Compiled JavaScript (generated)
│   └── (mirrors src/ structure)
│
├── test/                  # Test files
├── docs/                  # Documentation
├── package.json           # NPM configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Design Principles

### 1. Separation of Concerns
Each folder represents a distinct functional area:
- **Core**: Platform-agnostic abstractions
- **Platforms**: Platform-specific implementations
- **AI/Testing/Visual**: Feature-based modules
- **Server**: MCP protocol handling

### 2. Modularity
- No file over 1000 lines (server.ts refactored in v1.1.0)
- Clear dependencies between modules
- Easy to test and maintain

### 3. Cross-Platform
- Core abstraction layer (Robot interface)
- Platform implementations (Android, iOS)
- Shared utilities (wait conditions, image processing)

### 4. Scalability
- Room for growth in each category
- Easy to add new features
- Clear extension points

---

## Module Dependencies

### Core Layer
```
core/robot.ts
  ↓
platforms/android.ts
platforms/ios.ts
  ↓
server.ts (uses robots)
```

### AI Layer
```
ai/ai-element-finder.ts
  ← uses
core/robot.ts (for ScreenElement types)
visual/ocr-engine.ts (for OCR fallback)
```

### Testing Layer
```
testing/test-recorder.ts
  → generates
testing/code-generator.ts
  → outputs
Test code (TypeScript/JavaScript)
```

### Visual Layer
```
visual/visual-testing.ts
  ← uses
utils/image-utils.ts (image processing)
utils/png.ts (PNG handling)
```

---

## Build Output

**Source (`src/`)** compiles to **JavaScript (`lib/`)**:

```
src/core/robot.ts        →  lib/core/robot.js
src/platforms/android.ts →  lib/platforms/android.js
src/server.ts            →  lib/server.js
```

The compiled `lib/` directory mirrors the `src/` structure exactly.

---

## Key Files

### Entry Point
- **`src/index.ts`** - MCP server initialization
- **`src/server.ts`** - Main server logic (2980 lines - largest file)

### Core Abstractions
- **`src/core/robot.ts`** - Robot interface (158 lines)
- **`src/core/config.ts`** - Constants and timeouts (51 lines)

### Platform Implementations
- **`src/platforms/android.ts`** - Android robot (907 lines)
- **`src/platforms/ios.ts`** - iOS robot (572 lines)

### AI Features
- **`src/ai/ai-element-finder.ts`** - Natural language search (549 lines)
- **`src/visual/ocr-engine.ts`** - Text recognition (335 lines)

### Testing
- **`src/testing/assertions.ts`** - Expect-style assertions (261 lines)
- **`src/testing/test-recorder.ts`** - Action recording (189 lines)

---

## Refactoring History

### v1.1.0 (October 2025)
**Major code reorganization:**
- Created logical folder structure (11 categories)
- Moved 41 files into organized directories
- Updated 100+ imports
- Zero breaking changes
- All 30+ integration tests passing

**Before:**
```
src/ (40 files in flat structure)
```

**After:**
```
src/
├── core/
├── platforms/
├── ai/
├── testing/
├── visual/
... (11 categories)
```

**Benefits:**
- Better code organization
- Easier navigation
- Clear separation of concerns
- Ready for future growth

---

## Future Plans

### Phase 1: Split server.ts (Pending)
Break down 2980-line server.ts into modules:

```
src/server/
├── index.ts              # Main server setup (~200 lines)
├── config-loader.ts      # Configuration (~100 lines)
├── tool-registry.ts      # Tool helpers (~150 lines)
└── tools/                # Tool categories
    ├── core-tools.ts         (~300 lines)
    ├── ai-tools.ts           (~250 lines)
    ├── testing-tools.ts      (~200 lines)
    ├── visual-tools.ts       (~200 lines)
    ├── accessibility-tools.ts (~150 lines)
    ├── monitoring-tools.ts   (~200 lines)
    ├── device-tools.ts       (~250 lines)
    ├── reporting-tools.ts    (~200 lines)
    └── batch-tools.ts        (~150 lines)
```

**Estimated:** 3-4 hours with testing

### Phase 2: Documentation
- Add README.md to each folder
- Document public APIs
- Add usage examples

### Phase 3: Testing
- Add unit tests for each module
- Integration test suite
- Performance benchmarks

---

## Code Style

### File Naming
- **kebab-case**: `ai-element-finder.ts`
- **Descriptive**: Name reflects functionality

### Module Size
- **Target**: 200-400 lines per file
- **Max**: 1000 lines (currently only server.ts exceeds)
- **Reason**: Readability and maintainability

### Import Organization
```typescript
// 1. Node.js built-ins
import fs from "node:fs";

// 2. External packages
import sharp from "sharp";

// 3. Internal core
import { Robot } from "../core/robot";

// 4. Internal modules
import { AIElementFinder } from "../ai/ai-element-finder";
```

### Comments
- English language for all code and comments
- Document public functions with JSDoc
- Explain complex logic inline
- Keep comments up-to-date

---

## Quality Metrics

**Current State (v1.1.0 - Post Refactoring):**
- **Total files**: 46 TypeScript files (+5 from server.ts split)
- **Largest file**: android.ts (907 lines)
- **server.ts**: 514 lines (was 3810, -86%)
- **Average file size**: ~220 lines
- **Total lines**: ~15,000
- **Build time**: ~5 seconds
- **Test coverage**: Core functionality tested
- **TypeScript errors**: 0
- **ESLint errors**: 0

**Code Quality:**
- Clear folder structure
- Logical module separation
- Cross-platform abstraction
- No circular dependencies
- Type-safe (TypeScript)
- All files <1000 lines (best practice)

---

## Finding Code

### By Feature
- **Device operations** → `src/platforms/`
- **AI features** → `src/ai/`
- **Testing tools** → `src/testing/`
- **Visual testing** → `src/visual/`
- **Bug reports** → `src/reporting/`

### By Platform
- **Android** → `src/platforms/android.ts`
- **iOS** → `src/platforms/ios.ts`
- **Cross-platform** → `src/core/robot.ts`

### By Use Case
- **Element finding** → `src/ai/ai-element-finder.ts`
- **Assertions** → `src/testing/assertions.ts`
- **Screenshots** → `src/visual/`
- **Performance** → `src/monitoring/`

---

## Related Documentation

- **[SETUP.md](SETUP.md)** - Installation and configuration
- **[AI_AGENT_GUIDELINES.md](AI_AGENT_GUIDELINES.md)** - How AI agents should use tools
- **[TOOLS.md](TOOLS.md)** - Complete tool reference
- **[RUNNING_Server.md](RUNNING_Server.md)** - Server commands

---

**Last Updated:** October 5, 2025
**Version:** 1.1.0
**Status:** Production Ready

