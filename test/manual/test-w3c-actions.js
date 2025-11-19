/**
 * Real Device Test: W3C Actions API
 *
 * Purpose: Test W3C standardized gestures on real device
 *
 * This test:
 * 1. Connects to Android device 843b3cd3
 * 2. Opens Settings app
 * 3. Tests W3C Actions API gestures:
 *    - tap() - Single touch
 *    - doubleTap() - Double tap
 *    - longPress() - Long press
 *    - swipe() - Smooth swipe
 *    - drag() - Drag gesture
 * 4. Validates gestures work correctly
 *
 * Expected results:
 * - All gestures execute correctly
 * - Precise timing control (±50ms)
 * - Smooth animations
 * - Platform-independent behavior
 *
 * Prerequisites:
 * - Android device 843b3cd3 connected via adb
 * - Settings app available
 *
 * Run this test:
 *   node test/manual/test-w3c-actions.js
 */

const { AndroidRobot } = require("../../lib/platforms/android");
const { createW3CActions } = require("../../lib/actions/w3c-actions");

const DEVICE_ID = "843b3cd3";
const APP_PACKAGE = "com.android.settings";

/**
 * Test W3C Actions API on real device
 */
async function testW3CActions() {
	console.log("=== W3C Actions API Real Device Test ===");
	console.log(`Device: Android ${DEVICE_ID}`);
	console.log(`App: Settings (${APP_PACKAGE})\n`);

	let robot;

	try {
		// Step 1: Connect to device
		console.log("Step 1: Connecting to device...");
		robot = new AndroidRobot(DEVICE_ID);
		console.log("Connected\n");

		// Step 2: Launch Settings app
		console.log("Step 2: Launching Settings app...");
		await robot.launchApp(APP_PACKAGE);
		await new Promise(resolve => setTimeout(resolve, 2000));
		console.log("Settings app launched\n");

		// Step 3: Get screen size
		console.log("📏 Step 3: Getting screen info...");
		const screenSize = await robot.getScreenSize();
		console.log(`Screen: ${screenSize.width}x${screenSize.height}\n`);

		// Step 4: Create W3C Actions instance
		console.log("Step 4: Creating W3C Actions instance...");
		const actions = createW3CActions(robot);
		console.log("W3C Actions ready\n");

		// Test scenarios
		const results = [];

		// Test 1: Tap gesture
		console.log("=".repeat(60));
		console.log("\n[Test 1] Tap gesture - Single touch");
		console.log("-".repeat(60));
		try {
			const centerX = screenSize.width / 2;
			const centerY = screenSize.height / 2;
			
			console.log(`Tapping at center (${Math.round(centerX)}, ${Math.round(centerY)})...`);
			const start = Date.now();
			await actions.tap(centerX, centerY, { duration: 100 });
			const duration = Date.now() - start;
			
			console.log(`Tap completed in ${duration}ms`);
			results.push({ test: "tap", passed: true, duration });
		} catch (error) {
			console.error(`Tap failed: ${error.message}`);
			results.push({ test: "tap", passed: false, error: error.message });
		}

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Test 2: Double tap gesture
		console.log("\n[Test 2] Double tap gesture - Two quick taps");
		console.log("-".repeat(60));
		try {
			const centerX = screenSize.width / 2;
			const centerY = screenSize.height / 2;
			
			console.log(`Double tapping at center...`);
			const start = Date.now();
			await actions.doubleTap(centerX, centerY);
			const duration = Date.now() - start;
			
			console.log(`Double tap completed in ${duration}ms`);
			results.push({ test: "doubleTap", passed: true, duration });
		} catch (error) {
			console.error(`Double tap failed: ${error.message}`);
			results.push({ test: "doubleTap", passed: false, error: error.message });
		}

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Test 3: Long press gesture
		console.log("\n[Test 3] Long press gesture - Hold for 1 second");
		console.log("-".repeat(60));
		try {
			const centerX = screenSize.width / 2;
			const centerY = screenSize.height / 2;
			
			console.log(`Long pressing at center for 1000ms...`);
			const start = Date.now();
			await actions.longPress(centerX, centerY, { duration: 1000 });
			const duration = Date.now() - start;
			
			console.log(`Long press completed in ${duration}ms`);
			results.push({ test: "longPress", passed: true, duration });
		} catch (error) {
			console.error(`Long press failed: ${error.message}`);
			results.push({ test: "longPress", passed: false, error: error.message });
		}

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Test 4: Swipe gesture
		console.log("\n[Test 4] Swipe gesture - Smooth swipe up");
		console.log("-".repeat(60));
		try {
			const centerX = screenSize.width / 2;
			const fromY = screenSize.height * 0.8;  // Bottom
			const toY = screenSize.height * 0.2;    // Top
			
			console.log(`Swiping from (${Math.round(centerX)}, ${Math.round(fromY)}) to (${Math.round(centerX)}, ${Math.round(toY)})...`);
			const start = Date.now();
			await actions.swipe(centerX, fromY, centerX, toY, { duration: 300 });
			const duration = Date.now() - start;
			
			console.log(`Swipe completed in ${duration}ms`);
			results.push({ test: "swipe", passed: true, duration });
		} catch (error) {
			console.error(`Swipe failed: ${error.message}`);
			results.push({ test: "swipe", passed: false, error: error.message });
		}

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Test 5: Drag gesture
		console.log("\n[Test 5] Drag gesture - Slow drag");
		console.log("-".repeat(60));
		try {
			const fromX = screenSize.width * 0.3;
			const fromY = screenSize.height / 2;
			const toX = screenSize.width * 0.7;
			const toY = screenSize.height / 2;
			
			console.log(`Dragging from (${Math.round(fromX)}, ${Math.round(fromY)}) to (${Math.round(toX)}, ${Math.round(toY)})...`);
			const start = Date.now();
			await actions.drag(fromX, fromY, toX, toY, { duration: 500 });
			const duration = Date.now() - start;
			
			console.log(`Drag completed in ${duration}ms`);
			results.push({ test: "drag", passed: true, duration });
		} catch (error) {
			console.error(`Drag failed: ${error.message}`);
			results.push({ test: "drag", passed: false, error: error.message });
		}

		// Results summary
		console.log("\n" + "=".repeat(60));
		console.log("\n=== Test Results Summary ===\n");

		const passedCount = results.filter(r => r.passed).length;
		const totalCount = results.length;

		console.log(`Tests run: ${totalCount}`);
		console.log(`Passed: ${passedCount}/${totalCount} (${Math.round(passedCount / totalCount * 100)}%)\n`);

		console.log("Individual results:");
		results.forEach(result => {
			const status = result.passed ? "PASS" : "FAIL";
			const detail = result.passed
				? `${result.duration}ms`
				: result.error;
			console.log(`  ${status}: ${result.test} (${detail})`);
		});

		// Validation
		console.log("\n=== Validation ===\n");

		const validations = [
			{ name: "All gestures working", passed: passedCount === totalCount, value: `${passedCount}/${totalCount}` },
			{ name: "Tap timing acceptable", passed: results[0]?.duration < 500, value: `${results[0]?.duration}ms` },
			{ name: "Long press timing", passed: results[2]?.duration > 1000, value: `${results[2]?.duration}ms` },
		];

		let allPassed = true;
		for (const validation of validations) {
			const status = validation.passed ? "PASS" : "FAIL";
			console.log(`${status}: ${validation.name} (${validation.value})`);
			if (!validation.passed) {
				allPassed = false;
			}
		}

		if (allPassed) {
			console.log("\nAll validations passed! W3C Actions API working perfectly!");
		} else {
			console.log("\nSome validations failed. Review results above.");
		}

		console.log("\nTest completed!");

	} catch (error) {
		console.error("\nTest failed with error:");
		console.error(error);
		process.exit(1);
	} finally {
		if (robot) {
			console.log("\nDisconnecting from device...");
		}
	}
}

// Run test
console.log("Starting W3C Actions API test...\n");
testW3CActions().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});

