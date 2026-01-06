/**
 * Context Tools - timeline and error analysis
 */

import { SessionStore } from '../SessionStore';
import {
  TimelineEntry,
  ConsoleError,
  NetworkError,
  AnyAction,
  RecordedAction,
  NavigationAction,
  VoiceTranscriptAction,
} from '../types';

/**
 * Create a summary text for an action
 */
function createActionSummaryText(action: AnyAction): string {
  switch (action.type) {
    case 'click':
      return 'Clicked on element';
    case 'input':
    case 'change': {
      const recordedAction = action as RecordedAction;
      const value = recordedAction.action?.value;
      if (value) {
        return `Entered: "${value.slice(0, 50)}${value.length > 50 ? '...' : ''}"`;
      }
      return 'Input changed';
    }
    case 'submit':
      return 'Submitted form';
    case 'keydown': {
      const recordedAction = action as RecordedAction;
      return `Pressed key: ${recordedAction.action?.key || 'unknown'}`;
    }
    case 'navigation': {
      const navAction = action as NavigationAction;
      return `Navigated to: ${navAction.navigation.toUrl.slice(0, 50)}`;
    }
    case 'voice_transcript': {
      const voiceAction = action as VoiceTranscriptAction;
      const text = voiceAction.transcript.text;
      return `Said: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
    }
    case 'page_visibility':
      return 'Page visibility changed';
    case 'media':
      return 'Media event';
    case 'download':
      return 'Download started';
    case 'fullscreen':
      return 'Fullscreen changed';
    case 'print':
      return 'Print event';
    default:
      return (action as AnyAction).type;
  }
}

/**
 * Get chronological interleaved timeline of all events
 */
export function sessionGetTimeline(
  store: SessionStore,
  params: {
    sessionId: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }
): { total: number; entries: TimelineEntry[] } {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const entries: TimelineEntry[] = [];

  // Add actions
  for (const action of session.session.actions) {
    let type: TimelineEntry['type'] = 'action';
    if (action.type === 'voice_transcript') {
      type = 'voice';
    } else if (action.type === 'navigation') {
      type = 'navigation';
    }

    entries.push({
      type,
      id: action.id,
      timestamp: action.timestamp,
      summary: createActionSummaryText(action),
    });
  }

  // Add console errors
  for (const entry of session.consoleEntries) {
    if (entry.level === 'error' || entry.level === 'warn') {
      const message = formatConsoleArgs(entry.args);
      entries.push({
        type: 'error',
        id: `console-${entry.timestamp}`,
        timestamp: entry.timestamp,
        summary: `[${entry.level.toUpperCase()}] ${message.slice(0, 100)}`,
      });
    }
  }

  // Add network errors
  for (const entry of session.networkEntries) {
    if (entry.status >= 400) {
      entries.push({
        type: 'error',
        id: `network-${entry.timestamp}`,
        timestamp: entry.timestamp,
        summary: `[HTTP ${entry.status}] ${entry.method} ${entry.url.slice(0, 60)}`,
      });
    }
  }

  // Sort by timestamp
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Filter by time range
  let filteredEntries = entries;
  if (params.startTime) {
    const startTime = new Date(params.startTime).getTime();
    filteredEntries = filteredEntries.filter(
      (e) => new Date(e.timestamp).getTime() >= startTime
    );
  }
  if (params.endTime) {
    const endTime = new Date(params.endTime).getTime();
    filteredEntries = filteredEntries.filter(
      (e) => new Date(e.timestamp).getTime() <= endTime
    );
  }

  const total = filteredEntries.length;
  const offset = params.offset || 0;
  const limit = Math.min(params.limit || 50, 200);

  return {
    total,
    entries: filteredEntries.slice(offset, offset + limit),
  };
}

/**
 * Get all errors (console + network)
 */
export function sessionGetErrors(
  store: SessionStore,
  params: { sessionId: string }
): {
  console: ConsoleError[];
  network: NetworkError[];
  total: number;
} {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  // Get console errors
  const consoleErrors: ConsoleError[] = session.consoleEntries
    .filter((c) => c.level === 'error' || c.level === 'warn')
    .map((c) => ({
      level: c.level,
      message: formatConsoleArgs(c.args).slice(0, 200),
      timestamp: c.timestamp,
      nearestActionId: findNearestActionId(session.session.actions, c.timestamp),
      stack: c.stack,
    }));

  // Get network errors
  const networkErrors: NetworkError[] = session.networkEntries
    .filter((n) => n.status >= 400)
    .map((n) => ({
      url: n.url,
      method: n.method,
      status: n.status,
      statusText: n.statusText,
      timestamp: n.timestamp,
      nearestActionId: findNearestActionId(session.session.actions, n.timestamp),
    }));

  return {
    console: consoleErrors,
    network: networkErrors,
    total: consoleErrors.length + networkErrors.length,
  };
}

/**
 * Find the ID of the action nearest to a timestamp
 */
function findNearestActionId(actions: AnyAction[], timestamp: string): string | undefined {
  const targetTime = new Date(timestamp).getTime();
  let nearest: { id: string; diff: number } | null = null;

  for (const action of actions) {
    const actionTime = new Date(action.timestamp).getTime();
    const diff = Math.abs(actionTime - targetTime);

    if (!nearest || diff < nearest.diff) {
      nearest = { id: action.id, diff };
    }
  }

  return nearest?.id;
}

/**
 * Format console arguments to a string
 */
function formatConsoleArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}
