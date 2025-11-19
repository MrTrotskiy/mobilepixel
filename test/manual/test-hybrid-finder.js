/**
 * Real Device Test: Hybrid Element Finder Performance
 *
 * Purpose: Test 3-tier hybrid element finding strategy on real device
 *
 * This test:
 * 1. Connects to Android device 843b3cd3
 * 2. Opens Settings app
 * 3. Tests different types of element descriptions:
 *    - Simple text (Tier 1 should find)
 *    - Position-based (Tier 2 should find)
 *    - Complex descriptions (Tier 3 AI fallback)
 * 4. Measures which tier handled each request
 * 5. Validates tier distribution (target: 70/20/10)
 *
 * Expected results:
 * - Tier 1: 70% of searches (fast, 0.1s)
 * - Tier 2: 20% of searches (medium, 0.5s)
 * - Tier 3: 10% of searches (slow, 2.0s)
 * - Average: 0.37s (vs 2.0s with AI-only)
 * - Speedup: 5.4x faster!
 *
 * Prerequisites:
 * - Android device 843b3cd3 connected via adb
 * - Settings app available on device
 *
 * Run this test:
 *   node test/manual/test-hybrid-finder.js
 */

const { AndroidRobot } = require("../../lib/platforms/android");
const { getHybridElementFinder } = require("../../lib/ai/hybrid-element-finder");

const DEVICE_ID = "843b3cd3";
const APP_PACKAGE = "com.android.settings";

/**
 * Test scenarios covering all 3 tiers
 * Based on actual elements from Settings screen (Russian locale)
 */
const TEST_SCENARIOS = [
	// Tier 1: Simple exact text matches (should be fast)
	{ description: "Настройки", expectedTier: 1, category: "Exact text match" },
	{ description: "Wi-Fi", expectedTier: 1, category: "Exact text match" },
	{ description: "Bluetooth", expectedTier: 1, category: "Exact text match" },
	{ description: "О телефоне", expectedTier: 1, category: "Partial match" },
	
	// Tier 2: Position-based searches
	{ description: "text at top", expectedTier: 2, category: "Position hint (top)" },
	{ description: "text at bottom", expectedTier: 2, category: "Position hint (bottom)" },
	
	// Tier 3: Complex descriptions (AI needed)
	{ description: "настройка с единицей", expectedTier: 3, category: "Complex AI" },
];

/**
 * Test Hybrid Element Finder on real device
 */
async function testHybridFinder() {
	console.log("=== Hybrid Element Finder Real Device Test ===");
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

		// Step 3: Get hybrid finder
		console.log("Step 3: Initializing Hybrid Element Finder...");
		const hybridFinder = getHybridElementFinder();
		hybridFinder.resetStats();
		console.log("Hybrid finder ready\n");

		// Step 4: Get elements on screen once
		console.log("Step 4: Getting elements on screen...");
		const elements = await robot.getElementsOnScreen();
		console.log(`Found ${elements.length} elements\n`);

		// Step 5: Run test scenarios
		console.log("Step 5: Running test scenarios...\n");
		console.log("=" * 60);

		const results = [];

		for (let i = 0; i < TEST_SCENARIOS.length; i++) {
			const scenario = TEST_SCENARIOS[i];
			console.log(`\n[Test ${i + 1}/${TEST_SCENARIOS.length}] ${scenario.category}: "${scenario.description}"`);
			console.log(`Expected Tier: ${scenario.expectedTier}`);
			console.log("-".repeat(60));

			try {
				const result = await hybridFinder.findElement(elements, scenario.description);

				if (result) {
					console.log(`Found!`);
					console.log(`  Tier: ${result.tier} (${result.method})`);
					console.log(`  Score: ${result.score}`);
					console.log(`  Reason: ${result.reason}`);
					console.log(`  Duration: ${result.duration}ms`);
					console.log(`  Element: ${result.element.text || result.element.label || result.element.type}`);

					const tierMatch = result.tier === scenario.expectedTier;
					console.log(`  Expected tier: ${tierMatch ? "MATCH" : "MISMATCH"}`);

					results.push({
						...scenario,
						actualTier: result.tier,
						duration: result.duration,
						found: true,
						tierMatch
					});
				} else {
					console.log(`Not found`);
					results.push({
						...scenario,
						actualTier: null,
						duration: 0,
						found: false,
						tierMatch: false
					});
				}

			} catch (error) {
				console.error(`Error: ${error.message}`);
				results.push({
					...scenario,
					actualTier: null,
					duration: 0,
					found: false,
					tierMatch: false,
					error: error.message
				});
			}

			// Small delay between tests
			await new Promise(resolve => setTimeout(resolve, 200));
		}

		console.log("\n" + "=".repeat(60));
		console.log("\n=== Test Results Summary ===\n");

		// Calculate statistics
		const foundCount = results.filter(r => r.found).length;
		const tierMatchCount = results.filter(r => r.tierMatch).length;

		console.log(`Tests run: ${results.length}`);
		console.log(`Found: ${foundCount}/${results.length} (${Math.round(foundCount / results.length * 100)}%)`);
		console.log(`Tier matches: ${tierMatchCount}/${results.length} (${Math.round(tierMatchCount / results.length * 100)}%)\n`);

		// Tier distribution
		const tier1Count = results.filter(r => r.actualTier === 1).length;
		const tier2Count = results.filter(r => r.actualTier === 2).length;
		const tier3Count = results.filter(r => r.actualTier === 3).length;

		console.log("=== Tier Distribution ===\n");
		console.log(`Tier 1: ${tier1Count} (${Math.round(tier1Count / foundCount * 100)}%) - Target: 70%`);
		console.log(`Tier 2: ${tier2Count} (${Math.round(tier2Count / foundCount * 100)}%) - Target: 20%`);
		console.log(`Tier 3: ${tier3Count} (${Math.round(tier3Count / foundCount * 100)}%) - Target: 10%`);

		// Average duration
		const avgDuration = results
			.filter(r => r.found)
			.reduce((sum, r) => sum + r.duration, 0) / foundCount;

		console.log("\n=== Performance ===\n");
		console.log(`Average search time: ${Math.round(avgDuration)}ms`);
		console.log(`Target: 370ms (0.7×100ms + 0.2×500ms + 0.1×2000ms)`);

		// Get hybrid finder stats
		const stats = hybridFinder.getStats();
		console.log("\n=== Hybrid Finder Statistics ===\n");
		console.log(`Total attempts: ${stats.totalAttempts}`);
		console.log(`Tier 1: ${stats.tier1Success}/${stats.tier1Attempts} (${stats.tier1SuccessRate}%)`);
		console.log(`Tier 2: ${stats.tier2Success}/${stats.tier2Attempts} (${stats.tier2SuccessRate}%)`);
		console.log(`Tier 3: ${stats.tier3Success}/${stats.tier3Attempts} (${stats.tier3SuccessRate}%)`);
		console.log(`Average duration: ${stats.avgDuration}ms`);

		// Validation
		console.log("\n=== Validation ===\n");

		const validations = [
			{ name: "All elements found", passed: foundCount === results.length, value: `${foundCount}/${results.length}` },
			{ name: "Avg duration < 500ms", passed: avgDuration < 500, value: `${Math.round(avgDuration)}ms` },
			{ name: "Tier 1 working", passed: tier1Count > 0, value: `${tier1Count} successes` },
			{ name: "Faster than AI-only", passed: avgDuration < 1000, value: `${Math.round(avgDuration)}ms vs 2000ms` }
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
			console.log("\nAll validations passed! Hybrid finder working great!");
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
console.log("Starting Hybrid Element Finder test...\n");
testHybridFinder().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});

