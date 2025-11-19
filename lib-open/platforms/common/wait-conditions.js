"use strict";
/**
 * Smart waiting conditions for mobile automation
 * Similar to Playwright's waiting mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WAIT_CONFIG = void 0;
exports.elementMatches = elementMatches;
exports.findElement = findElement;
exports.getNextPollInterval = getNextPollInterval;
exports.sleep = sleep;
exports.waitForCondition = waitForCondition;
const config_1 = require("../../core/config");
/**
 * Default wait configuration
 * Uses centralized timeout from config
 */
exports.DEFAULT_WAIT_CONFIG = {
    timeout: config_1.TIMEOUTS.waitFor, // From config (default: 5 seconds)
    pollInterval: 100, // Check every 100ms
    maxPollInterval: 1000, // Max interval for exponential backoff
};
/**
 * Check if element matches selector
 */
function elementMatches(element, selector) {
    // Check label match
    if (selector.label !== undefined) {
        if (element.label?.includes(selector.label) === false) {
            return false;
        }
    }
    // Check text match
    if (selector.text !== undefined) {
        if (element.text?.includes(selector.text) === false) {
            return false;
        }
    }
    // Check type match
    if (selector.type !== undefined) {
        if (element.type !== selector.type) {
            return false;
        }
    }
    // Check identifier match
    if (selector.identifier !== undefined) {
        if (element.identifier !== selector.identifier) {
            return false;
        }
    }
    return true;
}
/**
 * Find element in array that matches selector
 */
function findElement(elements, selector) {
    return elements.find(el => elementMatches(el, selector));
}
/**
 * Calculate next poll interval with exponential backoff
 */
function getNextPollInterval(currentInterval, maxInterval = exports.DEFAULT_WAIT_CONFIG.maxPollInterval) {
    const nextInterval = currentInterval * 1.5;
    return Math.min(nextInterval, maxInterval);
}
/**
 * Sleep for specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Wait implementation helper
 * Used by Robot implementations
 */
async function waitForCondition(condition, checkFn) {
    const timeout = condition.timeout ?? exports.DEFAULT_WAIT_CONFIG.timeout;
    const startTime = Date.now();
    // Handle simple time-based wait
    if (condition.type === "time") {
        const waitTime = condition.timeMs ?? 1000;
        await sleep(waitTime);
        return {
            success: true,
            timeElapsed: waitTime,
        };
    }
    // Element-based conditions require selector
    if (!condition.element) {
        return {
            success: false,
            timeElapsed: 0,
            error: "Element selector is required for element-based conditions",
        };
    }
    let pollInterval = condition.pollInterval ?? exports.DEFAULT_WAIT_CONFIG.pollInterval;
    // Poll until condition is met or timeout
    while (Date.now() - startTime < timeout) {
        try {
            const elements = await checkFn();
            const element = findElement(elements, condition.element);
            switch (condition.type) {
                case "element_visible":
                    if (element) {
                        return {
                            success: true,
                            element,
                            timeElapsed: Date.now() - startTime,
                        };
                    }
                    break;
                case "element_hidden":
                    if (!element) {
                        return {
                            success: true,
                            timeElapsed: Date.now() - startTime,
                        };
                    }
                    break;
                case "element_enabled":
                    if (element && !element.focused) {
                        // Element exists and not focused (enabled)
                        return {
                            success: true,
                            element,
                            timeElapsed: Date.now() - startTime,
                        };
                    }
                    break;
            }
        }
        catch (error) {
            // Ignore errors during polling, continue waiting
        }
        // Wait before next check with exponential backoff
        await sleep(pollInterval);
        pollInterval = getNextPollInterval(pollInterval);
    }
    // Timeout reached
    return {
        success: false,
        timeElapsed: Date.now() - startTime,
        error: `Timeout waiting for condition: ${condition.type}`,
    };
}
