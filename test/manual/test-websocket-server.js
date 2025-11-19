/**
 * WebSocket Test Server - Mock server for testing WebSocket Transport
 *
 * Purpose: Simple WebSocket server that echoes requests for testing
 *
 * Features:
 * - Echoes requests back with results
 * - Request/response correlation via IDs
 * - Simulates delays for realistic testing
 *
 * Run this server first before running test-websocket-transport.js:
 *   node test/manual/test-websocket-server.js
 */

const WebSocket = require("ws");

const PORT = 8080;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

console.log(`=== WebSocket Test Server ===`);
console.log(`Listening on port ${PORT}`);
console.log(`URL: ws://localhost:${PORT}\n`);

wss.on("connection", (ws) => {
	console.log("Client connected");

	ws.on("message", (data) => {
		try {
			const request = JSON.parse(data);
			console.log(`📥 Received: ${request.method} (id: ${request.id})`);

			// Simulate processing delay (10ms)
			setTimeout(() => {
				// Echo back with result
				const response = {
					id: request.id,
					result: {
						method: request.method,
						params: request.params,
						timestamp: Date.now()
					}
				};

				ws.send(JSON.stringify(response));
				console.log(`📤 Sent: ${request.method} result (id: ${request.id})`);
			}, 10);

		} catch (error) {
			console.error("Error parsing message:", error);
		}
	});

	ws.on("close", () => {
		console.log("Client disconnected");
	});

	ws.on("error", (error) => {
		console.error("WebSocket error:", error);
	});
});

wss.on("error", (error) => {
	console.error("Server error:", error);
});

console.log("Server ready! Waiting for connections...\n");

// Keep server running
process.on("SIGINT", () => {
	console.log("\n\nShutting down server...");
	wss.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

