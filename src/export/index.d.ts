/**
 * Markdown Export Module - Barrel Export
 *
 * Auto-generates human-readable markdown documents from session recording data:
 * - transcript.md - Voice transcription narrative and timestamps
 * - actions.md - Chronological action timeline with element context
 * - console-summary.md - Grouped/deduplicated console logs
 * - network-summary.md - Request statistics and performance data
 */
export { extractElementContext, formatElementContext, ElementContext } from './elementContext';
export { generateTranscriptMarkdown, generateTranscriptMarkdownFile, TranscriptData } from './transcriptToMarkdown';
export { generateActionsMarkdown, generateActionsMarkdownFile } from './actionsToMarkdown';
export { generateConsoleSummary, generateConsoleSummaryFile } from './consoleSummary';
export { generateNetworkSummary, generateNetworkSummaryFile } from './networkSummary';
/**
 * Result of markdown generation
 */
export interface MarkdownExportResult {
    transcript?: string | null;
    actions?: string | null;
    consoleSummary?: string | null;
    networkSummary?: string | null;
    errors: string[];
    duration: number;
}
/**
 * Generate all markdown exports for a session (FR-6)
 *
 * Called automatically from SessionRecorder.stopRecording()
 * Generates: transcript.md, actions.md, console-summary.md, network-summary.md
 *
 * @param sessionDir - Path to the session directory containing session data files
 * @returns Result object with paths to generated files and any errors
 */
export declare function generateMarkdownExports(sessionDir: string): Promise<MarkdownExportResult>;
//# sourceMappingURL=index.d.ts.map