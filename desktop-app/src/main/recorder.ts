/**
 * Recording Orchestrator for Session Recorder Desktop
 *
 * Coordinates browser recording (via Playwright) and voice recording.
 * Manages the lifecycle of a recording session.
 */

import { EventEmitter } from 'events';
import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import {
  AppConfig,
  BrowserType,
  getVoiceRecorderPath,
  hasPythonVoiceRecorder,
  getPythonVoiceRecorderPath
} from './config';
import { VoiceRecorderProcess } from './voice';

// Import real SessionRecorder from parent session-recorder package
import { SessionRecorder } from 'session-recorder';

export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'processing';

export class RecordingOrchestrator extends EventEmitter {
  private config: AppConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionRecorder: SessionRecorder | null = null;
  private voiceRecorder: VoiceRecorderProcess | null = null;
  private state: RecordingState = 'idle';
  private voiceEnabled: boolean;
  private sessionId: string | null = null;

  constructor(config: AppConfig) {
    super();
    this.config = config;
    this.voiceEnabled = config.voiceEnabled;
  }

  async startRecording(browserType: BrowserType = 'chromium'): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start recording in state: ${this.state}`);
    }

    this.setState('starting');

    try {
      // Generate session ID
      this.sessionId = `session-${Date.now()}`;

      // Launch browser
      this.browser = await this.launchBrowser(browserType);

      // Create browser context
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 }
      });

      // Create initial page
      this.page = await this.context.newPage();

      // Initialize SessionRecorder
      this.sessionRecorder = await this.createSessionRecorder();

      // Start session recording (SessionRecorder gets context from page internally)
      await this.sessionRecorder.start(this.page);

      // Start voice recording if enabled
      if (this.voiceEnabled) {
        await this.startVoiceRecording();
      }

      // Monitor for browser close
      this.browser.on('disconnected', () => {
        if (this.state === 'recording') {
          this.emit('browserClosed');
        }
      });

      // Monitor for page close
      this.page.on('close', () => {
        // If main page is closed, check if any pages remain
        if (this.context) {
          const pages = this.context.pages();
          if (pages.length === 0 && this.state === 'recording') {
            this.emit('browserClosed');
          }
        }
      });

      // Navigate to a starting page
      await this.page.goto('about:blank');

      this.setState('recording');
      this.emit('started', { sessionId: this.sessionId, browserType });
    } catch (error) {
      this.setState('idle');
      await this.cleanup();
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this.state !== 'recording') {
      console.warn(`Cannot stop recording in state: ${this.state}`);
      return null;
    }

    this.setState('stopping');

    try {
      // Get session directory first (needed for saving transcript)
      const sessionDir = this.sessionRecorder?.getSessionDir();

      // Stop voice recording and save transcript
      if (this.voiceRecorder) {
        try {
          const transcriptResult = await this.voiceRecorder.stop();

          // Save transcript to session directory before session recorder stops
          if (transcriptResult && sessionDir) {
            const transcriptPath = path.join(sessionDir, 'transcript.json');
            fs.writeFileSync(transcriptPath, JSON.stringify(transcriptResult, null, 2));
            console.log(`Saved transcript to: ${transcriptPath}`);
          }
        } catch (error) {
          console.error('Error stopping voice recorder:', error);
        }
        this.voiceRecorder = null;
      }

      // Stop session recording
      let outputPath: string | null = null;
      if (this.sessionRecorder) {
        await this.sessionRecorder.stop();

        // Create zip archive using real SessionRecorder (now includes transcript)
        const zipPath = await this.sessionRecorder.createZip();
        const recorderSessionDir = this.sessionRecorder.getSessionDir();

        // Copy output to configured output directory if different
        const targetDir = path.join(this.config.outputDir, this.sessionId!);
        const targetZip = `${targetDir}.zip`;

        if (recorderSessionDir !== targetDir) {
          // Copy session directory to target location
          await this.copyDirectory(recorderSessionDir, targetDir);

          // Copy zip file
          if (fs.existsSync(zipPath)) {
            fs.copyFileSync(zipPath, targetZip);
          }

          outputPath = targetZip;
        } else {
          outputPath = zipPath;
        }
      }

      // Cleanup
      await this.cleanup();

      this.setState('idle');
      this.emit('stopped', { outputPath });

      return outputPath;
    } catch (error) {
      this.setState('idle');
      await this.cleanup();
      throw error;
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private async launchBrowser(browserType: BrowserType): Promise<Browser> {
    const launchOptions = {
      headless: false,  // Always show browser for recording
      args: ['--start-maximized']
    };

    switch (browserType) {
      case 'chromium':
        return await chromium.launch(launchOptions);
      case 'firefox':
        return await firefox.launch(launchOptions);
      case 'webkit':
        return await webkit.launch(launchOptions);
      default:
        return await chromium.launch(launchOptions);
    }
  }

  private async createSessionRecorder(): Promise<SessionRecorder> {
    // Use the real SessionRecorder from the session-recorder package
    // Note: SessionRecorder outputs to its own __dirname-relative path,
    // we copy files to user's configured output directory after recording

    // Create the recorder with proper options
    const recorder = new SessionRecorder(this.sessionId!, {
      browser_record: true,
      voice_record: false,  // Desktop app handles voice recording separately
      compress_snapshots: this.config.compressSnapshots,
      screenshot_format: this.config.screenshotFormat,
      screenshot_quality: this.config.screenshotQuality,
      tray_notifications: false,  // Desktop app handles notifications
      tray_icon: false
    });

    return recorder;
  }

  private async startVoiceRecording(): Promise<void> {
    const voiceExePath = getVoiceRecorderPath();
    const sessionDir = this.sessionRecorder?.getSessionDir();

    if (!sessionDir) {
      console.warn('Session directory not available for voice recording');
      return;
    }

    const audioDir = path.join(sessionDir, 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const audioPath = path.join(audioDir, `recording.${this.config.audioFormat}`);

    this.voiceRecorder = new VoiceRecorderProcess({
      executablePath: voiceExePath,
      usePythonFallback: !voiceExePath && hasPythonVoiceRecorder(),
      pythonScriptPath: getPythonVoiceRecorderPath(),
      outputPath: audioPath,
      format: this.config.audioFormat,
      model: this.config.whisperModel,
      device: this.config.audioDevice
    });

    try {
      await this.voiceRecorder.start();
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      this.voiceRecorder = null;
      // Don't fail the whole recording if voice fails
    }
  }

  private async cleanup(): Promise<void> {
    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    // Cleanup session recorder
    this.sessionRecorder = null;
    this.sessionId = null;
  }

  private setState(state: RecordingState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  getState(): RecordingState {
    return this.state;
  }

  isRecording(): boolean {
    return this.state === 'recording';
  }

  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
  }
}
