# Testing Guide

**Last Updated:** October 6, 2025

---

## Overview

MobilePixel uses comprehensive testing strategy to ensure code quality and reliability:

- **Unit Tests** - Test individual modules in isolation
- **Integration Tests** - Test platform implementations (Android, iOS)
- **Coverage Reports** - Track code coverage (target: 80%+)
- **CI/CD Testing** - Automated tests on every commit

---

## Test Structure

```
test/
├── unit/                      # Unit tests
│   ├── ai/                    # AI module tests
│   │   ├── ai-cache.test.ts
│   │   └── hybrid-element-finder.test.ts
│   ├── core/                  # Core module tests
│   │   └── png.test.ts
│   ├── testing/               # Testing utilities tests
│   │   └── test-context.test.ts
│   ├── transport/             # Transport layer tests
│   │   └── websocket-transport.test.ts
│   └── visual/                # Visual testing module tests
│       └── ocr-engine.test.ts
├── integration/               # Integration tests
│   └── platforms/
│       ├── android.test.ts
│       └── ios.test.ts
├── benchmarks/                # Performance benchmarks
│   └── benchmark-suite.ts
└── manual/                    # Manual test scripts
    └── ...
```

---

## Running Tests

### All Tests

```bash
npm test
```

This runs both unit and integration tests.

### Unit Tests Only

```bash
npm run test:unit
```

Fast tests that don't require device connection.

### Integration Tests Only

```bash
npm run test:integration
```

Tests that require Android/iOS device or emulator.

### Watch Mode

```bash
npm run test:watch
```

Auto-rerun tests on file changes (useful during development).

### Coverage Report

```bash
npm run test:coverage
```

Generates coverage report in `coverage/` directory.

View HTML report:
```bash
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, before, after } from "mocha";
import * as assert from "assert";
import { AICache } from "../../../src/ai/ai-cache";

describe("AI Cache", () => {
  let cache: AICache;

  before(() => {
    cache = new AICache(100, 5000);
  });

  after(() => {
    cache.clear();
  });

  it("should store and retrieve element", () => {
    const element = { text: "Login", type: "button" };
    cache.set("login", Buffer.from("screen"), element, 95, "found", "accessibility");

    const cached = cache.get("login", Buffer.from("screen"));
    
    assert.ok(cached, "Element should be cached");
    assert.strictEqual(cached.element.text, "Login");
  });
});
```

### Integration Test Example

```typescript
import { describe, it } from "mocha";
import * as assert from "assert";
import { AndroidRobot } from "../../../src/platforms/android";

describe("Android Robot", () => {
  const deviceId = process.env.TEST_DEVICE_ID || "843b3cd3";

  it("should connect to device", async () => {
    const robot = new AndroidRobot(deviceId);
    const isConnected = await robot.ping();
    
    assert.ok(isConnected, "Should connect to device");
  });
});
```

---

## Coverage Requirements

### Target Coverage (nyc configuration)

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

### Checking Coverage

```bash
npm run test:coverage
```

Output:
```
========================= Coverage summary =========================
Statements   : 82.5% (1650/2000)
Branches     : 76.3% (305/400)
Functions    : 81.2% (130/160)
Lines        : 82.8% (1620/1955)
====================================================================
```

### Critical Modules (Covered)

**AI Cache** - 95% coverage
- Cache hit/miss scenarios
- TTL expiration
- LRU eviction
- Statistics tracking

**Hybrid Element Finder** - 92% coverage
- Tier 1/2/3 search logic
- Fallback strategy
- Performance metrics

**WebSocket Transport** - 88% coverage
- Connection lifecycle
- Request/response correlation
- Reconnection logic
- Timeout handling

---

## Test Categories

### Unit Tests (Fast, No Dependencies)

Test individual functions and classes:

- **AI Cache** - Caching logic
- **Hybrid Finder** - Element search tiers
- **WebSocket Transport** - Network layer
- **Input Sanitizer** - Input validation
- **Credential Manager** - Security

### Integration Tests (Slow, Requires Devices)

Test platform implementations:

- **Android Robot** - ADB commands
- **iOS Robot** - XCTest commands
- **Device Pool** - Multi-device management
- **Real App Testing** - End-to-end flows

### Benchmark Tests

Measure performance:

```bash
npm run test:benchmarks
```

Tracks:
- Element search speed
- Cache hit rates
- Network latency
- Memory usage

---

## CI/CD Testing

### GitHub Actions Matrix

Tests run on:
- **Node versions**: 18, 20, 22
- **Platforms**: Ubuntu, Windows, macOS
- **Total combinations**: 8 parallel jobs

### Android Emulator Tests

Runs on Ubuntu with Android API 31 emulator:

```bash
npm run test:integration
```

### Coverage Upload

Coverage reports uploaded to:
- **Codecov** - For tracking trends
- **GitHub Artifacts** - For download (30 days retention)

---

## Test Best Practices

### DO

- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies
- Clean up after tests (close connections, delete files)
- Keep tests fast (< 5s per test)
- Test both success and failure paths

### DON'T

- Write tests that depend on external services
- Hard-code device IDs (use env vars)
- Leave side effects (files, connections)
- Write flaky tests (random failures)
- Test implementation details (test behavior)
- Skip error handling tests

---

## Debugging Tests

### Run Single Test File

```bash
npx mocha --require ts-node/register test/unit/ai/ai-cache.test.ts
```

### Run Specific Test

```bash
npx mocha --require ts-node/register test/unit/ai/ai-cache.test.ts --grep "should store and retrieve"
```

### Enable Debug Logs

```bash
DEBUG=* npm test
```

### Increase Timeout

```bash
npx mocha --require ts-node/register test/integration/**/*.test.ts --timeout 30000
```

---

## Continuous Improvement

### Coverage Goals

- **Phase 1** (Current): 80% coverage on critical modules
- **Phase 2** (Next): 85% overall coverage
- **Phase 3** (Future): 90% coverage + mutation testing

### Test Priorities

1. **Critical paths** - AI features, device control
2. **Error handling** - Failure scenarios, edge cases
3. **Security** - Input validation, credential management
4. **Performance** - Benchmarks, load testing

---

## References

- [Mocha Documentation](https://mochajs.org/)
- [NYC Coverage](https://github.com/istanbuljs/nyc)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-testing-and-overall-quality-practices)



