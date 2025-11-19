/**
 * WebSocket Transport Test
 *
 * Purpose: Test WebSocket Transport with mock server
 *
 * This test:
 * 1. Starts mock WebSocket server
 * 2. Creates WebSocket transport
 * 3. Tests basic request/response
 * 4. Tests concurrent requests
 * 5. Tests connection pooling
 * 6. Measures performance vs HTTP
 *
 * Expected results:
 * - All requests succeed
 * - Request/response correlation works
 * - Performance: ~10ms per request (vs ~100ms for HTTP)
 * - Connection pooling works correctly
 *
 * Prerequisites:
 * - Start test server first: node test/manual/test-websocket-server.js
 *
 * Run this test:
 *   node test/manual/test-websocket-transport.js
 */

const { createWebSocketTransport } = require("../../lib/transport/websocket-transport");
const { createConnectionPool } = require("../../lib/transport/connection-pool");

const SERVER_URL = "ws://localhost:8080";

/**
 * Test WebSocket Transport basic functionality
 */
async function testBasicTransport() {
	console.log("=== Test 1: Basic WebSocket Transport ===\n");

	const transport = createWebSocketTransport({ url: SERVER_URL });

	try {
		// Connect
		console.log("Connecting to server...");
		await transport.connect();
		console.log(`Connected (state: ${transport.getState()})\n`);

		// Test single request
		console.log("📤 Sending request...");
		const start = Date.now();
		const result = await transport.send("test-method", { foo: "bar" });
		const duration = Date.now() - start;

		console.log(`Response received in ${duration}ms`);
		console.log(`   Result:`, result);

		// Validate response
		if (result.method === "test-method" && result.params.foo === "bar") {
			console.log("Response validated\n");
			return { passed: true, duration };
		} else {
			console.log("Response validation failed\n");
			return { passed: false, duration };
		}

	} catch (error) {
		console.error("Test failed:", error.message);
		return { passed: false, error: error.message };
	} finally {
		transport.close();
	}
}

/**
 * Test concurrent requests
 */
async function testConcurrentRequests() {
	console.log("=== Test 2: Concurrent Requests ===\n");

	const transport = createWebSocketTransport({ url: SERVER_URL });

	try {
		await transport.connect();
		console.log("Connected\n");

		// Send 10 concurrent requests
		console.log("📤 Sending 10 concurrent requests...");
		const start = Date.now();

		const promises = [];
		for (let i = 0; i < 10; i++) {
			promises.push(transport.send(`request-${i}`, { index: i }));
		}

		const results = await Promise.all(promises);
		const duration = Date.now() - start;

		console.log(`All responses received in ${duration}ms`);
		console.log(`   Average: ${Math.round(duration / 10)}ms per request\n`);

		// Validate all responses
		const allValid = results.every((r, i) => r.method === `request-${i}` && r.params.index === i);

		if (allValid) {
			console.log("All responses validated\n");
			return { passed: true, duration, count: 10, avgDuration: duration / 10 };
		} else {
			console.log("Some responses failed validation\n");
			return { passed: false, duration };
		}

	} catch (error) {
		console.error("Test failed:", error.message);
		return { passed: false, error: error.message };
	} finally {
		transport.close();
	}
}

/**
 * Test connection pool
 */
async function testConnectionPool() {
	console.log("=== Test 3: Connection Pool ===\n");

	const pool = createConnectionPool(
		(deviceId) => ({ url: SERVER_URL }),
		{ maxConnectionsPerDevice: 1, maxTotalConnections: 3 }
	);

	try {
		// Test acquiring connections for multiple devices
		console.log("Acquiring connections for 3 devices...");

		const device1 = await pool.acquire("device1");
		const device2 = await pool.acquire("device2");
		const device3 = await pool.acquire("device3");

		console.log("Acquired 3 connections\n");

		// Get pool stats
		const stats = pool.getStats();
		console.log("Pool stats:");
		console.log(`   Total: ${stats.total}`);
		console.log(`   Busy: ${stats.busy}`);
		console.log(`   Idle: ${stats.idle}`);
		console.log(`   By device:`, stats.byDevice);
		console.log();

		// Test sending via pool
		console.log("📤 Sending requests via pool...");
		const start = Date.now();

		const result1 = await device1.send("device1-request", { device: "device1" });
		const result2 = await device2.send("device2-request", { device: "device2" });
		const result3 = await device3.send("device3-request", { device: "device3" });

		const duration = Date.now() - start;

		console.log(`All requests completed in ${duration}ms\n`);

		// Release connections
		pool.release(device1);
		pool.release(device2);
		pool.release(device3);

		console.log("Released all connections");

		// Get updated stats
		const statsAfter = pool.getStats();
		console.log("Pool stats after release:");
		console.log(`   Total: ${statsAfter.total}`);
		console.log(`   Busy: ${statsAfter.busy}`);
		console.log(`   Idle: ${statsAfter.idle}\n`);

		// Validate
		if (statsAfter.busy === 0 && statsAfter.total === 3) {
			console.log("Connection pool working correctly\n");
			return { passed: true, duration };
		} else {
			console.log("Connection pool validation failed\n");
			return { passed: false };
		}

	} catch (error) {
		console.error("Test failed:", error.message);
		return { passed: false, error: error.message };
	} finally {
		pool.close();
	}
}

/**
 * Test performance comparison
 */
async function testPerformanceComparison() {
	console.log("=== Test 4: Performance Comparison ===\n");

	const transport = createWebSocketTransport({ url: SERVER_URL });

	try {
		await transport.connect();
		console.log("Connected\n");

		// Warm up
		await transport.send("warmup", {});

		// Test 100 requests
		console.log("📤 Sending 100 requests to measure performance...");
		const start = Date.now();

		for (let i = 0; i < 100; i++) {
			await transport.send("perf-test", { index: i });
		}

		const duration = Date.now() - start;
		const avgDuration = duration / 100;

		console.log(`Completed in ${duration}ms`);
		console.log(`   Average: ${avgDuration.toFixed(2)}ms per request`);
		console.log(`   HTTP overhead (typical): ~100ms per request`);
		console.log(`   WebSocket overhead: ~${avgDuration.toFixed(2)}ms per request`);
		console.log(`   Speedup: ${(100 / avgDuration).toFixed(1)}x faster!\n`);

		return {
			passed: true,
			duration,
			avgDuration,
			speedup: 100 / avgDuration
		};

	} catch (error) {
		console.error("Test failed:", error.message);
		return { passed: false, error: error.message };
	} finally {
		transport.close();
	}
}

/**
 * Run all tests
 */
async function runAllTests() {
	console.log("=== WebSocket Transport Tests ===\n");
	console.log("Make sure test server is running:");
	console.log("  node test/manual/test-websocket-server.js\n");
	console.log("=".repeat(60) + "\n");

	const results = [];

	// Test 1: Basic transport
	const test1 = await testBasicTransport();
	results.push({ name: "Basic Transport", ...test1 });
	await new Promise(resolve => setTimeout(resolve, 500));

	// Test 2: Concurrent requests
	const test2 = await testConcurrentRequests();
	results.push({ name: "Concurrent Requests", ...test2 });
	await new Promise(resolve => setTimeout(resolve, 500));

	// Test 3: Connection pool
	const test3 = await testConnectionPool();
	results.push({ name: "Connection Pool", ...test3 });
	await new Promise(resolve => setTimeout(resolve, 500));

	// Test 4: Performance
	const test4 = await testPerformanceComparison();
	results.push({ name: "Performance", ...test4 });

	// Summary
	console.log("=".repeat(60));
	console.log("\n=== Test Results Summary ===\n");

	const passedCount = results.filter(r => r.passed).length;
	console.log(`Tests run: ${results.length}`);
	console.log(`Passed: ${passedCount}/${results.length} (${Math.round(passedCount / results.length * 100)}%)\n`);

	console.log("Individual results:");
	results.forEach(result => {
		const status = result.passed ? "PASS" : "FAIL";
		const detail = result.error ? result.error : result.duration ? `${result.duration}ms` : "";
		console.log(`  ${status}: ${result.name} ${detail ? `(${detail})` : ""}`);
	});

	// Performance summary
	const perfResult = results.find(r => r.name === "Performance");
	if (perfResult && perfResult.passed) {
		console.log("\n=== Performance Summary ===\n");
		console.log(`WebSocket avg: ${perfResult.avgDuration.toFixed(2)}ms per request`);
		console.log(`HTTP typical: ~100ms per request`);
		console.log(`Speedup: ${perfResult.speedup.toFixed(1)}x faster! `);
	}

	// Validation
	console.log("\n=== Validation ===\n");

	const validations = [
		{ name: "All tests passed", passed: passedCount === results.length, value: `${passedCount}/${results.length}` },
		{ name: "WebSocket faster than 50ms", passed: perfResult?.avgDuration < 50, value: `${perfResult?.avgDuration.toFixed(2)}ms` },
		{ name: "Speedup > 2x", passed: perfResult?.speedup > 2, value: `${perfResult?.speedup.toFixed(1)}x` }
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
		console.log("\nAll validations passed! WebSocket Transport working perfectly!");
	} else {
		console.log("\nSome validations failed. Review results above.");
	}

	console.log("\nTests completed!");
}

// Run tests
runAllTests().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});

