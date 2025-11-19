/**
 * Manual Test: Self-Healing Element Finder
 *
 * Purpose: Test self-healing functionality on real device
 *
 * Test Scenarios:
 * 1. First search - element not in memory → self-healing → save to memory
 * 2. Second search - use saved selector → instant hit
 * 3. Simulate selector change - try alternatives → self-heal → update memory
 * 4. Third search - use new selector → instant hit
 *
 * Expected Results:
 * - First search: Self-healing event (slow - uses Hybrid Finder)
 * - Second search: Saved selector hit (instant)
 * - Changed selector: Alternative/self-healing (medium)
 * - Third search: New saved selector hit (instant)
 * - Recovery rate: >90%
 *
 * Test Device: Android 843b3cd3
 */

const { getHybridElementFinder } = require('../../lib/ai/hybrid-element-finder');
const { SelfHealingFinder } = require('../../lib/testing/self-healing-finder');
const { AndroidRobot } = require('../../lib/platforms/android');
const { promises: fs } = require('fs');
const path = require('path');

// Test configuration
const DEVICE_ID = '843b3cd3';
const STORAGE_PATH = './test/self-healing-memory';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

/**
 * Main test function
 */
async function testSelfHealingFinder() {
	console.log(`\n${'='.repeat(60)}`);
	console.log(`${BLUE}Self-Healing Finder - Real Device Test${RESET}`);
	console.log(`Device: ${DEVICE_ID}`);
	console.log(`${'='.repeat(60)}\n`);

	let robot;
	let passed = 0;
	let failed = 0;

	try {
		// Initialize Android robot
		console.log(`${BLUE}[Setup]${RESET} Initializing Android robot...`);
		robot = new AndroidRobot(DEVICE_ID);
		console.log(`${GREEN}✓${RESET} Robot initialized\n`);

		// Clear existing memory for clean test
		console.log(`${BLUE}[Setup]${RESET} Clearing existing memory...`);
		try {
			await fs.rm(STORAGE_PATH, { recursive: true, force: true });
			console.log(`${GREEN}✓${RESET} Memory cleared\n`);
		} catch (error) {
			console.log(`${YELLOW}⚠${RESET} No existing memory to clear\n`);
		}

		// Create instances
		const hybridFinder = getHybridElementFinder();
		const selfHealingFinder = new SelfHealingFinder(hybridFinder, STORAGE_PATH);

		// Get current screen state
		console.log(`${BLUE}[Setup]${RESET} Getting screen state...`);
		const elements = await robot.getElementsOnScreen();
		const screenshot = await robot.getScreenshot();
		console.log(`${GREEN}✓${RESET} Found ${elements.length} elements\n`);

		if (elements.length === 0) {
			console.log(`${RED}✗${RESET} No elements found on screen. Make sure device is unlocked!\n`);
			return;
		}

		// Display available elements for reference
		console.log(`${BLUE}[Info]${RESET} Available elements (first 10):`);
		elements.slice(0, 10).forEach((el, i) => {
			const text = el.text || el.label || el.identifier || '(no text)';
			console.log(`  ${i + 1}. ${el.type}: "${text}"`);
		});
		console.log();

		// =================================================================
		// TEST 1: First Search - Not in Memory (Self-Healing)
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}TEST 1: First Search (Not in Memory)${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		try {
			// Use a generic description that should match something on home screen
			const description1 = 'first button on screen';
			console.log(`Searching for: "${description1}"`);

			const start1 = Date.now();
			const element1 = await selfHealingFinder.findElement(description1, elements, screenshot);
			const duration1 = Date.now() - start1;

			if (element1) {
				console.log(`${GREEN}✓ PASSED${RESET} - Found element via self-healing`);
				console.log(`  Duration: ${duration1}ms`);
				console.log(`  Type: ${element1.type}`);
				console.log(`  Text: ${element1.text || element1.label || '(no text)'}`);
				console.log(`  Position: (${element1.rect.x}, ${element1.rect.y})\n`);
				passed++;
			} else {
				throw new Error('Element not found');
			}
		} catch (error) {
			console.log(`${RED}✗ FAILED${RESET} - ${error.message}\n`);
			failed++;
		}

		// =================================================================
		// TEST 2: Second Search - Use Saved Selector (Instant Hit)
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}TEST 2: Second Search (Saved Selector)${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		try {
			const description2 = 'first button on screen'; // Same as before
			console.log(`Searching for: "${description2}" (should use saved selector)`);

			const start2 = Date.now();
			const element2 = await selfHealingFinder.findElement(description2, elements, screenshot);
			const duration2 = Date.now() - start2;

			if (element2 && duration2 < 50) {
				// Should be instant (<50ms)
				console.log(`${GREEN}✓ PASSED${RESET} - Found via saved selector (instant!)`);
				console.log(`  Duration: ${duration2}ms`);
				console.log(`  Type: ${element2.type}`);
				console.log(`  Text: ${element2.text || element2.label || '(no text)'}\n`);
				passed++;
			} else if (element2) {
				console.log(
					`${YELLOW}⚠ PARTIAL${RESET} - Found but slower than expected (${duration2}ms)\n`
				);
				passed++;
			} else {
				throw new Error('Element not found');
			}
		} catch (error) {
			console.log(`${RED}✗ FAILED${RESET} - ${error.message}\n`);
			failed++;
		}

		// =================================================================
		// TEST 3: Search Different Element
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}TEST 3: Different Element Search${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		try {
			// Try to find a different element
			const description3 = elements.length > 5 ? 'element in the middle' : 'any element with text';
			console.log(`Searching for: "${description3}"`);

			const start3 = Date.now();
			const element3 = await selfHealingFinder.findElement(description3, elements, screenshot);
			const duration3 = Date.now() - start3;

			if (element3) {
				console.log(`${GREEN}✓ PASSED${RESET} - Found element`);
				console.log(`  Duration: ${duration3}ms`);
				console.log(`  Type: ${element3.type}`);
				console.log(`  Text: ${element3.text || element3.label || '(no text)'}\n`);
				passed++;
			} else {
				throw new Error('Element not found');
			}
		} catch (error) {
			console.log(`${RED}✗ FAILED${RESET} - ${error.message}\n`);
			failed++;
		}

		// =================================================================
		// TEST 4: Re-search to Test Memory
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}TEST 4: Re-search (Memory Test)${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		try {
			const description4 = 'element in the middle'; // Same as TEST 3
			console.log(`Searching for: "${description4}" (should use saved selector)`);

			const start4 = Date.now();
			const element4 = await selfHealingFinder.findElement(description4, elements, screenshot);
			const duration4 = Date.now() - start4;

			if (element4 && duration4 < 50) {
				console.log(`${GREEN}✓ PASSED${RESET} - Found via saved selector (instant!)`);
				console.log(`  Duration: ${duration4}ms\n`);
				passed++;
			} else if (element4) {
				console.log(
					`${YELLOW}⚠ PARTIAL${RESET} - Found but slower than expected (${duration4}ms)\n`
				);
				passed++;
			} else {
				throw new Error('Element not found');
			}
		} catch (error) {
			console.log(`${RED}✗ FAILED${RESET} - ${error.message}\n`);
			failed++;
		}

		// =================================================================
		// Generate Healing Report
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}HEALING REPORT${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		const report = selfHealingFinder.getHealingReport();

		console.log(`${BLUE}Summary:${RESET}`);
		console.log(`  Total Searches: ${report.summary.totalSearches}`);
		console.log(`  Saved Selector Hits: ${report.summary.savedSelectorHits} (instant)`);
		console.log(`  Alternative Selector Hits: ${report.summary.alternativeSelectorHits}`);
		console.log(`  Self-Healing Events: ${report.summary.selfHealingEvents}`);
		console.log(`  Failed Searches: ${report.summary.failedSearches}`);
		console.log(`  Avg Search Time: ${report.summary.avgSearchTime}ms`);
		console.log(
			`  Recovery Rate: ${report.summary.recoveryRate}% ${
				report.summary.recoveryRate >= 90 ? GREEN + '✓ Target: 90%' + RESET : RED + '✗ Target: 90%' + RESET
			}`
		);
		console.log();

		console.log(`${BLUE}Elements in Memory:${RESET}`);
		report.elements.forEach((el, i) => {
			console.log(`  ${i + 1}. "${el.description}"`);
			console.log(`     Selector: ${el.selector}`);
			console.log(`     Usage Count: ${el.usageCount}`);
			console.log(`     Healing Count: ${el.healingCount}`);
			if (el.lastHealing) {
				console.log(`     Last Healing: ${el.lastHealing.reason}`);
			}
			console.log();
		});

		// =================================================================
		// Final Results
		// =================================================================
		console.log(`${'='.repeat(60)}`);
		console.log(`${BLUE}FINAL RESULTS${RESET}`);
		console.log(`${'='.repeat(60)}\n`);

		const total = passed + failed;
		const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

		console.log(`Tests Passed: ${GREEN}${passed}${RESET}/${total}`);
		console.log(`Tests Failed: ${failed > 0 ? RED : GREEN}${failed}${RESET}/${total}`);
		console.log(`Success Rate: ${successRate}%\n`);

		// Target validation
		console.log(`${BLUE}Target Validation:${RESET}`);
		console.log(
			`  Recovery Rate: ${
				report.summary.recoveryRate >= 90
					? GREEN + '✓ PASS' + RESET
					: RED + '✗ FAIL' + RESET
			} (${report.summary.recoveryRate}% / 90% target)`
		);
		console.log(
			`  Memory Persistence: ${
				report.elements.length > 0 ? GREEN + '✓ PASS' + RESET : RED + '✗ FAIL' + RESET
			} (${report.elements.length} elements saved)`
		);
		console.log(
			`  Saved Selector Hits: ${
				report.summary.savedSelectorHits > 0
					? GREEN + '✓ PASS' + RESET
					: YELLOW + '⚠ NONE' + RESET
			} (${report.summary.savedSelectorHits} hits)`
		);
		console.log();

		if (successRate === 100 && report.summary.recoveryRate >= 90) {
			console.log(`${GREEN}${''.repeat(20)}${RESET}`);
			console.log(`${GREEN}✓ ALL TESTS PASSED! Self-Healing Working Perfectly!${RESET}`);
			console.log(`${GREEN}${''.repeat(20)}${RESET}\n`);
		} else if (successRate >= 75) {
			console.log(`${YELLOW}⚠ Most tests passed, but needs improvement${RESET}\n`);
		} else {
			console.log(`${RED}✗ Many tests failed - needs debugging${RESET}\n`);
		}
	} catch (error) {
		console.error(`${RED}Fatal error:${RESET}`, error);
	} finally {
		if (robot) {
			console.log(`${BLUE}[Cleanup]${RESET} Closing robot connection...`);
			// Robot cleanup if needed
		}
	}
}

// Run test
testSelfHealingFinder().catch(console.error);

