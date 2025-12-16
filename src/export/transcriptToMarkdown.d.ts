/**
 * Transcript to Markdown - FR-2
 *
 * Converts transcript.json to transcript.md with:
 * - Full narrative text section
 * - Timestamped segments table (MM:SS format)
 * - Language and duration metadata
 */
/**
 * Word-level timing information
 */
interface WordTiming {
    word: string;
    startTime: string;
    endTime: string;
    confidence?: number;
}
/**
 * Transcript segment structure
 */
interface TranscriptSegment {
    id: number;
    text: string;
    start: number;
    end: number;
    words?: WordTiming[];
}
/**
 * Full transcript data structure from transcript.json
 */
export interface TranscriptData {
    success: boolean;
    text?: string;
    duration?: number;
    language?: string;
    segments?: TranscriptSegment[];
    words?: WordTiming[];
    device?: string;
    model?: string;
    error?: string;
}
/**
 * Generate transcript.md content from transcript data
 *
 * @param transcript - The transcript data from transcript.json
 * @returns Markdown string
 */
export declare function generateTranscriptMarkdown(transcript: TranscriptData): string;
/**
 * Read transcript.json and generate transcript.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated transcript.md, or null if no transcript exists
 */
export declare function generateTranscriptMarkdownFile(sessionDir: string): Promise<string | null>;
export {};
//# sourceMappingURL=transcriptToMarkdown.d.ts.map