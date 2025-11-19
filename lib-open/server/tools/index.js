"use strict";
/**
 * Tool Modules Index
 *
 * This file exports all tool registration modules
 * Each module contains related tools organized by category
 *
 * For Open Source builds, Pro tool registrations are stubbed out
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEnterpriseTools = exports.registerVisualTools = exports.registerCompositeTools = exports.registerAITools = exports.registerCoreTools = void 0;
// Always export Core Tools
var core_tools_1 = require("./core-tools");
Object.defineProperty(exports, "registerCoreTools", { enumerable: true, get: function () { return core_tools_1.registerCoreTools; } });
// Conditional exports for Pro features
// These are stubbed out if the files don't exist (Open Source build)
let registerAITools;
let registerCompositeTools;
let registerVisualTools;
let registerEnterpriseTools;
try {
    // Try to import Pro tools (available in Pro build)
    const aiTools = require("./ai-tools");
    exports.registerAITools = registerAITools = aiTools.registerAITools;
}
catch {
    // Stub for Open Source build
    exports.registerAITools = registerAITools = () => {
        // No-op: AI tools not available in Open Source
    };
}
try {
    const compositeTools = require("./composite-tools");
    exports.registerCompositeTools = registerCompositeTools = compositeTools.registerCompositeTools;
}
catch {
    exports.registerCompositeTools = registerCompositeTools = () => {
        // No-op: Composite tools not available in Open Source
    };
}
try {
    const visualTools = require("./visual-tools");
    exports.registerVisualTools = registerVisualTools = visualTools.registerVisualTools;
}
catch {
    exports.registerVisualTools = registerVisualTools = () => {
        // No-op: Visual tools not available in Open Source
    };
}
try {
    const enterpriseTools = require("./enterprise-tools");
    exports.registerEnterpriseTools = registerEnterpriseTools = enterpriseTools.registerEnterpriseTools;
}
catch {
    exports.registerEnterpriseTools = registerEnterpriseTools = () => {
        // No-op: Enterprise tools not available in Open Source
    };
}
