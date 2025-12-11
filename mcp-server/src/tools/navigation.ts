/**
 * Navigation Tools - browse and navigate session actions
 */

import { SessionStore } from '../SessionStore';
import {
  ActionSummary,
  ActionDetail,
  UrlFlow,
  AnyAction,
  RecordedAction,
  NavigationAction,
  VoiceTranscriptAction,
  LoadedSession,
} from '../types';

/**
 * Create a summary of an action (lightweight representation)
 */
function createActionSummary(action: AnyAction, index: number): ActionSummary {
  const summary: ActionSummary = {
    id: action.id,
    index,
    type: action.type,
    timestamp: action.timestamp,
  };

  // Add URL
  if (action.type === 'navigation') {
    const navAction = action as NavigationAction;
    summary.url = navAction.navigation.toUrl;
  } else if ('before' in action) {
    summary.url = (action as RecordedAction).before?.url;
  }

  // Add description if present
  if ('description' in action && action.description) {
    summary.description = action.description as string;
  }

  // Add value for input actions
  if ('action' in action) {
    const recordedAction = action as RecordedAction;
    if (recordedAction.action?.value) {
      summary.value = recordedAction.action.value;
    }
  }

  return summary;
}

/**
 * Create detailed action information
 */
function createActionDetail(
  action: AnyAction,
  index: number,
  session: LoadedSession
): ActionDetail {
  const detail: ActionDetail = {
    id: action.id,
    index,
    type: action.type,
    timestamp: action.timestamp,
    tabId: 'tabId' in action ? action.tabId : 0,
  };

  // Add URL and action details for recorded actions
  if ('before' in action) {
    const recordedAction = action as RecordedAction;
    detail.url = recordedAction.before?.url;
    detail.action = recordedAction.action;
    detail.value = recordedAction.action?.value;
  }

  // Add navigation details
  if (action.type === 'navigation') {
    const navAction = action as NavigationAction;
    detail.url = navAction.navigation.toUrl;
    detail.navigation = {
      fromUrl: navAction.navigation.fromUrl,
      toUrl: navAction.navigation.toUrl,
      navigationType: navAction.navigation.navigationType,
    };
  }

  // Add description
  if ('description' in action && action.description) {
    detail.description = action.description as string;
  }

  // Add voice context - find nearby voice transcripts
  const voiceContext = getVoiceContext(session, action.timestamp);
  if (voiceContext) {
    detail.voiceContext = voiceContext;
  }

  return detail;
}

/**
 * Get voice transcript text near a timestamp
 */
function getVoiceContext(session: LoadedSession, timestamp: string): string | undefined {
  const targetTime = new Date(timestamp).getTime();
  const windowMs = 10000; // 10 second window

  const voiceActions = session.session.actions.filter(
    (a): a is VoiceTranscriptAction => a.type === 'voice_transcript'
  );

  const nearbyVoice = voiceActions.filter((v) => {
    const voiceTime = new Date(v.timestamp).getTime();
    return Math.abs(voiceTime - targetTime) < windowMs;
  });

  if (nearbyVoice.length > 0) {
    return nearbyVoice.map((v) => v.transcript.text).join(' ');
  }

  return undefined;
}

/**
 * Get filtered list of actions with summaries
 */
export function sessionGetActions(
  store: SessionStore,
  params: {
    sessionId: string;
    types?: string[];
    url?: string;
    startIndex?: number;
    limit?: number;
  }
): { total: number; returned: number; actions: ActionSummary[] } {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  let actions = session.session.actions;

  // Filter by types
  if (params.types && params.types.length > 0) {
    actions = actions.filter((a) => params.types!.includes(a.type));
  }

  // Filter by URL
  if (params.url) {
    actions = actions.filter((a) => {
      let url: string | undefined;
      if (a.type === 'navigation') {
        url = (a as NavigationAction).navigation.toUrl;
      } else if ('before' in a) {
        url = (a as RecordedAction).before?.url;
      }
      return url?.includes(params.url!);
    });
  }

  const total = actions.length;
  const startIndex = params.startIndex || 0;
  const limit = Math.min(params.limit || 20, 100);

  // Map back to original indices before slicing
  const actionsWithIndices = session.session.actions
    .map((a, i) => ({ action: a, index: i }))
    .filter((item) => actions.includes(item.action));

  const paginated = actionsWithIndices.slice(startIndex, startIndex + limit);

  return {
    total,
    returned: paginated.length,
    actions: paginated.map((item) => createActionSummary(item.action, item.index)),
  };
}

/**
 * Get full details of a single action
 */
export function sessionGetAction(
  store: SessionStore,
  params: { sessionId: string; actionId: string }
): ActionDetail {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const index = session.session.actions.findIndex((a) => a.id === params.actionId);
  if (index === -1) {
    throw new Error(`Action not found: ${params.actionId}`);
  }

  const action = session.session.actions[index];
  return createActionDetail(action, index, session);
}

/**
 * Get a range of actions with combined context
 */
export function sessionGetRange(
  store: SessionStore,
  params: { sessionId: string; startId: string; endId: string }
): {
  actions: ActionDetail[];
  combinedTranscript: string;
  combinedNotes: string[];
  descriptions: string[];
  urls: string[];
  duration: number;
} {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const { actions } = session.session;
  const startIdx = actions.findIndex((a) => a.id === params.startId);
  const endIdx = actions.findIndex((a) => a.id === params.endId);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Invalid action ID range');
  }

  const rangeActions = actions.slice(startIdx, endIdx + 1);

  // Collect voice transcripts
  const transcripts: string[] = [];
  for (const action of rangeActions) {
    if (action.type === 'voice_transcript') {
      const voiceAction = action as VoiceTranscriptAction;
      transcripts.push(voiceAction.transcript.text);
    }
  }

  // Collect descriptions
  const descriptions: string[] = [];
  for (const action of rangeActions) {
    if ('description' in action && action.description) {
      descriptions.push(action.description as string);
    }
  }

  // Collect unique URLs
  const urlSet = new Set<string>();
  for (const action of rangeActions) {
    let url: string | undefined;
    if (action.type === 'navigation') {
      url = (action as NavigationAction).navigation.toUrl;
    } else if ('before' in action) {
      url = (action as RecordedAction).before?.url;
    }
    if (url && url !== 'about:blank') {
      urlSet.add(url);
    }
  }

  // Calculate duration
  const startTime = new Date(rangeActions[0].timestamp).getTime();
  const endTime = new Date(rangeActions[rangeActions.length - 1].timestamp).getTime();
  const duration = endTime - startTime;

  return {
    actions: rangeActions.map((a, i) => createActionDetail(a, startIdx + i, session)),
    combinedTranscript: transcripts.join(' '),
    combinedNotes: [], // Notes feature not yet implemented
    descriptions,
    urls: Array.from(urlSet),
    duration,
  };
}

/**
 * Get URL navigation structure
 */
export function sessionGetUrls(
  store: SessionStore,
  params: { sessionId: string }
): UrlFlow[] {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const urlMap = new Map<string, UrlFlow>();

  session.session.actions.forEach((action, index) => {
    let url: string | undefined;

    if (action.type === 'navigation') {
      url = (action as NavigationAction).navigation.toUrl;
    } else if ('before' in action) {
      url = (action as RecordedAction).before?.url;
    }

    if (!url || url === 'about:blank') return;

    const existing = urlMap.get(url);
    if (existing) {
      existing.lastVisitIndex = index;
      existing.visitCount++;
      existing.actionCount++;
    } else {
      urlMap.set(url, {
        url,
        firstVisitIndex: index,
        lastVisitIndex: index,
        visitCount: 1,
        actionCount: 1,
        description: 'description' in action ? (action.description as string) : undefined,
      });
    }
  });

  return Array.from(urlMap.values());
}

/**
 * Get context window around a specific action
 */
export function sessionGetContext(
  store: SessionStore,
  params: {
    sessionId: string;
    actionId: string;
    before?: number;
    after?: number;
  }
): {
  target: ActionDetail;
  before: ActionSummary[];
  after: ActionSummary[];
  voiceContext: string;
  noteContext: string[];
} {
  const session = store.get(params.sessionId);
  if (!session) {
    throw new Error(`Session not loaded: ${params.sessionId}`);
  }

  const { actions } = session.session;
  const targetIdx = actions.findIndex((a) => a.id === params.actionId);
  if (targetIdx === -1) {
    throw new Error(`Action not found: ${params.actionId}`);
  }

  const beforeCount = params.before || 3;
  const afterCount = params.after || 3;

  const startIdx = Math.max(0, targetIdx - beforeCount);
  const endIdx = Math.min(actions.length - 1, targetIdx + afterCount);

  const beforeActions = actions.slice(startIdx, targetIdx);
  const afterActions = actions.slice(targetIdx + 1, endIdx + 1);

  // Collect voice context from the range
  const voiceTexts: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const action = actions[i];
    if (action.type === 'voice_transcript') {
      voiceTexts.push((action as VoiceTranscriptAction).transcript.text);
    }
  }

  return {
    target: createActionDetail(actions[targetIdx], targetIdx, session),
    before: beforeActions.map((a, i) => createActionSummary(a, startIdx + i)),
    after: afterActions.map((a, i) => createActionSummary(a, targetIdx + 1 + i)),
    voiceContext: voiceTexts.join(' '),
    noteContext: [], // Notes feature not yet implemented
  };
}
