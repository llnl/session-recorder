/**
 * RecordingManager - Manages browser session recording via MCP
 *
 * This class wraps the SessionRecorder to provide a clean interface
 * for MCP tools to control recording sessions.
 */

import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import * as path from 'path';

// Define SessionRecorder interface to match the actual implementation
// This allows TypeScript to know about all methods without importing source files
interface SessionRecorderOptions {
  browser_record?: boolean;
  voice_record?: boolean;
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  whisper_device?: 'cpu' | 'cuda' | 'mps';
}

interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  actions: Array<{ type: string; timestamp: string; [key: string]: unknown }>;
  resources: unknown[];
  voiceRecording?: {
    enabled: boolean;
    model?: string;
    device?: string;
  };
}

interface ISessionRecorder {
  start(page: Page): Promise<void>;
  startVoiceEarly(): Promise<void>;
  stop(): Promise<void>;
  createZip(): Promise<string>;
  getSessionData(): SessionData;
}

// Dynamic import function to load SessionRecorder at runtime
// This avoids TypeScript trying to analyze the parent package source
async function loadSessionRecorder(): Promise<new (sessionId?: string, options?: SessionRecorderOptions) => ISessionRecorder> {
  // Use require to bypass TypeScript's module resolution
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('../../dist/src/index.js');
  return module.SessionRecorder;
}

export interface StartBrowserOptions {
  title?: string;
  url?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

export interface StartVoiceOptions {
  title?: string;
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
}

export interface StartCombinedOptions extends StartBrowserOptions, StartVoiceOptions {}

export interface StartResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  message?: string;
  browserUrl?: string;
  voiceEnabled?: boolean;
  activeSessionId?: string;
}

export interface StopResult {
  success: boolean;
  sessionId?: string;
  zipPath?: string;
  viewerUrl?: string;
  duration?: string;
  error?: string;
  summary?: {
    actionCount: number;
    voiceSegments?: number;
    transcriptPreview?: string;
  };
}

export interface StatusResult {
  isRecording: boolean;
  sessionId?: string;
  mode?: 'browser' | 'voice' | 'combined';
  duration?: string;
  durationMs?: number;
  actionCount?: number;
  voiceEnabled?: boolean;
  currentUrl?: string;
  lastSession?: {
    sessionId: string;
    zipPath: string;
    completedAt: string;
  };
}

interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  mode: 'browser' | 'voice' | 'combined' | null;
  startTime: Date | null;
  browser: Browser | null;
  page: Page | null;
  recorder: ISessionRecorder | null;
}

interface LastSession {
  sessionId: string;
  zipPath: string;
  completedAt: string;
}

// Type for the SessionRecorder constructor
type SessionRecorderConstructor = new (sessionId?: string, options?: SessionRecorderOptions) => ISessionRecorder;

export class RecordingManager {
  private state: RecordingState = {
    isRecording: false,
    sessionId: null,
    mode: null,
    startTime: null,
    browser: null,
    page: null,
    recorder: null,
  };

  private lastSession: LastSession | null = null;
  private outputDir: string;
  private SessionRecorderClass: SessionRecorderConstructor | null = null;

  constructor() {
    // Default output directory - can be overridden via OUTPUT_DIR env var
    this.outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../../dist/output');
  }

  /**
   * Ensure SessionRecorder class is loaded (lazy loading)
   */
  private async ensureSessionRecorderLoaded(): Promise<SessionRecorderConstructor> {
    if (!this.SessionRecorderClass) {
      this.SessionRecorderClass = await loadSessionRecorder();
    }
    return this.SessionRecorderClass;
  }

  async startBrowserRecording(options: StartBrowserOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined,
      };
    }

    try {
      const SessionRecorder = await this.ensureSessionRecorderLoaded();

      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `session-${Date.now()}`;

      const browser = await this.launchBrowser(options.browserType);
      const page = await browser.newPage();

      const recorder = new SessionRecorder(sessionId, {
        browser_record: true,
        voice_record: false,
      });

      await recorder.start(page);

      if (options.url) {
        await page.goto(options.url);
      }

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'browser',
        startTime: new Date(),
        browser,
        page,
        recorder,
      };

      return {
        success: true,
        sessionId,
        message: 'Browser recording started. Interact with the browser, then call stop_recording when done.',
        browserUrl: options.url || page.url(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start browser recording: ${(error as Error).message}`,
      };
    }
  }

  async startVoiceRecording(options: StartVoiceOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined,
      };
    }

    try {
      const SessionRecorder = await this.ensureSessionRecorderLoaded();

      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `voice-${Date.now()}`;

      const recorder = new SessionRecorder(sessionId, {
        browser_record: false,
        voice_record: true,
        whisper_model: options.whisperModel || 'base',
      });

      // Start voice-only recording (no browser page needed)
      await recorder.startVoiceEarly();

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'voice',
        startTime: new Date(),
        browser: null,
        page: null,
        recorder,
      };

      return {
        success: true,
        sessionId,
        message: 'Voice recording started. Speak clearly, then call stop_recording when done.',
        voiceEnabled: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start voice recording: ${(error as Error).message}`,
      };
    }
  }

  async startCombinedRecording(options: StartCombinedOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined,
      };
    }

    try {
      const SessionRecorder = await this.ensureSessionRecorderLoaded();

      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `session-${Date.now()}`;

      const browser = await this.launchBrowser(options.browserType);
      const page = await browser.newPage();

      const recorder = new SessionRecorder(sessionId, {
        browser_record: true,
        voice_record: true,
        whisper_model: options.whisperModel || 'base',
      });

      await recorder.start(page);

      if (options.url) {
        await page.goto(options.url);
      }

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'combined',
        startTime: new Date(),
        browser,
        page,
        recorder,
      };

      return {
        success: true,
        sessionId,
        message: 'Combined recording started. Interact with browser and speak, then call stop_recording when done.',
        browserUrl: options.url || page.url(),
        voiceEnabled: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start combined recording: ${(error as Error).message}`,
      };
    }
  }

  async stopRecording(): Promise<StopResult> {
    if (!this.state.isRecording || !this.state.recorder) {
      return {
        success: false,
        error: 'No active recording to stop.',
      };
    }

    try {
      await this.state.recorder.stop();
      const zipPath = await this.state.recorder.createZip();

      if (this.state.browser) {
        await this.state.browser.close();
      }

      const duration = Date.now() - this.state.startTime!.getTime();
      const sessionId = this.state.sessionId!;
      const sessionData = this.state.recorder.getSessionData();

      // Count voice segments
      const voiceSegments = sessionData.actions?.filter(
        (a: { type: string }) => a.type === 'voice_transcript'
      ).length || 0;

      // Store last session info
      this.lastSession = {
        sessionId,
        zipPath,
        completedAt: new Date().toISOString(),
      };

      // Reset state
      this.state = {
        isRecording: false,
        sessionId: null,
        mode: null,
        startTime: null,
        browser: null,
        page: null,
        recorder: null,
      };

      return {
        success: true,
        sessionId,
        zipPath,
        viewerUrl: `http://localhost:3001?zip=file://${encodeURIComponent(zipPath)}`,
        duration: this.formatDuration(duration),
        summary: {
          actionCount: sessionData.actions?.length || 0,
          voiceSegments: voiceSegments > 0 ? voiceSegments : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stop recording: ${(error as Error).message}`,
      };
    }
  }

  getStatus(): StatusResult {
    if (!this.state.isRecording) {
      return {
        isRecording: false,
        lastSession: this.lastSession || undefined,
      };
    }

    const duration = Date.now() - this.state.startTime!.getTime();
    const sessionData = this.state.recorder?.getSessionData();

    return {
      isRecording: true,
      sessionId: this.state.sessionId!,
      mode: this.state.mode!,
      duration: this.formatDuration(duration),
      durationMs: duration,
      actionCount: sessionData?.actions?.length || 0,
      voiceEnabled: this.state.mode === 'combined' || this.state.mode === 'voice',
      currentUrl: this.state.page?.url() || undefined,
    };
  }

  private async launchBrowser(type: string = 'chromium'): Promise<Browser> {
    // Always launch visible browser - headless makes no sense for recording
    const options = { headless: false };

    switch (type) {
      case 'firefox':
        return await firefox.launch(options);
      case 'webkit':
        return await webkit.launch(options);
      default:
        return await chromium.launch(options);
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
}
