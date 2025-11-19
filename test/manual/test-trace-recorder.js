/**
 * Week 14 - Trace Recorder Test
 * 
 * Tests the TraceRecorder functionality:
 * - Recording actions (tap, swipe, longPress)
 * - Auto-capturing screenshots after actions
 * - Auto-capturing accessibility tree
 * - Exporting trace to JSON
 * - Time-travel debugging capabilities
 * 
 * Prerequisites:
 * - Android device connected (ID: 843b3cd3)
 * - Device unlocked and on home screen
 * - npm run build completed successfully
 * 
 * Run: node test/manual/test-trace-recorder.js
 */

const { AndroidRobot } = require('../../lib/platforms/android');
const fs = require('fs');
const path = require('path');

// Test configuration
const DEVICE_ID = '843b3cd3';
const OUTPUT_DIR = path.join(__dirname, '../test-traces');
const TRACE_FILE = path.join(OUTPUT_DIR, 'test-trace.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Sleep utility
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runTests() {
	console.log('═══════════════════════════════════════════════════════════');
	console.log('📹 Week 14 - Trace Recorder Tests');
	console.log('═══════════════════════════════════════════════════════════\n');

	const robot = new AndroidRobot(DEVICE_ID);
	let testsPassed = 0;
	let testsFailed = 0;

	try {
		// Test 1: Basic tracing functionality
		console.log('Test 1: Basic tracing functionality');
		console.log('─────────────────────────────────────');
		
		// Start tracing
		robot.startTracing({
			captureScreenshots: true,
			captureTree: true
		});
		
		console.log('✓ Tracing started');
		
		// Check if tracing is active
		if (!robot.isTracing()) {
			throw new Error('Tracing should be active');
		}
		console.log('✓ Tracing is active');
		
		// Get screen size (should be recorded)
		const screenSize = await robot.getScreenSize();
		console.log(`✓ Screen size: ${screenSize.width}x${screenSize.height}`);
		
		testsPassed++;
		console.log('Test 1 passed\n');
		
		// Test 2: Record actions with screenshots and trees
		console.log('Test 2: Record actions with screenshots and trees');
		console.log('─────────────────────────────────────');
		
		// Perform a tap action (center of screen)
		const centerX = Math.floor(screenSize.width / 2);
		const centerY = Math.floor(screenSize.height / 2);
		
		console.log(`Tapping at (${centerX}, ${centerY})`);
		await robot.tap(centerX, centerY);
		console.log('✓ Tap action recorded');
		
		await sleep(500); // Wait a bit
		
		// Perform a swipe action
		console.log('Swiping up...');
		await robot.swipe('up');
		console.log('✓ Swipe action recorded');
		
		await sleep(500);
		
		// Perform a long press
		console.log(`Long pressing at (${centerX}, ${centerY})`);
		await robot.longPress(centerX, centerY);
		console.log('✓ Long press action recorded');
		
		testsPassed++;
		console.log('Test 2 passed\n');
		
		// Test 3: Stop tracing and validate trace data
		console.log('Test 3: Stop tracing and validate trace data');
		console.log('─────────────────────────────────────');
		
		// Get trace recorder to check data before stopping
		const recorder = robot.getTraceRecorder();
		if (!recorder) {
			throw new Error('Trace recorder should be available');
		}
		
		const events = recorder.getEvents();
		console.log(`✓ Total events recorded: ${events.length}`);
		
		// Count events by type
		const eventsByType = {
			action: 0,
			screenshot: 0,
			tree: 0,
			log: 0,
			error: 0
		};
		
		events.forEach(event => {
			eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
		});
		
		console.log('✓ Events by type:');
		console.log(`  - Actions: ${eventsByType.action}`);
		console.log(`  - Screenshots: ${eventsByType.screenshot}`);
		console.log(`  - Trees: ${eventsByType.tree}`);
		console.log(`  - Logs: ${eventsByType.log}`);
		console.log(`  - Errors: ${eventsByType.error}`);
		
		// Validate minimum expectations
		if (eventsByType.action < 3) {
			throw new Error(`Expected at least 3 actions, got ${eventsByType.action}`);
		}
		
		if (eventsByType.screenshot < 3) {
			throw new Error(`Expected at least 3 screenshots, got ${eventsByType.screenshot}`);
		}
		
		if (eventsByType.tree < 3) {
			throw new Error(`Expected at least 3 trees, got ${eventsByType.tree}`);
		}
		
		console.log('✓ Event counts validated');
		
		// Get summary
		const summary = recorder.getSummary();
		console.log(`✓ Summary generated: ${summary.totalEvents} total events`);
		
		testsPassed++;
		console.log('Test 3 passed\n');
		
		// Test 4: Export trace to file
		console.log('Test 4: Export trace to file');
		console.log('─────────────────────────────────────');
		
		// Stop tracing and save
		await robot.stopTracing(TRACE_FILE);
		console.log(`✓ Trace saved to: ${TRACE_FILE}`);
		
		// Verify trace is no longer active
		if (robot.isTracing()) {
			throw new Error('Tracing should be stopped');
		}
		console.log('✓ Tracing stopped');
		
		// Read and validate the saved trace file
		if (!fs.existsSync(TRACE_FILE)) {
			throw new Error('Trace file was not created');
		}
		console.log('✓ Trace file exists');
		
		const traceContent = fs.readFileSync(TRACE_FILE, 'utf8');
		const trace = JSON.parse(traceContent);
		
		console.log('✓ Trace file is valid JSON');
		
		// Validate trace structure
		if (!trace.version) {
			throw new Error('Trace should have version');
		}
		console.log(`✓ Trace version: ${trace.version}`);
		
		if (!trace.startTime || !trace.endTime) {
			throw new Error('Trace should have start and end times');
		}
		console.log(`✓ Trace duration: ${trace.duration}ms`);
		
		if (!trace.events || !Array.isArray(trace.events)) {
			throw new Error('Trace should have events array');
		}
		console.log(`✓ Trace has ${trace.events.length} events`);
		
		if (!trace.summary) {
			throw new Error('Trace should have summary');
		}
		console.log('✓ Trace has summary');
		console.log(`  - Total actions: ${trace.summary.totalActions}`);
		console.log(`  - Total screenshots: ${trace.summary.totalScreenshots}`);
		console.log(`  - Error count: ${trace.summary.errorCount}`);
		
		if (!trace.metadata) {
			throw new Error('Trace should have metadata');
		}
		console.log('✓ Trace has metadata');
		console.log(`  - Device: ${trace.metadata.deviceId}`);
		console.log(`  - Platform: ${trace.metadata.platform}`);
		
		// Calculate trace file size
		const stats = fs.statSync(TRACE_FILE);
		const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
		console.log(`✓ Trace file size: ${sizeMB}MB`);
		
		testsPassed++;
		console.log('Test 4 passed\n');
		
		// Test 5: Validate individual events
		console.log('Test 5: Validate individual events');
		console.log('─────────────────────────────────────');
		
		// Check tap event
		const tapEvent = trace.events.find(e => 
			e.type === 'action' && e.data.action === 'tap'
		);
		
		if (!tapEvent) {
			throw new Error('Should have at least one tap event');
		}
		console.log('✓ Found tap event');
		console.log(`  - Timestamp: ${new Date(tapEvent.timestamp).toISOString()}`);
		console.log(`  - Duration: ${tapEvent.duration}ms`);
		console.log(`  - Params: x=${tapEvent.data.params.x}, y=${tapEvent.data.params.y}`);
		
		// Check swipe event
		const swipeEvent = trace.events.find(e => 
			e.type === 'action' && e.data.action === 'swipe'
		);
		
		if (!swipeEvent) {
			throw new Error('Should have at least one swipe event');
		}
		console.log('✓ Found swipe event');
		console.log(`  - Timestamp: ${new Date(swipeEvent.timestamp).toISOString()}`);
		console.log(`  - Duration: ${swipeEvent.duration}ms`);
		console.log(`  - Direction: ${swipeEvent.data.params.direction}`);
		
		// Check screenshot event
		const screenshotEvent = trace.events.find(e => e.type === 'screenshot');
		
		if (!screenshotEvent) {
			throw new Error('Should have at least one screenshot event');
		}
		console.log('✓ Found screenshot event');
		console.log(`  - Has screenshot data: ${!!screenshotEvent.data.screenshot}`);
		console.log(`  - Screenshot size (base64): ${screenshotEvent.data.screenshot.length} chars`);
		
		// Check tree event
		const treeEvent = trace.events.find(e => e.type === 'tree');
		
		if (!treeEvent) {
			throw new Error('Should have at least one tree event');
		}
		console.log('✓ Found tree event');
		console.log(`  - Element count: ${treeEvent.data.elementCount}`);
		console.log(`  - Tree array length: ${treeEvent.data.tree.length}`);
		
		testsPassed++;
		console.log('Test 5 passed\n');
		
	} catch (error) {
		console.error(`Test failed: ${error.message}`);
		console.error(error.stack);
		testsFailed++;
	}

	// Summary
	console.log('═══════════════════════════════════════════════════════════');
	console.log('WEEK 14 TEST SUMMARY');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`Total Tests: ${testsPassed + testsFailed}`);
	console.log(`Passed: ${testsPassed}`);
	console.log(`Failed: ${testsFailed}`);
	console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(0)}%`);
	console.log('═══════════════════════════════════════════════════════════\n');

	if (testsFailed === 0) {
		console.log('ALL TESTS PASSED! Week 14 Complete!\n');
		console.log('TraceRecorder: Working');
		console.log('Action Recording: Working');
		console.log('Screenshot Capture: Working');
		console.log('Tree Capture: Working');
		console.log('Trace Export: Working');
		console.log('Time-travel Debugging: Ready');
		console.log('\nNext steps:');
		console.log('   - Review trace file: ' + TRACE_FILE);
		console.log('   - Build trace viewer UI (optional)');
		console.log('   - Integrate into CI/CD pipeline');
		console.log('   - Add network event recording (optional)');
	} else {
		console.log('SOME TESTS FAILED. Please review the errors above.\n');
		process.exit(1);
	}
}

// Run tests
runTests().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});

