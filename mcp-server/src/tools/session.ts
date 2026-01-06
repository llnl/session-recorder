/**
 * Session Tools - load, unload, summary, markdown
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SessionStore } from '../SessionStore';

const execAsync = promisify(exec);
import {
  LoadedSession,
  LoadResult,
  AnyAction,
  VoiceTranscriptAction,
} from '../types';

/**
 * Calculate session duration in milliseconds
 */
function calculateDuration(session: LoadedSession): number {
  const { session: sessionData } = session;
  if (sessionData.endTime) {
    return new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime();
  }
  // If no end time, use the last action timestamp
  const actions = sessionData.actions;
  if (actions.length > 0) {
    const lastAction = actions[actions.length - 1];
    return new Date(lastAction.timestamp).getTime() - new Date(sessionData.startTime).getTime();
  }
  return 0;
}

/**
 * Get unique URLs from actions (max 20)
 */
function getUniqueUrls(session: LoadedSession): string[] {
  const urls = new Set<string>();

  for (const action of session.session.actions) {
    let url: string | undefined;

    if (action.type === 'navigation' && 'navigation' in action) {
      url = action.navigation.toUrl;
    } else if ('before' in action && action.before?.url) {
      url = action.before.url;
    } else if ('tabUrl' in action) {
      url = action.tabUrl;
    }

    if (url && url !== 'about:blank') {
      urls.add(url);
      if (urls.size >= 20) break;
    }
  }

  return Array.from(urls);
}

/**
 * Count actions by type
 */
function countActionTypes(session: LoadedSession): {
  clicks: number;
  inputs: number;
  navigations: number;
  voiceSegments: number;
} {
  const counts = { clicks: 0, inputs: 0, navigations: 0, voiceSegments: 0 };

  for (const action of session.session.actions) {
    switch (action.type) {
      case 'click':
        counts.clicks++;
        break;
      case 'input':
      case 'change':
        counts.inputs++;
        break;
      case 'navigation':
        counts.navigations++;
        break;
      case 'voice_transcript':
        counts.voiceSegments++;
        break;
    }
  }

  return counts;
}

/**
 * Check if any actions have descriptions
 */
function hasDescriptions(session: LoadedSession): boolean {
  return session.session.actions.some(
    (action) => 'description' in action && action.description
  );
}

/**
 * Check if any actions are notes (not implemented yet, placeholder)
 */
function hasNotes(session: LoadedSession): boolean {
  return false; // Notes feature not yet implemented
}

/**
 * Load a session from a zip file or directory
 */
export async function sessionLoad(
  store: SessionStore,
  params: { path: string }
): Promise<LoadResult> {
  const session = await store.load(params.path);

  return {
    sessionId: session.sessionId,
    duration: calculateDuration(session),
    actionCount: session.session.actions.length,
    hasVoice: !!session.transcript || session.session.actions.some(a => a.type === 'voice_transcript'),
    hasDescriptions: hasDescriptions(session),
    hasNotes: hasNotes(session),
    urls: getUniqueUrls(session),
    summary: countActionTypes(session),
  };
}

/**
 * Unload a session from memory
 */
export function sessionUnload(
  store: SessionStore,
  params: { sessionId: string }
): { success: boolean; message: string } {
  const success = store.unload(params.sessionId);
  return {
    success,
    message: success
      ? `Session ${params.sessionId} unloaded`
      : `Session ${params.sessionId} not found`,
  };
}

/**
 * Get session summary with more detail
 */
export function sessionGetSummary(
  store: SessionStore,
  params: { sessionId: string }
): {
  sessionId: string;
  duration: number;
  totalActions: number;
  byType: Record<string, number>;
  urls: Array<{ url: string; actionCount: number }>;
  hasVoice: boolean;
  hasDescriptions: boolean;
  hasNotes: boolean;
  errorCount: number;
  transcriptPreview: string;
  featuresDetected: string[];
} {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  // Count actions by type
  const byType: Record<string, number> = {};
  for (const action of session.session.actions) {
    byType[action.type] = (byType[action.type] || 0) + 1;
  }

  // Count actions per URL
  const urlCounts = new Map<string, number>();
  for (const action of session.session.actions) {
    let url: string | undefined;
    if (action.type === 'navigation' && 'navigation' in action) {
      url = action.navigation.toUrl;
    } else if ('before' in action && action.before?.url) {
      url = action.before.url;
    }
    if (url && url !== 'about:blank') {
      urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
    }
  }

  const urls = Array.from(urlCounts.entries())
    .map(([url, actionCount]) => ({ url, actionCount }))
    .slice(0, 20);

  // Get transcript preview
  let transcriptPreview = '';
  const voiceActions = session.session.actions.filter(
    (a): a is VoiceTranscriptAction => a.type === 'voice_transcript'
  );
  if (voiceActions.length > 0) {
    transcriptPreview = voiceActions
      .slice(0, 5)
      .map((a) => a.transcript.text)
      .join(' ')
      .slice(0, 500);
  } else if (session.transcript?.text) {
    transcriptPreview = session.transcript.text.slice(0, 500);
  }

  // Count errors
  const consoleErrors = session.consoleEntries.filter(
    (e) => e.level === 'error' || e.level === 'warn'
  ).length;
  const networkErrors = session.networkEntries.filter((e) => e.status >= 400).length;

  // Detect features based on keywords in transcript and URLs
  const features: string[] = [];
  const textContent = transcriptPreview.toLowerCase();
  const urlContent = urls.map((u) => u.url).join(' ').toLowerCase();

  if (textContent.includes('login') || urlContent.includes('login') || urlContent.includes('auth')) {
    features.push('authentication');
  }
  if (textContent.includes('checkout') || urlContent.includes('checkout') || urlContent.includes('cart')) {
    features.push('e-commerce');
  }
  if (textContent.includes('form') || textContent.includes('submit')) {
    features.push('forms');
  }
  if (textContent.includes('calendar') || urlContent.includes('calendar')) {
    features.push('calendar');
  }
  if (textContent.includes('dashboard') || urlContent.includes('dashboard')) {
    features.push('dashboard');
  }

  return {
    sessionId: session.sessionId,
    duration: calculateDuration(session),
    totalActions: session.session.actions.length,
    byType,
    urls,
    hasVoice: !!session.transcript || voiceActions.length > 0,
    hasDescriptions: hasDescriptions(session),
    hasNotes: hasNotes(session),
    errorCount: consoleErrors + networkErrors,
    transcriptPreview,
    featuresDetected: features,
  };
}

/**
 * Available markdown file types
 */
type MarkdownType = 'transcript' | 'actions' | 'console' | 'network' | 'all';

/**
 * Get pre-generated markdown summaries from a session
 * More token-efficient than returning raw JSON
 */
export function sessionGetMarkdown(
  store: SessionStore,
  params: { sessionId: string; type?: MarkdownType }
): {
  sessionId: string;
  type: MarkdownType;
  files: Array<{ name: string; content: string }>;
  availableFiles: string[];
} {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const sessionDir = path.dirname(session.zipPath);
  const type = params.type || 'all';

  // Define markdown file mappings
  const markdownFiles: Record<string, string> = {
    transcript: 'transcript.md',
    actions: 'actions.md',
    console: 'console-summary.md',
    network: 'network-summary.md',
  };

  // Check which files exist
  const availableFiles: string[] = [];
  for (const [key, filename] of Object.entries(markdownFiles)) {
    const filePath = path.join(sessionDir, filename);
    if (fs.existsSync(filePath)) {
      availableFiles.push(key);
    }
  }

  // Determine which files to return
  const filesToReturn = type === 'all'
    ? availableFiles
    : availableFiles.filter(f => f === type);

  // Read requested files
  const files: Array<{ name: string; content: string }> = [];
  for (const fileType of filesToReturn) {
    const filename = markdownFiles[fileType];
    const filePath = path.join(sessionDir, filename);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      files.push({ name: filename, content });
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    sessionId: session.sessionId,
    type,
    files,
    availableFiles,
  };
}

/**
 * Regenerate markdown exports for a session
 * Useful when session data has been edited or markdown files are missing
 */
export async function sessionRegenerateMarkdown(
  store: SessionStore,
  params: { sessionId: string }
): Promise<{
  sessionId: string;
  generated: string[];
  errors: string[];
}> {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const sessionDir = path.dirname(session.zipPath);
  const generated: string[] = [];
  const errors: string[] = [];

  // Use the session-recorder CLI to regenerate markdown
  // The CLI script is at session-recorder/dist/src/scripts/export-markdown.js
  const mcpServerDir = path.resolve(__dirname, '..', '..');
  const sessionRecorderDir = path.resolve(mcpServerDir, '..');
  const cliScript = path.join(sessionRecorderDir, 'dist', 'src', 'scripts', 'export-markdown.js');

  try {
    // Check if the CLI script exists
    if (!fs.existsSync(cliScript)) {
      // Try to build it first
      errors.push(`CLI script not found at ${cliScript}. Run 'npm run build' in session-recorder first.`);
      return { sessionId: session.sessionId, generated, errors };
    }

    // Run the CLI script
    const { stdout, stderr } = await execAsync(`node "${cliScript}" "${sessionDir}"`);

    // Parse output to determine what was generated
    const output = stdout + stderr;
    if (output.includes('transcript.md')) generated.push('transcript.md');
    if (output.includes('actions.md')) generated.push('actions.md');
    if (output.includes('console-summary.md')) generated.push('console-summary.md');
    if (output.includes('network-summary.md')) generated.push('network-summary.md');

    if (generated.length === 0 && !output.includes('No markdown files generated')) {
      // Check if files exist in the directory
      const markdownFiles = ['transcript.md', 'actions.md', 'console-summary.md', 'network-summary.md'];
      for (const file of markdownFiles) {
        if (fs.existsSync(path.join(sessionDir, file))) {
          generated.push(file);
        }
      }
    }

    if (generated.length === 0) {
      errors.push('No markdown files generated (missing source data)');
    }
  } catch (error) {
    const err = error as { message: string; stderr?: string };
    errors.push(`Failed to generate markdown: ${err.message || err.stderr || 'Unknown error'}`);
  }

  return {
    sessionId: session.sessionId,
    generated,
    errors,
  };
}
