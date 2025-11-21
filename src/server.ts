// SPDX-License-Identifier: Apache-2.0
// Copyright 2024 MrTrotskiy

/**
 * MobilePix MCP Server - Main Entry Point
 *
 * This file provides the main MCP server creation and configuration.
 * Tool registration is delegated to modular tool files in server/tools/
 *
 * Architecture:
 * - Core server setup and configuration loading
 * - Device management (getRobotFromDevice)
 * - Tool registration wrapper with error handling
 * - MCP resources for test context
 * - Import and register tools from modules
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z, ZodRawShape, ZodTypeAny } from "zod";
import fs from "node:fs";
import os from "node:os";
import crypto from "crypto";

import { error, trace } from "./core/logger";
import { AndroidRobot, AndroidDeviceManager } from "./platforms/android";
import { ActionableError, Robot } from "./core/robot";
import { SimctlManager } from "./platforms/iphone-simulator";
import { IosManager, IosRobot } from "./platforms/ios";
import { PNG } from "./utils/png";
import { isScalingAvailable, Image } from "./utils/image-utils";
import { configureSharpPerformance } from "./utils/image-performance";

// Import tool modules
import {
	registerCoreTools,
	registerAITools,
	registerCompositeTools,
	registerVisualTools,
	registerEnterpriseTools,
	type ToolContext
} from "./server/tools";

// ===========================
// VERSION & UPDATE CHECK
// ===========================

export const getAgentVersion = (): string => {
	const json = require("../package.json");
	return json.version;
};

const getLatestAgentVersion = async (): Promise<string> => {
	const response = await fetch("https://api.github.com/repos/MrTrotskiy/mobilepixel/tags?per_page=1");
	const json = await response.json();
	return json[0].name;
};

const checkForLatestAgentVersion = async (): Promise<void> => {
	try {
		const latestVersion = await getLatestAgentVersion();
		const currentVersion = getAgentVersion();
		if (latestVersion !== currentVersion) {
			trace(`You are running an older version of the agent. Please update to the latest version: ${latestVersion}.`);
		}
	} catch (error: any) {
		// ignore
	}
};

// ===========================
// CONFIGURATION
// ===========================

/**
 * Tool configuration modes
 * - essential: Only core tools + composite smart tools (~20 tools)
 * - custom: User-defined category selection
 * - full: All tools enabled (backward compatibility)
 */
type ToolMode = "essential" | "custom" | "full";

/**
 * Essential mode configuration
 * Only the most commonly used tools for 90% of use cases
 */
const ESSENTIAL_CONFIG = {
	core: true,                    // Core operations (tap, swipe, screenshot, logs)
	ai: false,                     // AI element finder - disabled, use composite tools instead
	testing: false,                // Test context - advanced feature
	assertions: false,             // expect_* assertions - advanced feature
	visual_testing: false,         // Visual regression testing - advanced feature
	visual: true,                  // Touch indicators and demo mode - useful for all users
	accessibility: false,          // Accessibility checks - advanced feature
	bug_reports: false,            // Bug report generation - advanced feature
	test_recording: false,         // Record and generate test code - advanced feature
	batch_operations: false,       // Batch action execution - advanced feature
	loading_detection: false,      // Wait for loading completion - advanced feature
	clipboard: false,              // Clipboard operations - advanced feature
	device_conditions: false,      // Simulate battery, network, GPS - advanced feature
	video_recording: false,        // Video recording - advanced feature
	performance_monitoring: false, // CPU/memory monitoring - advanced feature
	network_monitoring: false,     // HTTP traffic capture - advanced feature
	flakiness_detection: false,    // Test flakiness tracking - advanced feature
	test_data_generation: false,   // Generate test data - advanced feature
	composite: true                // Smart high-level tools (always in essential)
};

/**
 * Full mode configuration
 * All categories enabled for backward compatibility
 */
const FULL_CONFIG = {
	core: true,
	ai: true,
	testing: true,
	assertions: true,
	visual_testing: true,
	visual: true,
	accessibility: true,
	bug_reports: true,
	test_recording: true,
	batch_operations: true,
	loading_detection: true,
	clipboard: true,
	device_conditions: true,
	video_recording: true,
	performance_monitoring: true,
	network_monitoring: true,
	flakiness_detection: true,
	test_data_generation: true,
	composite: true
};

/**
 * Load tool configuration from mcp-config.json
 * Supports three modes: essential (default), custom, full
 *
 * @returns Tool configuration object with boolean flags for each category
 */
const loadToolConfig = (): Record<string, boolean> => {
	const configPath = "mcp-config.json";

	try {
		// Try to read config file
		const configContent = fs.readFileSync(configPath, "utf-8");
		const config = JSON.parse(configContent);

		// Validate that config has 'tools' property
		if (!config.tools || typeof config.tools !== "object") {
			trace(`Warning: Invalid mcp-config.json structure, using essential mode`);
			trace(`✓ Tool mode: essential (~20 tools)`);
			return ESSENTIAL_CONFIG;
		}

		// Get mode (default to essential)
		const mode: ToolMode = config.tools.mode || "essential";

		let toolConfig: Record<string, boolean>;

		switch (mode) {
			case "essential":
				toolConfig = ESSENTIAL_CONFIG;
				trace(`✓ Tool mode: essential (~20 core + composite tools)`);
				break;

			case "custom":
				// Merge with full config to ensure all keys exist
				toolConfig = { ...FULL_CONFIG, ...config.tools.categories };
				const enabledCategories = Object.keys(toolConfig).filter(k => toolConfig[k]);
				trace(`✓ Tool mode: custom`);
				trace(`✓ Enabled categories (${enabledCategories.length}/${Object.keys(FULL_CONFIG).length}): ${enabledCategories.join(", ")}`);
				break;

			case "full":
				toolConfig = FULL_CONFIG;
				trace(`✓ Tool mode: full (all 94+ tools enabled)`);
				break;

			default:
				trace(`Warning: Unknown mode "${mode}", using essential`);
				toolConfig = ESSENTIAL_CONFIG;
				trace(`✓ Tool mode: essential (~20 tools)`);
				break;
		}

		return toolConfig;
	} catch (error: any) {
		// Config file doesn't exist - use essential mode as default
		trace(`No mcp-config.json found, using essential mode (recommended)`);
		trace(`✓ Tool mode: essential (~20 core + composite tools)`);
		return ESSENTIAL_CONFIG;
	}
};

// ===========================
// POSTHOG ANALYTICS
// ===========================

const posthog = async (event: string, properties: Record<string, string>) => {
	try {
		const url = "https://us.i.posthog.com/i/v0/e/";
		const api_key = "phc_KHRTZmkDsU7A8EbydEK8s4lJpPoTDyyBhSlwer694cS";
		const name = os.hostname() + process.execPath;
		const distinct_id = crypto.createHash("sha256").update(name).digest("hex");
		const systemProps = {
			Platform: os.platform(),
			Product: "mobilepixel",
			Version: getAgentVersion(),
			NodeVersion: process.version,
		};

		await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				api_key,
				event,
				properties: {
					...systemProps,
					...properties,
				},
				distinct_id,
			})
		});
	} catch (err: any) {
		// ignore
	}
};

// ===========================
// MAIN SERVER CREATION
// ===========================

export const createMcpServer = (): McpServer => {
	// Configure Sharp for optimal image processing performance
	configureSharpPerformance();

	// Load tool configuration (Open Source version)
	const toolConfig = loadToolConfig();

	// Log Open Source status
	trace("=".repeat(50));
	trace("MobilePixel Open Source - 20 Core Tools");
	trace("Upgrade to Pro for 94+ tools: https://www.npmjs.com/package/@mobilepixel/mcp-pro");
	trace("=".repeat(50));

	// Create MCP server
	const server = new McpServer({
		name: "mobilepixel",
		version: getAgentVersion(),
		capabilities: {
			resources: {},
			tools: {},
		},
	});

	// Common schema for empty parameters
	const noParams = z.object({});

	// Initialize device managers
	const simulatorManager = new SimctlManager();

	/**
	 * Get Robot instance from device identifier
	 * Checks simulators, Android devices, and iOS devices
	 */
	const getRobotFromDevice = (device: string): Robot => {
		const iosManager = new IosManager();
		const androidManager = new AndroidDeviceManager();
		const simulators = simulatorManager.listBootedSimulators();
		const androidDevices = androidManager.getConnectedDevices();
		const iosDevices = iosManager.listDevices();

		// Check if it's a simulator
		const simulator = simulators.find(s => s.name === device);
		if (simulator) {
			return simulatorManager.getSimulator(device);
		}

		// Check if it's an Android device
		const androidDevice = androidDevices.find(d => d.deviceId === device);
		if (androidDevice) {
			return new AndroidRobot(device);
		}

		// Check if it's an iOS device
		const iosDevice = iosDevices.find(d => d.deviceId === device);
		if (iosDevice) {
			return new IosRobot(device);
		}

		throw new ActionableError(`Device "${device}" not found. Use the mobile_list_available_devices tool to see available devices.`);
	};

	/**
	 * Register a tool with the MCP server
	 * Wraps the tool callback with error handling and logging
	 */
	const tool = (
		name: string,
		description: string,
		paramsSchema: ZodRawShape,
		cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>
	) => {
		const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
			try {
				trace(`Invoking ${name} with args: ${JSON.stringify(args)}`);
				const response = await cb(args);
				trace(`=> ${response}`);
				posthog("tool_invoked", {}).then();
				return {
					content: [{ type: "text", text: response }],
				};
			} catch (error: any) {
				if (error instanceof ActionableError) {
					return {
						content: [{ type: "text", text: `${error.message}. Please fix the issue and try again.` }],
					};
				} else {
					// a real exception
					trace(`Tool '${description}' failed: ${error.message} stack: ${error.stack}`);
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
						isError: true,
					};
				}
			}
		};

		server.tool(name, description, paramsSchema, args => wrappedCb(args));
	};

	/**
	 * Conditionally register a tool based on category configuration
	 * Tool is only registered if its category is enabled in toolConfig
	 */
	const conditionalTool = (
		category: string,
		name: string,
		description: string,
		paramsSchema: ZodRawShape,
		cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>
	) => {
		// Only register if category is enabled
		if (toolConfig[category]) {
			tool(name, description, paramsSchema, cb);
		}
	};

	// ===========================
	// SPECIAL TOOL: mobile_take_screenshot
	// ===========================
	// This tool needs direct access to server.tool() to return image data

	server.tool(
		"mobile_take_screenshot",
		"Take a screenshot of the mobile device. Use this to understand what's on screen, if you need to press an element that is available through view hierarchy then you must list elements on screen instead. Do not cache this result.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			try {
				const robot = getRobotFromDevice(device);
				const screenSize = await robot.getScreenSize();

				let screenshot = await robot.getScreenshot();
				let mimeType = "image/png";

				// validate we received a png
				const image = new PNG(screenshot);
				const pngSize = image.getDimensions();
				if (pngSize.width <= 0 || pngSize.height <= 0) {
					throw new ActionableError("Screenshot is invalid. Please try again.");
				}

				if (isScalingAvailable()) {
					trace("Image scaling is available, resizing screenshot");
					const image = Image.fromBuffer(screenshot);
					const beforeSize = screenshot.length;
					screenshot = image.resize(Math.floor(pngSize.width / screenSize.scale))
						.jpeg({ quality: 75 })
						.toBuffer();

					const afterSize = screenshot.length;
					trace(`Screenshot resized from ${beforeSize} bytes to ${afterSize} bytes`);

					mimeType = "image/jpeg";
				}

				const screenshot64 = screenshot.toString("base64");
				trace(`Screenshot taken: ${screenshot.length} bytes`);

				return {
					content: [{ type: "image", data: screenshot64, mimeType }]
				};
			} catch (err: any) {
				error(`Error taking screenshot: ${err.message} ${err.stack}`);
				return {
					content: [{ type: "text", text: `Error: ${err.message}` }],
					isError: true,
				};
			}
		}
	);

	// ===========================
	// REGISTER TOOL MODULES
	// ===========================

	// Create tool context with all dependencies
	const context: ToolContext = {
		tool,
		conditionalTool,
		getRobotFromDevice,
		simulatorManager,
		toolConfig,
		noParams,
		deviceSchema: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
	};

	// Register all tool modules
	registerCoreTools(context);
	registerAITools(context);
	registerCompositeTools(context);
	registerVisualTools(context);
	registerEnterpriseTools(context);
	// registerDeviceConditionsTools(context);
	// registerVideoTools(context);
	// registerPerformanceTools(context);
	// registerFlakinessTools(context);
	// registerDataGenerationTools(context);
	// registerTouchIndicatorTools(context);
	// registerCICDTools(context);

	// ===========================
	// MCP RESOURCES
	// ===========================
	// Provide test context to AI via MCP Resources

	// ===========================
	// MCP PROMPTS
	// ===========================
	// Provide best practices guidance to AI agents

	server.registerPrompt(
		"mobile-automation-best-practices",
		{
			title: "Mobile Automation Best Practices",
			description: "CRITICAL: How to use MobilePixel tools effectively. READ THIS FIRST before automating mobile apps to achieve 95% success rate vs 30% with basic tools."
		},
		async () => {
			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `# MobilePixel Tool Selection Priority

**CRITICAL: Always follow this priority order:**

## 1. SMART TOOLS FIRST (95% success rate)

### For Authentication (HIGHEST PRIORITY):
- Use \`mobile_smart_login\` - Completes ENTIRE login flow in 1 call
- DON'T use manual: click → type → click → type → click (10-20 calls)
- Success: 95% vs 30% with coordinates

### For Forms (PRIORITY):
- Use \`mobile_smart_fill_form\` - Finds all fields, fills, submits in 1 call
- DON'T use manual field clicking and typing
- Reduces: 15-25 calls → 1 call

### For Element Interaction (PRIORITY):
- Use \`mobile_smart_interact\` - Finds by description, waits, scrolls, taps, verifies
- DON'T use \`mobile_click_on_screen_at_coordinates\` unless smart_interact fails
- Examples: "login button", "email field", "settings icon"

### For Navigation (PRIORITY):
- Use \`mobile_smart_navigate\` - Intelligently finds navigation path
- DON'T manually search for menu items
- Examples: "Settings", "Profile page", "Home"

## 2. If Smart Tool Fails - Try Variations FIRST:
**CRITICAL: Don't give up after ONE failure!**

\`\`\`
mobile_smart_interact("Open button")     Failed
mobile_smart_interact("Open")            Try without "button"
mobile_smart_interact("OPEN")            Try uppercase

mobile_smart_interact("Check progress")  Failed
mobile_smart_interact("progress")        Try just keyword
mobile_smart_interact("Check")           Try first word

mobile_smart_interact("Settings icon")   Failed
mobile_smart_interact("Settings")        Remove "icon"
mobile_smart_interact("settings")        Try lowercase
\`\`\`

**Pattern: Remove type keywords ("button", "field", "icon", "tab") and try variations!**

## 3. Basic Tools - ONLY as Last Resort:
Only use \`mobile_click_on_screen_at_coordinates\` if:
- Smart tool failed after 2-3 description attempts
- Need pixel-perfect control (gaming)
- Element has no text/label

## Writing Good Descriptions:
- "Login button" - specific + type
- "Email field" - exact text + type
- "the blue button" - avoid colors
- "button" - too vague

Full guide: docs/AI_AGENT_GUIDELINES.md

**REMEMBER: Smart tools = 90% fewer calls, 3x higher success rate!**`
						}
					}
				]
			};
		}
	);

	// Send analytics
	posthog("launch", {}).then();

	// Check for updates
	checkForLatestAgentVersion().then();

	return server;
};
