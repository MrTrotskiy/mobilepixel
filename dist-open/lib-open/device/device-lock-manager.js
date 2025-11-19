"use strict";
/**
 * Device Lock Manager
 *
 * Manages locks on mobile devices to prevent concurrent access.
 * Essential for parallel test execution where multiple tests
 * might try to use the same device simultaneously.
 *
 * Features:
 * - Device-level locking (one test per device at a time)
 * - Automatic lock release on error
 * - Timeout support for lock acquisition
 * - Queue management for waiting tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceLockManager = getDeviceLockManager;
exports.withDeviceLock = withDeviceLock;
const robot_1 = require("../core/robot");
/**
 * Global device lock manager singleton
 * Ensures only one instance manages all device locks
 */
class DeviceLockManager {
    locks = new Map();
    queue = [];
    lockCheckInterval = null;
    constructor() {
        // Start periodic check for expired locks
        this.startLockMonitoring();
    }
    /**
     * Start monitoring locks for expiration
     */
    startLockMonitoring() {
        // Check every second for expired locks
        this.lockCheckInterval = setInterval(() => {
            this.checkExpiredLocks();
        }, 1000);
    }
    /**
     * Check for and release expired locks
     */
    checkExpiredLocks() {
        const now = Date.now();
        for (const [deviceId, lock] of this.locks.entries()) {
            if (lock.expiresAt && lock.expiresAt < now) {
                console.warn(`Lock expired for device ${deviceId} (owner: ${lock.ownerId})`);
                this.releaseLock(deviceId, lock.ownerId);
            }
        }
    }
    /**
     * Acquire a lock on a device
     *
     * @param deviceId - Device to lock
     * @param ownerId - ID of the test/process acquiring lock
     * @param timeout - Max time to wait for lock (ms). 0 = fail immediately, undefined = wait forever
     * @param lockDuration - Max time to hold lock (ms). undefined = no expiration
     * @returns Promise that resolves when lock is acquired
     */
    async acquireLock(deviceId, ownerId, timeout, lockDuration) {
        // Check if device is already locked
        const existingLock = this.locks.get(deviceId);
        if (!existingLock) {
            // Device is free, acquire immediately
            this.setLock(deviceId, ownerId, lockDuration);
            return;
        }
        // Device is locked by someone else
        if (existingLock.ownerId === ownerId) {
            // Already own the lock - this is reentrant, just update expiration
            if (lockDuration) {
                existingLock.expiresAt = Date.now() + lockDuration;
            }
            return;
        }
        // Need to wait for lock
        if (timeout === 0) {
            // Fail immediately if timeout is 0
            throw new robot_1.ActionableError(`Device ${deviceId} is locked by ${existingLock.ownerId} (acquired ${Date.now() - existingLock.acquiredAt}ms ago)`);
        }
        // Wait for lock with timeout
        return new Promise((resolve, reject) => {
            const request = {
                deviceId,
                ownerId,
                resolve: () => {
                    this.setLock(deviceId, ownerId, lockDuration);
                    resolve();
                },
                reject,
                requestedAt: Date.now(),
            };
            this.queue.push(request);
            // Set timeout if specified
            if (timeout !== undefined) {
                setTimeout(() => {
                    // Check if still in queue
                    const index = this.queue.indexOf(request);
                    if (index !== -1) {
                        this.queue.splice(index, 1);
                        reject(new robot_1.ActionableError(`Timeout waiting for lock on device ${deviceId} (waited ${Date.now() - request.requestedAt}ms)`));
                    }
                }, timeout);
            }
        });
    }
    /**
     * Release a lock on a device
     *
     * @param deviceId - Device to unlock
     * @param ownerId - ID of the test/process releasing lock (must match owner)
     */
    releaseLock(deviceId, ownerId) {
        const lock = this.locks.get(deviceId);
        if (!lock) {
            // No lock to release - this is OK (idempotent)
            return;
        }
        if (lock.ownerId !== ownerId) {
            console.warn(`Attempted to release lock on ${deviceId} by ${ownerId}, but lock is owned by ${lock.ownerId}`);
            return;
        }
        // Release the lock
        this.locks.delete(deviceId);
        // Process queue - give lock to next waiting request
        this.processQueue(deviceId);
    }
    /**
     * Process queue for a specific device
     * Find first request waiting for this device and resolve it
     */
    processQueue(deviceId) {
        const index = this.queue.findIndex(req => req.deviceId === deviceId);
        if (index !== -1) {
            const request = this.queue.splice(index, 1)[0];
            request.resolve();
        }
    }
    /**
     * Set lock on a device
     */
    setLock(deviceId, ownerId, lockDuration) {
        const lock = {
            deviceId,
            ownerId,
            acquiredAt: Date.now(),
            expiresAt: lockDuration ? Date.now() + lockDuration : 0,
        };
        this.locks.set(deviceId, lock);
    }
    /**
     * Check if device is locked
     */
    isLocked(deviceId) {
        return this.locks.has(deviceId);
    }
    /**
     * Get information about current lock on device
     */
    getLockInfo(deviceId) {
        return this.locks.get(deviceId) || null;
    }
    /**
     * Get all currently locked devices
     */
    getLockedDevices() {
        return Array.from(this.locks.keys());
    }
    /**
     * Release all locks (cleanup)
     */
    releaseAll() {
        this.locks.clear();
        // Reject all pending requests
        this.queue.forEach(req => {
            req.reject(new robot_1.ActionableError("Device lock manager is shutting down"));
        });
        this.queue = [];
    }
    /**
     * Cleanup and stop monitoring
     */
    shutdown() {
        if (this.lockCheckInterval) {
            clearInterval(this.lockCheckInterval);
            this.lockCheckInterval = null;
        }
        this.releaseAll();
    }
}
// Global singleton instance
let globalLockManager = null;
/**
 * Get the global device lock manager instance
 */
function getDeviceLockManager() {
    if (!globalLockManager) {
        globalLockManager = new DeviceLockManager();
    }
    return globalLockManager;
}
/**
 * Helper function to execute code with device lock
 * Automatically acquires and releases lock
 *
 * @param deviceId - Device to lock
 * @param ownerId - ID of the test/process
 * @param fn - Function to execute while holding lock
 * @param timeout - Max time to wait for lock (ms)
 * @param lockDuration - Max time to hold lock (ms)
 */
async function withDeviceLock(deviceId, ownerId, fn, timeout, lockDuration) {
    const manager = getDeviceLockManager();
    try {
        // Acquire lock
        await manager.acquireLock(deviceId, ownerId, timeout, lockDuration);
        // Execute function
        return await fn();
    }
    finally {
        // Always release lock, even on error
        manager.releaseLock(deviceId, ownerId);
    }
}
