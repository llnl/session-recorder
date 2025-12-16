/**
 * Transcript to Markdown - FR-2
 *
 * Converts transcript.json to transcript.md with:
 * - Full narrative text section
 * - Timestamped segments table (MM:SS format)
 * - Language and duration metadata
 */

import * as fs from 'fs';
import * as path from 'path';

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
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration for display (e.g., "25:18" or "1:05:30")
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Escape markdown special characters in text
 */
function escapeMarkdown(text: string): string {
  // Escape pipe characters for table cells
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Generate transcript.md content from transcript data
 *
 * @param transcript - The transcript data from transcript.json
 * @returns Markdown string
 */
export function generateTranscriptMarkdown(transcript: TranscriptData): string {
  if (!transcript.success || !transcript.text) {
    return '# Session Transcript\n\n*No transcript available.*\n';
  }

  const lines: string[] = [];

  // Header
  lines.push('# Session Transcript');
  lines.push('');

  // Metadata
  const metadata: string[] = [];
  if (transcript.duration) {
    metadata.push(`**Duration**: ${formatDuration(transcript.duration)}`);
  }
  if (transcript.language) {
    metadata.push(`**Language**: ${transcript.language}`);
  }
  if (transcript.model) {
    metadata.push(`**Model**: ${transcript.model}`);
  }
  if (transcript.device) {
    metadata.push(`**Device**: ${transcript.device}`);
  }

  if (metadata.length > 0) {
    lines.push(metadata.join(' | '));
    lines.push('');
  }

  // Full Narrative section
  lines.push('## Full Narrative');
  lines.push('');
  lines.push(transcript.text.trim());
  lines.push('');
  lines.push('---');
  lines.push('');

  // Timestamped Segments table
  if (transcript.segments && transcript.segments.length > 0) {
    lines.push('## Timestamped Segments');
    lines.push('');
    lines.push('| Time | Text |');
    lines.push('|------|------|');

    for (const segment of transcript.segments) {
      const time = formatTime(segment.start);
      const text = escapeMarkdown(segment.text.trim());
      lines.push(`| ${time} | ${text} |`);
    }

    lines.push('');
  } else if (transcript.words && transcript.words.length > 0) {
    // Fall back to word-level timing if no segments
    lines.push('## Timestamped Words');
    lines.push('');
    lines.push('| Time | Text |');
    lines.push('|------|------|');

    // Group words into ~10 second chunks
    let currentChunk: string[] = [];
    let chunkStart: number | null = null;

    for (const word of transcript.words) {
      const wordStart = new Date(word.startTime).getTime() / 1000;

      if (chunkStart === null) {
        chunkStart = wordStart;
      }

      currentChunk.push(word.word);

      // Every 10 seconds or so, create a new row
      if (wordStart - chunkStart >= 10) {
        const time = formatTime(chunkStart);
        const text = escapeMarkdown(currentChunk.join(' ').trim());
        lines.push(`| ${time} | ${text} |`);
        currentChunk = [];
        chunkStart = null;
      }
    }

    // Add remaining words
    if (currentChunk.length > 0 && chunkStart !== null) {
      const time = formatTime(chunkStart);
      const text = escapeMarkdown(currentChunk.join(' ').trim());
      lines.push(`| ${time} | ${text} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Read transcript.json and generate transcript.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated transcript.md, or null if no transcript exists
 */
export async function generateTranscriptMarkdownFile(sessionDir: string): Promise<string | null> {
  const transcriptJsonPath = path.join(sessionDir, 'transcript.json');

  // Check if transcript.json exists
  if (!fs.existsSync(transcriptJsonPath)) {
    console.log('📝 No transcript.json found, skipping transcript.md generation');
    return null;
  }

  try {
    // Read transcript.json
    const transcriptData: TranscriptData = JSON.parse(
      fs.readFileSync(transcriptJsonPath, 'utf-8')
    );

    // Generate markdown
    const markdown = generateTranscriptMarkdown(transcriptData);

    // Write transcript.md
    const outputPath = path.join(sessionDir, 'transcript.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`📝 Generated transcript.md`);
    return outputPath;
  } catch (error) {
    console.error('❌ Failed to generate transcript.md:', error);
    return null;
  }
}
