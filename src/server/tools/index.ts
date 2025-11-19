/**
 * Tool Modules Index
 *
 * This file exports all tool registration modules
 * Each module contains related tools organized by category
 *
 * For Open Source builds, Pro tool registrations are stubbed out
 */

import type { ToolContext } from "./types";

// Always export Core Tools
export { registerCoreTools } from "./core-tools";

// Conditional exports for Pro features
// These are stubbed out if the files don't exist (Open Source build)
let registerAITools: (context: ToolContext) => void;
let registerCompositeTools: (context: ToolContext) => void;
let registerVisualTools: (context: ToolContext) => void;
let registerEnterpriseTools: (context: ToolContext) => void;

try {
	// Try to import Pro tools (available in Pro build)
	const aiTools = require("./ai-tools");
	registerAITools = aiTools.registerAITools;
} catch {
	// Stub for Open Source build
	registerAITools = () => {
		// No-op: AI tools not available in Open Source
	};
}

try {
	const compositeTools = require("./composite-tools");
	registerCompositeTools = compositeTools.registerCompositeTools;
} catch {
	registerCompositeTools = () => {
		// No-op: Composite tools not available in Open Source
	};
}

try {
	const visualTools = require("./visual-tools");
	registerVisualTools = visualTools.registerVisualTools;
} catch {
	registerVisualTools = () => {
		// No-op: Visual tools not available in Open Source
	};
}

try {
	const enterpriseTools = require("./enterprise-tools");
	registerEnterpriseTools = enterpriseTools.registerEnterpriseTools;
} catch {
	registerEnterpriseTools = () => {
		// No-op: Enterprise tools not available in Open Source
	};
}

export { registerAITools, registerCompositeTools, registerVisualTools, registerEnterpriseTools };

// Export types
export type { ToolModule, ToolContext, ToolRegistrar, ConditionalToolRegistrar } from "./types";
