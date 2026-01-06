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

import { generateTranscriptMarkdownFile } from './transcriptToMarkdown';
import { generateActionsMarkdownFile } from './actionsToMarkdown';
import { generateConsoleSummaryFile } from './consoleSummary';
import { generateNetworkSummaryFile } from './networkSummary';

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
export async function generateMarkdownExports(sessionDir: string): Promise<MarkdownExportResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const result: MarkdownExportResult = {
    errors,
    duration: 0
  };

  console.log('📄 Generating markdown exports...');

  // Generate all markdown files in parallel for performance (TR-2)
  const [transcript, actions, consoleSummary, networkSummary] = await Promise.all([
    generateTranscriptMarkdownFile(sessionDir).catch(err => {
      errors.push(`transcript.md: ${err.message}`);
      return null;
    }),
    generateActionsMarkdownFile(sessionDir).catch(err => {
      errors.push(`actions.md: ${err.message}`);
      return null;
    }),
    generateConsoleSummaryFile(sessionDir).catch(err => {
      errors.push(`console-summary.md: ${err.message}`);
      return null;
    }),
    generateNetworkSummaryFile(sessionDir).catch(err => {
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
