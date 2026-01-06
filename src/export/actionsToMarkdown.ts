/**
 * Actions to Markdown - FR-3
 *
 * Converts session.json actions to actions.md with:
 * - Chronological timeline of all actions
 * - Human-readable element descriptions (from FR-1)
 * - Before/After screenshot + HTML links in tables
 * - Inline voice context when associated
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { extractElementContext, formatElementContext } from './elementContext';

const gunzipAsync = promisify(zlib.gunzip);

/**
 * Session data structure from session.json
 */
interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  actions: AnyAction[];
  voiceRecording?: {
    enabled: boolean;
    model?: string;
    device?: string;
    language?: string;
    duration?: number;
  };
}

/**
 * Base action interface
 */
interface BaseAction {
  id: string;
  timestamp: string;
  type: string;
  tabId?: number;
}

/**
 * Recorded action (click, input, etc.)
 */
interface RecordedAction extends BaseAction {
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown' | 'scroll';
  before: {
    html: string;
    screenshot: string;
    url: string;
    viewport?: { width: number; height: number };
  };
  after: {
    html: string;
    screenshot: string;
    url: string;
    viewport?: { width: number; height: number };
  };
  action: {
    type: string;
    value?: string;
    key?: string;
    x?: number;
    y?: number;
    button?: string;
    modifiers?: string[];
  };
}

/**
 * Navigation action
 */
interface NavigationAction extends BaseAction {
  type: 'navigation';
  navigation: {
    fromUrl: string;
    toUrl: string;
    navigationType: 'initial' | 'link' | 'typed' | 'reload' | 'back' | 'forward' | 'other';
  };
  snapshot?: {
    html: string;
    screenshot: string;
    url: string;
    viewport?: { width: number; height: number };
  };
}

/**
 * Voice transcript action
 */
interface VoiceTranscriptAction extends BaseAction {
  type: 'voice_transcript';
  transcript: {
    text: string;
    fullText?: string;
    startTime: string;
    endTime: string;
    confidence?: number;
  };
  associatedActionId?: string;
}

/**
 * Media action
 */
interface MediaAction extends BaseAction {
  type: 'media';
  media: {
    event: string;
    mediaType: string;
    src?: string;
    currentTime?: number;
    duration?: number;
  };
  snapshot?: {
    screenshot: string;
    html?: string;
  };
}

/**
 * Download action
 */
interface DownloadAction extends BaseAction {
  type: 'download';
  download: {
    url: string;
    suggestedFilename: string;
    state: 'started' | 'completed' | 'failed';
    error?: string;
  };
  snapshot?: {
    screenshot: string;
    html?: string;
  };
}

/**
 * Fullscreen action
 */
interface FullscreenAction extends BaseAction {
  type: 'fullscreen';
  fullscreen: {
    state: 'entered' | 'exited';
    element?: string;
  };
  snapshot?: {
    screenshot: string;
    html?: string;
  };
}

/**
 * Print action
 */
interface PrintAction extends BaseAction {
  type: 'print';
  print: {
    event: 'beforeprint' | 'afterprint';
  };
  snapshot?: {
    screenshot: string;
    html?: string;
  };
}

type AnyAction = RecordedAction | NavigationAction | VoiceTranscriptAction | MediaAction | DownloadAction | FullscreenAction | PrintAction;

/**
 * Format timestamp for display (e.g., "06:19:51 UTC")
 */
function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const mins = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${mins}:${secs} UTC`;
}

/**
 * Format duration for display
 */
function formatDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const totalSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Read HTML snapshot content (handles gzip compression)
 */
async function readSnapshotContent(sessionDir: string, snapshotPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(sessionDir, snapshotPath);

    // Check if file exists (try both compressed and uncompressed)
    let actualPath = fullPath;
    if (!fs.existsSync(actualPath)) {
      // Try with .gz extension
      if (fs.existsSync(fullPath + '.gz')) {
        actualPath = fullPath + '.gz';
      } else if (fullPath.endsWith('.gz') && fs.existsSync(fullPath.replace('.gz', ''))) {
        actualPath = fullPath.replace('.gz', '');
      } else {
        return null;
      }
    }

    const content = fs.readFileSync(actualPath);

    // Decompress if gzipped
    if (actualPath.endsWith('.gz')) {
      const decompressed = await gunzipAsync(content);
      return decompressed.toString('utf-8');
    }

    return content.toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Get action type display name
 */
function getActionTypeName(action: AnyAction): string {
  switch (action.type) {
    case 'click': return 'Click';
    case 'input': return 'Input';
    case 'change': return 'Change';
    case 'submit': return 'Submit';
    case 'keydown': return 'Keydown';
    case 'scroll': return 'Scroll';
    case 'navigation': return 'Navigation';
    case 'voice_transcript': return 'Voice';
    case 'media': return `Media (${(action as MediaAction).media.event})`;
    case 'download': return `Download (${(action as DownloadAction).download.state})`;
    case 'fullscreen': return `Fullscreen (${(action as FullscreenAction).fullscreen.state})`;
    case 'print': return `Print (${(action as PrintAction).print.event})`;
    default: return (action as BaseAction).type;
  }
}

/**
 * Generate markdown for a single action
 */
async function generateActionMarkdown(
  action: AnyAction,
  sessionDir: string,
  voiceByActionId: Map<string, VoiceTranscriptAction[]>
): Promise<string> {
  const lines: string[] = [];
  const timestamp = formatTimestamp(action.timestamp);
  const actionType = getActionTypeName(action);

  lines.push(`### ${timestamp} - ${actionType}`);
  lines.push('');

  // Handle different action types
  if (action.type === 'navigation') {
    const nav = action as NavigationAction;
    if (nav.navigation.navigationType === 'initial') {
      lines.push(`Navigated to **${nav.navigation.toUrl}**`);
    } else {
      lines.push(`Navigated from ${nav.navigation.fromUrl || '(new tab)'} to **${nav.navigation.toUrl}**`);
    }

    // Add snapshot table if available
    if (nav.snapshot) {
      lines.push('');
      lines.push('| Type | Screenshot | HTML Snapshot |');
      lines.push('|------|------------|---------------|');
      lines.push(`| Page | [View](${nav.snapshot.screenshot}) | [View](${nav.snapshot.html}) |`);
    }
  } else if (action.type === 'voice_transcript') {
    const voice = action as VoiceTranscriptAction;
    lines.push(`> ${voice.transcript.text}`);
  } else if (action.type === 'media') {
    const media = action as MediaAction;
    lines.push(`Media **${media.media.event}** on ${media.media.mediaType}`);
    if (media.media.src) {
      lines.push(`Source: ${media.media.src}`);
    }
    if (media.snapshot) {
      lines.push('');
      lines.push(`[Screenshot](${media.snapshot.screenshot})`);
    }
  } else if (action.type === 'download') {
    const download = action as DownloadAction;
    lines.push(`Download **${download.download.state}**: ${download.download.suggestedFilename}`);
    if (download.download.error) {
      lines.push(`Error: ${download.download.error}`);
    }
    if (download.snapshot) {
      lines.push('');
      lines.push(`[Screenshot](${download.snapshot.screenshot})`);
    }
  } else if (action.type === 'fullscreen') {
    const fs = action as FullscreenAction;
    lines.push(`Fullscreen **${fs.fullscreen.state}**${fs.fullscreen.element ? ` (${fs.fullscreen.element})` : ''}`);
    if (fs.snapshot) {
      lines.push('');
      lines.push(`[Screenshot](${fs.snapshot.screenshot})`);
    }
  } else if (action.type === 'print') {
    const print = action as PrintAction;
    lines.push(`Print event: **${print.print.event}**`);
    if (print.snapshot) {
      lines.push('');
      lines.push(`[Screenshot](${print.snapshot.screenshot})`);
    }
  } else {
    // RecordedAction (click, input, etc.)
    const recorded = action as RecordedAction;

    // Try to extract element context from before snapshot
    let elementDescription = 'element';
    const beforeHtml = await readSnapshotContent(sessionDir, recorded.before.html);
    if (beforeHtml) {
      const context = extractElementContext(beforeHtml);
      elementDescription = formatElementContext(context);
    }

    // Format action description
    switch (recorded.type) {
      case 'click':
        lines.push(`Clicked **${elementDescription}**`);
        break;
      case 'input':
        lines.push(`Typed "${recorded.action.value || ''}" into **${elementDescription}**`);
        break;
      case 'change':
        lines.push(`Changed **${elementDescription}**${recorded.action.value ? ` to "${recorded.action.value}"` : ''}`);
        break;
      case 'submit':
        lines.push(`Submitted **${elementDescription}**`);
        break;
      case 'keydown':
        lines.push(`Pressed **${recorded.action.key || 'key'}** on **${elementDescription}**`);
        break;
      case 'scroll':
        lines.push(`Scrolled **${elementDescription}**`);
        break;
      default:
        lines.push(`Interacted with **${elementDescription}**`);
    }

    // Add before/after table
    lines.push('');
    lines.push('| Type | Screenshot | HTML Snapshot |');
    lines.push('|------|------------|---------------|');
    lines.push(`| Before | [View](${recorded.before.screenshot}) | [View](${recorded.before.html}) |`);
    lines.push(`| After | [View](${recorded.after.screenshot}) | [View](${recorded.after.html}) |`);
  }

  // Add associated voice context (FR-3.3)
  const associatedVoice = voiceByActionId.get(action.id);
  if (associatedVoice && associatedVoice.length > 0) {
    lines.push('');
    for (const voice of associatedVoice) {
      lines.push(`> *Voice context*: "${voice.transcript.text}"`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate actions.md content from session data
 */
export async function generateActionsMarkdown(sessionData: SessionData, sessionDir: string): Promise<string> {
  const lines: string[] = [];

  // Header
  lines.push('# Session Actions');
  lines.push('');

  // Metadata
  lines.push(`**Session ID**: ${sessionData.sessionId}`);

  if (sessionData.startTime && sessionData.endTime) {
    const duration = formatDuration(sessionData.startTime, sessionData.endTime);
    const startFormatted = formatTimestamp(sessionData.startTime);
    const endFormatted = formatTimestamp(sessionData.endTime);
    lines.push(`**Duration**: ${duration} (${startFormatted} - ${endFormatted})`);
  }

  // Count non-voice actions
  const nonVoiceActions = sessionData.actions.filter(a => a.type !== 'voice_transcript');
  lines.push(`**Total Actions**: ${nonVoiceActions.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Build map of voice actions by associated action ID
  const voiceByActionId = new Map<string, VoiceTranscriptAction[]>();
  for (const action of sessionData.actions) {
    if (action.type === 'voice_transcript') {
      const voice = action as VoiceTranscriptAction;
      if (voice.associatedActionId) {
        const existing = voiceByActionId.get(voice.associatedActionId) || [];
        existing.push(voice);
        voiceByActionId.set(voice.associatedActionId, existing);
      }
    }
  }

  // Timeline
  lines.push('## Timeline');
  lines.push('');

  // Generate markdown for each action (skip voice-only actions that are associated)
  for (const action of sessionData.actions) {
    // Skip voice transcripts that are associated with other actions
    if (action.type === 'voice_transcript') {
      const voice = action as VoiceTranscriptAction;
      if (voice.associatedActionId) {
        continue; // Will be shown inline with associated action
      }
    }

    const actionMarkdown = await generateActionMarkdown(action, sessionDir, voiceByActionId);
    lines.push(actionMarkdown);
  }

  return lines.join('\n');
}

/**
 * Read session.json and generate actions.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated actions.md, or null if generation fails
 */
export async function generateActionsMarkdownFile(sessionDir: string): Promise<string | null> {
  const sessionJsonPath = path.join(sessionDir, 'session.json');

  // Check if session.json exists
  if (!fs.existsSync(sessionJsonPath)) {
    console.log('📝 No session.json found, skipping actions.md generation');
    return null;
  }

  try {
    // Read session.json
    const sessionData: SessionData = JSON.parse(
      fs.readFileSync(sessionJsonPath, 'utf-8')
    );

    // Generate markdown
    const markdown = await generateActionsMarkdown(sessionData, sessionDir);

    // Write actions.md
    const outputPath = path.join(sessionDir, 'actions.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`📝 Generated actions.md`);
    return outputPath;
  } catch (error) {
    console.error('❌ Failed to generate actions.md:', error);
    return null;
  }
}
