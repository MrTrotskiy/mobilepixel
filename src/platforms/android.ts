// SPDX-License-Identifier: Apache-2.0
// Copyright 2024 MrTrotskiy

import path from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import * as xml from "fast-xml-parser";

import { ActionableError, Button, InstalledApp, Robot, ScreenElement, ScreenElementRect, ScreenSize, SwipeDirection, Orientation } from "../core/robot";
import { WaitCondition, WaitResult, waitForCondition } from "./common/wait-conditions";
import { TIMEOUTS, DURATIONS, BUFFERS } from "../core/config";

// Optional Pro features
let TraceRecorder: any = null;
let sanitizeCommandArg: (arg: string) => string;
let sanitizePackageName: (pkg: string) => string;

try {
	// Try to load Pro monitoring features
	TraceRecorder = require("../monitoring/trace-recorder").TraceRecorder;
} catch {
	// TraceRecorder not available in Open Source
	TraceRecorder = null;
}

try {
	// Try to load Pro security features
	const security = require("../security/input-sanitizer");
	sanitizeCommandArg = security.sanitizeCommandArg;
	sanitizePackageName = security.sanitizePackageName;
} catch {
	// Security features not available in Open Source - use basic sanitization
	sanitizeCommandArg = (arg: string) => arg.replace(/[;&|<>]/g, "");
	sanitizePackageName = (pkg: string) => pkg.replace(/[^a-zA-Z0-9._-]/g, "");
}

export interface AndroidDevice {
	deviceId: string;
	deviceType: "tv" | "mobile";
}

interface UiAutomatorXmlNode {
	node: UiAutomatorXmlNode[];
	class?: string;
	text?: string;
	bounds?: string;
	hint?: string;
	focused?: string;
	"content-desc"?: string;
	"resource-id"?: string;
}

interface UiAutomatorXml {
	hierarchy: {
		node: UiAutomatorXmlNode;
	};
}

const getAdbPath = (): string => {
	if (process.env.ANDROID_HOME) {
		return path.join(process.env.ANDROID_HOME, "platform-tools", "adb");
	}

	const defaultAndroidSdk = path.join(process.env.HOME || "", "Library", "Android", "sdk", "platform-tools", "adb");
	if (existsSync(defaultAndroidSdk)) {
		return defaultAndroidSdk;
	}

	return "adb";
};

const BUTTON_MAP: Record<Button, string> = {
	"BACK": "KEYCODE_BACK",
	"HOME": "KEYCODE_HOME",
	"VOLUME_UP": "KEYCODE_VOLUME_UP",
	"VOLUME_DOWN": "KEYCODE_VOLUME_DOWN",
	"ENTER": "KEYCODE_ENTER",
	"DPAD_CENTER": "KEYCODE_DPAD_CENTER",
	"DPAD_UP": "KEYCODE_DPAD_UP",
	"DPAD_DOWN": "KEYCODE_DPAD_DOWN",
	"DPAD_LEFT": "KEYCODE_DPAD_LEFT",
	"DPAD_RIGHT": "KEYCODE_DPAD_RIGHT",
};

type AndroidDeviceType = "tv" | "mobile";

// Cache TTL for element queries (in milliseconds)
// Elements are cached for 5 seconds to avoid expensive uiautomator dumps
// Cache is automatically cleared after any action (tap, swipe, etc.)
//
// Why 5 seconds?
// - UIAutomator dump takes 2000-2500ms on most devices
// - Screen doesn't change without actions
// - After action (tap/swipe), cache is cleared immediately
// - Safe to cache for longer when screen is stable
//
// Performance impact:
// - Before: 2200ms per getElementsOnScreen() call
// - After: 2200ms first call, 0ms cached calls (within 5s)
// - Speedup: 1000x for cached calls!
const ELEMENT_CACHE_TTL = 5000; // Increased from 200ms to 5000ms (5 seconds)

interface CachedElements {
	data: ScreenElement[];
	timestamp: number;
}

export class AndroidRobot implements Robot {

	private _cachedScreenSize: ScreenSize | null = null;
	private _cachedElements: CachedElements | null = null;

	// Trace recorder for debugging and time-travel
	// Can be enabled via startTracing() and stopped via stopTracing()
	private _traceRecorder: any = null;

	// Static flag to track if UIAutomator fallback warning was shown
	// This prevents log spam when multiple AndroidRobot instances are created
	private static _uiAutomatorFallbackWarningShown = false;

	public constructor(private deviceId: string) {
	}

	/**
	 * Start trace recording
	 * Records all actions, screenshots, and element trees for debugging
	 *
	 * @param options - Trace recorder options (optional)
	 */
	public startTracing(options?: { captureScreenshots?: boolean; captureTree?: boolean }): void {
		this._traceRecorder = new TraceRecorder({
			captureScreenshots: options?.captureScreenshots ?? true,
			captureTree: options?.captureTree ?? true,
		});
		this._traceRecorder.start();
	}

	/**
	 * Stop trace recording and save to file
	 *
	 * @param outputPath - Path to save trace file
	 */
	public async stopTracing(outputPath: string): Promise<void> {
		if (!this._traceRecorder) {
			throw new Error("Tracing not started. Call startTracing() first.");
		}

		await this._traceRecorder.stop();
		await this._traceRecorder.save(outputPath, {
			deviceId: this.deviceId,
			platform: "android",
		});

		this._traceRecorder = null;
	}

	/**
	 * Get trace recorder instance
	 * Returns null if tracing is not active
	 */
	public getTraceRecorder(): any {
		return this._traceRecorder;
	}

	/**
	 * Check if tracing is currently active
	 */
	public isTracing(): boolean {
		return this._traceRecorder !== null && this._traceRecorder.isRecording();
	}

	public adb(...args: string[]): Buffer {
		return execFileSync(getAdbPath(), ["-s", this.deviceId, ...args], {
			maxBuffer: BUFFERS.maxBuffer,
			timeout: TIMEOUTS.slow,
		});
	}

	public getSystemFeatures(): string[] {
		return this.adb("shell", "pm", "list", "features")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("feature:"))
			.map(line => line.substring("feature:".length));
	}

	/**
	 * Get screen size with caching
	 * Screen size doesn't change unless orientation changes
	 */
	public async getScreenSize(): Promise<ScreenSize> {
		// Return cached value if available
		if (this._cachedScreenSize) {
			return this._cachedScreenSize;
		}

		// Get fresh screen size
		const screenSize = this.adb("shell", "wm", "size")
			.toString()
			.split(" ")
			.pop();

		if (!screenSize) {
			throw new Error("Failed to get screen size");
		}

		const scale = 1;
		const [width, height] = screenSize.split("x").map(Number);

		// Cache the result
		this._cachedScreenSize = { width, height, scale };
		return this._cachedScreenSize;
	}

	public async listApps(): Promise<InstalledApp[]> {
		// only apps that have a launcher activity are returned
		return this.adb("shell", "cmd", "package", "query-activities", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("packageName="))
			.map(line => line.substring("packageName=".length))
			.filter((value, index, self) => self.indexOf(value) === index)
			.map(packageName => ({
				packageName,
				appName: packageName,
			}));
	}

	private async listPackages(): Promise<string[]> {
		return this.adb("shell", "pm", "list", "packages")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("package:"))
			.map(line => line.substring("package:".length));
	}

	public async launchApp(packageName: string): Promise<void> {
		// Sanitize package name to prevent command injection
		const safePkg = sanitizePackageName(packageName);

		// Check if package exists before trying to launch
		const packages = await this.listPackages();
		if (!packages.includes(safePkg)) {
			// Find similar package names to help user
			const similar = packages.filter(p =>
				p.toLowerCase().includes(safePkg.toLowerCase()) ||
				safePkg.toLowerCase().includes(p.toLowerCase())
			);

			let errorMsg = `App package "${safePkg}" not found on device.`;
			if (similar.length > 0) {
				errorMsg += `\n\nDid you mean one of these?\n${similar.slice(0, 5).map(p => `  - ${p}`).join("\n")}`;
			}
			throw new ActionableError(errorMsg);
		}

		this.adb("shell", "monkey", "-p", safePkg, "-c", "android.intent.category.LAUNCHER", "1");
	}

	public async listRunningProcesses(): Promise<string[]> {
		return this.adb("shell", "ps", "-e")
			.toString()
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.startsWith("u")) // non-system processes
			.map(line => line.split(/\s+/)[8]); // get process name
	}

	public async swipe(direction: SwipeDirection): Promise<void> {
		const startTime = Date.now();

		// Record action start if tracing
		this._traceRecorder?.recordAction("swipe", { direction });

		try {
			const screenSize = await this.getScreenSize();
			const centerX = screenSize.width >> 1;

			let x0: number, y0: number, x1: number, y1: number;

			switch (direction) {
				case "up":
					x0 = x1 = centerX;
					y0 = Math.floor(screenSize.height * 0.80);
					y1 = Math.floor(screenSize.height * 0.20);
					break;
				case "down":
					x0 = x1 = centerX;
					y0 = Math.floor(screenSize.height * 0.20);
					y1 = Math.floor(screenSize.height * 0.80);
					break;
				case "left":
					x0 = Math.floor(screenSize.width * 0.80);
					x1 = Math.floor(screenSize.width * 0.20);
					y0 = y1 = Math.floor(screenSize.height * 0.50);
					break;
				case "right":
					x0 = Math.floor(screenSize.width * 0.20);
					x1 = Math.floor(screenSize.width * 0.80);
					y0 = y1 = Math.floor(screenSize.height * 0.50);
					break;
				default:
					throw new ActionableError(`Swipe direction "${direction}" is not supported`);
			}

			this.adb("shell", "input", "swipe", `${x0}`, `${y0}`, `${x1}`, `${y1}`, `${DURATIONS.swipe}`);

			// Clear element cache after swipe
			this.clearElementCache();

			const duration = Date.now() - startTime;

			// Capture screenshot and tree after action if tracing
			if (this._traceRecorder?.isRecording()) {
				const screenshot = await this.getScreenshot();
				this._traceRecorder.recordScreenshot(screenshot, await this.getScreenSize());

				const tree = await this.getElementsOnScreen();
				this._traceRecorder.recordTree(tree);
			}

			// Update action with duration
			this._traceRecorder?.recordAction("swipe", { direction, from: { x: x0, y: y0 }, to: { x: x1, y: y1 } }, "success", duration);
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMsg = error instanceof Error ? error.message : String(error);
			this._traceRecorder?.recordAction("swipe", { direction }, "error", duration, errorMsg);
			this._traceRecorder?.recordError(error instanceof Error ? error : new Error(errorMsg));
			throw error;
		}
	}

	public async swipeFromCoordinate(x: number, y: number, direction: SwipeDirection, distance?: number): Promise<void> {
		const screenSize = await this.getScreenSize();

		let x0: number, y0: number, x1: number, y1: number;

		// Use provided distance or default to 30% of screen dimension
		const defaultDistanceY = Math.floor(screenSize.height * 0.3);
		const defaultDistanceX = Math.floor(screenSize.width * 0.3);
		const swipeDistanceY = distance || defaultDistanceY;
		const swipeDistanceX = distance || defaultDistanceX;

		switch (direction) {
			case "up":
				x0 = x1 = x;
				y0 = y;
				y1 = Math.max(0, y - swipeDistanceY);
				break;
			case "down":
				x0 = x1 = x;
				y0 = y;
				y1 = Math.min(screenSize.height, y + swipeDistanceY);
				break;
			case "left":
				x0 = x;
				x1 = Math.max(0, x - swipeDistanceX);
				y0 = y1 = y;
				break;
			case "right":
				x0 = x;
				x1 = Math.min(screenSize.width, x + swipeDistanceX);
				y0 = y1 = y;
				break;
			default:
				throw new ActionableError(`Swipe direction "${direction}" is not supported`);
		}

		this.adb("shell", "input", "swipe", `${x0}`, `${y0}`, `${x1}`, `${y1}`, `${DURATIONS.swipe}`);

		// Clear element cache after swipe
		this.clearElementCache();
	}

	private getDisplayCount(): number {
		return this.adb("shell", "dumpsys", "SurfaceFlinger", "--display-id")
			.toString()
			.split("\n")
			.filter(s => s.startsWith("Display "))
			.length;
	}

	private getFirstDisplayId(): string | null {
		const displays = this.adb("shell", "cmd", "display", "get-displays")
			.toString()
			.split("\n")
			.filter(s => s.startsWith("Display id "))
			// filter for state ON even though get-displays only returns turned on displays
			.filter(s => s.indexOf(", state ON,") >= 0)
			// another paranoia check
			.filter(s => s.indexOf(", uniqueId ") >= 0);

		if (displays.length > 0) {
			const m = displays[0].match(/uniqueId \"([^\"]+)\"/);
			if (m !== null) {
				const displayId = m[1];
				if (displayId.indexOf("local:") === 0) {
					return displayId.split(":")[1];
				}

				return displayId;
			}
		}

		return null;
	}

	public async getScreenshot(): Promise<Buffer> {
		if (this.getDisplayCount() <= 1) {
			// backward compatibility for android 10 and below, and for single display devices
			return this.adb("exec-out", "screencap", "-p");
		}

		// find the first display that is turned on, and capture that one
		const displayId = this.getFirstDisplayId();
		return this.adb("exec-out", "screencap", "-p", "-d", `${displayId}`);
	}

	private collectElements(node: UiAutomatorXmlNode): ScreenElement[] {
		const elements: Array<ScreenElement> = [];

		if (node.node) {
			if (Array.isArray(node.node)) {
				for (const childNode of node.node) {
					elements.push(...this.collectElements(childNode));
				}
			} else {
				elements.push(...this.collectElements(node.node));
			}
		}

		if (node.text || node["content-desc"] || node.hint) {
			const element: ScreenElement = {
				type: node.class || "text",
				text: node.text,
				label: node["content-desc"] || node.hint || "",
				rect: this.getScreenElementRect(node),
			};

			if (node.focused === "true") {
				// only provide it if it's true, otherwise don't confuse llm
				element.focused = true;
			}

			const resourceId = node["resource-id"];
			if (resourceId !== null && resourceId !== "") {
				element.identifier = resourceId;
			}

			if (element.rect.width > 0 && element.rect.height > 0) {
				elements.push(element);
			}
		}

		return elements;
	}

	/**
	 * Get elements on screen with caching
	 * Elements are cached for 200ms to avoid duplicate queries
	 * Cache is automatically cleared after any action
	 */
	public async getElementsOnScreen(): Promise<ScreenElement[]> {
		// Check if cache is valid (exists and not expired)
		if (this._cachedElements) {
			const age = Date.now() - this._cachedElements.timestamp;
			if (age < ELEMENT_CACHE_TTL) {
				// Cache is fresh, return cached data
				return this._cachedElements.data;
			}
		}

		// Cache miss or expired - fetch fresh elements
		const parsedXml = await this.getUiAutomatorXml();
		const hierarchy = parsedXml.hierarchy;
		const elements = this.collectElements(hierarchy.node);

		// Store in cache with current timestamp
		this._cachedElements = {
			data: elements,
			timestamp: Date.now(),
		};

		return elements;
	}

	/**
	 * Hide soft keyboard on device
	 *
	 * Useful when keyboard overlaps elements you want to interact with
	 * Safe to call even if keyboard is not visible
	 */
	public async hideKeyboard(): Promise<void> {
		try {
			// Send BACK key event to dismiss keyboard
			// This is the standard Android way to hide keyboard
			this.adb("shell", "input", "keyevent", "KEYCODE_BACK");

			// Clear element cache since keyboard state changed
			this.clearElementCache();
		} catch (error) {
			// Ignore errors - keyboard might not be visible
			console.error("Failed to hide keyboard:", error);
		}
	}

	/**
	 * Select option by text in native picker/dropdown
	 *
	 * Works with native Android spinners
	 * Automatically scrolls through options to find matching text
	 *
	 * @param text - Text of the option to select
	 * @param maxScrollAttempts - Maximum number of scroll attempts (default: 10)
	 * @returns true if option was found and selected, false otherwise
	 */
	public async selectOptionByText(text: string, maxScrollAttempts: number = 10): Promise<boolean> {
		// Strategy:
		// 1. Get all elements on screen
		// 2. Look for element with matching text
		// 3. If found, tap on it
		// 4. If not found, scroll and try again

		for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
			const elements = await this.getElementsOnScreen();

			// Find element with matching text
			const matchingElement = elements.find(el =>
				el.text === text || el.label === text
			);

			if (matchingElement) {
				// Found it! Tap on it
				const centerX = matchingElement.rect.x + matchingElement.rect.width / 2;
				const centerY = matchingElement.rect.y + matchingElement.rect.height / 2;
				await this.tap(centerX, centerY);
				return true;
			}

			// Not found, scroll down to see more options
			if (attempt < maxScrollAttempts - 1) {
				await this.swipe("down");
			}
		}

		// Not found after all attempts
		return false;
	}

	/**
	 * Swipe inside a specific element (useful for scrollable containers)
	 *
	 * This allows scrolling within a specific element like carousels or nested lists
	 *
	 * @param element - The element to swipe inside
	 * @param direction - Swipe direction
	 * @param distance - Optional swipe distance (default: 70% of element dimension)
	 */
	public async swipeInElement(element: ScreenElement, direction: SwipeDirection, distance?: number): Promise<void> {
		// Calculate center of element as starting point
		const centerX = element.rect.x + element.rect.width / 2;
		const centerY = element.rect.y + element.rect.height / 2;

		// Calculate swipe distance (default to 70% of element size)
		let swipeDistance: number;
		if (distance) {
			swipeDistance = distance;
		} else {
			// Default: 70% of element dimension
			if (direction === "up" || direction === "down") {
				swipeDistance = Math.floor(element.rect.height * 0.7);
			} else {
				swipeDistance = Math.floor(element.rect.width * 0.7);
			}
		}

		// Perform swipe from center of element
		await this.swipeFromCoordinate(centerX, centerY, direction, swipeDistance);
	}

	/**
	 * Clear element cache
	 * Called after any action that might change screen elements
	 */
	private clearElementCache(): void {
		this._cachedElements = null;
	}

	public async terminateApp(packageName: string): Promise<void> {
		// Sanitize package name to prevent command injection
		const safePkg = sanitizePackageName(packageName);
		this.adb("shell", "am", "force-stop", safePkg);
	}

	public async openUrl(url: string): Promise<void> {
		// Sanitize URL to prevent command injection
		const safeUrl = sanitizeCommandArg(url);
		this.adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", safeUrl);
	}

	private isAscii(text: string): boolean {
		return /^[\x00-\x7F]*$/.test(text);
	}

	private escapeShellText(text: string): string {
		// Use enhanced sanitization from security module
		// This provides better protection against command injection
		return sanitizeCommandArg(text);
	}

	private async isDeviceKitInstalled(): Promise<boolean> {
		const packages = await this.listPackages();
		return packages.includes("com.mobilenext.devicekit");
	}

	/**
	 * Clear current text field
	 *
	 * Selects all text and deletes it using keyboard shortcuts
	 * Use before sendKeys to ensure field is empty
	 */
	public async clearTextField(): Promise<void> {
		// Select all (Ctrl+A) and delete
		this.adb("shell", "input", "keyevent", "KEYCODE_MOVE_END"); // Move to end

		// Send multiple backspaces to clear field (safer than select all on some devices)
		// 100 backspaces should clear most fields
		for (let i = 0; i < 100; i++) {
			this.adb("shell", "input", "keyevent", "KEYCODE_DEL");
		}

		// Clear element cache after clearing field
		this.clearElementCache();
	}

	public async sendKeys(text: string, clearFirst: boolean = false): Promise<void> {
		if (text === "") {
			// bailing early, so we don't run adb shell with empty string.
			// this happens when you prompt with a simple "submit".
			return;
		}

		// Clear field if requested
		if (clearFirst) {
			await this.clearTextField();
		}

		if (this.isAscii(text)) {
			// adb shell input only supports ascii characters. and
			// some of the keys have to be escaped.
			const _text = this.escapeShellText(text);
			this.adb("shell", "input", "text", _text);
		} else if (await this.isDeviceKitInstalled()) {
			// try sending over clipboard
			const base64 = Buffer.from(text).toString("base64");

			// send clipboard over and immediately paste it
			this.adb("shell", "am", "broadcast", "-a", "devicekit.clipboard.set", "-e", "encoding", "base64", "-e", "text", base64, "-n", "com.mobilenext.devicekit/.ClipboardBroadcastReceiver");
			this.adb("shell", "input", "keyevent", "KEYCODE_PASTE");

			// clear clipboard when we're done
			this.adb("shell", "am", "broadcast", "-a", "devicekit.clipboard.clear", "-n", "com.mobilenext.devicekit/.ClipboardBroadcastReceiver");
		} else {
			throw new ActionableError("Non-ASCII text is not supported on Android, please install mobilenext devicekit, see https://github.com/mobile-next/devicekit-android");
		}

		// Clear element cache after sending keys
		this.clearElementCache();
	}

	public async pressButton(button: Button) {
		if (!BUTTON_MAP[button]) {
			throw new ActionableError(`Button "${button}" is not supported`);
		}

		const mapped = BUTTON_MAP[button];
		this.adb("shell", "input", "keyevent", mapped);

		// Clear element cache after button press
		this.clearElementCache();
	}

	public async tap(x: number, y: number): Promise<void> {
		const startTime = Date.now();

		// Record action start if tracing
		this._traceRecorder?.recordAction("tap", { x, y });

		try {
			this.adb("shell", "input", "tap", `${x}`, `${y}`);

			// Clear element cache after tap
			this.clearElementCache();

			const duration = Date.now() - startTime;

			// Capture screenshot and tree after action if tracing
			if (this._traceRecorder?.isRecording()) {
				const screenshot = await this.getScreenshot();
				this._traceRecorder.recordScreenshot(screenshot, await this.getScreenSize());

				const tree = await this.getElementsOnScreen();
				this._traceRecorder.recordTree(tree);
			}

			// Update action with duration
			this._traceRecorder?.recordAction("tap", { x, y }, "success", duration);
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMsg = error instanceof Error ? error.message : String(error);
			this._traceRecorder?.recordAction("tap", { x, y }, "error", duration, errorMsg);
			this._traceRecorder?.recordError(error instanceof Error ? error : new Error(errorMsg));
			throw error;
		}
	}

	public async longPress(x: number, y: number): Promise<void> {
		const startTime = Date.now();

		// Record action start if tracing
		this._traceRecorder?.recordAction("longPress", { x, y });

		try {
			// a long press is a swipe with no movement and a long duration
			this.adb("shell", "input", "swipe", `${x}`, `${y}`, `${x}`, `${y}`, `${DURATIONS.longPress}`);

			// Clear element cache after long press
			this.clearElementCache();

			const duration = Date.now() - startTime;

			// Capture screenshot and tree after action if tracing
			if (this._traceRecorder?.isRecording()) {
				const screenshot = await this.getScreenshot();
				this._traceRecorder.recordScreenshot(screenshot, await this.getScreenSize());

				const tree = await this.getElementsOnScreen();
				this._traceRecorder.recordTree(tree);
			}

			// Update action with duration
			this._traceRecorder?.recordAction("longPress", { x, y }, "success", duration);
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMsg = error instanceof Error ? error.message : String(error);
			this._traceRecorder?.recordAction("longPress", { x, y }, "error", duration, errorMsg);
			this._traceRecorder?.recordError(error instanceof Error ? error : new Error(errorMsg));
			throw error;
		}
	}

	public async setOrientation(orientation: Orientation): Promise<void> {
		const value = orientation === "portrait" ? 0 : 1;

		// disable auto-rotation prior to setting the orientation
		this.adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
		this.adb("shell", "content", "insert", "--uri", "content://settings/system", "--bind", "name:s:user_rotation", "--bind", `value:i:${value}`);

		// Clear screen size cache since orientation changed
		this._cachedScreenSize = null;

		// Clear element cache since orientation changed
		this.clearElementCache();
	}

	public async getOrientation(): Promise<Orientation> {
		const rotation = this.adb("shell", "settings", "get", "system", "user_rotation").toString().trim();
		return rotation === "0" ? "portrait" : "landscape";
	}

	/**
	 * Wait for a condition to be met (smart waiting)
	 * Uses polling with exponential backoff
	 */
	public async waitFor(condition: WaitCondition): Promise<WaitResult> {
		return waitForCondition(condition, async () => {
			return await this.getElementsOnScreen();
		});
	}

	/**
	 * Get application logs from Android device
	 *
	 * Returns recent log entries for a specific app package
	 * This helps with debugging by showing what the app is logging
	 *
	 * @param packageName - Package name of the app (e.g., "com.example.app")
	 * @param lines - Number of most recent log lines to return (default: 100)
	 * @returns Array of log lines as strings
	 */
	public getAppLogs(packageName: string, lines: number = 100): string[] {
		try {
			// Get PID of the running app
			// pidof returns the process ID if app is running
			const pidOutput = this.adb("shell", "pidof", packageName).toString().trim();

			if (!pidOutput) {
				// App is not running, return empty logs
				return [`App ${packageName} is not running`];
			}

			const pid = pidOutput;

			// Get logs filtered by PID
			// -d: dump logs and exit (don't follow)
			// --pid: filter by process ID
			// -t: show timestamps
			const logsOutput = this.adb(
				"shell",
				"logcat",
				"-d",
				"--pid",
				pid,
				"-t",
				lines.toString()
			).toString();

			// Split into lines and filter empty ones
			const logLines = logsOutput
				.split("\n")
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// If no logs, return helpful message
			if (logLines.length === 0) {
				return [`No logs found for ${packageName}`];
			}

			return logLines;
		} catch (error: any) {
			// If command fails, return error message
			return [`Error reading logs: ${error.message}`];
		}
	}

	/**
	 * Clear all logs on Android device
	 *
	 * Note: This clears ALL logs on device, not just one app
	 * Use with caution as it affects all applications
	 *
	 * @returns Success or error message
	 */
	public clearLogs(): string {
		try {
			// Clear all logs
			// -c: clear (flush) the entire log and exit
			this.adb("shell", "logcat", "-c");
			return "Android logs cleared successfully";
		} catch (error: any) {
			return `Error clearing logs: ${error.message}`;
		}
	}

	/**
	 * Get crash logs from Android device
	 *
	 * Searches for FATAL EXCEPTION entries in logs
	 * These indicate app crashes and include stack traces
	 *
	 * This is critical for debugging - helps Cursor AI see why apps crash
	 *
	 * @param packageName - Optional package name to filter crashes (if not provided, gets all crashes)
	 * @param lines - Number of log lines to search through (default: 500)
	 * @returns Array of crash log entries
	 */
	public getCrashLogs(packageName?: string, lines: number = 500): string[] {
		try {
			// Strategy:
			// 1. Get recent logs from crash buffer
			// 2. Search for FATAL EXCEPTION or AndroidRuntime errors
			// 3. Filter by package name if provided
			// 4. Return grouped crash reports

			// Get logs from crash buffer
			// -b crash: read from crash log buffer
			// -d: dump and exit
			// -t: limit number of lines
			const crashBuffer = this.adb(
				"shell",
				"logcat",
				"-b",
				"crash",
				"-d",
				"-t",
				lines.toString()
			).toString();

			// Also get main log buffer for FATAL EXCEPTION entries
			const mainBuffer = this.adb(
				"shell",
				"logcat",
				"-d",
				"-t",
				lines.toString()
			).toString();

			// Combine both buffers
			const allLogs = crashBuffer + "\n" + mainBuffer;

			// Split into lines
			const logLines = allLogs.split("\n");

			// Find crash-related lines
			const crashLines: string[] = [];
			let inCrashBlock = false;
			let crashBlockLines: string[] = [];

			for (const line of logLines) {
				// Check if this is start of a crash
				if (line.includes("FATAL EXCEPTION") ||
					line.includes("AndroidRuntime") && line.includes("FATAL") ||
					line.includes("*** FATAL EXCEPTION")) {

					// If we were already in a crash block, save it
					if (inCrashBlock && crashBlockLines.length > 0) {
						// Check if crash matches package filter
						const crashText = crashBlockLines.join("\n");
						if (!packageName || crashText.includes(packageName)) {
							crashLines.push("=== CRASH DETECTED ===");
							crashLines.push(...crashBlockLines);
							crashLines.push("=== END CRASH ===");
							crashLines.push("");
						}
					}

					// Start new crash block
					inCrashBlock = true;
					crashBlockLines = [line];
				} else if (inCrashBlock) {
					// Continue collecting crash lines
					crashBlockLines.push(line);

					// Stop collecting after we see empty line or new log entry starts
					if (line.trim() === "" || (!line.startsWith("\t") && !line.startsWith(" ") && line.length > 0 && !line.includes("at "))) {
						// End of this crash block
						const crashText = crashBlockLines.join("\n");
						if (!packageName || crashText.includes(packageName)) {
							crashLines.push("=== CRASH DETECTED ===");
							crashLines.push(...crashBlockLines);
							crashLines.push("=== END CRASH ===");
							crashLines.push("");
						}
						inCrashBlock = false;
						crashBlockLines = [];
					}
				}
			}

			// Handle last crash block if still open
			if (inCrashBlock && crashBlockLines.length > 0) {
				const crashText = crashBlockLines.join("\n");
				if (!packageName || crashText.includes(packageName)) {
					crashLines.push("=== CRASH DETECTED ===");
					crashLines.push(...crashBlockLines);
					crashLines.push("=== END CRASH ===");
				}
			}

			// If no crashes found, return helpful message
			if (crashLines.length === 0) {
				if (packageName) {
					return [`No crashes found for ${packageName}`];
				}
				return ["No crashes found in recent logs"];
			}

			return crashLines;
		} catch (error: any) {
			return [`Error reading crash logs: ${error.message}`];
		}
	}

	/**
	 * Get system error logs from Android device
	 *
	 * Searches for ERROR level logs in system logs
	 * This includes system-level errors that might affect app behavior
	 *
	 * Helps Cursor AI understand system-level issues
	 *
	 * @param lines - Number of recent log lines to return (default: 100)
	 * @returns Array of system error log entries
	 */
	public getSystemErrors(lines: number = 100): string[] {
		try {
			// Get logs filtered by ERROR priority
			// -b system: read from system log buffer
			// -d: dump and exit
			// *:E: show only ERROR priority and above
			// -t: limit number of lines
			const logsOutput = this.adb(
				"shell",
				"logcat",
				"-b",
				"system",
				"-d",
				"*:E",
				"-t",
				lines.toString()
			).toString();

			// Split into lines and filter empty ones
			const logLines = logsOutput
				.split("\n")
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// If no errors found, return helpful message
			if (logLines.length === 0) {
				return ["No system errors found in recent logs"];
			}

			return logLines;
		} catch (error: any) {
			return [`Error reading system errors: ${error.message}`];
		}
	}

	/**
	 * Get clipboard content from device
	 *
	 * Uses adb shell to read clipboard content.
	 * Returns empty string if clipboard is empty.
	 */
	public async getClipboard(): Promise<string> {
		try {
		// Use cmd clipboard get command (Android 10+)
			const result = this.adb("shell", "cmd", "clipboard", "get").toString();
			return result.trim();
		} catch (error) {
		// Fallback: return empty string if command fails
			console.error("Failed to get clipboard:", error);
			return "";
		}
	}

	/**
	 * Set clipboard content on device
	 *
	 * @param text - Text to set in clipboard
	 */
	public async setClipboard(text: string): Promise<void> {
		try {
		// Use service call method which is more reliable
		// This is a workaround for cmd clipboard limitations
			this.adb("shell", "service", "call", "clipboard", "2", "s16", `android.content.ClipData`, "i32", "1", "s16", "text/plain", "s16", text);
		} catch (error) {
		// Fallback: try simpler approach
			try {
			// Direct service call with text
				const escapedText = text.replace(/'/g, "");
				this.adb("shell", `am broadcast -a clipper.set -e text '${escapedText}'`);
			} catch {
				throw new Error(`Failed to set clipboard: ${error}`);
			}
		}
	}

	/**
	 * Clear clipboard content
	 */
	public async clearClipboard(): Promise<void> {
		try {
			this.adb("shell", "cmd", "clipboard", "clear");
		} catch (error) {
		// Fallback: set empty string
			await this.setClipboard("");
		}
	}

	/**
	 * Set HTTP proxy for Wi-Fi connection
	 *
	 * This allows intercepting network traffic through a proxy server
	 * Required for network monitoring with tools like mitmproxy or Charles
	 *
	 * Note: Requires device to be connected via Wi-Fi
	 *
	 * @param host - Proxy server host (e.g., "192.168.1.100")
	 * @param port - Proxy server port (e.g., 8080)
	 * @returns Success or error message
	 */
	public setProxy(host: string, port: number): string {
		try {
			// Set global HTTP proxy via adb shell settings
			// This works for most apps that respect system proxy settings
			this.adb("shell", "settings", "put", "global", "http_proxy", `${host}:${port}`);
			return `Proxy set to ${host}:${port}. Restart app to apply changes.`;
		} catch (error: any) {
			return `Error setting proxy: ${error.message}`;
		}
	}

	/**
	 * Clear HTTP proxy settings
	 *
	 * Removes proxy configuration and restores direct connection
	 *
	 * @returns Success or error message
	 */
	public clearProxy(): string {
		try {
			// Clear global HTTP proxy
			this.adb("shell", "settings", "put", "global", "http_proxy", ":0");
			return "Proxy cleared. Restart app to apply changes.";
		} catch (error: any) {
			return `Error clearing proxy: ${error.message}`;
		}
	}

	/**
	 * Get current proxy settings
	 *
	 * @returns Current proxy configuration
	 */
	public getProxy(): string {
		try {
			const proxy = this.adb("shell", "settings", "get", "global", "http_proxy").toString().trim();
			if (!proxy || proxy === ":0") {
				return "No proxy configured (direct connection)";
			}
			return `Current proxy: ${proxy}`;
		} catch (error: any) {
			return `Error reading proxy: ${error.message}`;
		}
	}

	/**
	 * Check if Activity is in resumed state (ready for UI inspection)
	 * This helps avoid unnecessary UIAutomator dump attempts
	 */
	private isActivityResumed(): boolean {
		try {
			const activities = this.adb("shell", "dumpsys", "activity", "activities").toString();
			// Check if there's a resumed activity
			return activities.includes("mResumedActivity") || activities.includes("mFocusedActivity");
		} catch (error) {
			// If we can't check, assume it's okay to proceed
			return true;
		}
	}

	/**
	 * Get UIAutomator XML dump with enhanced retry logic and graceful degradation
	 *
	 * Strategy:
	 * - Standard apps: 3 attempts with 50ms → 100ms → 200ms backoff
	 * - React Native apps: 5 attempts with longer delays (100ms → 200ms → 400ms → 800ms → 1600ms)
	 * - Graceful degradation: Return partial data if XML fails completely
	 *
	 * Improvements:
	 * - Detect React Native apps and use extended retry
	 * - Add screen refresh command before retry
	 * - Return empty but valid XML as fallback (allows coordinate-based operations)
	 */
	private async getUiAutomatorDump(): Promise<string> {
		// Detect if this is a React Native app (check for common RN indicators)
		const isReactNative = this.isReactNativeApp();

		// Use extended retry for React Native apps
		const maxRetries = isReactNative ? 5 : 3;
		let delay = isReactNative ? 100 : 50; // React Native needs longer initial delay

		for (let tries = 0; tries < maxRetries; tries++) {
			// Check if activity is ready (skip on first try)
			if (tries > 0) {
				// For React Native, force screen refresh before retry
				if (isReactNative && tries > 1) {
					try {
						// Send a harmless input event to trigger UI update
						this.adb("shell", "input", "keyevent", "KEYCODE_UNKNOWN");
					} catch (e) {
						// Ignore errors, this is just a helper
					}
				}

				if (!this.isActivityResumed()) {
					// Activity not ready, wait before retry
					await new Promise(resolve => setTimeout(resolve, delay));
					delay *= 2; // Exponential backoff
					continue;
				}
			}

			try {
				const dump = this.adb("exec-out", "uiautomator", "dump", "/dev/tty").toString();

				// Check for known error
				if (dump.includes("null root node returned by UiTestAutomationBridge")) {
					if (tries < maxRetries - 1) {
						// Wait before retry with exponential backoff
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2;
						continue;
					}
					// Last attempt failed - use graceful degradation
					console.warn(`[UIAutomator] Null root node after ${maxRetries} attempts - using fallback`);
					return await this.getFallbackXml();
				}

				// Check if we got valid XML
				const xmlStart = dump.indexOf("<?xml");
				if (xmlStart === -1) {
					if (tries < maxRetries - 1) {
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2;
						continue;
					}
					// Last attempt failed - use graceful degradation
					console.warn(`[UIAutomator] No XML found after ${maxRetries} attempts - using fallback`);
					return await this.getFallbackXml();
				}

				// Success! Return XML
				return dump.substring(xmlStart);

			} catch (error) {
				// If it's our ActionableError, rethrow only if it's the last attempt
				if (error instanceof ActionableError) {
					if (tries < maxRetries - 1) {
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2;
						continue;
					}
					// Last attempt - use fallback
					console.warn(`[UIAutomator] Error after ${maxRetries} attempts - using fallback: ${error}`);
					return await this.getFallbackXml();
				}

				// For other errors, retry or use fallback
				if (tries < maxRetries - 1) {
					await new Promise(resolve => setTimeout(resolve, delay));
					delay *= 2;
					continue;
				}

				// Last attempt failed - use graceful degradation
				console.warn(`[UIAutomator] Failed after ${maxRetries} attempts - using fallback`);
				return await this.getFallbackXml();
			}
		}

		// Should not reach here, but just in case - use fallback
		// Only show warning once to avoid log spam across all instances
		if (!AndroidRobot._uiAutomatorFallbackWarningShown) {
			console.warn(`[UIAutomator] Max retries reached - using fallback`);
			AndroidRobot._uiAutomatorFallbackWarningShown = true;
		}
		return await this.getFallbackXml();
	}

	/**
	 * Detect if current app is React Native
	 * Checks for common React Native process/package indicators
	 */
	private isReactNativeApp(): boolean {
		try {
			// Get current focused activity
			const activity = this.adb("shell", "dumpsys", "window", "windows", "|", "grep", "-E", "'mCurrentFocus|mFocusedApp'").toString();

			// React Native apps often have these indicators in their package names
			const reactNativeIndicators = [
				"react",
				"ReactNative",
				"rn",
				"expo",
				"facebook.react"
			];

			return reactNativeIndicators.some(indicator =>
				activity.toLowerCase().includes(indicator.toLowerCase())
			);
		} catch (e) {
			// If detection fails, assume it's not React Native (conservative approach)
			return false;
		}
	}

	/**
	 * Generate fallback XML when UIAutomator fails
	 * Returns minimal but valid XML structure that allows coordinate-based operations
	 *
	 * This enables:
	 * - Coordinate-based taps/swipes
	 * - Screenshot capture
	 * - OCR-based element finding
	 * - Demo mode and visual features
	 *
	 * Limitations:
	 * - No accessibility tree
	 * - Self-healing will rely on OCR
	 * - No text/label extraction
	 */
	private async getFallbackXml(): Promise<string> {
		// Get screen size for bounds
		const screenSize = await this.getScreenSize();
		const bounds = `[0,0][${screenSize.width},${screenSize.height}]`;

		// Return minimal valid XML with root node
		// This allows the parser to work and operations to continue
		return `<?xml version="1.0" encoding="UTF-8"?>
<hierarchy rotation="0">
  <node index="0" 
        text="" 
        resource-id="" 
        class="android.widget.FrameLayout" 
        package="android" 
        content-desc="Fallback root - UIAutomator unavailable" 
        checkable="false" 
        checked="false" 
        clickable="true" 
        enabled="true" 
        focusable="false" 
        focused="false" 
        scrollable="false" 
        long-clickable="false" 
        password="false" 
        selected="false" 
        bounds="${bounds}" />
</hierarchy>`;
	}

	private async getUiAutomatorXml(): Promise<UiAutomatorXml> {
		const dump = await this.getUiAutomatorDump();
		const parser = new xml.XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
		});

		return parser.parse(dump) as UiAutomatorXml;
	}

	private getScreenElementRect(node: UiAutomatorXmlNode): ScreenElementRect {
		const bounds = String(node.bounds);

		const [, left, top, right, bottom] = bounds.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)?.map(Number) || [];
		return {
			x: left,
			y: top,
			width: right - left,
			height: bottom - top,
		};
	}
}

export class AndroidDeviceManager {

	private getDeviceType(name: string): AndroidDeviceType {
		const device = new AndroidRobot(name);
		const features = device.getSystemFeatures();
		if (features.includes("android.software.leanback") || features.includes("android.hardware.type.television")) {
			return "tv";
		}

		return "mobile";
	}

	public getConnectedDevices(): AndroidDevice[] {
		try {
			const names = execFileSync(getAdbPath(), ["devices"])
				.toString()
				.split("\n")
				.map(line => line.trim())
				.filter(line => line !== "")
				.filter(line => !line.startsWith("List of devices attached"))
				.map(line => line.split("\t")[0]);

			return names.map(name => ({
				deviceId: name,
				deviceType: this.getDeviceType(name),
			}));
		} catch (error) {
			console.error("Could not execute adb command, maybe ANDROID_HOME is not set?");
			return [];
		}
	}
}
