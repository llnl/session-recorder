/**
 * Network Summary Markdown - FR-5
 *
 * Converts session.network to network-summary.md with:
 * - Total requests, success rate, size
 * - Breakdown by resource type
 * - Failed requests table with status and error
 * - Slowest requests (top 10)
 * - Cache hit ratio
 */
/**
 * Generate network-summary.md content
 */
export declare function generateNetworkSummary(networkPath: string): Promise<string>;
/**
 * Read session.network and generate network-summary.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated network-summary.md, or null if no network log exists
 */
export declare function generateNetworkSummaryFile(sessionDir: string): Promise<string | null>;
//# sourceMappingURL=networkSummary.d.ts.map