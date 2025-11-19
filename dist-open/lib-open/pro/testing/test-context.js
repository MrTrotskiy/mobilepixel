"use strict";
/**
 * TestContext class for tracking test execution history
 *
 * Purpose: Provides full context of test execution to Cursor AI
 * This includes all actions performed, logs captured, and screenshots taken
 *
 * This makes debugging much easier - AI can see the full history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestContext = void 0;
/**
 * Static class to maintain test context across tool calls
 *
 * Why static? Because MCP tools are stateless, but we need to track
 * actions across multiple tool invocations in the same test session
 */
class TestContext {
    // Store all actions performed during test
    static actions = [];
    // Store all logs captured during test
    static logs = [];
    // Flag to enable/disable context recording
    static enabled = true;
    /**
     * Record an action in test history
     *
     * Call this from every MCP tool to track what's happening
     *
     * @param action - Action to record
     */
    static recordAction(action) {
        if (!this.enabled) {
            return;
        }
        // Add timestamp if not provided
        if (!action.timestamp) {
            action.timestamp = Date.now();
        }
        this.actions.push(action);
    }
    /**
     * Add log entry to test context
     *
     * Use this to store important log messages
     *
     * @param log - Log message to add
     */
    static addLog(log) {
        if (!this.enabled) {
            return;
        }
        this.logs.push(`[${new Date().toISOString()}] ${log}`);
    }
    /**
     * Clear all test context data
     *
     * Call this at the start of a new test
     */
    static clear() {
        this.actions = [];
        this.logs = [];
    }
    /**
     * Enable context recording
     */
    static enable() {
        this.enabled = true;
    }
    /**
     * Disable context recording
     *
     * Useful if you want to reduce memory usage
     */
    static disable() {
        this.enabled = false;
    }
    /**
     * Get all recorded actions
     */
    static getActions() {
        return [...this.actions];
    }
    /**
     * Get all recorded logs
     */
    static getLogs() {
        return [...this.logs];
    }
    /**
     * Get action count
     */
    static getActionCount() {
        return this.actions.length;
    }
    /**
     * Export test context as MCP Resources
     *
     * This makes the context available to Cursor AI through MCP
     *
     * @returns Array of MCP resources
     */
    static toResources() {
        const resources = [];
        // Resource 1: Actions history
        resources.push({
            uri: "test://current/actions",
            name: "Test Actions History",
            description: "All actions performed in current test session",
            mimeType: "application/json",
            text: JSON.stringify(this.actions, null, 2)
        });
        // Resource 2: Captured logs
        resources.push({
            uri: "test://current/logs",
            name: "Test Logs",
            description: "All logs captured during test session",
            mimeType: "text/plain",
            text: this.logs.join("\n")
        });
        // Resource 3: Summary
        const summary = {
            totalActions: this.actions.length,
            totalLogs: this.logs.length,
            startTime: this.actions.length > 0 ? this.actions[0].timestamp : null,
            lastActionTime: this.actions.length > 0 ? this.actions[this.actions.length - 1].timestamp : null,
            devices: [...new Set(this.actions.map(a => a.device))],
            actionTypes: [...new Set(this.actions.map(a => a.type))]
        };
        resources.push({
            uri: "test://current/summary",
            name: "Test Summary",
            description: "Summary of current test session",
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2)
        });
        return resources;
    }
    /**
     * Find resource by URI
     *
     * @param uri - Resource URI to find
     * @returns Resource or null if not found
     */
    static findResource(uri) {
        const resources = this.toResources();
        return resources.find(r => r.uri === uri) || null;
    }
}
exports.TestContext = TestContext;
