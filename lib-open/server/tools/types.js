"use strict";
/**
 * Common types and utilities for MCP tool registration
 * This file provides shared types used across all tool modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatform = exports.isIosRobot = exports.isAndroidRobot = void 0;
const android_1 = require("../../platforms/android");
const ios_1 = require("../../platforms/ios");
/**
 * Helper to check if robot is Android
 */
const isAndroidRobot = (robot) => {
    return robot instanceof android_1.AndroidRobot;
};
exports.isAndroidRobot = isAndroidRobot;
/**
 * Helper to check if robot is iOS
 */
const isIosRobot = (robot) => {
    return robot instanceof ios_1.IosRobot;
};
exports.isIosRobot = isIosRobot;
/**
 * Helper to get platform name from robot
 */
const getPlatform = (robot) => {
    return (0, exports.isAndroidRobot)(robot) ? "android" : "ios";
};
exports.getPlatform = getPlatform;
