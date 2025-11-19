/**
 * Common types and utilities for MCP tool registration
 * This file provides shared types used across all tool modules
 */

import { z, ZodRawShape, ZodTypeAny } from "zod";
import { Robot } from "../../core/robot";
import { AndroidRobot } from "../../platforms/android";
import { IosRobot } from "../../platforms/ios";
import { SimctlManager } from "../../platforms/iphone-simulator";

/**
 * Tool registration function type
 * Used to register individual tools with the MCP server
 */
export type ToolRegistrar = (
	name: string,
	description: string,
	paramsSchema: ZodRawShape,
	callback: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>
) => void;

/**
 * Conditional tool registrar
 * Only registers tool if category is enabled in config
 */
export type ConditionalToolRegistrar = (
	category: string,
	name: string,
	description: string,
	paramsSchema: ZodRawShape,
	callback: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>
) => void;

/**
 * Tool registration context
 * Provides access to all dependencies needed by tools
 */
export interface ToolContext {
	// Tool registration functions
	tool: ToolRegistrar;
	conditionalTool: ConditionalToolRegistrar;

	// Device management
	getRobotFromDevice: (device: string) => Robot;
	simulatorManager: SimctlManager;

	// Configuration
	toolConfig: Record<string, boolean>;

	// Common schemas
	noParams: z.ZodObject<any>;
	deviceSchema: z.ZodString;
}

/**
 * Tool module interface
 * Each tool module exports a register function that takes ToolContext
 */
export type ToolModule = (context: ToolContext) => void;

/**
 * Helper to check if robot is Android
 */
export const isAndroidRobot = (robot: Robot): robot is AndroidRobot => {
	return robot instanceof AndroidRobot;
};

/**
 * Helper to check if robot is iOS
 */
export const isIosRobot = (robot: Robot): robot is IosRobot => {
	return robot instanceof IosRobot;
};

/**
 * Helper to get platform name from robot
 */
export const getPlatform = (robot: Robot): "android" | "ios" => {
	return isAndroidRobot(robot) ? "android" : "ios";
};
