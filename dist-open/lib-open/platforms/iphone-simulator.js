"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimctlManager = exports.Simctl = void 0;
const node_child_process_1 = require("node:child_process");
const logger_1 = require("../core/logger");
const webdriver_agent_1 = require("./webdriver-agent");
const robot_1 = require("../core/robot");
const wait_conditions_1 = require("./common/wait-conditions");
const config_1 = require("../core/config");
// Optional Pro security features
let sanitizePackageName;
try {
    sanitizePackageName = require("../security/input-sanitizer").sanitizePackageName;
}
catch {
    // Basic sanitization for Open Source
    sanitizePackageName = (pkg) => pkg.replace(/[^a-zA-Z0-9._-]/g, "");
}
const WDA_PORT = 8100;
// Cache TTL for element queries (in milliseconds)
// Elements are cached for 5 seconds to avoid expensive WDA queries
// Cache is automatically cleared after any action (tap, swipe, etc.)
//
// Why 5 seconds?
// - WDA element queries take 300-1000ms on simulators
// - Screen doesn't change without actions
// - After action (tap/swipe), cache is cleared immediately
// - Safe to cache for longer when screen is stable
//
// Performance impact:
// - Before: 300-1000ms per getElementsOnScreen() call
// - After: 300-1000ms first call, 0ms cached calls (within 5s)
// - Speedup: 300-1000x for cached calls!
const ELEMENT_CACHE_TTL = 5000; // Increased from 200ms to 5000ms (5 seconds)
class Simctl {
    simulatorUuid;
    wdaInstance = null;
    _cachedScreenSize = null;
    _cachedElements = null;
    _wdaInitialized = false; // Track if WDA was checked/started
    constructor(simulatorUuid) {
        this.simulatorUuid = simulatorUuid;
    }
    async isWdaInstalled() {
        const apps = await this.listApps();
        return apps.map(app => app.packageName).includes("com.facebook.WebDriverAgentRunner.xctrunner");
    }
    async startWda() {
        if (!(await this.isWdaInstalled())) {
            // wda is not even installed, won't attempt to start it
            return;
        }
        (0, logger_1.trace)("Starting WebDriverAgent");
        const webdriverPackageName = "com.facebook.WebDriverAgentRunner.xctrunner";
        this.simctl("launch", this.simulatorUuid, webdriverPackageName);
        // now we wait for wda to have a successful status
        const wda = new webdriver_agent_1.WebDriverAgent("localhost", WDA_PORT);
        // wait for wda to start (configured timeout)
        const timeout = +new Date() + config_1.TIMEOUTS.wdaStart;
        while (+new Date() < timeout) {
            // cross fingers and see if wda is already running
            if (await wda.isRunning()) {
                (0, logger_1.trace)("WebDriverAgent is now running");
                return;
            }
            // wait 100ms before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        (0, logger_1.trace)("Could not start WebDriverAgent in time, giving up");
    }
    /**
     * Get WebDriverAgent instance with lazy initialization
     * Checks if WDA is running only ONCE on first call
     * Subsequent calls reuse cached instance without checking
     * This saves 5-10 seconds per test suite by avoiding repeated checks
     */
    async wda() {
        // Return cached instance immediately if already initialized
        if (this._wdaInitialized && this.wdaInstance) {
            return this.wdaInstance;
        }
        // First time initialization - check and start WDA if needed
        const wda = new webdriver_agent_1.WebDriverAgent("localhost", WDA_PORT);
        if (!(await wda.isRunning())) {
            await this.startWda();
            if (!(await wda.isRunning())) {
                throw new robot_1.ActionableError("WebDriverAgent is not running on simulator, please see https://github.com/MrTrotskiy/mobilepixel/wiki/");
            }
        }
        // Cache the WDA instance and mark as initialized
        this.wdaInstance = wda;
        this._wdaInitialized = true;
        return wda;
    }
    simctl(...args) {
        return (0, node_child_process_1.execFileSync)("xcrun", ["simctl", ...args], {
            timeout: config_1.TIMEOUTS.slow,
            maxBuffer: config_1.BUFFERS.maxBuffer,
        });
    }
    async getScreenshot() {
        const wda = await this.wda();
        return await wda.getScreenshot();
        // alternative: return this.simctl("io", this.simulatorUuid, "screenshot", "-");
    }
    async openUrl(url) {
        const wda = await this.wda();
        await wda.openUrl(url);
        // alternative: this.simctl("openurl", this.simulatorUuid, url);
    }
    async launchApp(packageName) {
        // Sanitize bundle ID to prevent command injection
        const safeBundleId = sanitizePackageName(packageName);
        this.simctl("launch", this.simulatorUuid, safeBundleId);
    }
    async terminateApp(packageName) {
        // Sanitize bundle ID to prevent command injection
        const safeBundleId = sanitizePackageName(packageName);
        this.simctl("terminate", this.simulatorUuid, safeBundleId);
    }
    async listApps() {
        const text = this.simctl("listapps", this.simulatorUuid).toString();
        const result = (0, node_child_process_1.execFileSync)("plutil", ["-convert", "json", "-o", "-", "-r", "-"], {
            input: text,
        });
        const output = JSON.parse(result.toString());
        return Object.values(output).map(app => ({
            packageName: app.CFBundleIdentifier,
            appName: app.CFBundleDisplayName,
        }));
    }
    /**
     * Get screen size with caching
     * Screen size doesn't change unless orientation changes
     */
    async getScreenSize() {
        // Return cached value if available
        if (this._cachedScreenSize) {
            return this._cachedScreenSize;
        }
        // Get fresh screen size from WebDriverAgent
        const wda = await this.wda();
        this._cachedScreenSize = await wda.getScreenSize();
        return this._cachedScreenSize;
    }
    async sendKeys(keys, clearFirst = false) {
        const wda = await this.wda();
        // Clear field if requested
        if (clearFirst) {
            // TODO: Implement clearTextField for iOS simulator
            // For now, just send the text as is
        }
        await wda.sendKeys(keys);
        // Clear element cache after sending keys
        this.clearElementCache();
    }
    async swipe(direction) {
        const wda = await this.wda();
        await wda.swipe(direction);
        // Clear element cache after swipe
        this.clearElementCache();
    }
    async swipeFromCoordinate(x, y, direction, distance) {
        const wda = await this.wda();
        await wda.swipeFromCoordinate(x, y, direction, distance);
        // Clear element cache after swipe
        this.clearElementCache();
    }
    async tap(x, y) {
        const wda = await this.wda();
        await wda.tap(x, y);
        // Clear element cache after tap
        this.clearElementCache();
    }
    async longPress(x, y) {
        const wda = await this.wda();
        await wda.longPress(x, y);
        // Clear element cache after long press
        this.clearElementCache();
    }
    async pressButton(button) {
        const wda = await this.wda();
        await wda.pressButton(button);
        // Clear element cache after button press
        this.clearElementCache();
    }
    /**
     * Get elements on screen with caching
     * Elements are cached for 200ms to avoid duplicate queries
     * Cache is automatically cleared after any action
     */
    async getElementsOnScreen() {
        // Check if cache is valid (exists and not expired)
        if (this._cachedElements) {
            const age = Date.now() - this._cachedElements.timestamp;
            if (age < ELEMENT_CACHE_TTL) {
                // Cache is fresh, return cached data
                return this._cachedElements.data;
            }
        }
        // Cache miss or expired - fetch fresh elements
        const wda = await this.wda();
        const elements = await wda.getElementsOnScreen();
        // Store in cache with current timestamp
        this._cachedElements = {
            data: elements,
            timestamp: Date.now(),
        };
        return elements;
    }
    /**
     * Clear element cache
     * Called after any action that might change screen elements
     */
    clearElementCache() {
        this._cachedElements = null;
    }
    async setOrientation(orientation) {
        const wda = await this.wda();
        await wda.setOrientation(orientation);
        // Clear screen size cache since orientation changed
        this._cachedScreenSize = null;
        // Clear element cache since orientation changed
        this.clearElementCache();
    }
    async getOrientation() {
        const wda = await this.wda();
        return wda.getOrientation();
    }
    /**
     * Wait for a condition to be met (smart waiting)
     * Uses polling with exponential backoff
     */
    async waitFor(condition) {
        return (0, wait_conditions_1.waitForCondition)(condition, async () => {
            return await this.getElementsOnScreen();
        });
    }
    /**
     * Hide soft keyboard (simulator version)
     * Uses WDA to dismiss keyboard
     */
    async hideKeyboard() {
        try {
            const wda = await this.wda();
            // Try to dismiss keyboard by tapping outside or sending return
            // WDA has built-in keyboard dismissal logic
            try {
                // Get screen size and tap in safe area (top of screen)
                const screenSize = await this.getScreenSize();
                await wda.tap(screenSize.width / 2, 50);
            }
            catch {
                // Ignore if tap fails
            }
        }
        catch (error) {
            // Ignore errors - keyboard might not be present
        }
    }
    /**
     * Select option by text in native picker (simulator version)
     * Same implementation as IosRobot
     */
    async selectOptionByText(text, maxScrollAttempts = 10) {
        const textLower = text.toLowerCase();
        for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
            const elements = await this.getElementsOnScreen();
            const option = elements.find(el => (el.text || "").toLowerCase().includes(textLower) ||
                (el.label || "").toLowerCase().includes(textLower) ||
                (el.value || "").toLowerCase().includes(textLower));
            if (option) {
                const tapX = option.rect.x + Math.floor(option.rect.width / 2);
                const tapY = option.rect.y + Math.floor(option.rect.height / 2);
                await this.tap(tapX, tapY);
                return true;
            }
            const screenSize = await this.getScreenSize();
            const centerX = Math.floor(screenSize.width / 2);
            const centerY = Math.floor(screenSize.height * 0.6);
            await this.swipeFromCoordinate(centerX, centerY, "up", 100);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
    }
    /**
     * Swipe inside a specific element (simulator version)
     * Same implementation as IosRobot
     */
    async swipeInElement(element, direction, distance) {
        const centerX = Math.floor(element.rect.x + element.rect.width / 2);
        const centerY = Math.floor(element.rect.y + element.rect.height / 2);
        let swipeDistance;
        if (distance) {
            swipeDistance = distance;
        }
        else {
            if (direction === "up" || direction === "down") {
                swipeDistance = Math.floor(element.rect.height * 0.7);
            }
            else {
                swipeDistance = Math.floor(element.rect.width * 0.7);
            }
        }
        await this.swipeFromCoordinate(centerX, centerY, direction, swipeDistance);
    }
    /**
     * Get clipboard content from simulator
     */
    async getClipboard() {
        try {
            const result = (0, node_child_process_1.execFileSync)("xcrun", [
                "simctl",
                "pbpaste",
                this.simulatorUuid
            ]).toString();
            return result;
        }
        catch (error) {
            console.error("Failed to get clipboard:", error);
            return "";
        }
    }
    /**
     * Set clipboard content on simulator
     */
    async setClipboard(text) {
        try {
            (0, node_child_process_1.execFileSync)("xcrun", [
                "simctl",
                "pbcopy",
                this.simulatorUuid
            ], {
                input: text
            });
        }
        catch (error) {
            throw new Error(`Failed to set clipboard: ${error}`);
        }
    }
    /**
     * Clear clipboard content
     */
    async clearClipboard() {
        await this.setClipboard("");
    }
    /**
     * Cleanup - dispose WebDriver session
     * Should be called when Robot is disposed or tests are complete
     */
    async dispose() {
        if (this.wdaInstance) {
            await this.wdaInstance.dispose();
            this.wdaInstance = null;
        }
    }
}
exports.Simctl = Simctl;
class SimctlManager {
    listSimulators() {
        // detect if this is a mac
        if (process.platform !== "darwin") {
            // don't even try to run xcrun
            return [];
        }
        try {
            const text = (0, node_child_process_1.execFileSync)("xcrun", ["simctl", "list", "devices", "-j"]).toString();
            const json = JSON.parse(text);
            return Object.values(json.devices).flatMap(device => {
                return device.map(d => {
                    return {
                        name: d.name,
                        uuid: d.udid,
                        state: d.state,
                    };
                });
            });
        }
        catch (error) {
            console.error("Error listing simulators", error);
            return [];
        }
    }
    listBootedSimulators() {
        return this.listSimulators()
            .filter(simulator => simulator.state === "Booted");
    }
    getSimulator(uuid) {
        return new Simctl(uuid);
    }
}
exports.SimctlManager = SimctlManager;
