/**
 * TypeScript type definitions for session recording
 */

export interface SessionData {
  sessionId: string;
  startTime: string;  // ISO 8601 UTC
  endTime?: string;   // ISO 8601 UTC
  actions: RecordedAction[];
  resources?: string[];  // List of captured resource SHA1s
}

export interface RecordedAction {
  id: string;
  timestamp: string;  // ISO 8601 UTC
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';

  before: SnapshotWithScreenshot;
  action: ActionDetails;
  after: SnapshotWithScreenshot;
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
