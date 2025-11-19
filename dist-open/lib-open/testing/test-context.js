"use strict";
/**
 * Test Context - Basic test utilities for Open Source version
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRecorder = exports.TestContext = void 0;
/**
 * Basic test context for recording test actions
 * This is a simplified version for the Open Source release
 */
class TestContext {
    static actions = [];
    /**
     * Record a test action (no-op in Open Source)
     */
    static recordAction(action) {
        // Basic implementation - just stores actions in memory
        this.actions.push(action);
    }
    /**
     * Get recorded actions
     */
    static getActions() {
        return [...this.actions];
    }
    /**
     * Clear recorded actions
     */
    static clear() {
        this.actions = [];
    }
}
exports.TestContext = TestContext;
/**
 * Test recorder stub for Open Source
 */
class TestRecorder {
    /**
     * Start recording (no-op in Open Source)
     */
    start() {
        // No-op in Open Source version
    }
    /**
     * Stop recording (no-op in Open Source)
     */
    stop() {
        // No-op in Open Source version
    }
}
exports.TestRecorder = TestRecorder;
