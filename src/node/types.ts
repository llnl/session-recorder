/**
 * TypeScript type definitions for session recording
 */

export interface SessionData {
  sessionId: string;
  startTime: string;  // ISO 8601 UTC
  endTime?: string;   // ISO 8601 UTC
  actions: (RecordedAction | VoiceTranscriptAction)[];
  resources?: string[];  // List of captured resource SHA1s
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
}

export interface RecordedAction {
  id: string;
  timestamp: string;  // ISO 8601 UTC
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';

  before: SnapshotWithScreenshot;
  action: ActionDetails;
  after: SnapshotWithScreenshot;
}

export interface VoiceTranscriptAction {
  id: string;
  type: 'voice_transcript';
  timestamp: string;  // ISO 8601 UTC - when segment started
  transcript: {
    text: string;
    startTime: string;  // ISO 8601 UTC
    endTime: string;    // ISO 8601 UTC
    confidence: number; // 0-1 probability
    words?: Array<{
      word: string;
      startTime: string;  // ISO 8601 UTC
      endTime: string;    // ISO 8601 UTC
      probability: number;
    }>;
  };
  audioFile?: string;  // Relative path to audio segment
  nearestSnapshotId?: string;
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
  value?: string;
  key?: string;
  timestamp: string;
}

// Delegate interfaces for HarTracer and Snapshotter integration
export interface HarEntry {
  // Simplified HAR entry structure
  request: {
    method: string;
    url: string;
    headers: any[];
  };
  response: {
    status: number;
    statusText: string;
    headers: any[];
    content: {
      size: number;
      mimeType: string;
      _sha1?: string;
    };
  };
  time: number;
  timings: any;
}

export interface SnapshotterBlob {
  buffer: Buffer;
  sha1: string;
}

/**
 * Enhanced network entry for session.network log (JSON Lines format)
 * Balances debugging capability with implementation simplicity
 */
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

/**
 * Console log entry for session.console log (JSON Lines format)
 * Captures all console output during the session
 */
export interface ConsoleEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  timestamp: string;      // ISO 8601 UTC
  args: any[];           // Serialized console arguments
  stack?: string;        // Stack trace for error/warn
}
