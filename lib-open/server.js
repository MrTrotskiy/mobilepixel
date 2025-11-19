"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpServer = exports.getAgentVersion = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("./core/logger");
const android_1 = require("./platforms/android");
const robot_1 = require("./core/robot");
const iphone_simulator_1 = require("./platforms/iphone-simulator");
const ios_1 = require("./platforms/ios");
const png_1 = require("./utils/png");
const image_utils_1 = require("./utils/image-utils");
const image_performance_1 = require("./utils/image-performance");
// Import tool modules
const tools_1 = require("./server/tools");
// ===========================
// VERSION & UPDATE CHECK
// ===========================
const getAgentVersion = () => {
    const json = require("../package.json");
    return json.version;
};
exports.getAgentVersion = getAgentVersion;
const getLatestAgentVersion = async () => {
    const response = await fetch("https://api.github.com/repos/MrTrotskiy/mobilepixel/tags?per_page=1");
    const json = await response.json();
    return json[0].name;
};
const checkForLatestAgentVersion = async () => {
    try {
        const latestVersion = await getLatestAgentVersion();
        const currentVersion = (0, exports.getAgentVersion)();
        if (latestVersion !== currentVersion) {
            (0, logger_1.trace)(`You are running an older version of the agent. Please update to the latest version: ${latestVersion}.`);
        }
    }
    catch (error) {
        // ignore
    }
};
/**
 * Essential mode configuration
 * Only the most commonly used tools for 90% of use cases
 */
const ESSENTIAL_CONFIG = {
    core: true, // Core operations (tap, swipe, screenshot, logs)
    ai: false, // AI element finder - disabled, use composite tools instead
    testing: false, // Test context - advanced feature
    assertions: false, // expect_* assertions - advanced feature
    visual_testing: false, // Visual regression testing - advanced feature
    visual: true, // Touch indicators and demo mode - useful for all users
    accessibility: false, // Accessibility checks - advanced feature
    bug_reports: false, // Bug report generation - advanced feature
    test_recording: false, // Record and generate test code - advanced feature
    batch_operations: false, // Batch action execution - advanced feature
    loading_detection: false, // Wait for loading completion - advanced feature
    clipboard: false, // Clipboard operations - advanced feature
    device_conditions: false, // Simulate battery, network, GPS - advanced feature
    video_recording: false, // Video recording - advanced feature
    performance_monitoring: false, // CPU/memory monitoring - advanced feature
    network_monitoring: false, // HTTP traffic capture - advanced feature
    flakiness_detection: false, // Test flakiness tracking - advanced feature
    test_data_generation: false, // Generate test data - advanced feature
    composite: true // Smart high-level tools (always in essential)
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
const loadToolConfig = () => {
    const configPath = "mcp-config.json";
    try {
        // Try to read config file
        const configContent = node_fs_1.default.readFileSync(configPath, "utf-8");
        const config = JSON.parse(configContent);
        // Validate that config has 'tools' property
        if (!config.tools || typeof config.tools !== "object") {
            (0, logger_1.trace)(`Warning: Invalid mcp-config.json structure, using essential mode`);
            (0, logger_1.trace)(`✓ Tool mode: essential (~20 tools)`);
            return ESSENTIAL_CONFIG;
        }
        // Get mode (default to essential)
        const mode = config.tools.mode || "essential";
        let toolConfig;
        switch (mode) {
            case "essential":
                toolConfig = ESSENTIAL_CONFIG;
                (0, logger_1.trace)(`✓ Tool mode: essential (~20 core + composite tools)`);
                break;
            case "custom":
                // Merge with full config to ensure all keys exist
                toolConfig = { ...FULL_CONFIG, ...config.tools.categories };
                const enabledCategories = Object.keys(toolConfig).filter(k => toolConfig[k]);
                (0, logger_1.trace)(`✓ Tool mode: custom`);
                (0, logger_1.trace)(`✓ Enabled categories (${enabledCategories.length}/${Object.keys(FULL_CONFIG).length}): ${enabledCategories.join(", ")}`);
                break;
            case "full":
                toolConfig = FULL_CONFIG;
                (0, logger_1.trace)(`✓ Tool mode: full (all 94+ tools enabled)`);
                break;
            default:
                (0, logger_1.trace)(`Warning: Unknown mode "${mode}", using essential`);
                toolConfig = ESSENTIAL_CONFIG;
                (0, logger_1.trace)(`✓ Tool mode: essential (~20 tools)`);
                break;
        }
        return toolConfig;
    }
    catch (error) {
        // Config file doesn't exist - use essential mode as default
        (0, logger_1.trace)(`No mcp-config.json found, using essential mode (recommended)`);
        (0, logger_1.trace)(`✓ Tool mode: essential (~20 core + composite tools)`);
        return ESSENTIAL_CONFIG;
    }
};
// ===========================
// POSTHOG ANALYTICS
// ===========================
const posthog = async (event, properties) => {
    try {
        const url = "https://us.i.posthog.com/i/v0/e/";
        const api_key = "phc_KHRTZmkDsU7A8EbydEK8s4lJpPoTDyyBhSlwer694cS";
        const name = node_os_1.default.hostname() + process.execPath;
        const distinct_id = crypto_1.default.createHash("sha256").update(name).digest("hex");
        const systemProps = {
            Platform: node_os_1.default.platform(),
            Product: "mobilepixel",
            Version: (0, exports.getAgentVersion)(),
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
    }
    catch (err) {
        // ignore
    }
};
// ===========================
// MAIN SERVER CREATION
// ===========================
const createMcpServer = () => {
    // Configure Sharp for optimal image processing performance
    (0, image_performance_1.configureSharpPerformance)();
    // Load tool configuration (Open Source version)
    const toolConfig = loadToolConfig();
    // Log Open Source status
    (0, logger_1.trace)("=".repeat(50));
    (0, logger_1.trace)("MobilePixel Open Source - 20 Core Tools");
    (0, logger_1.trace)("Upgrade to Pro for 94+ tools: https://www.npmjs.com/package/@mobilepixel/mcp-pro");
    (0, logger_1.trace)("=".repeat(50));
    // Create MCP server
    const server = new mcp_js_1.McpServer({
        name: "mobilepixel",
        version: (0, exports.getAgentVersion)(),
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    // Common schema for empty parameters
    const noParams = zod_1.z.object({});
    // Initialize device managers
    const simulatorManager = new iphone_simulator_1.SimctlManager();
    /**
     * Get Robot instance from device identifier
     * Checks simulators, Android devices, and iOS devices
     */
    const getRobotFromDevice = (device) => {
        const iosManager = new ios_1.IosManager();
        const androidManager = new android_1.AndroidDeviceManager();
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
            return new android_1.AndroidRobot(device);
        }
        // Check if it's an iOS device
        const iosDevice = iosDevices.find(d => d.deviceId === device);
        if (iosDevice) {
            return new ios_1.IosRobot(device);
        }
        throw new robot_1.ActionableError(`Device "${device}" not found. Use the mobile_list_available_devices tool to see available devices.`);
    };
    /**
     * Register a tool with the MCP server
     * Wraps the tool callback with error handling and logging
     */
    const tool = (name, description, paramsSchema, cb) => {
        const wrappedCb = async (args) => {
            try {
                (0, logger_1.trace)(`Invoking ${name} with args: ${JSON.stringify(args)}`);
                const response = await cb(args);
                (0, logger_1.trace)(`=> ${response}`);
                posthog("tool_invoked", {}).then();
                return {
                    content: [{ type: "text", text: response }],
                };
            }
            catch (error) {
                if (error instanceof robot_1.ActionableError) {
                    return {
                        content: [{ type: "text", text: `${error.message}. Please fix the issue and try again.` }],
                    };
                }
                else {
                    // a real exception
                    (0, logger_1.trace)(`Tool '${description}' failed: ${error.message} stack: ${error.stack}`);
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
    const conditionalTool = (category, name, description, paramsSchema, cb) => {
        // Only register if category is enabled
        if (toolConfig[category]) {
            tool(name, description, paramsSchema, cb);
        }
    };
    // ===========================
    // SPECIAL TOOL: mobile_take_screenshot
    // ===========================
    // This tool needs direct access to server.tool() to return image data
    server.tool("mobile_take_screenshot", "Take a screenshot of the mobile device. Use this to understand what's on screen, if you need to press an element that is available through view hierarchy then you must list elements on screen instead. Do not cache this result.", {
        device: zod_1.z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
    }, async ({ device }) => {
        try {
            const robot = getRobotFromDevice(device);
            const screenSize = await robot.getScreenSize();
            let screenshot = await robot.getScreenshot();
            let mimeType = "image/png";
            // validate we received a png
            const image = new png_1.PNG(screenshot);
            const pngSize = image.getDimensions();
            if (pngSize.width <= 0 || pngSize.height <= 0) {
                throw new robot_1.ActionableError("Screenshot is invalid. Please try again.");
            }
            if ((0, image_utils_1.isScalingAvailable)()) {
                (0, logger_1.trace)("Image scaling is available, resizing screenshot");
                const image = image_utils_1.Image.fromBuffer(screenshot);
                const beforeSize = screenshot.length;
                screenshot = image.resize(Math.floor(pngSize.width / screenSize.scale))
                    .jpeg({ quality: 75 })
                    .toBuffer();
                const afterSize = screenshot.length;
                (0, logger_1.trace)(`Screenshot resized from ${beforeSize} bytes to ${afterSize} bytes`);
                mimeType = "image/jpeg";
            }
            const screenshot64 = screenshot.toString("base64");
            (0, logger_1.trace)(`Screenshot taken: ${screenshot.length} bytes`);
            return {
                content: [{ type: "image", data: screenshot64, mimeType }]
            };
        }
        catch (err) {
            (0, logger_1.error)(`Error taking screenshot: ${err.message} ${err.stack}`);
            return {
                content: [{ type: "text", text: `Error: ${err.message}` }],
                isError: true,
            };
        }
    });
    // ===========================
    // REGISTER TOOL MODULES
    // ===========================
    // Create tool context with all dependencies
    const context = {
        tool,
        conditionalTool,
        getRobotFromDevice,
        simulatorManager,
        toolConfig,
        noParams,
        deviceSchema: zod_1.z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
    };
    // Register all tool modules
    (0, tools_1.registerCoreTools)(context);
    (0, tools_1.registerAITools)(context);
    (0, tools_1.registerCompositeTools)(context);
    (0, tools_1.registerVisualTools)(context);
    (0, tools_1.registerEnterpriseTools)(context);
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
    server.registerPrompt("mobile-automation-best-practices", {
        title: "Mobile Automation Best Practices",
        description: "CRITICAL: How to use MobilePixel tools effectively. READ THIS FIRST before automating mobile apps to achieve 95% success rate vs 30% with basic tools."
    }, async () => {
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
    });
    // Send analytics
    posthog("launch", {}).then();
    // Check for updates
    checkForLatestAgentVersion().then();
    return server;
};
exports.createMcpServer = createMcpServer;
