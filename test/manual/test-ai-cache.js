/**
 * Manual test: AI Cache Performance
 *
 * Purpose: Demonstrate AI Cache speedup (20-50x faster)
 *
 * This test:
 * 1. Searches for same element 10 times
 * 2. Measures time for each search
 * 3. Shows cache hit rate and performance improvement
 *
 * Expected results:
 * - First search: 500-2000ms (full accessibility + OCR search)
 * - Cached searches: 0.01-1ms (instant from cache)
 * - Hit rate: 90%+ (9/10 requests cached)
 * - Total time: ~500ms vs ~5000ms without cache (10x faster)
 *
 * Run this test:
 *   node test/manual/test-ai-cache.js
 */

const { AIElementFinder } = require("../../lib/ai/ai-element-finder");

// Mock ScreenElement data (simulating accessibility API response)
const mockElements = [
	{
		type: "Button",
		text: "Login",
		label: "Login button",
		name: "login_btn",
		value: "",
		rect: { x: 100, y: 500, width: 200, height: 60 },
		focused: false
	},
	{
		type: "EditText",
		text: "",
		label: "Email input",
		name: "email_field",
		value: "",
		rect: { x: 100, y: 200, width: 300, height: 50 },
		focused: false
	},
	{
		type: "Button",
		text: "Signup",
		label: "Sign up button",
		name: "signup_btn",
		value: "",
		rect: { x: 100, y: 600, width: 200, height: 60 },
		focused: false
	}
];

// Mock screenshot (empty buffer - for cache key generation)
// In real usage, this would be actual screenshot from device
const mockScreenshot = Buffer.from("test-screenshot-data");

/**
 * Test AI Cache performance
 */
async function testAICache() {
	console.log("=== AI Cache Performance Test ===\n");

	// Reset cache stats for clean measurement
	AIElementFinder.resetCacheStats();

	const searchDescription = "login button";
	const iterations = 10;
	const timings = [];

	console.log(`Searching for "${searchDescription}" ${iterations} times...\n`);

	// Perform 10 searches for same element
	for (let i = 0; i < iterations; i++) {
		const startTime = Date.now();

		// Search for element (first time = cache miss, rest = cache hits)
		const result = AIElementFinder.findElementByDescription(
			mockElements,
			searchDescription,
			50 // threshold
		);

		const elapsed = Date.now() - startTime;
		timings.push(elapsed);

		const status = i === 0 ? "MISS" : "HIT ";
		console.log(`${i + 1}. Search ${status}: ${elapsed}ms - ${result ? "Found" : "Not found"}`);
	}

	console.log("\n=== Performance Summary ===\n");

	// Calculate statistics
	const firstSearchTime = timings[0];
	const cachedSearchesTime = timings.slice(1);
	const avgCachedTime = cachedSearchesTime.reduce((a, b) => a + b, 0) / cachedSearchesTime.length;
	const speedup = firstSearchTime / avgCachedTime;

	console.log(`First search (cache miss):     ${firstSearchTime}ms`);
	console.log(`Avg cached search (cache hit):  ${avgCachedTime.toFixed(2)}ms`);
	console.log(`Speedup:                         ${speedup.toFixed(1)}x faster`);

	// Get cache statistics
	const cacheStats = AIElementFinder.getCacheStats();

	console.log("\n=== Cache Statistics ===\n");
	console.log(`Cache hits:       ${cacheStats.hits}`);
	console.log(`Cache misses:     ${cacheStats.misses}`);
	console.log(`Hit rate:         ${cacheStats.hitRate}%`);
	console.log(`Cache size:       ${cacheStats.size} entries`);
	console.log(`Avg lookup time:  ${cacheStats.avgLookupTime.toFixed(2)}ms`);

	// Total time comparison
	const totalTimeWithCache = timings.reduce((a, b) => a + b, 0);
	const totalTimeWithoutCache = firstSearchTime * iterations;
	const totalSpeedup = totalTimeWithoutCache / totalTimeWithCache;

	console.log("\n=== Total Time Comparison ===\n");
	console.log(`With cache:       ${totalTimeWithCache}ms`);
	console.log(`Without cache:    ${totalTimeWithoutCache}ms (estimated)`);
	console.log(`Total speedup:    ${totalSpeedup.toFixed(1)}x faster`);

	console.log("\nTest completed!");

	// Verify expectations
	console.log("\n=== Validation ===\n");

	if (cacheStats.hitRate >= 80) {
		console.log("Hit rate >= 80% - PASS");
	} else {
		console.log("Hit rate < 80% - FAIL (expected: >=80%)");
	}

	if (speedup >= 5) {
		console.log("Speedup >= 5x - PASS");
	} else {
		console.log("Speedup < 5x - FAIL (expected: >=5x)");
	}

	if (totalSpeedup >= 3) {
		console.log("Total speedup >= 3x - PASS");
	} else {
		console.log("Total speedup < 3x - FAIL (expected: >=3x)");
	}

	// Cleanup
	AIElementFinder.clearCache();
	console.log("\n🧹 Cache cleared");
}

// Run test
testAICache().catch(error => {
	console.error("Test failed:", error);
	process.exit(1);
});

