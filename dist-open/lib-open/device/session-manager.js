"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const robot_1 = require("../core/robot");
const config_1 = require("../core/config");
/**
 * Session Manager for WebDriver Agent
 *
 * Manages persistent WebDriver sessions to avoid creating/deleting sessions
 * for every operation. This provides significant performance improvements:
 * - Before: 300-700ms overhead per operation
 * - After: ~0ms overhead (session reused)
 */
class SessionManager {
    host;
    port;
    sessionId = null;
    sessionUrl = null;
    isConnecting = false;
    baseHeaders;
    constructor(host, port) {
        this.host = host;
        this.port = port;
        // HTTP Keep-Alive headers for connection reuse
        this.baseHeaders = {
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=60, max=100",
        };
    }
    /**
     * Helper method for fetch with keep-alive headers
     */
    async fetchWithKeepAlive(url, options) {
        const headers = {
            ...this.baseHeaders,
            ...(options?.headers || {}),
        };
        return fetch(url, {
            ...options,
            headers,
        });
    }
    /**
     * Get or create a WebDriver session
     * Uses lazy initialization - session is created on first call
     */
    async getSession() {
        // If we already have a session, verify it's still alive
        if (this.sessionId) {
            const isAlive = await this.isSessionAlive();
            if (isAlive) {
                return this.sessionUrl;
            }
            // Session is dead, clean up and create new one
            this.sessionId = null;
            this.sessionUrl = null;
        }
        // Prevent multiple simultaneous session creation attempts
        if (this.isConnecting) {
            // Wait for existing connection attempt to complete
            return this.waitForConnection();
        }
        // Create new session
        this.isConnecting = true;
        try {
            this.sessionId = await this.createSession();
            this.sessionUrl = `http://${this.host}:${this.port}/session/${this.sessionId}`;
            return this.sessionUrl;
        }
        finally {
            this.isConnecting = false;
        }
    }
    /**
     * Wait for ongoing connection attempt to complete
     * Uses configured session connection timeout
     */
    async waitForConnection() {
        const startTime = Date.now();
        while (this.isConnecting) {
            if (Date.now() - startTime > config_1.TIMEOUTS.sessionConnection) {
                throw new robot_1.ActionableError("Timeout waiting for WebDriver session creation");
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!this.sessionUrl) {
            throw new robot_1.ActionableError("Session creation failed");
        }
        return this.sessionUrl;
    }
    /**
     * Check if current session is still alive
     */
    async isSessionAlive() {
        if (!this.sessionId || !this.sessionUrl) {
            return false;
        }
        try {
            // Use lightweight status endpoint to check session health
            const response = await this.fetchWithKeepAlive(`${this.sessionUrl}/status`, {
                method: "GET",
            });
            return response.ok;
        }
        catch (error) {
            // Network error or session is dead
            return false;
        }
    }
    /**
     * Create a new WebDriver session
     */
    async createSession() {
        const url = `http://${this.host}:${this.port}/session`;
        const response = await this.fetchWithKeepAlive(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ capabilities: { alwaysMatch: { platformName: "iOS" } } }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new robot_1.ActionableError(`Failed to create WebDriver session: ${response.status} ${errorText}`);
        }
        const json = await response.json();
        if (!json.value || !json.value.sessionId) {
            throw new robot_1.ActionableError(`Invalid session response: ${JSON.stringify(json)}`);
        }
        return json.value.sessionId;
    }
    /**
     * Explicitly delete the session
     * Should be called when Robot is disposed or tests are complete
     */
    async dispose() {
        if (!this.sessionId) {
            return;
        }
        try {
            const url = `http://${this.host}:${this.port}/session/${this.sessionId}`;
            await this.fetchWithKeepAlive(url, { method: "DELETE" });
        }
        catch (error) {
            // Ignore errors during cleanup
        }
        finally {
            this.sessionId = null;
            this.sessionUrl = null;
        }
    }
    /**
     * Force reconnection (useful for testing or error recovery)
     */
    async reconnect() {
        await this.dispose();
        await this.getSession();
    }
}
exports.SessionManager = SessionManager;
