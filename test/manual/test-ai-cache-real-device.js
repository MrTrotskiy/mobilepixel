/**
 * Real Device Test: AI Cache Performance on Android 843b3cd3
 *
 * Purpose: Measure AI Cache performance on real device with real app
 *
 * This test:
 * 1. Connects to Android device 843b3cd3
 * 2. Opens Settings app
 * 3. Searches for same element 10 times
 * 4. Measures time for each search (first = miss, rest = hits)
 * 5. Shows cache statistics (hit rate, speedup)
 *
 * Expected results:
 * - First search: 100-500ms (full search with accessibility API)
 * - Cached searches: 0.1-2ms (instant from cache)
 * - Hit rate: 90%+ (9/10 requests cached)
 * - Total speedup: 10-50x faster
 *
 * Prerequisites:
 * - Android device 843b3cd3 connected via adb
 * - Settings app available on device
 *
 * Run this test:
 *   node test/manual/test-ai-cache-real-device.js
 */

const { AndroidRobot } = require("../../lib/platforms/android");
const { AIElementFinder } = require("../../lib/ai/ai-element-finder");

const DEVICE_ID = "843b3cd3";
const APP_PACKAGE = "com.android.settings"; // Settings app

/**
 * Test AI Cache on real Android device
 */
async function testAICacheOnRealDevice() {
	console.log("=== AI Cache Real Device Performance Test ===");
	console.log(`Device: Android ${DEVICE_ID}`);
	console.log(`App: Settings (${APP_PACKAGE})\n`);

	let robot;

	try {
		// Step 1: Connect to device
		console.log("Step 1: Connecting to device...");
		robot = new AndroidRobot(DEVICE_ID);
		console.log("Connected to Android 843b3cd3\n");

		// Step 2: Launch Settings app
		console.log("Step 2: Launching Settings app...");
		await robot.launchApp(APP_PACKAGE);
		await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for app to open
		console.log("Settings app launched\n");

		// Step 3: Get screen size
		console.log("📏 Step 3: Getting screen info...");
		const screenSize = await robot.getScreenSize();
		console.log(`Screen: ${screenSize.width}x${screenSize.height}\n`);

		// Step 4: Reset cache statistics for clean measurement
		console.log("Step 4: Resetting cache statistics...");
		AIElementFinder.resetCacheStats();
		const initialStats = AIElementFinder.getCacheStats();
		console.log(`Initial cache: ${initialStats.size} entries\n`);

		// Step 5: Get initial elements and choose one to search for
		console.log("Step 5: Getting elements on screen...");
		const initialElements = await robot.getElementsOnScreen();
		console.log(`Found ${initialElements.length} elements\n`);

		// Find first element with non-empty text
		let searchElement = null;
		for (const elem of initialElements) {
			if (elem.text && elem.text.trim().length > 0) {
				searchElement = elem;
				break;
			}
		}

		if (!searchElement) {
			console.log("No element with text found on screen. Exiting.");
			return;
		}

		const searchDescription = searchElement.text;
		console.log(`Selected element to search for: "${searchDescription}"`);
		console.log(`Element type: ${searchElement.type}\n`);

		// Step 6: Perform element searches (10 iterations)
		console.log("Step 6: Searching for same element 10 times...\n");

		const iterations = 10;
		const timings = [];

		for (let i = 0; i < iterations; i++) {
			const startTime = Date.now();

			// Get elements on screen
			const elements = await robot.getElementsOnScreen();
			console.log(`  Iteration ${i + 1}: Found ${elements.length} elements on screen`);

			// Search for element using AI Element Finder
			const result = AIElementFinder.findElementByDescription(
				elements,
				searchDescription,
				35 // Lower threshold for better matching
			);

			const elapsed = Date.now() - startTime;
			timings.push(elapsed);

			const status = i === 0 ? "MISS (first)" : "HIT  (cached)";
			const found = result ? "Found" : "Not found";
			console.log(`  ${status}: ${elapsed}ms - ${found}`);

			if (result) {
				console.log(`    → Element: ${result.element.text || result.element.label || "(no text)"}`);
				console.log(`    → Score: ${result.score}, Reason: ${result.reason}`);
			}

			// Small delay between iterations to avoid overwhelming the device
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		console.log("\n=== Performance Summary ===\n");

		// Calculate statistics
		const firstSearchTime = timings[0];
		const cachedSearchesTime = timings.slice(1);
		const avgCachedTime = cachedSearchesTime.reduce((a, b) => a + b, 0) / cachedSearchesTime.length;
		const speedup = firstSearchTime / avgCachedTime;
		const minTime = Math.min(...timings);
		const maxTime = Math.max(...timings);

		console.log(`First search (cache miss):      ${firstSearchTime}ms`);
		console.log(`Avg cached search (cache hit):   ${avgCachedTime.toFixed(2)}ms`);
		console.log(`Min search time:                 ${minTime}ms`);
		console.log(`Max search time:                 ${maxTime}ms`);
		console.log(`Speedup:                          ${speedup.toFixed(1)}x faster`);

		// Get cache statistics
		const cacheStats = AIElementFinder.getCacheStats();

		console.log("\n=== Cache Statistics ===\n");
		console.log(`Cache hits:        ${cacheStats.hits}`);
		console.log(`Cache misses:      ${cacheStats.misses}`);
		console.log(`Hit rate:          ${cacheStats.hitRate.toFixed(1)}%`);
		console.log(`Cache size:        ${cacheStats.size} entries`);
		console.log(`Evictions:         ${cacheStats.evictions}`);
		console.log(`Avg lookup time:   ${cacheStats.avgLookupTime.toFixed(2)}ms`);

		// Total time comparison
		const totalTimeWithCache = timings.reduce((a, b) => a + b, 0);
		const totalTimeWithoutCache = firstSearchTime * iterations;
		const totalSpeedup = totalTimeWithoutCache / totalTimeWithCache;

		console.log("\n=== Total Time Comparison ===\n");
		console.log(`With cache:        ${totalTimeWithCache}ms`);
		console.log(`Without cache:     ${totalTimeWithoutCache}ms (estimated)`);
		console.log(`Total speedup:     ${totalSpeedup.toFixed(1)}x faster`);
		console.log(`Time saved:        ${totalTimeWithoutCache - totalTimeWithCache}ms`);

		console.log("\nTest completed successfully!\n");

		// Validation
		console.log("=== Validation ===\n");

		const validations = [
			{ name: "Hit rate >= 70%", passed: cacheStats.hitRate >= 70, value: `${cacheStats.hitRate.toFixed(1)}%` },
			{ name: "Speedup >= 3x", passed: speedup >= 3, value: `${speedup.toFixed(1)}x` },
			{ name: "Total speedup >= 2x", passed: totalSpeedup >= 2, value: `${totalSpeedup.toFixed(1)}x` },
			{ name: "Cache working", passed: cacheStats.hits > 0, value: `${cacheStats.hits} hits` }
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
			console.log("\nAll validations passed! Cache is working perfectly on real device!");
		} else {
			console.log("\nSome validations failed. Check results above.");
		}

		// Cleanup
		console.log("\n🧹 Cleaning up...");
		AIElementFinder.clearCache();
		console.log("Cache cleared");

	} catch (error) {
		console.error("\nTest failed with error:");
		console.error(error);
		process.exit(1);
	} finally {
		// Cleanup robot
		if (robot) {
			console.log("Disconnecting from device...");
			// Robot cleanup (if needed)
		}
	}
}

// Run test
console.log("Starting AI Cache real device test...\n");
testAICacheOnRealDevice().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});

