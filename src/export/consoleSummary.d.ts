/**
 * Console Summary Markdown - FR-4
 *
 * Converts session.console to console-summary.md with:
 * - Total counts by level (error/warn/info/debug)
 * - Pattern-grouped messages with occurrence counts
 * - First/last timestamps per pattern
 * - Stack traces for errors
 * - Wildcard normalization (URLs, numbers, UUIDs → *)
 */
/**
 * Generate console-summary.md content
 */
export declare function generateConsoleSummary(consolePath: string): Promise<string>;
/**
 * Read session.console and generate console-summary.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated console-summary.md, or null if no console log exists
 */
export declare function generateConsoleSummaryFile(sessionDir: string): Promise<string | null>;
//# sourceMappingURL=consoleSummary.d.ts.map