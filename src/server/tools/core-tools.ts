// SPDX-License-Identifier: Apache-2.0
// Copyright 2024 MrTrotskiy

/**
 * Core MCP Tools - Essential device interaction
 *
 * This module provides the fundamental tools for mobile device interaction:
 * - Device & app discovery
 * - Basic interactions (tap, swipe, type)
 * - Screenshots & screen info
 * - Button presses & URL opening
 * - Orientation control
 * - App logs & diagnostics
 *
 * These are always enabled regardless of configuration mode
 */

import { z } from "zod";
import fs from "node:fs";
import { ToolModule } from "./types";
import { AndroidRobot } from "../../platforms/android";
import { IosRobot } from "../../platforms/ios";
import { IosManager } from "../../platforms/ios";
import { AndroidDeviceManager } from "../../platforms/android";

// Optional Pro features - only available in Pro build
let TestContext: any = null;
let TestRecorder: any = null;

try {
	// Try to load Pro testing features
	TestContext = require("../../testing/test-context").TestContext;
	TestRecorder = require("../../testing/test-recorder").TestRecorder;
} catch {
	// Pro features not available in Open Source build
	TestContext = {
		recordAction: () => { /* no-op */ }
	};
	TestRecorder = {
		recordLaunch: () => { /* no-op */ },
		recordTap: () => { /* no-op */ },
		recordSwipe: () => { /* no-op */ },
		recordType: () => { /* no-op */ }
	};
}

/**
 * Register all core tools with the MCP server
 */
export const registerCoreTools: ToolModule = context => {
	const { tool, getRobotFromDevice, simulatorManager, noParams } = context;

	// ===========================
	// DEVICE DISCOVERY
	// ===========================

	tool(
		"mobile_list_available_devices",
		"List all available devices. This includes both physical devices and simulators. If there is more than one device returned, you need to let the user select one of them.",
		{ noParams },
		async ({}) => {
			const iosManager = new IosManager();
			const androidManager = new AndroidDeviceManager();
			const simulators = simulatorManager.listBootedSimulators();
			const simulatorNames = simulators.map(d => d.name);
			const androidDevices = androidManager.getConnectedDevices();
			const iosDevices = await iosManager.listDevices();
			const iosDeviceNames = iosDevices.map(d => d.deviceId);
			const androidTvDevices = androidDevices.filter(d => d.deviceType === "tv").map(d => d.deviceId);
			const androidMobileDevices = androidDevices.filter(d => d.deviceType === "mobile").map(d => d.deviceId);

			const resp = ["Found these devices:"];
			if (simulatorNames.length > 0) {
				resp.push(`iOS simulators: [${simulatorNames.join(".")}]`);
			}
			if (iosDevices.length > 0) {
				resp.push(`iOS devices: [${iosDeviceNames.join(",")}]`);
			}
			if (androidMobileDevices.length > 0) {
				resp.push(`Android devices: [${androidMobileDevices.join(",")}]`);
			}
			if (androidTvDevices.length > 0) {
				resp.push(`Android TV devices: [${androidTvDevices.join(",")}]`);
			}

			return resp.join("\n");
		}
	);

	tool(
		"mobile_list_apps",
		"List all the installed apps on the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const result = await robot.listApps();
			return `Found these apps on device: ${result.map(app => `${app.appName} (${app.packageName})`).join(", ")}`;
		}
	);

	// ===========================
	// APP MANAGEMENT
	// ===========================

	tool(
		"mobile_launch_app",
		"Launch an app on mobile device. Use this to open a specific app. You can find the package name of the app by calling list_apps_on_device.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name of the app to launch"),
		},
		async ({ device, packageName }) => {
			const robot = getRobotFromDevice(device);
			await robot.launchApp(packageName);

			// Record action in test context
			TestContext.recordAction({
				type: "launch_app",
				timestamp: Date.now(),
				device,
				params: { packageName },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordLaunch(packageName);

			return `Launched app ${packageName}`;
		}
	);

	tool(
		"mobile_terminate_app",
		"Stop and terminate an app on mobile device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name of the app to terminate"),
		},
		async ({ device, packageName }) => {
			const robot = getRobotFromDevice(device);
			await robot.terminateApp(packageName);
			return `Terminated app ${packageName}`;
		}
	);

	// ===========================
	// SCREEN INFORMATION
	// ===========================

	tool(
		"mobile_get_screen_size",
		"Get the screen size of the mobile device in pixels",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const screenSize = await robot.getScreenSize();
			return `Screen size is ${screenSize.width}x${screenSize.height} pixels`;
		}
	);

	tool(
		"mobile_list_elements_on_screen",
		"List elements on screen and their coordinates, with display text or accessibility label. Do not cache this result.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const elements = await robot.getElementsOnScreen();

			const result = elements.map(element => {
				const out: any = {
					type: element.type,
					text: element.text,
					label: element.label,
					name: element.name,
					value: element.value,
					identifier: element.identifier,
					coordinates: {
						x: element.rect.x,
						y: element.rect.y,
						width: element.rect.width,
						height: element.rect.height,
					},
				};

				if (element.focused) {
					out.focused = true;
				}

				return out;
			});

			return `Found these elements on screen: ${JSON.stringify(result)}`;
		}
	);

	// ===========================
	// BASIC INTERACTIONS
	// ===========================

	tool(
		"mobile_click_on_screen_at_coordinates",
		`LOW-LEVEL TOOL: Click at exact pixel coordinates.

ALWAYS TRY mobile_smart_interact FIRST with 2-3 variations!

Example: Instead of finding coordinates manually:
BAD:
  mobile_list_elements_on_screen()
  // Find "Open" at x=353, y=1004
  mobile_click_on_screen_at_coordinates(353, 1004)

GOOD (try these variations first):
  mobile_smart_interact("Open button")  → fails
  mobile_smart_interact("Open")         → success!

Only use coordinates if mobile_smart_interact failed after trying:
- Without type keywords ("button", "field", "icon")
- Different capitalization
- Partial text

Success rate: mobile_smart_interact 85% vs coordinates 50%
See prompt 'mobile-automation-best-practices'`,
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			x: z.number().describe("The x coordinate to click on the screen, in pixels"),
			y: z.number().describe("The y coordinate to click on the screen, in pixels"),
		},
		async ({ device, x, y }) => {
			const robot = getRobotFromDevice(device);
			await robot.tap(x, y);

			// Record action in test context
			TestContext.recordAction({
				type: "tap",
				timestamp: Date.now(),
				device,
				params: { x, y },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordTap(x, y);

			return `Clicked on screen at coordinates: ${x}, ${y}`;
		}
	);

	tool(
		"mobile_long_press_on_screen_at_coordinates",
		"Long press on the screen at given x,y coordinates. If long pressing on an element, use the list_elements_on_screen tool to find the coordinates.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			x: z.number().describe("The x coordinate to long press on the screen, in pixels"),
			y: z.number().describe("The y coordinate to long press on the screen, in pixels"),
		},
		async ({ device, x, y }) => {
			const robot = getRobotFromDevice(device);
			await robot.longPress(x, y);
			return `Long pressed on screen at coordinates: ${x}, ${y}`;
		}
	);

	tool(
		"mobile_swipe_on_screen",
		"Swipe on the screen",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			direction: z.enum(["up", "down", "left", "right"]).describe("The direction to swipe"),
			x: z.number().optional().describe("The x coordinate to start the swipe from, in pixels. If not provided, uses center of screen"),
			y: z.number().optional().describe("The y coordinate to start the swipe from, in pixels. If not provided, uses center of screen"),
			distance: z.number().optional().describe("The distance to swipe in pixels. Defaults to 400 pixels for iOS or 30% of screen dimension for Android"),
		},
		async ({ device, direction, x, y, distance }) => {
			const robot = getRobotFromDevice(device);

			if (x !== undefined && y !== undefined) {
				// Use coordinate-based swipe
				await robot.swipeFromCoordinate(x, y, direction, distance);

				// Record action in test context
				TestContext.recordAction({
					type: "swipe",
					timestamp: Date.now(),
					device,
					params: { direction, x, y, distance },
					result: "success"
				});

				// Record in test recorder if recording
				TestRecorder.recordSwipe(x, y, x, y, direction);

				const distanceText = distance ? ` ${distance} pixels` : "";
				return `Swiped ${direction}${distanceText} from coordinates: ${x}, ${y}`;
			} else {
				// Use center-based swipe
				await robot.swipe(direction);

				// Record action in test context
				TestContext.recordAction({
					type: "swipe",
					timestamp: Date.now(),
					device,
					params: { direction },
					result: "success"
				});

				// Record in test recorder if recording
				TestRecorder.recordSwipe(0, 0, 0, 0, direction);

				return `Swiped ${direction} on screen`;
			}
		}
	);

	tool(
		"mobile_type_keys",
		"LOW-LEVEL TOOL: Type text into currently focused element. PREFER mobile_smart_fill_form for forms or mobile_smart_login for login (1 call vs 10-20). Use this only if: 1) Smart tools failed, 2) Element already focused, 3) Simple single-field input. See prompt 'mobile-automation-best-practices' for full guide.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			text: z.string().describe("The text to type"),
			submit: z.boolean().describe("Whether to submit the text. If true, the text will be submitted as if the user pressed the enter key."),
			clearField: z.boolean().optional().describe("If true, clears the field before typing. Use this to avoid text concatenation issues (default: false).")
		},
		async ({ device, text, submit, clearField }) => {
			const robot = getRobotFromDevice(device);
			await robot.sendKeys(text, clearField || false);

			if (submit) {
				await robot.pressButton("ENTER");
			}

			// Record action in test context
			TestContext.recordAction({
				type: "type",
				timestamp: Date.now(),
				device,
				params: { text, submit },
				result: "success"
			});

			// Record in test recorder if recording
			TestRecorder.recordType(text);

			return `Typed text: ${text}`;
		}
	);

	tool(
		"mobile_press_button",
		"Press a button on device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			button: z.string().describe("The button to press. Supported buttons: BACK (android only), HOME, VOLUME_UP, VOLUME_DOWN, ENTER, DPAD_CENTER (android tv only), DPAD_UP (android tv only), DPAD_DOWN (android tv only), DPAD_LEFT (android tv only), DPAD_RIGHT (android tv only)"),
		},
		async ({ device, button }) => {
			const robot = getRobotFromDevice(device);
			await robot.pressButton(button);
			return `Pressed the button: ${button}`;
		}
	);

	tool(
		"mobile_open_url",
		"Open a URL in browser on device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			url: z.string().describe("The URL to open"),
		},
		async ({ device, url }) => {
			const robot = getRobotFromDevice(device);
			await robot.openUrl(url);
			return `Opened URL: ${url}`;
		}
	);

	// ===========================
	// SCREENSHOTS
	// ===========================

	tool(
		"mobile_save_screenshot",
		"Save a screenshot of the mobile device to a file",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			saveTo: z.string().describe("The path to save the screenshot to"),
		},
		async ({ device, saveTo }) => {
			const robot = getRobotFromDevice(device);
			const screenshot = await robot.getScreenshot();
			fs.writeFileSync(saveTo, screenshot);
			return `Screenshot saved to: ${saveTo}`;
		}
	);

	// Note: mobile_take_screenshot is registered separately in server.ts
	// because it uses server.tool() directly for CallToolResult

	// ===========================
	// ORIENTATION
	// ===========================

	tool(
		"mobile_set_orientation",
		"Change the screen orientation of the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			orientation: z.enum(["portrait", "landscape"]).describe("The desired orientation"),
		},
		async ({ device, orientation }) => {
			const robot = getRobotFromDevice(device);
			await robot.setOrientation(orientation);
			return `Changed device orientation to ${orientation}`;
		}
	);

	tool(
		"mobile_get_orientation",
		"Get the current screen orientation of the device",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);
			const orientation = await robot.getOrientation();
			return `Current device orientation is ${orientation}`;
		}
	);

	// ===========================
	// APP LOGS & DIAGNOSTICS
	// ===========================

	tool(
		"mobile_get_app_logs",
		"Get application logs from the device. This shows recent log entries from a specific app, which helps with debugging. Use this when you need to see what errors or messages the app is logging.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().describe("The package name (Android) or bundle ID (iOS) of the app to get logs for. Use mobile_list_apps to find available package names."),
			lines: z.number().optional().describe("Number of most recent log lines to return. Defaults to 100 if not specified.")
		},
		async ({ device, packageName, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 100;

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const logs = robot.getAppLogs(packageName, numLines);

				if (logs.length === 0) {
					return `No logs found for app: ${packageName}`;
				}

				// Format logs nicely
				const logText = logs.join("\n");
				return `Application logs for ${packageName} (${logs.length} lines):\n\n${logText}`;
			}

			// For simulators or other robot types
			return `Log reading is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_clear_app_logs",
		"Clear application logs on the device. This clears all logs (not just one app) on Android devices. iOS does not support clearing logs programmatically.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you.")
		},
		async ({ device }) => {
			const robot = getRobotFromDevice(device);

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const result = robot.clearLogs();
				return result;
			}

			// For simulators or other robot types
			return `Log clearing is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_get_crash_logs",
		"Get crash logs from the device. This shows recent app crashes with stack traces, which is critical for debugging crash issues. Use this when an app has crashed and you need to understand why.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			packageName: z.string().optional().describe("Optional package name (Android) or bundle ID (iOS) to filter crashes for a specific app. If not provided, returns all recent crashes."),
			lines: z.number().optional().describe("Number of log lines to search through for crashes. Defaults to 500 if not specified.")
		},
		async ({ device, packageName, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 500;

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const crashes = robot.getCrashLogs(packageName, numLines);

				if (crashes.length === 0) {
					return packageName
						? `No crashes found for app: ${packageName}`
						: "No crashes found in recent logs";
				}

				// Format crashes nicely
				const crashText = crashes.join("\n");

				if (packageName) {
					return `Crash logs for ${packageName} (searched ${numLines} lines):\n\n${crashText}`;
				}

				return `Recent crash logs (searched ${numLines} lines):\n\n${crashText}`;
			}

			// For simulators or other robot types
			return `Crash log reading is not yet supported for this device type`;
		}
	);

	tool(
		"mobile_get_system_errors",
		"Get system error logs from the device. This shows system-level errors that might affect app behavior. Use this when you need to understand system-level issues or investigate performance problems.",
		{
			device: z.string().describe("The device identifier to use. Use mobile_list_available_devices to find which devices are available to you."),
			lines: z.number().optional().describe("Number of recent error log lines to return. Defaults to 100 if not specified.")
		},
		async ({ device, lines }) => {
			const robot = getRobotFromDevice(device);
			const numLines = lines || 100;

			// Check if it's Android or iOS robot
			if (robot instanceof AndroidRobot || robot instanceof IosRobot) {
				const errors = robot.getSystemErrors(numLines);

				if (errors.length === 0) {
					return "No system errors found in recent logs";
				}

				// Format errors nicely
				const errorText = errors.join("\n");
				return `System error logs (${errors.length} entries):\n\n${errorText}`;
			}

			// For simulators or other robot types
			return `System error reading is not yet supported for this device type`;
		}
	);
};
