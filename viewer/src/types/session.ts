/**
 * TypeScript type definitions for session recording viewer
 * Imported from session-recorder types
 */

export interface StoredResource {
  sha1: string;
  content: string; // base64 for binary, raw for text
  contentType: string;
  size: number;
  timestamp: number;
}

// Union type for all action types
export type AnyAction =
  | RecordedAction
  | NavigationAction
  | VoiceTranscriptAction
  | PageVisibilityAction
  | MediaAction
  | DownloadAction
  | FullscreenAction
  | PrintAction
  | NoteAction;

/**
 * User-created note action
 * Notes are inserted between actions for annotation purposes
 */
export interface NoteAction {
  id: string;
  type: 'note';
  timestamp: string;  // ISO 8601 UTC - when note was created/last edited
  note: {
    /** Markdown content of the note */
    content: string;
    /** ISO 8601 UTC timestamp when note was created */
    createdAt: string;
    /** ISO 8601 UTC timestamp when note was last updated */
    updatedAt: string;
    /** ID of the action this note appears after (null if at the beginning) */
    insertAfterActionId: string | null;
  };
}

/**
 * Type guard to check if an action is a NoteAction
 */
export function isNoteAction(action: AnyAction): action is NoteAction {
  return action.type === 'note';
}

export interface SessionData {
  sessionId: string;
  startTime: string;  // ISO 8601 UTC
  endTime?: string;   // ISO 8601 UTC
  actions: AnyAction[];
  resources?: string[];  // List of captured resource SHA1s
  resourceStorage?: Record<string, StoredResource>; // SHA1-based resource deduplication
  network?: {
    file: string;  // Relative path to network log file: session.network
    count: number; // Number of network requests logged
  };
  console?: {
    file: string;  // Relative path to console log file: session.console
    count: number; // Number of console entries logged
  };
  voiceRecording?: {
    enabled: boolean;
    audioFile?: string;   // Relative path to audio file: audio/recording.wav
    transcriptFile?: string;  // Relative path to transcript: transcript.json
    model?: string;       // Whisper model used
    device?: string;      // Device used (cuda/mps/cpu)
    language?: string;    // Detected language
    duration?: number;    // Total audio duration in seconds
  };
  systemAudioRecording?: {
    enabled: boolean;
    audioFile?: string;   // Relative path to audio file: audio/system.webm
    transcriptFile?: string;  // Relative path to transcript: system-transcript.json
    duration?: number;    // Total audio duration in ms
    chunks?: number;      // Number of audio chunks recorded
  };
}

export interface RecordedAction {
  id: string;
  timestamp: string;  // ISO 8601 UTC
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';

  // Multi-tab support
  tabId?: number;      // Tab index (0-based)
  tabUrl?: string;    // URL of the tab when action occurred

  before: SnapshotWithScreenshot;
  action: ActionDetails;
  after: SnapshotWithScreenshot;
}

export interface NavigationAction {
  id: string;
  timestamp: string;  // ISO 8601 UTC
  type: 'navigation';

  // Multi-tab support
  tabId: number;      // Tab index (0-based)

  navigation: {
    fromUrl: string;   // URL before navigation (empty string for initial load)
    toUrl: string;     // URL navigated to
    navigationType: 'initial' | 'link' | 'typed' | 'reload' | 'back_forward' | 'other';
  };

  // Snapshot of the page after navigation
  snapshot?: {
    html: string;       // Relative path to HTML file: snapshots/nav-1.html
    screenshot: string; // Relative path to screenshot: screenshots/nav-1.png
    url: string;
    viewport: { width: number; height: number };
  };
}

export interface VoiceTranscriptAction {
  id: string;
  type: 'voice_transcript';
  timestamp: string;  // ISO 8601 UTC - when segment started
  transcript: {
    text: string;           // The text for this segment (may be partial if split)
    fullText?: string;      // Original full segment text (only set if split)
    startTime: string;      // ISO 8601 UTC
    endTime: string;        // ISO 8601 UTC
    confidence: number;     // 0-1 probability
    words?: Array<{
      word: string;
      startTime: string;  // ISO 8601 UTC
      endTime: string;    // ISO 8601 UTC
      probability: number;
    }>;
    // Split segment metadata (for action list alignment)
    isPartial?: boolean;    // True if this was split from a larger segment
    partIndex?: number;     // 0, 1, 2... which part of the split
    totalParts?: number;    // Total number of parts this segment was split into
    // Merged segment metadata (for consecutive voice transcript merging)
    mergedSegments?: {
      count: number;           // Number of original segments merged
      originalIds: string[];   // Original segment IDs for debugging
    };
  };
  audioFile?: string;  // Relative path to audio segment
  nearestSnapshotId?: string;
  // Action alignment - which browser action follows this voice segment
  associatedActionId?: string;
  // Source attribution for dual-stream recording (FEAT-04)
  source?: 'voice' | 'system';  // 'voice' for microphone, 'system' for display audio
}

/**
 * Browser event snapshot - screenshot and HTML captured at moment of event
 */
export interface BrowserEventSnapshot {
  screenshot: string;  // Relative path to screenshot: screenshots/visibility-1.png
  html?: string;       // Relative path to HTML file: snapshots/visibility-1.html
  url: string;
  viewport: { width: number; height: number };
  timestamp: string;  // ISO 8601 UTC
}

/**
 * Page visibility change event (tab switch, minimize, etc.)
 */
export interface PageVisibilityAction {
  id: string;
  type: 'page_visibility';
  timestamp: string;  // ISO 8601 UTC
  tabId: number;
  visibility: {
    state: 'visible' | 'hidden';
    previousState?: 'visible' | 'hidden';
  };
  snapshot?: BrowserEventSnapshot;  // Screenshot at moment of visibility change
}

/**
 * Media playback event (video/audio)
 */
export interface MediaAction {
  id: string;
  type: 'media';
  timestamp: string;  // ISO 8601 UTC
  tabId: number;
  media: {
    event: 'play' | 'pause' | 'ended' | 'seeked' | 'volumechange';
    mediaType: 'video' | 'audio';
    src?: string;           // Media source URL
    currentTime?: number;   // Current playback position in seconds
    duration?: number;      // Total duration in seconds
    volume?: number;        // Volume level 0-1
    muted?: boolean;
  };
  snapshot?: BrowserEventSnapshot;  // Screenshot at moment of media event
}

/**
 * Download initiated event
 */
export interface DownloadAction {
  id: string;
  type: 'download';
  timestamp: string;  // ISO 8601 UTC
  tabId: number;
  download: {
    url: string;            // Download URL
    suggestedFilename?: string;
    state: 'started' | 'completed' | 'canceled' | 'failed';
    totalBytes?: number;
    receivedBytes?: number;
    error?: string;
  };
  snapshot?: BrowserEventSnapshot;  // Screenshot at moment of download event
}

/**
 * Fullscreen change event
 */
export interface FullscreenAction {
  id: string;
  type: 'fullscreen';
  timestamp: string;  // ISO 8601 UTC
  tabId: number;
  fullscreen: {
    state: 'entered' | 'exited';
    element?: string;  // Tag name of fullscreen element (e.g., 'VIDEO', 'DIV')
  };
  snapshot?: BrowserEventSnapshot;  // Screenshot at moment of fullscreen change
}

/**
 * Print event (before/after print)
 */
export interface PrintAction {
  id: string;
  type: 'print';
  timestamp: string;  // ISO 8601 UTC
  tabId: number;
  print: {
    event: 'beforeprint' | 'afterprint';
  };
  snapshot?: BrowserEventSnapshot;  // Screenshot at moment of print event
}

export interface SnapshotWithScreenshot {
  timestamp: string;  // ISO 8601 UTC
  html: string;       // Relative path to HTML file: snapshots/action-1-before.html
  screenshot: string; // Relative path to screenshot: screenshots/action-1-before.png
  url: string;
  viewport: { width: number; height: number };
}

export interface ActionDetails {
  type: string;
  x?: number;
  y?: number;
  button?: number; // Mouse button: 0=left, 1=middle, 2=right
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
  // Basic request/response data
  timestamp: string;      // ISO 8601 UTC
  url: string;           // Full request URL
  method: string;        // GET, POST, PUT, DELETE, etc.
  status: number;        // HTTP status code (200, 404, etc.)
  statusText: string;    // "OK", "Not Found", etc.
  contentType: string;   // MIME type
  size: number;          // Response body size in bytes
  sha1?: string;         // SHA1 filename if resource was captured

  // Resource identification
  resourceType: string;  // "document", "stylesheet", "script", "image", "font", "xhr", "fetch", etc.
  initiator?: string;    // What triggered the request (optional)

  // Timing breakdown (all in milliseconds)
  timing: {
    start: number;       // Timestamp when request started (relative to session start)
    dns?: number;        // DNS resolution time (if available)
    connect?: number;    // TCP + SSL connection time (if available)
    ttfb: number;        // Time to first byte (server processing time)
    download: number;    // Time to download response body
    total: number;       // Total request duration
  };

  // Cache information
  fromCache: boolean;    // Was served from browser cache?

  // Error tracking (only present if request failed)
  error?: string;        // Error message if request failed
}

export interface ConsoleEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  timestamp: string;      // ISO 8601 UTC
  args: any[];           // Serialized console arguments
  stack?: string;        // Stack trace for error/warn
}

// Viewer-specific types
export interface TimelineSelection {
  startTime: string;
  endTime: string;
}

export interface LoadedSessionData {
  sessionData: SessionData;
  networkEntries: NetworkEntry[];
  consoleEntries: ConsoleEntry[];
  // Resource blobs loaded from zip or directory
  resources: Map<string, Blob>;
  audioBlob?: Blob;  // Voice audio file (microphone) if voice recording enabled
  systemAudioBlob?: Blob;  // System audio file (display audio) if system audio recording enabled
  // Whether lazy loading is enabled for this session (FR-4.7)
  lazyLoadEnabled?: boolean;
}
