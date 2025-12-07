/**
 * Session Recorder - Main API for recording user actions in Playwright
 */

import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import archiver from 'archiver';
import { SessionData, RecordedAction, HarEntry, SnapshotterBlob, NetworkEntry, ConsoleEntry, VoiceTranscriptAction } from './types';
import { ResourceStorage } from '../storage/resourceStorage';
import { VoiceRecorder } from '../voice/VoiceRecorder';

// Extend Window interface for session recorder flags
declare global {
  interface Window {
    __sessionRecorderLoaded?: boolean;
  }
}

export interface SessionRecorderOptions {
  browser_record?: boolean;  // Capture DOM + actions (default: true)
  voice_record?: boolean;    // Capture audio + transcript (default: false)
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  whisper_device?: 'cuda' | 'mps' | 'cpu';
}

// Track page info for multi-tab support
interface TrackedPage {
  page: Page;
  tabId: number;
  url: string;
}

export class SessionRecorder {
  private page: Page | null = null;  // Primary page (for backward compat)
  private pages: Map<number, TrackedPage> = new Map();  // All tracked pages by tabId
  private nextTabId: number = 0;
  private context: BrowserContext | null = null;
  private sessionData: SessionData;
  private sessionDir: string;
  private actionQueue: Promise<void> = Promise.resolve();
  private currentActionData: any = null; // Temporary storage for action being recorded
  private allResources = new Set<string>(); // Track all captured resources by SHA1
  private resourcesDir: string;
  private urlToResourceMap = new Map<string, string>(); // URL → SHA1 filename mapping
  private networkLogPath: string;
  private networkRequestCount = 0;
  private consoleLogPath: string;
  private consoleLogCount = 0;
  private sessionStartTime: number = 0;
  private resourceStorage: ResourceStorage; // SHA1-based resource deduplication
  private voiceRecorder: VoiceRecorder | null = null;
  private voiceStarted: boolean = false;
  private audioDir: string;
  private options: SessionRecorderOptions;

  constructor(sessionId?: string, options: SessionRecorderOptions = {}) {
    // Validate options - at least one must be true
    const {browser_record: browserRecord, voice_record: voiceRecord} = options;
    console.log('browser_record:', browserRecord, 'voice_record:', voiceRecord);

    if (!browserRecord && !voiceRecord) {
      throw new Error('At least one of browser_record or voice_record must be true');
    }

    this.options = {
      browser_record: browserRecord,
      voice_record: voiceRecord,
      whisper_model: options.whisper_model || 'base',
      whisper_device: options.whisper_device
    }

    this.sessionData = {
      sessionId: sessionId || `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      actions: [],
      resources: []
    };

    const outputDir = path.join(__dirname, '../../output');
    this.sessionDir = path.join(outputDir, this.sessionData.sessionId);
    this.resourcesDir = path.join(this.sessionDir, 'resources');
    this.audioDir = path.join(this.sessionDir, 'audio');
    this.networkLogPath = path.join(this.sessionDir, 'session.network');
    this.consoleLogPath = path.join(this.sessionDir, 'session.console');

    // Initialize resource storage with SHA1 deduplication
    this.resourceStorage = new ResourceStorage(this.sessionData.sessionId);

    // Initialize voice recorder if enabled
    if (this.options.voice_record) {
      this.voiceRecorder = new VoiceRecorder({
        model: this.options.whisper_model,
        device: this.options.whisper_device
      });

      this.sessionData.voiceRecording = {
        enabled: true,
        model: this.options.whisper_model,
        device: this.options.whisper_device
      };
    }
  }

  /**
   * Start voice recording early, before browser is ready.
   * Call this when you want to capture audio during browser launch/connection.
   */
  async startVoiceEarly(): Promise<void> {
    if (!this.options.voice_record || !this.voiceRecorder) {
      return;
    }

    if (this.voiceStarted) {
      return; // Already started
    }

    // Set session start time if not already set
    if (!this.sessionStartTime) {
      this.sessionStartTime = Date.now();
    }

    // Create output directories
    fs.mkdirSync(this.sessionDir, { recursive: true });

    console.log(`🎙️  Starting voice recording early...`);
    await this.voiceRecorder.startRecording(this.audioDir, this.sessionStartTime);
    this.voiceStarted = true;
    console.log(`✅ Voice recording active`);
  }

  async start(page: Page): Promise<void> {
    if (this.page) {
      throw new Error('Recording already started');
    }

    this.page = page;

    // Get browser context for multi-tab support
    this.context = page.context();

    // Set session start time if not already set (voice may have set it earlier)
    if (!this.sessionStartTime) {
      this.sessionStartTime = Date.now();
    }

    // Create output directories
    fs.mkdirSync(this.sessionDir, { recursive: true });

    // Start voice recording if enabled and not already started
    if (this.options.voice_record && this.voiceRecorder && !this.voiceStarted) {
      console.log(`🎙️  Initializing voice recording...`);
      await this.voiceRecorder.startRecording(this.audioDir, this.sessionStartTime);
      this.voiceStarted = true;
      console.log(`✅ Voice recording is ready - proceeding with browser setup`);
    }

    if (this.options.browser_record) {
      fs.mkdirSync(path.join(this.sessionDir, 'screenshots'), { recursive: true });
      fs.mkdirSync(path.join(this.sessionDir, 'snapshots'), { recursive: true });
      fs.mkdirSync(this.resourcesDir, { recursive: true });

      // Create network log file (JSON Lines format)
      fs.writeFileSync(this.networkLogPath, '', 'utf-8');

      // Create console log file (JSON Lines format)
      fs.writeFileSync(this.consoleLogPath, '', 'utf-8');

      // Attach to the initial page
      await this._attachToPage(page);

      // Listen for new pages (tabs) being opened
      this.context.on('page', async (newPage) => {
        console.log(`📑 New tab detected: ${newPage.url() || '(loading...)'}`);
        await this._attachToPage(newPage);
      });

      console.log(`📹 Browser recording started: ${this.sessionData.sessionId}`);
    }

    console.log(`📹 Session recording started: ${this.sessionData.sessionId}`);
    console.log(`   Browser: ${this.options.browser_record ? '✅' : '❌'}`);
    console.log(`   Voice: ${this.options.voice_record ? '✅' : '❌'}`);
    console.log(`📁 Output: ${this.sessionDir}`);
  }

  /**
   * Attach recording to a page (tab)
   * Sets up event handlers, exposes callbacks, and injects browser-side code
   */
  private async _attachToPage(page: Page): Promise<number> {
    const tabId = this.nextTabId++;
    const tabUrl = page.url();

    // Track this page
    this.pages.set(tabId, { page, tabId, url: tabUrl });

    console.log(`📑 Attaching to tab ${tabId}: ${tabUrl || '(blank)'}`);

    // Setup network resource capture for this page
    page.on('response', async (response) => {
      await this._handleNetworkResponse(response);
    });

    // Update tab URL when page navigates
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const tracked = this.pages.get(tabId);
        if (tracked) {
          tracked.url = page.url();
        }
      }
    });

    // Remove page from tracking when closed
    page.on('close', () => {
      console.log(`📑 Tab ${tabId} closed`);
      this.pages.delete(tabId);
    });

    // Read compiled browser-side code
    // When running from source (ts-node), __dirname is src/node/
    // When running compiled, __dirname is dist/src/node/
    // Browser code is always compiled JS in dist/src/browser/
    let browserDir = path.join(__dirname, '../browser');
    if (!fs.existsSync(path.join(browserDir, 'snapshotCapture.js'))) {
      // Running from source, use dist/ directory
      browserDir = path.join(__dirname, '../../dist/src/browser');
    }

    const snapshotCaptureCode = fs.readFileSync(
      path.join(browserDir, 'snapshotCapture.js'),
      'utf-8'
    );
    const actionListenerCode = fs.readFileSync(
      path.join(browserDir, 'actionListener.js'),
      'utf-8'
    );
    const consoleCaptureCode = fs.readFileSync(
      path.join(browserDir, 'consoleCapture.js'),
      'utf-8'
    );
    const injectedCode = fs.readFileSync(
      path.join(browserDir, 'injected.js'),
      'utf-8'
    );

    // Bundle and inject browser-side code
    // Wrapped in IIFE so we can use early return for guard clauses
    const fullInjectedCode = `
      (function() {
        // Skip if already loaded (prevents double-injection)
        if (window.__sessionRecorderLoaded) {
          console.log('⏩ Session recorder already loaded, skipping...');
          return;
        }

        console.log('🎬 Starting session recorder injection...');

      try {
        // Snapshot capture module
        (function() {
          console.log('Loading snapshot capture module...');
          ${snapshotCaptureCode.replace(/exports\.\w+\s*=/g, '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}
          window.__snapshotCapture = { captureSnapshot: createSnapshotCapture().captureSnapshot };
          console.log('✅ Snapshot capture loaded');
        })();

        // Action listener module
        (function() {
          console.log('Loading action listener module...');
          ${actionListenerCode.replace(/exports\.\w+\s*=/g, '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}
          window.__actionListener = { setupActionListeners };
          console.log('✅ Action listener loaded');
        })();

        // Console capture module
        (function() {
          console.log('Loading console capture module...');
          ${consoleCaptureCode.replace(/exports\.\w+\s*=/g, '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}
          window.__consoleCapture = createConsoleCapture();
          console.log('✅ Console capture loaded');
        })();

        // Main coordinator
        console.log('Loading main coordinator...');
        ${injectedCode.replace('"use strict";', '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}

        // Mark as loaded to prevent duplicate injection
        window.__sessionRecorderLoaded = true;
        console.log('✅ Session recorder fully loaded');
      } catch (err) {
        console.error('❌ Session recorder injection failed:', err);
      }
      })();
    `;

    // Expose callbacks BEFORE injecting code - capture tabId in closure
    // These need to be available when the injected code runs
    try {
      await page.exposeFunction('__recordActionBefore', async (data: any) => {
        this.actionQueue = this.actionQueue.then(() =>
          this._handleActionBefore(data, tabId, page.url())
        );
      });
    } catch (e: any) {
      // Function might already be exposed from a previous attachment attempt
      if (!e.message?.includes('already been registered')) throw e;
    }

    try {
      await page.exposeFunction('__recordActionAfter', async (data: any) => {
        this.actionQueue = this.actionQueue.then(() =>
          this._handleActionAfter(data, tabId, page.url())
        );
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    try {
      await page.exposeFunction('__recordConsoleLog', async (entry: ConsoleEntry) => {
        this._handleConsoleLog(entry);
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Add init script for future navigations
    await page.addInitScript(fullInjectedCode);

    // Also inject immediately for already-loaded pages
    // page.evaluate() uses CDP which bypasses CSP restrictions
    try {
      const alreadyLoaded = await page.evaluate(() => {
        return document.readyState !== 'loading' && !window.__sessionRecorderLoaded;
      });

      if (alreadyLoaded) {
        console.log(`📑 [Tab ${tabId}] Injecting code into already-loaded page...`);
        await page.evaluate(fullInjectedCode);
      }
    } catch (e: any) {
      // Page might be closed or in a weird state
      console.log(`⚠️ [Tab ${tabId}] Could not inject immediately: ${e.message}`);
    }

    return tabId;
  }

  private async _handleActionBefore(data: any, tabId: number = 0, tabUrl?: string): Promise<void> {
    // Find the page for this tab
    const tracked = this.pages.get(tabId);
    const page = tracked?.page || this.page;
    if (!page) return;

    // Check if page is still open
    if (page.isClosed()) {
      console.log(`⚠️ [Tab ${tabId}] Page closed, skipping action capture`);
      return;
    }

    const actionId = `action-${this.sessionData.actions.length + 1}`;

    // Process snapshot resources (CSS, images from extractResources())
    if (data.beforeResourceOverrides && data.beforeResourceOverrides.length > 0) {
      await this._processSnapshotResources(data.beforeResourceOverrides);
    }

    // Rewrite HTML to reference local resources
    const rewrittenHtml = this._rewriteHTML(data.beforeHtml, data.beforeUrl);

    // Save BEFORE HTML snapshot as separate file
    const beforeSnapshotPath = path.join(
      this.sessionDir,
      'snapshots',
      `${actionId}-before.html`
    );
    fs.writeFileSync(beforeSnapshotPath, rewrittenHtml, 'utf-8');

    // Take BEFORE screenshot
    const beforeScreenshotPath = path.join(
      this.sessionDir,
      'screenshots',
      `${actionId}-before.png`
    );

    try {
      await page.screenshot({
        path: beforeScreenshotPath,
        type: 'png'
      });
    } catch (err: any) {
      if (err.message?.includes('closed') || err.message?.includes('Target')) {
        console.log(`⚠️ [Tab ${tabId}] Page closed during screenshot, skipping`);
        return;
      }
      throw err;
    }

    // Store partial action data (with file paths, not inline HTML)
    this.currentActionData = {
      id: actionId,
      timestamp: data.action.timestamp,
      type: data.action.type,
      tabId: tabId,  // Multi-tab support
      tabUrl: tabUrl || data.beforeUrl,  // Multi-tab support
      before: {
        timestamp: data.beforeTimestamp,
        html: `snapshots/${actionId}-before.html`,  // File path instead of HTML string
        screenshot: `screenshots/${actionId}-before.png`,
        url: data.beforeUrl,
        viewport: data.beforeViewport
      },
      action: {
        type: data.action.type,
        x: data.action.x,
        y: data.action.y,
        value: data.action.value,
        key: data.action.key,
        timestamp: data.action.timestamp
      }
    };

    console.log(`📸 [Tab ${tabId}] Captured BEFORE: ${data.action.type}`);
  }

  private async _handleActionAfter(data: any, tabId: number = 0, _tabUrl?: string): Promise<void> {
    if (!this.currentActionData) return;

    // Find the page for this tab
    const tracked = this.pages.get(tabId);
    const page = tracked?.page || this.page;
    if (!page) return;

    // Check if page is still open
    if (page.isClosed()) {
      console.log(`⚠️ [Tab ${tabId}] Page closed, skipping after capture`);
      this.currentActionData = null;
      return;
    }

    const actionId = this.currentActionData.id;

    // Process snapshot resources (CSS, images from extractResources())
    if (data.afterResourceOverrides && data.afterResourceOverrides.length > 0) {
      await this._processSnapshotResources(data.afterResourceOverrides);
    }

    // Rewrite HTML to reference local resources
    const rewrittenHtml = this._rewriteHTML(data.afterHtml, data.afterUrl);

    // Save AFTER HTML snapshot as separate file
    const afterSnapshotPath = path.join(
      this.sessionDir,
      'snapshots',
      `${actionId}-after.html`
    );
    fs.writeFileSync(afterSnapshotPath, rewrittenHtml, 'utf-8');

    // Take AFTER screenshot
    const afterScreenshotPath = path.join(
      this.sessionDir,
      'screenshots',
      `${actionId}-after.png`
    );

    try {
      await page.screenshot({
        path: afterScreenshotPath,
        type: 'png'
      });
    } catch (err: any) {
      if (err.message?.includes('closed') || err.message?.includes('Target')) {
        console.log(`⚠️ [Tab ${tabId}] Page closed during screenshot, skipping`);
        this.currentActionData = null;
        return;
      }
      throw err;
    }

    // Complete action data (with file path, not inline HTML)
    this.currentActionData.after = {
      timestamp: data.afterTimestamp,
      html: `snapshots/${actionId}-after.html`,  // File path instead of HTML string
      screenshot: `screenshots/${actionId}-after.png`,
      url: data.afterUrl,
      viewport: data.afterViewport
    };

    // Add to session
    this.sessionData.actions.push(this.currentActionData);

    console.log(`✅ [Tab ${tabId}] Recorded action #${this.sessionData.actions.length}: ${this.currentActionData.type}`);

    this.currentActionData = null;
  }

  async stop(): Promise<void> {
    if (!this.page) {
      console.warn('Recording not started');
      return;
    }

    // Wait for any pending actions to complete
    await this.actionQueue;

    // Stop voice recording if enabled
    if (this.options.voice_record && this.voiceRecorder) {
      console.log('🎙️  Stopping voice recording...');
      const transcript = await this.voiceRecorder.stopRecording();

      if (transcript && transcript.success) {
        console.log(`✅ Transcription successful: ${transcript.text?.slice(0, 100)}...`);

        // Save full transcript as JSON
        const transcriptPath = path.join(this.sessionDir, 'transcript.json');
        fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2), 'utf-8');

        // Update session metadata
        if (this.sessionData.voiceRecording) {
          this.sessionData.voiceRecording.audioFile = 'audio/recording.wav';
          this.sessionData.voiceRecording.transcriptFile = 'transcript.json';
          this.sessionData.voiceRecording.language = transcript.language;
          this.sessionData.voiceRecording.duration = transcript.duration;
          this.sessionData.voiceRecording.device = transcript.device;
        }

        // Convert transcript to voice actions and merge with browser actions
        const voiceActions = this.voiceRecorder.convertToVoiceActions(
          transcript,
          'audio/recording.wav',
          (timestamp: string) => this._findNearestSnapshot(timestamp)
        );

        // Merge and sort all actions chronologically
        const allActions = [...this.sessionData.actions, ...voiceActions];
        allActions.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        this.sessionData.actions = allActions;

        console.log(`🎙️  Added ${voiceActions.length} voice transcript segments`);
      } else {
        console.error(`❌ Transcription failed: ${transcript?.error || 'Unknown error'}`);
      }
    }

    this.sessionData.endTime = new Date().toISOString();

    // Add network metadata (only if browser recording enabled)
    if (this.options.browser_record && this.networkRequestCount > 0) {
      this.sessionData.network = {
        file: 'session.network',
        count: this.networkRequestCount
      };
    }

    // Add console metadata (only if browser recording enabled)
    if (this.options.browser_record && this.consoleLogCount > 0) {
      this.sessionData.console = {
        file: 'session.console',
        count: this.consoleLogCount
      };
    }

    // Save session.json with resource storage data
    const sessionJsonPath = path.join(this.sessionDir, 'session.json');
    const sessionDataWithResources = this.options.browser_record ? {
      ...this.sessionData,
      resourceStorage: this.resourceStorage.exportToJSON()
    } : this.sessionData;

    fs.writeFileSync(
      sessionJsonPath,
      JSON.stringify(sessionDataWithResources, null, 2),
      'utf-8'
    );

    // Log session statistics
    console.log(`🛑 Recording stopped`);
    console.log(`📊 Total actions: ${this.sessionData.actions.length}`);

    if (this.options.browser_record) {
      const stats = this.resourceStorage.getStats();
      console.log(`📦 Total resources: ${this.allResources.size}`);
      console.log(`   - Unique resources: ${stats.resourceCount}`);
      console.log(`   - Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`   - Deduplication: ${stats.deduplicationRatio.toFixed(1)}% savings`);
      console.log(`🌐 Network requests: ${this.networkRequestCount}`);
    }

    if (this.options.voice_record && this.sessionData.voiceRecording) {
      const voiceCount = this.sessionData.actions.filter(
        (a): a is VoiceTranscriptAction => a.type === 'voice_transcript'
      ).length;
      console.log(`🎙️  Voice segments: ${voiceCount}`);
      console.log(`   - Language: ${this.sessionData.voiceRecording.language || 'unknown'}`);
      console.log(`   - Duration: ${this.sessionData.voiceRecording.duration?.toFixed(1) || 0}s`);
      console.log(`   - Model: ${this.sessionData.voiceRecording.model}`);
      console.log(`   - Device: ${this.sessionData.voiceRecording.device}`);
    }

    console.log(`📄 Session data: ${sessionJsonPath}`);

    this.page = null;
  }

  /**
   * Find the nearest snapshot action to a given timestamp
   */
  private _findNearestSnapshot(timestamp: string): string | undefined {
    const targetTime = new Date(timestamp).getTime();
    let nearest: RecordedAction | undefined;
    let minDiff = Infinity;

    for (const action of this.sessionData.actions) {
      if (action.type === 'voice_transcript') continue;

      const actionTime = new Date(action.timestamp).getTime();
      const diff = Math.abs(targetTime - actionTime);

      if (diff < minDiff) {
        minDiff = diff;
        nearest = action as RecordedAction;
      }
    }

    return nearest?.id;
  }

  /**
   * Create a zip file of the recorded session
   * @returns Promise<string> - Path to the created zip file
   */
  async createZip(): Promise<string> {
    const outputDir = path.dirname(this.sessionDir);
    const zipPath = path.join(outputDir, `${this.sessionData.sessionId}.zip`);

    return new Promise((resolve, reject) => {
      // Create a file to stream archive data to
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Listen for all archive data to be written
      output.on('close', () => {
        console.log(`📦 Created zip file: ${zipPath}`);
        console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve(zipPath);
      });

      // Handle warnings
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('⚠️  Zip warning:', err);
        } else {
          reject(err);
        }
      });

      // Handle errors
      archive.on('error', (err) => {
        reject(err);
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add the entire session directory to the zip (with false to put files at root level)
      archive.directory(this.sessionDir, false);

      // Finalize the archive
      archive.finalize();
    });
  }

  /**
   * Attach to all existing pages in the browser context
   * Call this after start() when connecting to an existing browser with multiple tabs
   */
  async attachToExistingPages(): Promise<void> {
    if (!this.context || !this.options.browser_record) {
      return;
    }

    const pages = this.context.pages();
    console.log(`📑 Found ${pages.length} existing page(s) in context`);

    for (const page of pages) {
      // Skip if already tracked (the page passed to start())
      const alreadyTracked = Array.from(this.pages.values()).some(t => t.page === page);
      if (!alreadyTracked) {
        await this._attachToPage(page);
      }
    }
  }

  /**
   * Get the number of tracked pages (tabs)
   */
  getTrackedPageCount(): number {
    return this.pages.size;
  }

  getSessionDir(): string {
    return this.sessionDir;
  }

  getSessionData(): SessionData {
    return this.sessionData;
  }

  getSummary(): any {
    return {
      sessionId: this.sessionData.sessionId,
      duration: this.sessionData.endTime
        ? new Date(this.sessionData.endTime).getTime() - new Date(this.sessionData.startTime).getTime()
        : null,
      totalActions: this.sessionData.actions.length,
      totalResources: this.allResources.size,
      actions: this.sessionData.actions.map(a => {
        if (a.type === 'voice_transcript') {
          return {
            id: a.id,
            type: a.type,
            timestamp: a.timestamp,
            text: a.transcript.text.slice(0, 100)
          };
        }
        return {
          id: a.id,
          type: a.type,
          timestamp: a.timestamp,
          url: a.after.url
        };
      })
    };
  }

  // ============================================================================
  // Resource Capture Methods (HarTracer-style)
  // ============================================================================

  /**
   * Process resources extracted from snapshot capture (CSS, images)
   * Stores them using ResourceStorage with SHA1 deduplication
   */
  private async _processSnapshotResources(resourceOverrides: any[]): Promise<void> {
    for (const resource of resourceOverrides) {
      try {
        // Store resource using ResourceStorage (with SHA1 deduplication)
        const sha1 = await this.resourceStorage.storeResource(
          resource.url,
          resource.content,
          resource.contentType
        );

        // Map URL to SHA1 for HTML rewriting
        const filename = sha1; // SHA1 already includes extension
        this.urlToResourceMap.set(resource.url, filename);
        this.allResources.add(sha1);

        // Write resource to disk
        const resourcePath = path.join(this.resourcesDir, filename);
        const storedResource = this.resourceStorage.getResource(sha1);
        if (storedResource) {
          // Decode content based on type
          const buffer = storedResource.contentType.startsWith('text/') ||
                        storedResource.contentType === 'application/javascript' ||
                        storedResource.contentType === 'application/json' ||
                        storedResource.contentType === 'image/svg+xml'
            ? Buffer.from(storedResource.content, 'utf8')
            : Buffer.from(storedResource.content, 'base64');

          fs.writeFileSync(resourcePath, buffer);
          console.log(`📦 Stored snapshot resource: ${filename} (${resource.size} bytes) - ${resource.contentType}`);
        }
      } catch (error) {
        console.warn(`[SessionRecorder] Failed to process snapshot resource ${resource.url}:`, error);
      }
    }
  }

  /**
   * Handle network responses - captures resources like HarTracer does
   */
  private async _handleNetworkResponse(response: any): Promise<void> {
    try {
      const status = response.status();
      const statusText = response.statusText();
      const contentType = response.headers()['content-type'] || '';
      const url = response.url();
      const request = response.request();

      // Skip data URLs
      if (url.startsWith('data:')) return;

      // Get timing data
      const timing = request.timing();
      const requestStartTime = Date.now(); // Approximate - Playwright doesn't expose exact time
      const relativeStartTime = requestStartTime - this.sessionStartTime;

      // Calculate timing breakdown (all in milliseconds)
      const timingBreakdown = {
        start: relativeStartTime,
        dns: timing?.domainLookupEnd && timing?.domainLookupStart && timing.domainLookupEnd > 0
          ? timing.domainLookupEnd - timing.domainLookupStart
          : undefined,
        connect: timing?.connectEnd && timing?.connectStart && timing.connectEnd > 0
          ? timing.connectEnd - timing.connectStart
          : undefined,
        ttfb: timing?.responseStart && timing?.requestStart && timing.responseStart > 0
          ? timing.responseStart - timing.requestStart
          : 0,
        download: timing?.responseEnd && timing?.responseStart && timing.responseEnd > 0
          ? timing.responseEnd - timing.responseStart
          : 0,
        total: timing?.responseEnd && timing?.startTime && timing.responseEnd > 0 && timing.startTime > 0
          ? timing.responseEnd - timing.startTime
          : 0
      };

      // Get resource type
      const resourceType = request.resourceType();

      // Check if from cache (may not be available for all response types)
      let fromCache = false;
      try {
        fromCache = typeof response.fromCache === 'function' ? response.fromCache() : false;
      } catch {
        fromCache = false;
      }

      // Try to get response body for successful responses
      let buffer: Buffer | null = null;
      let sha1: string | undefined = undefined;
      let filename: string | undefined = undefined;

      // Only capture successful responses with body content
      if (status >= 200 && status < 400) {
        const shouldCapture =
          contentType.includes('text/css') ||
          contentType.includes('javascript') ||
          contentType.includes('image/') ||
          contentType.includes('font/') ||
          contentType.includes('application/font') ||
          contentType.includes('text/html') ||
          contentType.includes('application/json');

        if (shouldCapture) {
          buffer = await response.body().catch(() => null);
          if (buffer) {
            // Calculate SHA1 hash (like HarTracer does)
            sha1 = this._calculateSha1(buffer);
            const extension = this._getExtensionFromContentType(contentType, url);
            filename = `${sha1}${extension}`;

            // Store URL → filename mapping for rewriting
            this.urlToResourceMap.set(url, filename);

            // Save via onContentBlob (mimics HarTracer delegate pattern)
            this.onContentBlob(filename, buffer);

            // If CSS, also rewrite and save rewritten version
            if (contentType.includes('text/css')) {
              const cssContent = buffer.toString('utf-8');
              const rewrittenCSS = this._rewriteCSS(cssContent, url);
              const rewrittenBuffer = Buffer.from(rewrittenCSS, 'utf-8');
              fs.writeFileSync(path.join(this.resourcesDir, filename), rewrittenBuffer);
            }

            console.log(`📦 Captured resource: ${filename} (${buffer.length} bytes) - ${contentType}`);
          }
        }
      }

      // Create network entry for logging
      const networkEntry: NetworkEntry = {
        timestamp: new Date().toISOString(),
        url: url,
        method: request.method(),
        status: status,
        statusText: statusText,
        contentType: contentType,
        size: buffer ? buffer.length : 0,
        sha1: filename,
        resourceType: resourceType,
        initiator: request.frame()?.url() || undefined,
        timing: timingBreakdown,
        fromCache: fromCache,
        error: status >= 400 ? statusText : undefined
      };

      // Write network entry to log file (JSON Lines format)
      fs.appendFileSync(this.networkLogPath, JSON.stringify(networkEntry) + '\n', 'utf-8');
      this.networkRequestCount++;

    } catch (err) {
      // Silently ignore errors (some responses may not have bodies)
    }
  }

  /**
   * Handle console logs from the browser
   */
  private _handleConsoleLog(entry: ConsoleEntry): void {
    try {
      // Write console entry to log file (JSON Lines format)
      fs.appendFileSync(this.consoleLogPath, JSON.stringify(entry) + '\n', 'utf-8');
      this.consoleLogCount++;
    } catch (err) {
      console.error('Failed to write console log:', err);
    }
  }

  /**
   * HarTracerDelegate: onContentBlob - Save network response bodies
   */
  onContentBlob(sha1: string, buffer: Buffer): void {
    if (this.allResources.has(sha1)) {
      return; // Already saved (deduplication)
    }

    this.allResources.add(sha1);

    const resourcePath = path.join(this.resourcesDir, sha1);
    fs.writeFileSync(resourcePath, buffer);

    // Track in session data
    if (this.sessionData.resources) {
      this.sessionData.resources.push(sha1);
    }
  }

  /**
   * HarTracerDelegate: onEntryStarted (optional - for HAR metadata)
   */
  onEntryStarted(entry: HarEntry): void {
    // Optional: Track when network requests start
  }

  /**
   * HarTracerDelegate: onEntryFinished (optional - for HAR metadata)
   */
  onEntryFinished(entry: HarEntry): void {
    // Optional: Store HAR entry metadata
    // entry.response.content._sha1 contains the resource filename
  }

  /**
   * SnapshotterDelegate: onSnapshotterBlob - Save snapshot-related resources
   */
  onSnapshotterBlob(blob: SnapshotterBlob): void {
    this.onContentBlob(blob.sha1, blob.buffer);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate SHA1 hash of buffer (like Playwright's calculateSha1)
   */
  private _calculateSha1(buffer: Buffer): string {
    return crypto.createHash('sha1').update(buffer).digest('hex');
  }

  /**
   * Get file extension from content type and URL
   */
  private _getExtensionFromContentType(contentType: string, url: string): string {
    // Try to get extension from content type
    if (contentType.includes('text/css')) return '.css';
    if (contentType.includes('javascript')) return '.js';
    if (contentType.includes('image/png')) return '.png';
    if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) return '.jpg';
    if (contentType.includes('image/svg')) return '.svg';
    if (contentType.includes('image/webp')) return '.webp';
    if (contentType.includes('image/gif')) return '.gif';
    if (contentType.includes('font/woff2')) return '.woff2';
    if (contentType.includes('font/woff')) return '.woff';
    if (contentType.includes('font/ttf')) return '.ttf';
    if (contentType.includes('text/html')) return '.html';
    if (contentType.includes('application/json')) return '.json';

    // Try to get extension from URL
    const urlExt = path.extname(url);
    if (urlExt) return urlExt;

    // Default
    return '.dat';
  }

  // ============================================================================
  // URL Rewriting Methods
  // ============================================================================

  /**
   * Rewrite HTML to reference local resources
   */
  private _rewriteHTML(html: string, baseUrl: string): string {
    let rewritten = html;

    // Rewrite <link> stylesheets
    rewritten = rewritten.replace(
      /<link([^>]*?)href=["']([^"']+)["']/g,
      (match, attrs, href) => {
        const absoluteUrl = this._resolveUrl(href, baseUrl);
        const localPath = this.urlToResourceMap.get(absoluteUrl);
        if (localPath) {
          return `<link${attrs}href="../resources/${localPath}"`;
        }
        return match;
      }
    );

    // Rewrite <script> sources
    rewritten = rewritten.replace(
      /<script([^>]*?)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const absoluteUrl = this._resolveUrl(src, baseUrl);
        const localPath = this.urlToResourceMap.get(absoluteUrl);
        if (localPath) {
          return `<script${attrs}src="../resources/${localPath}"`;
        }
        return match;
      }
    );

    // Rewrite <img> sources
    rewritten = rewritten.replace(
      /<img([^>]*?)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const absoluteUrl = this._resolveUrl(src, baseUrl);
        const localPath = this.urlToResourceMap.get(absoluteUrl);
        if (localPath) {
          return `<img${attrs}src="../resources/${localPath}"`;
        }
        return match;
      }
    );

    // Rewrite <source> srcset (for <picture> and <video>)
    rewritten = rewritten.replace(
      /<source([^>]*?)srcset=["']([^"']+)["']/g,
      (match, attrs, srcset) => {
        const absoluteUrl = this._resolveUrl(srcset, baseUrl);
        const localPath = this.urlToResourceMap.get(absoluteUrl);
        if (localPath) {
          return `<source${attrs}srcset="../resources/${localPath}"`;
        }
        return match;
      }
    );

    // Rewrite style attributes with url()
    rewritten = rewritten.replace(
      /style=["']([^"']*?)["']/g,
      (match, styleContent) => {
        const rewrittenStyle = this._rewriteCSSUrls(styleContent, baseUrl);
        return `style="${rewrittenStyle}"`;
      }
    );

    // Rewrite inline <style> tag content (fixes font and background-image URLs)
    rewritten = rewritten.replace(
      /<style([^>]*)>([\s\S]*?)<\/style>/gi,
      (match, attrs, content) => {
        const rewrittenContent = this._rewriteCSSUrls(content, baseUrl);
        return `<style${attrs}>${rewrittenContent}</style>`;
      }
    );

    return rewritten;
  }

  /**
   * Rewrite CSS file to reference local resources
   */
  private _rewriteCSS(css: string, baseUrl: string): string {
    return this._rewriteCSSUrls(css, baseUrl);
  }

  /**
   * Rewrite url() references in CSS content
   * Handles all quote styles: url("..."), url('...'), url(...)
   */
  private _rewriteCSSUrls(css: string, baseUrl?: string): string {
    // Enhanced pattern to handle all CSS url() variations:
    // - url("https://...") - double quoted
    // - url('https://...') - single quoted
    // - url(https://...) - unquoted
    // - url( "..." ) - with whitespace
    const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

    return css.replace(urlPattern, (match, _quote, urlValue) => {
      const url = urlValue.trim();

      // Skip data URLs (already embedded)
      if (url.startsWith('data:')) {
        return match;
      }

      // Skip blob URLs
      if (url.startsWith('blob:')) {
        return match;
      }

      // Skip empty URLs
      if (!url) {
        return match;
      }

      // Resolve absolute URL if we have a base URL
      let absoluteUrl = url;
      if (baseUrl && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
        try {
          absoluteUrl = new URL(url, baseUrl).href;
        } catch {
          // Invalid URL, keep original
          return match;
        }
      }

      // Handle protocol-relative URLs
      if (url.startsWith('//') && baseUrl) {
        try {
          const baseUrlObj = new URL(baseUrl);
          absoluteUrl = `${baseUrlObj.protocol}${url}`;
        } catch {
          return match;
        }
      }

      // Try to find the resource in our map
      const localPath = this.urlToResourceMap.get(absoluteUrl);
      if (localPath) {
        return `url('../resources/${localPath}')`;
      }

      // Try original URL if resolution failed
      const localPathOriginal = this.urlToResourceMap.get(url);
      if (localPathOriginal) {
        return `url('../resources/${localPathOriginal}')`;
      }

      // Try without query string/hash
      try {
        const urlObj = new URL(absoluteUrl);
        const cleanUrl = urlObj.origin + urlObj.pathname;
        const localPathClean = this.urlToResourceMap.get(cleanUrl);
        if (localPathClean) {
          return `url('../resources/${localPathClean}')`;
        }
      } catch {
        // Not a valid URL
      }

      return match;
    });
  }

  /**
   * Resolve a relative URL to an absolute URL using base URL
   */
  private _resolveUrl(url: string, baseUrl: string): string {
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    // Resolve relative URL
    try {
      return new URL(url, baseUrl).href;
    } catch {
      // Invalid URL, return as-is
      return url;
    }
  }
}
