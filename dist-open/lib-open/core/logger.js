"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.trace = void 0;
const node_fs_1 = require("node:fs");
/**
 * Write log message to file and stderr
 *
 * IMPORTANT: In MCP stdio protocol:
 * - stdout is reserved for JSON-RPC messages
 * - stderr is used for ALL logs (both INFO and ERROR)
 *
 * Using console.log breaks the MCP protocol with "Unexpected token" errors!
 */
const writeLog = (message, level = "INFO") => {
    // Write to file if LOG_FILE env var is set
    if (process.env.LOG_FILE) {
        const logfile = process.env.LOG_FILE;
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level} ${message}`;
        (0, node_fs_1.appendFileSync)(logfile, logMessage + "\n");
    }
    // ALWAYS use stderr for logs in stdio transport
    // MCP client will parse stderr and mark as [info] or [error] based on content
    console.error(message);
};
/**
 * Log informational message (success, status updates, etc.)
 * Goes to stderr and is marked as INFO level in log files
 */
const trace = (message) => {
    writeLog(message, "INFO");
};
exports.trace = trace;
/**
 * Log error message (failures, exceptions, etc.)
 * Goes to stderr and is marked as ERROR level in log files
 */
const error = (message) => {
    writeLog(message, "ERROR");
};
exports.error = error;
