/**
 * Session Recorder - Main API for recording user actions in Playwright
 */

import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import archiver from 'archiver';

// Promisified zlib functions for async compression
const gzipAsync = promisify(zlib.gzip);
import { SessionData, RecordedAction, NavigationAction, HarEntry, SnapshotterBlob, NetworkEntry, ConsoleEntry, VoiceTranscriptAction, MediaAction, DownloadAction, FullscreenAction, PrintAction, AnyAction, BrowserEventSnapshot } from './types';
import { ResourceStorage } from '../storage/resourceStorage';
import { ResourceCaptureQueue } from '../storage/ResourceCaptureQueue';
import { VoiceRecorder } from '../voice/VoiceRecorder';
import { SystemAudioRecorder, SystemAudioResult } from './SystemAudioRecorder';
import { createTrayManager, TrayManagerBase, TrayManagerOptions } from './TrayManager';
import { generateMarkdownExports } from '../export';

// Extend Window interface for session recorder flags
declare global {
  interface Window {
    __sessionRecorderLoaded?: boolean;
    __snapshotCapture?: {
      captureSnapshot: () => { html: string; resourceOverrides: any[] };
    };
  }
}

export interface SessionRecorderOptions {
  browser_record?: boolean;  // Capture DOM + actions (default: true)
  voice_record?: boolean;    // Capture microphone audio + transcript (default: false)
  system_audio_record?: boolean;  // Capture system/display audio (default: false)
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  whisper_device?: 'cuda' | 'mps' | 'cpu';

  // Compression options (TR-1)
  compress_snapshots?: boolean;  // Gzip compress DOM snapshots (default: true)
  screenshot_format?: 'png' | 'jpeg';  // Screenshot format (default: jpeg)
  screenshot_quality?: number;  // JPEG quality 0-100 (default: 75)

  // Audio compression options (TR-1)
  audio_format?: 'wav' | 'mp3';  // Audio format (default: wav, mp3 requires ffmpeg)
  audio_bitrate?: string;        // MP3 bitrate (default: 64k)
  audio_sample_rate?: number;    // MP3 sample rate (default: 22050)

  // Tray notification options (FR-3.1)
  tray_notifications?: boolean;  // Show system tray notifications (default: true)
  tray_icon?: boolean;           // Show system tray icon (default: true)
}

// Track page info for multi-tab support
interface TrackedPage {
  page: Page;
  tabId: number;
  url: string;
  previousUrl: string;  // For tracking navigation events
  isInitialLoad: boolean;  // True until first navigation event recorded
  pendingNavigation?: NodeJS.Timeout;  // Debounce timer for navigation events

}

export class SessionRecorder {
  private page: Page | null = null;  // Primary page (for backward compat)
  private pages: Map<number, TrackedPage> = new Map();  // All tracked pages by tabId
  private nextTabId: number = 0;
  private nextNavId: number = 0;  // Counter for navigation action IDs
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
  private resourceQueue: ResourceCaptureQueue; // Non-blocking resource capture (TR-4)
  private voiceRecorder: VoiceRecorder | null = null;
  private voiceStarted: boolean = false;
  private systemAudioRecorder: SystemAudioRecorder | null = null;
  private systemAudioStarted: boolean = false;
  private audioDir: string;
  private options: SessionRecorderOptions;
  private trayManager: TrayManagerBase | null = null;

  constructor(sessionId?: string, options: SessionRecorderOptions = {}) {
    // Validate options - at least one must be true
    const {browser_record: browserRecord, voice_record: voiceRecord, system_audio_record: systemAudioRecord} = options;
    console.log('browser_record:', browserRecord, 'voice_record:', voiceRecord, 'system_audio_record:', systemAudioRecord);

    if (!browserRecord && !voiceRecord && !systemAudioRecord) {
      throw new Error('At least one of browser_record, voice_record, or system_audio_record must be true');
    }

    this.options = {
      browser_record: browserRecord,
      voice_record: voiceRecord,
      system_audio_record: systemAudioRecord,
      whisper_model: options.whisper_model || 'base',
      whisper_device: options.whisper_device,
      // Compression defaults (TR-1)
      compress_snapshots: options.compress_snapshots !== false,  // Default: true
      screenshot_format: options.screenshot_format || 'jpeg',     // Default: jpeg (smaller)
      screenshot_quality: options.screenshot_quality ?? 75,       // Default: 75%
      // Audio compression defaults (TR-1)
      audio_format: options.audio_format || 'wav',  // Default: wav (mp3 requires ffmpeg)
      audio_bitrate: options.audio_bitrate || '64k',
      audio_sample_rate: options.audio_sample_rate || 22050
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

    // Initialize non-blocking resource capture queue (TR-4)
    this.resourceQueue = new ResourceCaptureQueue(this.resourcesDir, {
      maxConcurrent: 5,
      batchSize: 10
    });

    // Initialize voice recorder if enabled
    if (this.options.voice_record) {
      this.voiceRecorder = new VoiceRecorder({
        model: this.options.whisper_model,
        device: this.options.whisper_device,
        // TR-1: Audio compression options
        outputFormat: this.options.audio_format,
        mp3Bitrate: this.options.audio_bitrate,
        mp3SampleRate: this.options.audio_sample_rate
      });

      this.sessionData.voiceRecording = {
        enabled: true,
        model: this.options.whisper_model,
        device: this.options.whisper_device
      };
    }

    // Initialize system audio recorder if enabled
    // Note: SystemAudioRecorder requires page attachment, so we create it here
    // but start recording in start() method after page is available
    if (this.options.system_audio_record) {
      this.systemAudioRecorder = new SystemAudioRecorder({
        outputDir: this.audioDir,
        audioBitsPerSecond: 128000,
        timeslice: 1000
      });

      this.sessionData.systemAudioRecording = {
        enabled: true
      };
    }

    // Initialize tray manager for visual recording indicator (FR-3.1)
    if (options.tray_notifications !== false || options.tray_icon !== false) {
      this.trayManager = createTrayManager({
        notifications: options.tray_notifications !== false,
        trayIcon: options.tray_icon !== false,
        appName: 'Session Recorder',
      });
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

    // Start system audio recording if enabled (requires browser_record for page access)
    if (this.options.system_audio_record && this.systemAudioRecorder && !this.systemAudioStarted) {
      // Ensure audio directory exists
      fs.mkdirSync(this.audioDir, { recursive: true });

      console.log(`🔊 Initializing system audio capture...`);
      try {
        // Attach to page
        await this.systemAudioRecorder.attach(page);

        // Request capture (shows screen sharing dialog to user)
        const status = await this.systemAudioRecorder.requestCapture();

        if (status.state === 'recording' || status.state === 'requesting') {
          // Start recording
          const started = await this.systemAudioRecorder.startRecording();
          if (started) {
            this.systemAudioStarted = true;
            console.log(`✅ System audio recording active`);
          } else {
            console.warn(`⚠️ System audio recording failed to start`);
          }
        } else {
          console.warn(`⚠️ System audio capture not available: ${status.error || status.state}`);
        }
      } catch (err: any) {
        console.error(`❌ System audio initialization failed: ${err.message}`);
        // Don't fail the session - continue without system audio
      }
    }

    // Initialize and start tray manager for visual recording indicator (FR-3.1)
    if (this.trayManager) {
      await this.trayManager.initialize();
      this.trayManager.startRecording();
    }

    console.log(`📹 Session recording started: ${this.sessionData.sessionId}`);
    console.log(`   Browser: ${this.options.browser_record ? '✅' : '❌'}`);
    console.log(`   Voice: ${this.options.voice_record ? '✅' : '❌'}`);
    console.log(`   System Audio: ${this.systemAudioStarted ? '✅' : '❌'}`);
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
    this.pages.set(tabId, {
      page,
      tabId,
      url: tabUrl,
      previousUrl: '',  // Empty for initial load
      isInitialLoad: true
    });

    console.log(`📑 Attaching to tab ${tabId}: ${tabUrl || '(blank)'}`);

    // Setup network resource capture for this page
    page.on('response', async (response) => {
      await this._handleNetworkResponse(response);
    });

    // Track navigation events with debouncing
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const tracked = this.pages.get(tabId);
        if (tracked) {
          const newUrl = page.url();
          const oldUrl = tracked.url;

          // Skip about:blank
          if (newUrl === 'about:blank') return;

          // Don't record if URL didn't actually change (e.g., hash-only changes we want to skip)
          // But DO record initial loads and actual URL changes
          if (newUrl !== oldUrl || tracked.isInitialLoad) {
            // Clear any pending navigation (debounce rapid navigations)
            if (tracked.pendingNavigation) {
              clearTimeout(tracked.pendingNavigation);
            }

            // Store the navigation details to capture
            const captureFromUrl = oldUrl;
            const captureToUrl = newUrl;
            const captureIsInitial = tracked.isInitialLoad;

            // Update tracking immediately to avoid duplicate triggers
            tracked.previousUrl = oldUrl;
            tracked.url = newUrl;
            tracked.isInitialLoad = false;

            // Debounce: wait 500ms for rapid navigations to settle
            tracked.pendingNavigation = setTimeout(async () => {
              tracked.pendingNavigation = undefined;
              await this._recordNavigationEvent(tabId, captureFromUrl, captureToUrl, captureIsInitial);
            }, 500);
          }
        }
      }
    });

    // Remove page from tracking when closed
    page.on('close', () => {
      console.log(`📑 Tab ${tabId} closed`);
      // Clear any pending navigation timer
      const tracked = this.pages.get(tabId);
      if (tracked?.pendingNavigation) {
        clearTimeout(tracked.pendingNavigation);
      }
      this.pages.delete(tabId);
    });

    // Track download events
    page.on('download', async (download) => {
      const actionId = `download-${this.sessionData.actions.length + 1}`;

      // Capture screenshot at moment of download start
      const snapshot = await this._captureBrowserEventSnapshot(page, actionId, tabId);

      const downloadAction: DownloadAction = {
        id: actionId,
        timestamp: new Date().toISOString(),
        type: 'download',
        tabId,
        download: {
          url: download.url(),
          suggestedFilename: download.suggestedFilename(),
          state: 'started'
        },
        snapshot
      };
      this.sessionData.actions.push(downloadAction);
      console.log(`📥 [Tab ${tabId}] Download started: ${download.suggestedFilename()}${snapshot ? ' (screenshot captured)' : ''}`);

      // Track download completion
      download.path().then(async (downloadPath) => {
        if (downloadPath) {
          const completedActionId = `download-${this.sessionData.actions.length + 1}`;
          const completedSnapshot = await this._captureBrowserEventSnapshot(page, completedActionId, tabId);

          const completedAction: DownloadAction = {
            id: completedActionId,
            timestamp: new Date().toISOString(),
            type: 'download',
            tabId,
            download: {
              url: download.url(),
              suggestedFilename: download.suggestedFilename(),
              state: 'completed'
            },
            snapshot: completedSnapshot
          };
          this.sessionData.actions.push(completedAction);
          console.log(`✅ [Tab ${tabId}] Download completed: ${download.suggestedFilename()}`);
        }
      }).catch(async (err) => {
        const failedActionId = `download-${this.sessionData.actions.length + 1}`;
        const failedSnapshot = await this._captureBrowserEventSnapshot(page, failedActionId, tabId);

        const failedAction: DownloadAction = {
          id: failedActionId,
          timestamp: new Date().toISOString(),
          type: 'download',
          tabId,
          download: {
            url: download.url(),
            suggestedFilename: download.suggestedFilename(),
            state: 'failed',
            error: err.message
          },
          snapshot: failedSnapshot
        };
        this.sessionData.actions.push(failedAction);
        console.log(`❌ [Tab ${tabId}] Download failed: ${err.message}`);
      });
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

        // Browser event listeners module
        (function() {
          console.log('Setting up browser event listeners...');

          // Media events (video/audio) - play, pause, ended, seeked (no volumechange)
          function setupMediaListeners(mediaElement) {
            const mediaType = mediaElement.tagName.toLowerCase();
            const events = ['play', 'pause', 'ended', 'seeked'];

            events.forEach(function(eventName) {
              mediaElement.addEventListener(eventName, function() {
                if (typeof window.__recordMediaEvent === 'function') {
                  window.__recordMediaEvent({
                    event: eventName,
                    mediaType: mediaType,
                    src: mediaElement.src || mediaElement.currentSrc,
                    currentTime: mediaElement.currentTime,
                    duration: mediaElement.duration || 0,
                    volume: mediaElement.volume,
                    muted: mediaElement.muted
                  });
                }
              });
            });
          }

          // Setup listeners for existing media elements
          document.querySelectorAll('video, audio').forEach(setupMediaListeners);

          // Watch for new media elements
          var mediaObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                  if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                    setupMediaListeners(node);
                  }
                  // Check descendants
                  node.querySelectorAll && node.querySelectorAll('video, audio').forEach(setupMediaListeners);
                }
              });
            });
          });
          // Wait for document.body to exist before observing
          // (addInitScript runs before body is created)
          function startMediaObserver() {
            if (document.body) {
              mediaObserver.observe(document.body, { childList: true, subtree: true });
            } else {
              document.addEventListener('DOMContentLoaded', function() {
                if (document.body) {
                  mediaObserver.observe(document.body, { childList: true, subtree: true });
                }
              });
            }
          }
          startMediaObserver();

          // Fullscreen changes
          document.addEventListener('fullscreenchange', function() {
            if (typeof window.__recordFullscreenChange === 'function') {
              var fullscreenElement = document.fullscreenElement;
              window.__recordFullscreenChange({
                state: fullscreenElement ? 'entered' : 'exited',
                element: fullscreenElement ? fullscreenElement.tagName : undefined
              });
            }
          });
          // Webkit prefix for Safari
          document.addEventListener('webkitfullscreenchange', function() {
            if (typeof window.__recordFullscreenChange === 'function') {
              var fullscreenElement = document.webkitFullscreenElement;
              window.__recordFullscreenChange({
                state: fullscreenElement ? 'entered' : 'exited',
                element: fullscreenElement ? fullscreenElement.tagName : undefined
              });
            }
          });

          // Print events
          window.addEventListener('beforeprint', function() {
            if (typeof window.__recordPrintEvent === 'function') {
              window.__recordPrintEvent({ event: 'beforeprint' });
            }
          });
          window.addEventListener('afterprint', function() {
            if (typeof window.__recordPrintEvent === 'function') {
              window.__recordPrintEvent({ event: 'afterprint' });
            }
          });

          console.log('✅ Browser event listeners loaded');
        })();

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

    // Expose function for media events
    try {
      await page.exposeFunction('__recordMediaEvent', async (data: MediaAction['media']) => {
        const actionId = `media-${this.sessionData.actions.length + 1}`;

        // Capture screenshot at moment of media event
        const snapshot = await this._captureBrowserEventSnapshot(page, actionId, tabId);

        const action: MediaAction = {
          id: actionId,
          timestamp: new Date().toISOString(),
          type: 'media',
          tabId,
          media: data,
          snapshot
        };
        this.sessionData.actions.push(action);
        console.log(`🎬 [Tab ${tabId}] Media ${data.event}: ${data.mediaType}${snapshot ? ' (screenshot captured)' : ''}`);
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Expose function for fullscreen changes
    try {
      await page.exposeFunction('__recordFullscreenChange', async (data: { state: 'entered' | 'exited'; element?: string }) => {
        const actionId = `fullscreen-${this.sessionData.actions.length + 1}`;

        // Capture screenshot at moment of fullscreen change
        const snapshot = await this._captureBrowserEventSnapshot(page, actionId, tabId);

        const action: FullscreenAction = {
          id: actionId,
          timestamp: new Date().toISOString(),
          type: 'fullscreen',
          tabId,
          fullscreen: data,
          snapshot
        };
        this.sessionData.actions.push(action);
        console.log(`📺 [Tab ${tabId}] Fullscreen: ${data.state}${snapshot ? ' (screenshot captured)' : ''}`);
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Expose function for print events
    try {
      await page.exposeFunction('__recordPrintEvent', async (data: { event: 'beforeprint' | 'afterprint' }) => {
        const actionId = `print-${this.sessionData.actions.length + 1}`;

        // Capture screenshot at moment of print event
        const snapshot = await this._captureBrowserEventSnapshot(page, actionId, tabId);

        const action: PrintAction = {
          id: actionId,
          timestamp: new Date().toISOString(),
          type: 'print',
          tabId,
          print: data,
          snapshot
        };
        this.sessionData.actions.push(action);
        console.log(`🖨️ [Tab ${tabId}] Print: ${data.event}${snapshot ? ' (screenshot captured)' : ''}`);
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
      } else {
        // Page is still loading - wait for it and inject if initScript didn't run
        // This handles the race condition where page starts loading before we attach
        page.waitForLoadState('domcontentloaded').then(async () => {
          try {
            const needsInjection = await page.evaluate(() => !window.__sessionRecorderLoaded);
            if (needsInjection) {
              console.log(`📑 [Tab ${tabId}] Injecting code after load...`);
              await page.evaluate(fullInjectedCode);
            }
          } catch (e: any) {
            // Page might be closed
            if (!e.message?.includes('closed') && !e.message?.includes('Target')) {
              console.log(`⚠️ [Tab ${tabId}] Post-load injection failed: ${e.message}`);
            }
          }
        }).catch(() => {
          // Page might have been closed before load completed
        });
      }
    } catch (e: any) {
      // Page might be closed or in a weird state
      console.log(`⚠️ [Tab ${tabId}] Could not inject immediately: ${e.message}`);
    }

    return tabId;
  }

  /**
   * Record a navigation event (URL change or initial page load)
   */
  private async _recordNavigationEvent(
    tabId: number,
    fromUrl: string,
    toUrl: string,
    isInitialLoad: boolean
  ): Promise<void> {
    const tracked = this.pages.get(tabId);
    const page = tracked?.page || this.page;
    if (!page || page.isClosed()) return;

    // Skip about:blank navigations
    if (toUrl === 'about:blank') return;

    // Verify the page is still on the expected URL (in case of rapid navigations)
    const currentUrl = page.url();
    if (currentUrl !== toUrl && currentUrl !== 'about:blank') {
      console.log(`⚠️ [Tab ${tabId}] Navigation skipped: URL changed to ${currentUrl}`);
      return;
    }

    const actionId = `nav-${++this.nextNavId}`;
    const timestamp = new Date().toISOString();

    // Try to capture snapshot (HTML + screenshot) after page is fully loaded
    let snapshotData: NavigationAction['snapshot'] | undefined;
    try {
      // Wait for network to be idle (page fully loaded)
      // Use Promise.race to timeout if networkidle takes too long
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 5000 }),
        new Promise(resolve => setTimeout(resolve, 3000)) // Fallback after 3s
      ]).catch(() => {});

      // Verify page is still on the same URL after waiting
      if (page.isClosed() || page.url() !== toUrl) {
        console.log(`⚠️ [Tab ${tabId}] Navigation: page navigated away before snapshot`);
        return;
      }

      // Get viewport dimensions
      const viewportSize = page.viewportSize() || { width: 1280, height: 720 };

      // Capture HTML snapshot using browser-side code
      let htmlContent: string | null = null;
      let resourceOverrides: any[] = [];
      try {
        const snapshotResult = await page.evaluate(() => {
          if (window.__snapshotCapture && typeof window.__snapshotCapture.captureSnapshot === 'function') {
            return window.__snapshotCapture.captureSnapshot();
          }
          // Fallback: just get the raw HTML
          return {
            html: document.documentElement.outerHTML,
            resourceOverrides: []
          };
        });
        htmlContent = snapshotResult.html;
        resourceOverrides = snapshotResult.resourceOverrides || [];
      } catch (err: any) {
        // Snapshot capture might fail on some pages, use fallback
        if (!err.message?.includes('closed') && !err.message?.includes('Target')) {
          console.log(`⚠️ [Tab ${tabId}] HTML snapshot capture failed, using fallback: ${err.message}`);
        }
        try {
          htmlContent = await page.content();
        } catch {
          // Page might be closed
        }
      }

      // Process snapshot resources (CSS, images)
      if (resourceOverrides.length > 0) {
        await this._processSnapshotResources(resourceOverrides);
      }

      // Save HTML snapshot with optional gzip compression (TR-1)
      const ext = this.options.compress_snapshots ? '.html.gz' : '.html';
      if (htmlContent) {
        const rewrittenHtml = this._rewriteHTML(htmlContent, toUrl);
        const snapshotPath = path.join(this.sessionDir, 'snapshots', `${actionId}.html`);
        await this._saveSnapshot(snapshotPath, rewrittenHtml);
      }

      // Capture screenshot with configurable format/quality (TR-1)
      const screenshotExt = this._getScreenshotExtension();
      const screenshotPath = `screenshots/${actionId}${screenshotExt}`;
      const fullScreenshotPath = path.join(this.sessionDir, screenshotPath);

      await page.screenshot({
        path: fullScreenshotPath,
        ...this._getScreenshotOptions()
      });

      snapshotData = {
        html: `snapshots/${actionId}${ext}`,
        screenshot: screenshotPath,
        url: toUrl,
        viewport: viewportSize
      };

      console.log(`📸 [Tab ${tabId}] Captured navigation snapshot: ${actionId}`);
    } catch (err: any) {
      // Snapshot failed - page might be navigating or closed
      if (!err.message?.includes('closed') && !err.message?.includes('Target')) {
        console.log(`⚠️ [Tab ${tabId}] Navigation snapshot failed: ${err.message}`);
      }
    }

    // Determine navigation type
    let navigationType: NavigationAction['navigation']['navigationType'] = 'other';
    if (isInitialLoad) {
      navigationType = 'initial';
    } else if (fromUrl && toUrl) {
      // Try to determine if it was a link click, typed URL, etc.
      // This is a heuristic - Playwright doesn't give us this info directly
      navigationType = 'link';  // Default to link since we're recording user interactions
    }

    const navigationAction: NavigationAction = {
      id: actionId,
      timestamp,
      type: 'navigation',
      tabId,
      navigation: {
        fromUrl: fromUrl || '',
        toUrl,
        navigationType
      },
      snapshot: snapshotData
    };

    this.sessionData.actions.push(navigationAction);
    console.log(`🔗 [Tab ${tabId}] Navigation: ${fromUrl || '(new)'} → ${toUrl}`);
  }

  /**
   * Capture a snapshot (screenshot + HTML) for browser events
   * Used for visibility, media, fullscreen, print, and download events
   */
  private async _captureBrowserEventSnapshot(
    page: Page,
    actionId: string,
    tabId: number
  ): Promise<BrowserEventSnapshot | undefined> {
    try {
      if (page.isClosed()) {
        console.log(`⚠️ [Tab ${tabId}] Page closed, skipping event snapshot`);
        return undefined;
      }

      const screenshotExt = this._getScreenshotExtension();
      const snapshotExt = this.options.compress_snapshots ? '.html.gz' : '.html';
      const screenshotPath = `screenshots/${actionId}${screenshotExt}`;
      const fullScreenshotPath = path.join(this.sessionDir, screenshotPath);
      const htmlPath = `snapshots/${actionId}${snapshotExt}`;
      const fullHtmlPath = path.join(this.sessionDir, 'snapshots', `${actionId}.html`);

      // Get viewport dimensions
      const viewportSize = page.viewportSize() || { width: 1280, height: 720 };
      const pageUrl = page.url();

      // Capture HTML snapshot using browser-side code
      let htmlContent: string | null = null;
      let resourceOverrides: any[] = [];
      try {
        const snapshotResult = await page.evaluate(() => {
          if (window.__snapshotCapture && typeof window.__snapshotCapture.captureSnapshot === 'function') {
            return window.__snapshotCapture.captureSnapshot();
          }
          // Fallback: just get the raw HTML
          return {
            html: document.documentElement.outerHTML,
            resourceOverrides: []
          };
        });
        htmlContent = snapshotResult.html;
        resourceOverrides = snapshotResult.resourceOverrides || [];
      } catch (err: any) {
        // Snapshot capture might fail on some pages, use fallback
        if (!err.message?.includes('closed') && !err.message?.includes('Target')) {
          console.log(`⚠️ [Tab ${tabId}] HTML snapshot capture failed, using fallback: ${err.message}`);
        }
        try {
          htmlContent = await page.content();
        } catch {
          // Page might be closed
        }
      }

      // Process snapshot resources (CSS, images)
      if (resourceOverrides.length > 0) {
        await this._processSnapshotResources(resourceOverrides);
      }

      // Save HTML snapshot with optional gzip compression (TR-1)
      if (htmlContent) {
        const rewrittenHtml = this._rewriteHTML(htmlContent, pageUrl);
        await this._saveSnapshot(fullHtmlPath, rewrittenHtml);
      }

      // Capture screenshot with configurable format/quality (TR-1)
      await page.screenshot({
        path: fullScreenshotPath,
        ...this._getScreenshotOptions()
      });

      return {
        screenshot: screenshotPath,
        html: htmlContent ? htmlPath : undefined,
        url: pageUrl,
        viewport: viewportSize,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      if (!err.message?.includes('closed') && !err.message?.includes('Target')) {
        console.log(`⚠️ [Tab ${tabId}] Event snapshot failed: ${err.message}`);
      }
      return undefined;
    }
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

    // Save BEFORE HTML snapshot with optional gzip compression (TR-1)
    const snapshotExt = this.options.compress_snapshots ? '.html.gz' : '.html';
    const beforeSnapshotPath = path.join(
      this.sessionDir,
      'snapshots',
      `${actionId}-before.html`
    );
    await this._saveSnapshot(beforeSnapshotPath, rewrittenHtml);

    // Take BEFORE screenshot with configurable format/quality (TR-1)
    const screenshotExt = this._getScreenshotExtension();
    const beforeScreenshotPath = path.join(
      this.sessionDir,
      'screenshots',
      `${actionId}-before${screenshotExt}`
    );

    // Take BEFORE screenshot
    try {
      await page.screenshot({
        path: beforeScreenshotPath,
        ...this._getScreenshotOptions()
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
        html: `snapshots/${actionId}-before${snapshotExt}`,  // File path with compression extension
        screenshot: `screenshots/${actionId}-before${screenshotExt}`,  // Screenshot with format extension
        url: data.beforeUrl,
        viewport: data.beforeViewport
      },
      action: {
        type: data.action.type,
        x: data.action.x,
        y: data.action.y,
        button: data.action.button,
        modifiers: data.action.modifiers,
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

    // Save AFTER HTML snapshot with optional gzip compression (TR-1)
    const snapshotExt = this.options.compress_snapshots ? '.html.gz' : '.html';
    const afterSnapshotPath = path.join(
      this.sessionDir,
      'snapshots',
      `${actionId}-after.html`
    );
    await this._saveSnapshot(afterSnapshotPath, rewrittenHtml);

    // Take AFTER screenshot with configurable format/quality (TR-1)
    const screenshotExt = this._getScreenshotExtension();
    const afterScreenshotPath = path.join(
      this.sessionDir,
      'screenshots',
      `${actionId}-after${screenshotExt}`
    );

    // Take AFTER screenshot
    try {
      await page.screenshot({
        path: afterScreenshotPath,
        ...this._getScreenshotOptions()
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
      html: `snapshots/${actionId}-after${snapshotExt}`,  // File path with compression extension
      screenshot: `screenshots/${actionId}-after${screenshotExt}`,  // Screenshot with format extension
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

    // TR-4: Flush resource capture queue to ensure all resources are saved
    console.log('📦 Flushing resource capture queue...');
    await this.resourceQueue.flush();
    const queueStats = this.resourceQueue.getStats();
    console.log(`📦 Resource queue: ${queueStats.completed} captured, ${queueStats.failed} failed, ${(queueStats.totalBytes / 1024).toFixed(1)}KB total`);

    // Collect all voice/transcript actions for merging (FEAT-04)
    let allVoiceActions: VoiceTranscriptAction[] = [];

    // Stop voice recording if enabled
    if (this.options.voice_record && this.voiceRecorder) {
      console.log('🎙️  Stopping voice recording...');
      const transcript = await this.voiceRecorder.stopRecording();

      if (transcript && transcript.success) {
        console.log(`✅ Voice transcription successful: ${transcript.text?.slice(0, 100)}...`);

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

        // Convert transcript to voice actions with source='voice' (FEAT-04)
        const voiceActions = this.voiceRecorder.convertToVoiceActions(
          transcript,
          'audio/recording.wav',
          (timestamp: string) => this._findNearestSnapshot(timestamp),
          'voice',  // source attribution
          'voice'   // id prefix
        );

        allVoiceActions.push(...voiceActions);
        console.log(`🎙️  Voice segments: ${voiceActions.length} (source: voice)`);
      } else {
        console.error(`❌ Voice transcription failed: ${transcript?.error || 'Unknown error'}`);
      }
    }

    // Stop system audio recording if enabled
    if (this.options.system_audio_record && this.systemAudioRecorder && this.systemAudioStarted) {
      console.log('🔊 Stopping system audio recording...');
      const result = await this.systemAudioRecorder.stopRecording();

      if (result.success && result.audioFile) {
        console.log(`✅ System audio saved: ${result.audioFile} (${result.duration}ms, ${result.chunks} chunks)`);

        // Update session metadata
        if (this.sessionData.systemAudioRecording) {
          this.sessionData.systemAudioRecording.audioFile = `audio/${result.audioFile}`;
          this.sessionData.systemAudioRecording.duration = result.duration;
          this.sessionData.systemAudioRecording.chunks = result.chunks;
        }

        // FEAT-04: Transcribe system audio file using Whisper
        const systemAudioPath = path.join(this.audioDir, result.audioFile);
        console.log('🔊 Transcribing system audio...');

        // Create a temporary VoiceRecorder for transcription (or use existing if available)
        const transcriber = this.voiceRecorder || new VoiceRecorder({
          model: this.options.whisper_model,
          device: this.options.whisper_device
        });

        // Set session start time for timestamp alignment
        transcriber.setSessionStartTime(this.sessionStartTime);

        const systemTranscript = await transcriber.transcribeFile(systemAudioPath, {
          model: this.options.whisper_model,
          device: this.options.whisper_device
        });

        if (systemTranscript && systemTranscript.success) {
          console.log(`✅ System audio transcription successful: ${systemTranscript.text?.slice(0, 100)}...`);

          // Save system transcript as JSON
          const systemTranscriptPath = path.join(this.sessionDir, 'system-transcript.json');
          fs.writeFileSync(systemTranscriptPath, JSON.stringify(systemTranscript, null, 2), 'utf-8');

          // Update session metadata
          if (this.sessionData.systemAudioRecording) {
            this.sessionData.systemAudioRecording.transcriptFile = 'system-transcript.json';
          }

          // Convert transcript to voice actions with source='system' (FEAT-04)
          const systemActions = transcriber.convertToVoiceActions(
            systemTranscript,
            `audio/${result.audioFile}`,
            (timestamp: string) => this._findNearestSnapshot(timestamp),
            'system',  // source attribution
            'system'   // id prefix
          );

          allVoiceActions.push(...systemActions);
          console.log(`🔊 System segments: ${systemActions.length} (source: system)`);
        } else {
          console.error(`❌ System audio transcription failed: ${systemTranscript?.error || 'Unknown error'}`);
        }
      } else {
        console.error(`❌ System audio recording failed: ${result.error || 'Unknown error'}`);
      }

      this.systemAudioStarted = false;
    }

    // FEAT-04: Merge all voice/transcript actions with browser actions
    if (allVoiceActions.length > 0) {
      // Merge and sort all actions chronologically
      const allActions = [...this.sessionData.actions, ...allVoiceActions];
      allActions.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Align voice segments with browser actions (split at action boundaries)
      this.sessionData.actions = this._alignVoiceWithActions(allActions);

      const alignedVoiceCount = this.sessionData.actions.filter(
        a => a.type === 'voice_transcript'
      ).length;

      // Merge consecutive voice transcripts from SAME source (reduces clutter in action list)
      this.sessionData.actions = this._mergeConsecutiveVoiceTranscripts(this.sessionData.actions);

      const mergedVoiceCount = this.sessionData.actions.filter(
        a => a.type === 'voice_transcript'
      ).length;

      const voiceSourceCount = this.sessionData.actions.filter(
        (a): a is VoiceTranscriptAction => a.type === 'voice_transcript' && a.source === 'voice'
      ).length;

      const systemSourceCount = this.sessionData.actions.filter(
        (a): a is VoiceTranscriptAction => a.type === 'voice_transcript' && a.source === 'system'
      ).length;

      console.log(`🎵 Transcript segments: ${allVoiceActions.length} raw → ${alignedVoiceCount} aligned → ${mergedVoiceCount} merged`);
      console.log(`   - Voice source: ${voiceSourceCount}`);
      console.log(`   - System source: ${systemSourceCount}`);
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

    // Generate markdown exports (FR-6: Auto-Generation)
    try {
      await generateMarkdownExports(this.sessionDir);
    } catch (err) {
      console.error('⚠️  Markdown export failed (non-blocking):', err);
      // Don't fail recording if export fails (QA-3: Robustness)
    }

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

    if (this.options.system_audio_record && this.sessionData.systemAudioRecording) {
      console.log(`🔊 System audio:`);
      console.log(`   - File: ${this.sessionData.systemAudioRecording.audioFile || 'none'}`);
      console.log(`   - Duration: ${((this.sessionData.systemAudioRecording.duration || 0) / 1000).toFixed(1)}s`);
      console.log(`   - Chunks: ${this.sessionData.systemAudioRecording.chunks || 0}`);
    }

    console.log(`📄 Session data: ${sessionJsonPath}`);

    // Stop tray manager and show completion notification (FR-3.1)
    if (this.trayManager) {
      this.trayManager.stopRecording(sessionJsonPath);
      await this.trayManager.destroy();
    }

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
   * Align voice segments with browser actions
   * Splits voice segments at action boundaries and associates them with actions
   *
   * This creates two views:
   * - Timeline view: Full interleaved actions (original behavior)
   * - Action list: Voice segments split and associated with the actions they describe
   */
  private _alignVoiceWithActions(actions: AnyAction[]): AnyAction[] {
    const result: AnyAction[] = [];
    const browserActions = actions.filter(a => a.type !== 'voice_transcript');
    const voiceActions = actions.filter(a => a.type === 'voice_transcript') as VoiceTranscriptAction[];

    // Sort browser actions by timestamp for binary search
    const sortedBrowserActions = [...browserActions].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const voice of voiceActions) {
      const voiceStart = new Date(voice.transcript.startTime).getTime();
      const voiceEnd = new Date(voice.transcript.endTime).getTime();
      const words = voice.transcript.words || [];

      // Find browser actions that occur during this voice segment
      const actionsInSegment = sortedBrowserActions.filter(action => {
        const actionTime = new Date(action.timestamp).getTime();
        return actionTime > voiceStart && actionTime < voiceEnd;
      });

      // Find the action that immediately follows this voice segment (within 5 seconds)
      const followingAction = sortedBrowserActions.find(action => {
        const actionTime = new Date(action.timestamp).getTime();
        return actionTime >= voiceEnd && actionTime <= voiceEnd + 5000;
      });

      if (actionsInSegment.length === 0) {
        // No splitting needed - associate with following action if any
        const alignedVoice: VoiceTranscriptAction = {
          ...voice,
          associatedActionId: followingAction?.id
        };
        result.push(alignedVoice);
      } else {
        // Split the voice segment at each action boundary
        const splitPoints: { time: number; actionId?: string }[] = [
          { time: voiceStart }
        ];

        for (const action of actionsInSegment) {
          splitPoints.push({
            time: new Date(action.timestamp).getTime(),
            actionId: action.id
          });
        }

        splitPoints.push({
          time: voiceEnd,
          actionId: followingAction?.id
        });

        // Create voice segments for each split
        const totalParts = splitPoints.length - 1;
        let partCounter = 1;

        for (let i = 0; i < splitPoints.length - 1; i++) {
          const segmentStart = splitPoints[i].time;
          const segmentEnd = splitPoints[i + 1].time;
          const associatedActionId = splitPoints[i + 1].actionId;

          // Get words in this time range (word belongs to segment if it starts within it)
          const segmentWords = words.filter(w => {
            const wordStart = new Date(w.startTime).getTime();
            return wordStart >= segmentStart && wordStart < segmentEnd;
          });

          // Skip empty segments (no words)
          if (segmentWords.length === 0) {
            continue;
          }

          const segmentText = segmentWords.map(w => w.word).join(' ').trim();

          // Skip if text is empty or only whitespace
          if (!segmentText) {
            continue;
          }

          const alignedVoice: VoiceTranscriptAction = {
            id: totalParts > 1 ? `${voice.id}-part${partCounter}` : voice.id,
            type: 'voice_transcript',
            timestamp: new Date(segmentStart).toISOString(),
            transcript: {
              text: segmentText,
              fullText: voice.transcript.text,
              startTime: segmentWords[0].startTime,
              endTime: segmentWords[segmentWords.length - 1].endTime,
              confidence: voice.transcript.confidence,
              words: segmentWords,
              isPartial: totalParts > 1,
              partIndex: i,
              totalParts: totalParts
            },
            audioFile: voice.audioFile,
            nearestSnapshotId: voice.nearestSnapshotId,
            associatedActionId
          };

          result.push(alignedVoice);
          partCounter++;
        }
      }
    }

    // Add all browser actions
    result.push(...browserActions);

    // Sort by timestamp, with tiebreaker: instant actions before voice (which has duration)
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Same timestamp: instant actions (non-voice) come before voice transcripts
      const aIsVoice = a.type === 'voice_transcript';
      const bIsVoice = b.type === 'voice_transcript';

      if (aIsVoice && !bIsVoice) return 1;  // a (voice) goes after b (instant)
      if (!aIsVoice && bIsVoice) return -1; // a (instant) goes before b (voice)

      return 0;
    });

    return result;
  }

  /**
   * Merge consecutive voice transcript actions that have no browser actions between them.
   * This reduces clutter in the action list while preserving all word-level data for playback.
   */
  private _mergeConsecutiveVoiceTranscripts(actions: AnyAction[]): AnyAction[] {
    const result: AnyAction[] = [];
    let voiceRun: VoiceTranscriptAction[] = [];
    let currentSource: 'voice' | 'system' | undefined = undefined;

    const flushVoiceRun = () => {
      if (voiceRun.length === 0) return;

      if (voiceRun.length === 1) {
        result.push(voiceRun[0]);
      } else {
        result.push(this._mergeVoiceSegments(voiceRun));
      }
      voiceRun = [];
      currentSource = undefined;
    };

    for (const action of actions) {
      if (action.type === 'voice_transcript') {
        const voiceAction = action as VoiceTranscriptAction;
        // FEAT-04: Only merge consecutive segments from the SAME source
        if (voiceRun.length > 0 && voiceAction.source !== currentSource) {
          flushVoiceRun();
        }
        voiceRun.push(voiceAction);
        currentSource = voiceAction.source;
      } else {
        flushVoiceRun();
        result.push(action);
      }
    }

    flushVoiceRun(); // Don't forget trailing voice segments
    return result;
  }

  /**
   * Merge multiple voice segments into a single combined segment.
   * Preserves all word-level timing data for accurate playback highlighting.
   */
  private _mergeVoiceSegments(segments: VoiceTranscriptAction[]): VoiceTranscriptAction {
    if (segments.length === 0) throw new Error('Cannot merge empty segments');
    if (segments.length === 1) return segments[0];

    const first = segments[0];
    const last = segments[segments.length - 1];

    // Concatenate text with space separator
    const combinedText = segments
      .map(s => s.transcript.text.trim())
      .join(' ');

    // Combine all word arrays (already have absolute timestamps)
    const combinedWords = segments
      .flatMap(s => s.transcript.words || []);

    // Calculate weighted average confidence
    const totalWords = combinedWords.length || segments.length;
    const weightedConfidence = segments.reduce((sum, s) => {
      const wordCount = s.transcript.words?.length || 1;
      return sum + (s.transcript.confidence * wordCount);
    }, 0) / totalWords;

    return {
      id: first.id,
      type: 'voice_transcript',
      timestamp: first.timestamp,
      transcript: {
        text: combinedText,
        startTime: first.transcript.startTime,
        endTime: last.transcript.endTime,
        confidence: weightedConfidence,
        words: combinedWords.length > 0 ? combinedWords : undefined,
        mergedSegments: {
          count: segments.length,
          originalIds: segments.map(s => s.id)
        }
      },
      audioFile: first.audioFile,
      nearestSnapshotId: first.nearestSnapshotId,
      associatedActionId: last.associatedActionId, // Use last segment's association
      source: first.source // FEAT-04: Preserve source attribution
    };
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
        if (a.type === 'navigation') {
          return {
            id: a.id,
            type: a.type,
            timestamp: a.timestamp,
            url: a.navigation.toUrl
          };
        }
        // Handle new event types (visibility, media, download, fullscreen, print)
        if (a.type === 'page_visibility' || a.type === 'media' || a.type === 'download' || a.type === 'fullscreen' || a.type === 'print') {
          return {
            id: a.id,
            type: a.type,
            timestamp: a.timestamp
          };
        }
        // RecordedAction (click, input, etc.)
        return {
          id: a.id,
          type: a.type,
          timestamp: a.timestamp,
          url: (a as RecordedAction).after.url
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
   * Uses Promise.all for parallel processing
   */
  private async _processSnapshotResources(resourceOverrides: any[]): Promise<void> {
    // Process all resources in parallel for better performance
    const writePromises = resourceOverrides.map(async (resource) => {
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

        // Write resource to disk (async)
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

          await fsPromises.writeFile(resourcePath, buffer);
          console.log(`📦 Stored snapshot resource: ${filename} (${resource.size} bytes) - ${resource.contentType}`);
        }
      } catch (error) {
        console.warn(`[SessionRecorder] Failed to process snapshot resource ${resource.url}:`, error);
      }
    });

    await Promise.all(writePromises);
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
            // TR-4: Use ResourceCaptureQueue for non-blocking capture
            // SHA1 calculation happens inline (fast), disk write is queued
            filename = this.resourceQueue.enqueue(url, buffer, contentType);

            // Store URL → filename mapping for CSS rewriting
            this.urlToResourceMap.set(url, filename);

            // If CSS, also rewrite and save rewritten version (async)
            if (contentType.includes('text/css')) {
              const cssContent = buffer.toString('utf-8');
              const rewrittenCSS = this._rewriteCSS(cssContent, url);
              const rewrittenBuffer = Buffer.from(rewrittenCSS, 'utf-8');
              fsPromises.writeFile(path.join(this.resourcesDir, filename), rewrittenBuffer).catch(() => {});
            }

            console.log(`📦 Queued resource: ${filename} (${buffer.length} bytes) - ${contentType}`);
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

      // Write network entry to log file (JSON Lines format) - async, fire-and-forget
      fsPromises.appendFile(this.networkLogPath, JSON.stringify(networkEntry) + '\n', 'utf-8').catch(() => {});
      this.networkRequestCount++;

    } catch (err) {
      // Silently ignore errors (some responses may not have bodies)
    }
  }

  /**
   * Handle console logs from the browser
   */
  private _handleConsoleLog(entry: ConsoleEntry): void {
    // Write console entry to log file (JSON Lines format) - async, fire-and-forget
    fsPromises.appendFile(this.consoleLogPath, JSON.stringify(entry) + '\n', 'utf-8').catch(() => {});
    this.consoleLogCount++;
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
    // Async write, fire-and-forget for performance
    fsPromises.writeFile(resourcePath, buffer).catch(() => {});

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
   * Save HTML snapshot with optional gzip compression (TR-1)
   * Returns the file path (with .gz extension if compressed)
   */
  private async _saveSnapshot(snapshotPath: string, htmlContent: string): Promise<string> {
    if (this.options.compress_snapshots) {
      // Gzip compress the HTML
      const compressed = await gzipAsync(Buffer.from(htmlContent, 'utf-8'));
      const compressedPath = snapshotPath + '.gz';
      await fsPromises.writeFile(compressedPath, compressed);
      return compressedPath;
    } else {
      await fsPromises.writeFile(snapshotPath, htmlContent, 'utf-8');
      return snapshotPath;
    }
  }

  /**
   * Get screenshot options based on configuration
   */
  private _getScreenshotOptions(): { type: 'png' | 'jpeg'; quality?: number } {
    if (this.options.screenshot_format === 'jpeg') {
      return {
        type: 'jpeg',
        quality: this.options.screenshot_quality
      };
    }
    return { type: 'png' };
  }

  /**
   * Get screenshot file extension based on configuration
   */
  private _getScreenshotExtension(): string {
    return this.options.screenshot_format === 'jpeg' ? '.jpg' : '.png';
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
