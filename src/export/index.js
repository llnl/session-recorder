"use strict";
/**
 * Markdown Export Module - Barrel Export
 *
 * Auto-generates human-readable markdown documents from session recording data:
 * - transcript.md - Voice transcription narrative and timestamps
 * - actions.md - Chronological action timeline with element context
 * - console-summary.md - Grouped/deduplicated console logs
 * - network-summary.md - Request statistics and performance data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNetworkSummaryFile = exports.generateNetworkSummary = exports.generateConsoleSummaryFile = exports.generateConsoleSummary = exports.generateActionsMarkdownFile = exports.generateActionsMarkdown = exports.generateTranscriptMarkdownFile = exports.generateTranscriptMarkdown = exports.formatElementContext = exports.extractElementContext = void 0;
exports.generateMarkdownExports = generateMarkdownExports;
var elementContext_1 = require("./elementContext");
Object.defineProperty(exports, "extractElementContext", { enumerable: true, get: function () { return elementContext_1.extractElementContext; } });
Object.defineProperty(exports, "formatElementContext", { enumerable: true, get: function () { return elementContext_1.formatElementContext; } });
var transcriptToMarkdown_1 = require("./transcriptToMarkdown");
Object.defineProperty(exports, "generateTranscriptMarkdown", { enumerable: true, get: function () { return transcriptToMarkdown_1.generateTranscriptMarkdown; } });
Object.defineProperty(exports, "generateTranscriptMarkdownFile", { enumerable: true, get: function () { return transcriptToMarkdown_1.generateTranscriptMarkdownFile; } });
var actionsToMarkdown_1 = require("./actionsToMarkdown");
Object.defineProperty(exports, "generateActionsMarkdown", { enumerable: true, get: function () { return actionsToMarkdown_1.generateActionsMarkdown; } });
Object.defineProperty(exports, "generateActionsMarkdownFile", { enumerable: true, get: function () { return actionsToMarkdown_1.generateActionsMarkdownFile; } });
var consoleSummary_1 = require("./consoleSummary");
Object.defineProperty(exports, "generateConsoleSummary", { enumerable: true, get: function () { return consoleSummary_1.generateConsoleSummary; } });
Object.defineProperty(exports, "generateConsoleSummaryFile", { enumerable: true, get: function () { return consoleSummary_1.generateConsoleSummaryFile; } });
var networkSummary_1 = require("./networkSummary");
Object.defineProperty(exports, "generateNetworkSummary", { enumerable: true, get: function () { return networkSummary_1.generateNetworkSummary; } });
Object.defineProperty(exports, "generateNetworkSummaryFile", { enumerable: true, get: function () { return networkSummary_1.generateNetworkSummaryFile; } });
const transcriptToMarkdown_2 = require("./transcriptToMarkdown");
const actionsToMarkdown_2 = require("./actionsToMarkdown");
const consoleSummary_2 = require("./consoleSummary");
const networkSummary_2 = require("./networkSummary");
/**
 * Generate all markdown exports for a session (FR-6)
 *
 * Called automatically from SessionRecorder.stopRecording()
 * Generates: transcript.md, actions.md, console-summary.md, network-summary.md
 *
 * @param sessionDir - Path to the session directory containing session data files
 * @returns Result object with paths to generated files and any errors
 */
async function generateMarkdownExports(sessionDir) {
    const startTime = Date.now();
    const errors = [];
    const result = {
        errors,
        duration: 0
    };
    console.log('📄 Generating markdown exports...');
    // Generate all markdown files in parallel for performance (TR-2)
    const [transcript, actions, consoleSummary, networkSummary] = await Promise.all([
        (0, transcriptToMarkdown_2.generateTranscriptMarkdownFile)(sessionDir).catch(err => {
            errors.push(`transcript.md: ${err.message}`);
            return null;
        }),
        (0, actionsToMarkdown_2.generateActionsMarkdownFile)(sessionDir).catch(err => {
            errors.push(`actions.md: ${err.message}`);
            return null;
        }),
        (0, consoleSummary_2.generateConsoleSummaryFile)(sessionDir).catch(err => {
            errors.push(`console-summary.md: ${err.message}`);
            return null;
        }),
        (0, networkSummary_2.generateNetworkSummaryFile)(sessionDir).catch(err => {
            errors.push(`network-summary.md: ${err.message}`);
            return null;
        })
    ]);
    result.transcript = transcript;
    result.actions = actions;
    result.consoleSummary = consoleSummary;
    result.networkSummary = networkSummary;
    result.duration = Date.now() - startTime;
    // Summary
    const generated = [transcript, actions, consoleSummary, networkSummary].filter(Boolean).length;
    console.log(`📄 Markdown export complete: ${generated} files generated in ${result.duration}ms`);
    if (errors.length > 0) {
        console.log(`⚠️  Export warnings: ${errors.join(', ')}`);
    }
    return result;
}
//# sourceMappingURL=index.js.map