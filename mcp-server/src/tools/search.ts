/**
 * Search Tools - full-text search across session content
 */

import { SessionStore } from '../SessionStore';
import {
  SearchResult,
  SearchField,
  MatchType,
  AnyAction,
  RecordedAction,
  VoiceTranscriptAction,
  NavigationAction,
} from '../types';

// Map search fields to match types (singular form for output)
const fieldToMatchType: Record<SearchField, MatchType> = {
  transcript: 'transcript',
  descriptions: 'description',
  notes: 'notes',
  values: 'value',
  urls: 'url',
};

/**
 * Create a search result with highlighted match
 */
function createSearchResult(
  action: AnyAction,
  index: number,
  searchField: SearchField,
  text: string,
  query: string
): SearchResult {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const matchIndex = textLower.indexOf(queryLower);

  // Create highlight with context
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(text.length, matchIndex + query.length + 50);
  let highlight = text.slice(start, end);
  if (start > 0) highlight = '...' + highlight;
  if (end < text.length) highlight = highlight + '...';

  return {
    actionId: action.id,
    actionIndex: index,
    matchType: fieldToMatchType[searchField],
    text: text.slice(0, 200),
    highlight,
    timestamp: action.timestamp,
  };
}

/**
 * Full-text search across all text content in a session
 */
export function sessionSearch(
  store: SessionStore,
  params: {
    sessionId: string;
    query: string;
    searchIn?: SearchField[];
    limit?: number;
    includeContext?: boolean;
  }
): SearchResult[] {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const results: SearchResult[] = [];
  const searchIn = params.searchIn || ['transcript', 'descriptions', 'notes', 'values', 'urls'];
  const limit = Math.min(params.limit || 10, 50);
  const queryLower = params.query.toLowerCase();

  const { actions } = session.session;

  for (let i = 0; i < actions.length && results.length < limit; i++) {
    const action = actions[i];

    // Search voice transcript
    if (searchIn.includes('transcript') && action.type === 'voice_transcript') {
      const voiceAction = action as VoiceTranscriptAction;
      const text = voiceAction.transcript.text;
      if (text.toLowerCase().includes(queryLower)) {
        results.push(createSearchResult(action, i, 'transcript', text, params.query));
      }
    }

    // Search descriptions
    if (searchIn.includes('descriptions') && 'description' in action && action.description) {
      const text = action.description as string;
      if (text.toLowerCase().includes(queryLower)) {
        results.push(createSearchResult(action, i, 'descriptions', text, params.query));
      }
    }

    // Search input values
    if (searchIn.includes('values') && 'action' in action) {
      const recordedAction = action as RecordedAction;
      const value = recordedAction.action?.value;
      if (value && value.toLowerCase().includes(queryLower)) {
        results.push(createSearchResult(action, i, 'values', value, params.query));
      }
    }

    // Search URLs
    if (searchIn.includes('urls')) {
      let url: string | undefined;
      if (action.type === 'navigation') {
        const navAction = action as NavigationAction;
        url = navAction.navigation.toUrl;
      } else if ('before' in action) {
        url = (action as RecordedAction).before?.url;
      }
      if (url && url.toLowerCase().includes(queryLower)) {
        results.push(createSearchResult(action, i, 'urls', url, params.query));
      }
    }
  }

  // Also search in the full transcript if available
  if (searchIn.includes('transcript') && session.transcript?.text) {
    const text = session.transcript.text;
    if (text.toLowerCase().includes(queryLower) && results.length < limit) {
      // Find the segment that contains the match
      for (const segment of session.transcript.segments || []) {
        if (results.length >= limit) break;
        if (segment.text.toLowerCase().includes(queryLower)) {
          // Find the nearest action
          const nearestAction = findNearestAction(actions, segment.start, session.session.startTime);
          if (nearestAction) {
            results.push({
              actionId: nearestAction.action.id,
              actionIndex: nearestAction.index,
              matchType: 'transcript',
              text: segment.text.slice(0, 200),
              highlight: segment.text,
              timestamp: new Date(
                new Date(session.session.startTime).getTime() + segment.start * 1000
              ).toISOString(),
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Find the action nearest to a given time offset
 */
function findNearestAction(
  actions: AnyAction[],
  timeOffsetSeconds: number,
  sessionStartTime: string
): { action: AnyAction; index: number } | null {
  const targetTime = new Date(sessionStartTime).getTime() + timeOffsetSeconds * 1000;
  let nearest: { action: AnyAction; index: number; diff: number } | null = null;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionTime = new Date(action.timestamp).getTime();
    const diff = Math.abs(actionTime - targetTime);

    if (!nearest || diff < nearest.diff) {
      nearest = { action, index: i, diff };
    }
  }

  return nearest ? { action: nearest.action, index: nearest.index } : null;
}

/**
 * Search network requests
 */
export function sessionSearchNetwork(
  store: SessionStore,
  params: {
    sessionId: string;
    urlPattern?: string;
    method?: string;
    status?: number;
    contentType?: string;
    limit?: number;
  }
): Array<{
  url: string;
  method: string;
  status: number;
  contentType: string;
  size: number;
  timing: { total: number };
  timestamp: string;
  nearestActionId?: string;
}> {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  let requests = [...session.networkEntries];

  // Filter by URL pattern
  if (params.urlPattern) {
    const pattern = new RegExp(params.urlPattern, 'i');
    requests = requests.filter((r) => pattern.test(r.url));
  }

  // Filter by method
  if (params.method) {
    requests = requests.filter((r) => r.method.toUpperCase() === params.method!.toUpperCase());
  }

  // Filter by status
  if (params.status !== undefined) {
    requests = requests.filter((r) => r.status === params.status);
  }

  // Filter by content type
  if (params.contentType) {
    requests = requests.filter((r) => r.contentType.includes(params.contentType!));
  }

  const limit = Math.min(params.limit || 20, 50);

  return requests.slice(0, limit).map((r) => ({
    url: r.url,
    method: r.method,
    status: r.status,
    contentType: r.contentType,
    size: r.size,
    timing: { total: r.timing.total },
    timestamp: r.timestamp,
    nearestActionId: findNearestActionByTimestamp(session.session.actions, r.timestamp)?.id,
  }));
}

/**
 * Search console logs
 */
export function sessionSearchConsole(
  store: SessionStore,
  params: {
    sessionId: string;
    level?: 'error' | 'warn' | 'log' | 'info' | 'debug';
    pattern?: string;
    limit?: number;
  }
): Array<{
  level: string;
  message: string;
  timestamp: string;
  nearestActionId?: string;
  stack?: string;
}> {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  let logs = [...session.consoleEntries];

  // Filter by level
  if (params.level) {
    logs = logs.filter((l) => l.level === params.level);
  }

  // Filter by pattern
  if (params.pattern) {
    const pattern = new RegExp(params.pattern, 'i');
    logs = logs.filter((l) => {
      const message = formatConsoleArgs(l.args);
      return pattern.test(message);
    });
  }

  const limit = Math.min(params.limit || 20, 50);

  return logs.slice(0, limit).map((l) => ({
    level: l.level,
    message: formatConsoleArgs(l.args).slice(0, 300),
    timestamp: l.timestamp,
    nearestActionId: findNearestActionByTimestamp(session.session.actions, l.timestamp)?.id,
    stack: l.stack,
  }));
}

/**
 * Find action nearest to a timestamp
 */
function findNearestActionByTimestamp(
  actions: AnyAction[],
  timestamp: string
): AnyAction | undefined {
  const targetTime = new Date(timestamp).getTime();
  let nearest: { action: AnyAction; diff: number } | null = null;

  for (const action of actions) {
    const actionTime = new Date(action.timestamp).getTime();
    const diff = Math.abs(actionTime - targetTime);

    if (!nearest || diff < nearest.diff) {
      nearest = { action, diff };
    }
  }

  return nearest?.action;
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
