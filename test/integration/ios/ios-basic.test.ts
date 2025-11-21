// SPDX-License-Identifier: Apache-2.0
// Copyright 2024 MrTrotskiy

/**
 * iOS Integration Tests
 *
 * Requirements:
 * - macOS with Xcode installed
 * - iOS Simulator running OR physical iOS device connected
 * - WebDriverAgent running (via Appium or standalone)
 *
 * Run locally: npm run test:integration
 * Run in CI: Automatically runs via GitHub Actions on macos-latest
 */

import { describe, it, before, after } from "mocha";
import { ok } from "assert";
import { Robot } from "../../../src/core/robot";

// Dynamic imports for platform-specific modules
let SimctlManager: any;
let Simctl: any;
let IosManager: any;
let IosRobot: any;

describe("iOS Integration Tests", function() {
	this.timeout(60000); // 60s timeout for device operations

	let device: Robot | null = null;
	let simctlManager: any = null;
	let iosManager: any = null;
	let wdaAvailable = false;

	before(async function() {
		// Skip if not on macOS
		if (process.platform !== "darwin") {
			console.log("Skipping iOS tests - not on macOS");
			this.skip();
			return;
		}

		// Dynamic import platform modules
		try {
			const simModule = await import("../../../src/platforms/iphone-simulator");
			const iosModule = await import("../../../src/platforms/ios");
			SimctlManager = simModule.SimctlManager;
			Simctl = simModule.Simctl;
			IosManager = iosModule.IosManager;
			IosRobot = iosModule.IosRobot;

			simctlManager = new SimctlManager();
			iosManager = new IosManager();
		} catch (err) {
			console.log("Failed to import iOS modules:", err);
			this.skip();
			return;
		}

		// Try to find available iOS device
		try {
			const simulators = simctlManager.listBootedSimulators();
			if (simulators.length > 0) {
				device = new Simctl(simulators[0].uuid);
				console.log(`Using simulator: ${simulators[0].name}`);

				// Check if WDA is available by checking installed apps
				if (device) {
					try {
						const apps = await device.listApps();
						wdaAvailable = apps.some(app => app.packageName === "com.facebook.WebDriverAgentRunner.xctrunner");
						if (wdaAvailable) {
							console.log("WebDriverAgent is installed");
						} else {
							console.log("WebDriverAgent is NOT installed - tests requiring WDA will be skipped");
							console.log("To install WDA: https://github.com/MrTrotskiy/mobilepixel/wiki/");
						}
					} catch (err) {
						console.log("Could not check WDA installation status");
					}
				}
			} else {
				const physicalDevices = iosManager.listConnectedDevices();
				if (physicalDevices.length > 0) {
					device = new IosRobot(physicalDevices[0].udid);
					console.log(`Using physical device: ${physicalDevices[0].name}`);
					// Assume WDA might be available on physical devices
					wdaAvailable = true;
				}
			}

			if (!device) {
				console.log("No iOS device available, skipping tests");
				this.skip();
			}
		} catch (err) {
			console.log("Failed to initialize iOS device:", err);
			this.skip();
		}
	});

	after(async function() {
		device = null;
	});

	describe("Device Discovery", function() {
		it("should list booted simulators", function() {
			if (process.platform !== "darwin" || !simctlManager) {
				this.skip();
				return;
			}

			const simulators = simctlManager.listBootedSimulators();
			ok(Array.isArray(simulators), "Should return an array");

			for (const sim of simulators) {
				ok(sim.uuid, "Simulator should have uuid");
				ok(sim.name, "Simulator should have name");
			}
		});

		it("should list connected physical devices", function() {
			if (process.platform !== "darwin" || !iosManager) {
				this.skip();
				return;
			}

			const devices = iosManager.listConnectedDevices();
			ok(Array.isArray(devices), "Should return an array");

			for (const dev of devices) {
				ok(dev.udid, "Device should have udid");
				ok(dev.name, "Device should have name");
			}
		});
	});

	describe("Screen Operations", function() {
		it("should take a screenshot", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const screenshot = await device.getScreenshot();
			ok(screenshot, "Screenshot should not be empty");
			ok(screenshot.length > 1000, "Screenshot should have reasonable size");
		});

		it("should get screen size", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const size = await device.getScreenSize();
			ok(size.width > 0, "Width should be positive");
			ok(size.height > 0, "Height should be positive");
			ok(size.width < 5000, "Width should be reasonable");
			ok(size.height < 5000, "Height should be reasonable");
		});

		it("should get screen elements", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const elements = await device.getElementsOnScreen();
			ok(Array.isArray(elements), "Should return array of elements");
		});
	});

	describe("App Operations", function() {
		it("should list installed apps", async function() {
			if (!device) {
				this.skip();
				return;
			}

			const apps = await device.listApps();
			ok(Array.isArray(apps), "Should return array of apps");
			ok(apps.length > 0, "Should have at least one app installed");

			for (const app of apps) {
				ok(app.packageName, "App should have packageName");
			}
		});

		it("should launch and terminate Settings app", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const settingsBundle = "com.apple.Preferences";

			// Launch Settings
			await device.launchApp(settingsBundle);

			// Wait for app to load
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Take screenshot to verify
			const screenshot = await device.getScreenshot();
			ok(screenshot.length > 1000, "Should capture Settings screen");

			// Terminate app
			await device.terminateApp(settingsBundle);
		});
	});

	describe("Input Operations", function() {
		it("should tap on screen coordinates", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const size = await device.getScreenSize();
			const centerX = Math.floor(size.width / 2);
			const centerY = Math.floor(size.height / 2);

			// Should not throw
			await device.tap(centerX, centerY);
		});

		it("should perform swipe gesture", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			// Should not throw
			await device.swipe("up");
			await new Promise(resolve => setTimeout(resolve, 500));
			await device.swipe("down");
		});

		it("should press home button", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			// Should not throw
			await device.pressButton("HOME");
		});
	});

	describe("Orientation", function() {
		it("should get current orientation", async function() {
			if (!device || !wdaAvailable) {
				this.skip();
				return;
			}

			const orientation = await device.getOrientation();
			ok(
				orientation === "portrait" || orientation === "landscape",
				"Orientation should be portrait or landscape"
			);
		});
	});
});
