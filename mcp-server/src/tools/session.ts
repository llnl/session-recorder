/**
 * Session Tools - load, unload, summary
 */

import { SessionStore } from '../SessionStore';
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
