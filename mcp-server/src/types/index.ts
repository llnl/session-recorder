/**
 * Type definitions for Session Search MCP Server
 */

// ============================================
// Session Data Types (from session-recorder)
// ============================================

export type AnyAction =
  | RecordedAction
  | NavigationAction
  | VoiceTranscriptAction
  | PageVisibilityAction
  | MediaAction
  | DownloadAction
  | FullscreenAction
  | PrintAction;

export interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  actions: AnyAction[];
  resources?: string[];
  network?: {
    file: string;
    count: number;
  };
  console?: {
    file: string;
    count: number;
  };
  voiceRecording?: {
    enabled: boolean;
    audioFile?: string;
    transcriptFile?: string;
    model?: string;
    device?: string;
    language?: string;
    duration?: number;
  };
}

export interface RecordedAction {
  id: string;
  timestamp: string;
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';
  tabId: number;
  tabUrl?: string;
  before: SnapshotWithScreenshot;
  action: ActionDetails;
  after: SnapshotWithScreenshot;
  description?: string; // Human-written description
}

export interface NavigationAction {
  id: string;
  timestamp: string;
  type: 'navigation';
  tabId: number;
  navigation: {
    fromUrl: string;
    toUrl: string;
    navigationType: 'initial' | 'link' | 'typed' | 'reload' | 'back_forward' | 'other';
  };
  snapshot?: {
    html: string;
    screenshot: string;
    url: string;
    viewport: { width: number; height: number };
  };
}

export interface VoiceTranscriptAction {
  id: string;
  type: 'voice_transcript';
  timestamp: string;
  transcript: {
    text: string;
    fullText?: string;
    startTime: string;
    endTime: string;
    confidence: number;
    words?: Array<{
      word: string;
      startTime: string;
      endTime: string;
      probability: number;
    }>;
    isPartial?: boolean;
    partIndex?: number;
    totalParts?: number;
  };
  audioFile?: string;
  nearestSnapshotId?: string;
  associatedActionId?: string;
}

export interface PageVisibilityAction {
  id: string;
  type: 'page_visibility';
  timestamp: string;
  tabId: number;
  visibility: {
    state: 'visible' | 'hidden';
    previousState?: 'visible' | 'hidden';
  };
  snapshot?: BrowserEventSnapshot;
}

export interface MediaAction {
  id: string;
  type: 'media';
  timestamp: string;
  tabId: number;
  media: {
    event: 'play' | 'pause' | 'ended' | 'seeked' | 'volumechange';
    mediaType: 'video' | 'audio';
    src?: string;
    currentTime?: number;
    duration?: number;
    volume?: number;
    muted?: boolean;
  };
  snapshot?: BrowserEventSnapshot;
}

export interface DownloadAction {
  id: string;
  type: 'download';
  timestamp: string;
  tabId: number;
  download: {
    url: string;
    suggestedFilename?: string;
    state: 'started' | 'completed' | 'canceled' | 'failed';
    totalBytes?: number;
    receivedBytes?: number;
    error?: string;
  };
  snapshot?: BrowserEventSnapshot;
}

export interface FullscreenAction {
  id: string;
  type: 'fullscreen';
  timestamp: string;
  tabId: number;
  fullscreen: {
    state: 'entered' | 'exited';
    element?: string;
  };
  snapshot?: BrowserEventSnapshot;
}

export interface PrintAction {
  id: string;
  type: 'print';
  timestamp: string;
  tabId: number;
  print: {
    event: 'beforeprint' | 'afterprint';
  };
  snapshot?: BrowserEventSnapshot;
}

export interface BrowserEventSnapshot {
  screenshot: string;
  html?: string;
  url: string;
  viewport: { width: number; height: number };
  timestamp: string;
}

export interface SnapshotWithScreenshot {
  timestamp: string;
  html: string;
  screenshot: string;
  url: string;
  viewport: { width: number; height: number };
}

export interface ActionDetails {
  type: string;
  x?: number;
  y?: number;
  button?: number;
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
  value?: string;
  key?: string;
  timestamp: string;
}

export interface NetworkEntry {
  timestamp: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  contentType: string;
  size: number;
  sha1?: string;
  resourceType: string;
  initiator?: string;
  timing: {
    start: number;
    dns?: number;
    connect?: number;
    ttfb: number;
    download: number;
    total: number;
  };
  fromCache: boolean;
  error?: string;
}

export interface ConsoleEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  timestamp: string;
  args: any[];
  stack?: string;
}

export interface TranscriptData {
  success: boolean;
  text: string;
  segments: Array<{
    id: number;
    text: string;
    start: number;
    end: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      probability: number;
    }>;
  }>;
  language?: string;
  duration?: number;
}

// ============================================
// MCP Tool Response Types
// ============================================

export interface LoadResult {
  sessionId: string;
  duration: number;
  actionCount: number;
  hasVoice: boolean;
  hasDescriptions: boolean;
  hasNotes: boolean;
  urls: string[];
  summary: {
    clicks: number;
    inputs: number;
    navigations: number;
    voiceSegments: number;
  };
}

export type SearchField = 'transcript' | 'descriptions' | 'notes' | 'values' | 'urls';
export type MatchType = 'transcript' | 'description' | 'notes' | 'value' | 'url';

export interface SearchResult {
  actionId: string;
  actionIndex: number;
  matchType: MatchType;
  text: string;
  highlight: string;
  timestamp: string;
  context?: {
    before?: string;
    after?: string;
  };
}

export interface ActionSummary {
  id: string;
  index: number;
  type: string;
  timestamp: string;
  url?: string;
  description?: string;
  value?: string;
}

export interface ActionDetail {
  id: string;
  index: number;
  type: string;
  timestamp: string;
  tabId: number;
  url?: string;
  description?: string;
  action?: ActionDetails;
  voiceContext?: string;
  selector?: string;
  value?: string;
  navigation?: {
    fromUrl: string;
    toUrl: string;
    navigationType: string;
  };
}

export interface UrlFlow {
  url: string;
  firstVisitIndex: number;
  lastVisitIndex: number;
  visitCount: number;
  actionCount: number;
  description?: string;
}

export interface TimelineEntry {
  type: 'action' | 'voice' | 'navigation' | 'error';
  id: string;
  timestamp: string;
  summary: string;
}

export interface ConsoleError {
  level: string;
  message: string;
  timestamp: string;
  nearestActionId?: string;
  stack?: string;
}

export interface NetworkError {
  url: string;
  method: string;
  status: number;
  statusText: string;
  timestamp: string;
  nearestActionId?: string;
}

// ============================================
// Loaded Session Type
// ============================================

export interface LoadedSession {
  sessionId: string;
  session: SessionData;
  transcript?: TranscriptData;
  networkEntries: NetworkEntry[];
  consoleEntries: ConsoleEntry[];
  zipPath: string;
  loadedAt: Date;
}
