/**
 * Connection Pool - Manage Multiple WebSocket Connections
 *
 * Purpose: Efficiently manage WebSocket connections for multiple devices
 *
 * Features:
 * - Connection reuse (avoid creating new connections)
 * - Automatic cleanup of idle connections
 * - Connection limit (prevent resource exhaustion)
 * - Device-specific connection management
 *
 * Performance:
 * - Reuse existing connections (no connection overhead)
 * - Parallel operations on multiple devices
 * - Automatic cleanup (prevent memory leaks)
 *
 * Use case:
 * - Testing on multiple devices simultaneously
 * - CI/CD with device farm
 * - Parallel test execution
 */

import { WebSocketTransport, ConnectionOptions } from "./websocket-transport";

/**
 * Pooled connection metadata
 */
interface PooledConnection {
	id: string;                      // Unique connection ID
	deviceId: string;                // Device this connection belongs to
	transport: WebSocketTransport;   // WebSocket transport instance
	busy: boolean;                   // Is connection currently in use
	lastUsed: number;                // Last usage timestamp
	createdAt: number;               // Creation timestamp
}

/**
 * Pool configuration
 */
export interface PoolConfig {
	maxConnectionsPerDevice?: number;  // Max connections per device (default: 1)
	maxTotalConnections?: number;      // Max total connections (default: 10)
	idleTimeout?: number;              // Idle connection timeout (default: 60000ms = 1 min)
	cleanupInterval?: number;          // Cleanup interval (default: 30000ms = 30 sec)
}

/**
 * Connection Pool
 *
 * Manages pool of WebSocket connections for multiple devices
 * with automatic cleanup and connection reuse
 */
export class ConnectionPool {
	private connections: PooledConnection[] = [];
	private config: Required<PoolConfig>;
	private cleanupTimer: NodeJS.Timeout | null = null;
	private getConnectionOptions: (deviceId: string) => ConnectionOptions;

	constructor(
		getConnectionOptions: (deviceId: string) => ConnectionOptions,
		config: PoolConfig = {}
	) {
		this.getConnectionOptions = getConnectionOptions;
		this.config = {
			maxConnectionsPerDevice: config.maxConnectionsPerDevice ?? 1,
			maxTotalConnections: config.maxTotalConnections ?? 10,
			idleTimeout: config.idleTimeout ?? 60000,      // 1 minute
			cleanupInterval: config.cleanupInterval ?? 30000  // 30 seconds
		};

		// Start automatic cleanup
		this.startCleanup();
	}

	/**
	 * Acquire connection for device
	 *
	 * Returns existing connection or creates new one
	 * Waits if all connections are busy
	 *
	 * @param deviceId - Device identifier
	 * @returns WebSocket transport for device
	 */
	async acquire(deviceId: string): Promise<WebSocketTransport> {
		// Find free connection for this device
		let conn = this.connections.find(c =>
			c.deviceId === deviceId && !c.busy
		);

		// Create new connection if needed and allowed
		if (!conn && this.canCreateConnection(deviceId)) {
			conn = await this.createConnection(deviceId);
			this.connections.push(conn);
			console.log(`[ConnectionPool] Created new connection for ${deviceId} (total: ${this.connections.length})`);
		}

		// Wait for free connection if all busy
		if (!conn) {
			console.log(`[ConnectionPool] Waiting for free connection for ${deviceId}...`);
			await this.waitForFreeConnection(deviceId);
			return this.acquire(deviceId); // Retry
		}

		// Mark as busy
		conn.busy = true;
		conn.lastUsed = Date.now();

		console.log(`[ConnectionPool] Acquired connection ${conn.id} for ${deviceId}`);
		return conn.transport;
	}

	/**
	 * Release connection back to pool
	 *
	 * Marks connection as available for reuse
	 *
	 * @param transport - WebSocket transport to release
	 */
	release(transport: WebSocketTransport): void {
		const conn = this.connections.find(c => c.transport === transport);

		if (conn) {
			conn.busy = false;
			conn.lastUsed = Date.now();
			console.log(`[ConnectionPool] Released connection ${conn.id}`);
		} else {
			console.warn("[ConnectionPool] Attempted to release unknown connection");
		}
	}

	/**
	 * Check if can create new connection
	 */
	private canCreateConnection(deviceId: string): boolean {
		// Check total limit
		if (this.connections.length >= this.config.maxTotalConnections) {
			return false;
		}

		// Check per-device limit
		const deviceConnections = this.connections.filter(c => c.deviceId === deviceId);
		if (deviceConnections.length >= this.config.maxConnectionsPerDevice) {
			return false;
		}

		return true;
	}

	/**
	 * Create new connection
	 */
	private async createConnection(deviceId: string): Promise<PooledConnection> {
		const options = this.getConnectionOptions(deviceId);
		const transport = new WebSocketTransport(options);

		try {
			await transport.connect();
		} catch (error) {
			throw new Error(`Failed to create connection for ${deviceId}: ${error}`);
		}

		return {
			id: `conn-${deviceId}-${Date.now()}`,
			deviceId,
			transport,
			busy: false,
			lastUsed: Date.now(),
			createdAt: Date.now()
		};
	}

	/**
	 * Wait for free connection
	 */
	private async waitForFreeConnection(deviceId: string): Promise<void> {
		return new Promise(resolve => {
			const checkInterval = setInterval(() => {
				// Check if there's a free connection
				const freeConn = this.connections.find(c =>
					c.deviceId === deviceId && !c.busy
				);

				if (freeConn) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);

			// Timeout after 30 seconds
			setTimeout(() => {
				clearInterval(checkInterval);
				resolve(); // Resolve anyway (will retry or fail)
			}, 30000);
		});
	}

	/**
	 * Start automatic cleanup timer
	 */
	private startCleanup(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanup();
		}, this.config.cleanupInterval);
	}

	/**
	 * Cleanup idle connections
	 *
	 * Removes connections that have been idle for too long
	 */
	cleanup(): void {
		const now = Date.now();
		const before = this.connections.length;

		this.connections = this.connections.filter(conn => {
			// Keep busy connections
			if (conn.busy) {
				return true;
			}

			// Check idle timeout
			const idleTime = now - conn.lastUsed;
			if (idleTime > this.config.idleTimeout) {
				console.log(`[ConnectionPool] Closing idle connection ${conn.id} (idle: ${idleTime}ms)`);
				conn.transport.close();
				return false;
			}

			return true;
		});

		const removed = before - this.connections.length;
		if (removed > 0) {
			console.log(`[ConnectionPool] Cleaned up ${removed} idle connections (remaining: ${this.connections.length})`);
		}
	}

	/**
	 * Get pool statistics
	 */
	getStats(): {
		total: number;
		busy: number;
		idle: number;
		byDevice: Record<string, number>;
		} {
		const busyCount = this.connections.filter(c => c.busy).length;
		const byDevice: Record<string, number> = {};

		for (const conn of this.connections) {
			byDevice[conn.deviceId] = (byDevice[conn.deviceId] || 0) + 1;
		}

		return {
			total: this.connections.length,
			busy: busyCount,
			idle: this.connections.length - busyCount,
			byDevice
		};
	}

	/**
	 * Close all connections
	 *
	 * Cleanly shuts down entire pool
	 */
	close(): void {
		// Stop cleanup timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}

		// Close all connections
		console.log(`[ConnectionPool] Closing all connections (${this.connections.length})...`);
		for (const conn of this.connections) {
			conn.transport.close();
		}

		this.connections = [];
		console.log("[ConnectionPool] All connections closed");
	}
}

/**
 * Create connection pool instance
 */
export function createConnectionPool(
	getConnectionOptions: (deviceId: string) => ConnectionOptions,
	config?: PoolConfig
): ConnectionPool {
	return new ConnectionPool(getConnectionOptions, config);
}
