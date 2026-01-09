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
import { SessionRecorder, VoiceTranscriptAction } from 'session-recorder';
import type { TranscriptResult } from './voice';

export type RecordingState = 'idle' | 'starting' | 'recording' | 'paused' | 'stopping' | 'processing';

export interface RecordingStats {
  duration: number;  // milliseconds since recording started
  actionCount: number;
  currentUrl: string;
}

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
  private recordingStartTime: number = 0;
  private pausedDuration: number = 0;  // Total time spent paused
  private pauseStartTime: number = 0;  // When pause started
  private statsInterval: NodeJS.Timeout | null = null;
  private lastActionCount: number = 0;
  private lastUrl: string = '';

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

      // Create browser context with dynamic viewport (uses full browser window)
      this.context = await this.browser.newContext({
        viewport: null  // UX-01: Use full browser window, responds to resize
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

      // Start recording timer
      this.recordingStartTime = Date.now();
      this.pausedDuration = 0;
      this.lastActionCount = 0;
      this.lastUrl = '';

      // Start periodic stats updates (every second)
      this.startStatsInterval();

      this.setState('recording');
      this.emit('started', { sessionId: this.sessionId, browserType });
    } catch (error) {
      this.setState('idle');
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Start the stats update interval
   */
  private startStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(() => {
      if (this.state === 'recording') {
        this.emitStats();
      }
    }, 1000);
  }

  /**
   * Stop the stats update interval
   */
  private stopStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Emit current recording stats
   */
  private emitStats(): void {
    // Get action count from session recorder
    const actionCount = this.sessionRecorder?.getSessionData()?.actions?.length || 0;

    // Get current URL from page
    let currentUrl = '';
    try {
      currentUrl = this.page?.url() || '';
      if (currentUrl === 'about:blank') {
        currentUrl = '';
      }
    } catch {
      // Page might be closed
    }

    // Calculate duration (excluding paused time)
    const now = Date.now();
    const duration = now - this.recordingStartTime - this.pausedDuration;

    const stats: RecordingStats = {
      duration,
      actionCount,
      currentUrl
    };

    this.emit('stats', stats);

    // Also emit specific events for action count and URL changes
    if (actionCount !== this.lastActionCount) {
      this.lastActionCount = actionCount;
      this.emit('actionRecorded', actionCount);
    }

    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.emit('urlChanged', currentUrl);
    }
  }

  /**
   * Pause the recording
   */
  async pauseRecording(): Promise<void> {
    if (this.state !== 'recording') {
      throw new Error(`Cannot pause recording in state: ${this.state}`);
    }

    this.pauseStartTime = Date.now();
    this.setState('paused');
    this.emit('paused');
    console.log('Recording paused');
  }

  /**
   * Resume the recording
   */
  async resumeRecording(): Promise<void> {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume recording in state: ${this.state}`);
    }

    // Add paused time to total paused duration
    this.pausedDuration += Date.now() - this.pauseStartTime;
    this.pauseStartTime = 0;

    this.setState('recording');
    this.emit('resumed');
    console.log('Recording resumed');
  }

  async stopRecording(): Promise<string | null> {
    if (this.state !== 'recording' && this.state !== 'paused') {
      console.warn(`Cannot stop recording in state: ${this.state}`);
      return null;
    }

    // Stop stats updates
    this.stopStatsInterval();

    this.setState('stopping');

    try {
      // Get session directory first (needed for saving transcript)
      const sessionDir = this.sessionRecorder?.getSessionDir();

      // Stop voice recording and integrate transcript into session data
      if (this.voiceRecorder) {
        try {
          const transcriptResult = await this.voiceRecorder.stop();

          if (transcriptResult && transcriptResult.success && sessionDir && this.sessionRecorder) {
            // Save transcript to session directory
            const transcriptPath = path.join(sessionDir, 'transcript.json');
            fs.writeFileSync(transcriptPath, JSON.stringify(transcriptResult, null, 2));
            console.log(`Saved transcript to: ${transcriptPath}`);

            // Get session data and integrate voice transcript actions
            const sessionData = this.sessionRecorder.getSessionData();
            const sessionStartTime = new Date(sessionData.startTime).getTime();

            // Update voiceRecording metadata
            sessionData.voiceRecording = {
              enabled: true,
              audioFile: `audio/recording.${this.config.audioFormat}`,
              transcriptFile: 'transcript.json',
              model: this.config.whisperModel,
              language: transcriptResult.language,
              duration: transcriptResult.duration
            };

            // Convert transcript segments to VoiceTranscriptAction entries
            const voiceActions = this.convertTranscriptToVoiceActions(
              transcriptResult,
              sessionStartTime,
              `audio/recording.${this.config.audioFormat}`
            );

            if (voiceActions.length > 0) {
              // Merge voice actions with existing actions and sort by timestamp
              const allActions = [...sessionData.actions, ...voiceActions];
              allActions.sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                if (timeA !== timeB) return timeA - timeB;
                // Same timestamp: non-voice actions before voice actions
                const aIsVoice = a.type === 'voice_transcript';
                const bIsVoice = b.type === 'voice_transcript';
                if (aIsVoice && !bIsVoice) return 1;
                if (!aIsVoice && bIsVoice) return -1;
                return 0;
              });
              sessionData.actions = allActions;
              console.log(`🎙️  Added ${voiceActions.length} voice transcript segments to session`);
            }
          } else if (transcriptResult && !transcriptResult.success) {
            console.error(`Voice transcription failed: ${transcriptResult.error || 'Unknown error'}`);
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

        // Close browser immediately after session recorder stops
        // This happens before the slow zip/copy operations so user doesn't wait
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
    // Stop stats interval
    this.stopStatsInterval();

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

    // Reset timing state
    this.recordingStartTime = 0;
    this.pausedDuration = 0;
    this.pauseStartTime = 0;
    this.lastActionCount = 0;
    this.lastUrl = '';
  }

  private setState(state: RecordingState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  getState(): RecordingState {
    return this.state;
  }

  isRecording(): boolean {
    return this.state === 'recording' || this.state === 'paused';
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  /**
   * Get current recording duration in milliseconds
   */
  getDuration(): number {
    if (!this.recordingStartTime) return 0;

    const now = Date.now();
    let pauseTime = this.pausedDuration;

    // If currently paused, add the current pause duration
    if (this.state === 'paused' && this.pauseStartTime) {
      pauseTime += now - this.pauseStartTime;
    }

    return now - this.recordingStartTime - pauseTime;
  }

  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
  }

  /**
   * Convert transcript result to VoiceTranscriptAction entries
   * Replicates the logic from VoiceRecorder.convertToVoiceActions
   */
  private convertTranscriptToVoiceActions(
    transcript: TranscriptResult,
    sessionStartTime: number,
    audioFile: string
  ): VoiceTranscriptAction[] {
    if (!transcript.success || !transcript.segments) {
      return [];
    }

    const actions: VoiceTranscriptAction[] = [];
    let actionCounter = 1;

    for (const segment of transcript.segments) {
      // Convert relative timestamps (in seconds) to absolute UTC
      const startTime = new Date(sessionStartTime + segment.start * 1000);
      const endTime = new Date(sessionStartTime + segment.end * 1000);

      // Convert words to absolute timestamps
      const words = segment.words?.map(word => ({
        word: word.word,
        startTime: new Date(sessionStartTime + word.start * 1000).toISOString(),
        endTime: new Date(sessionStartTime + word.end * 1000).toISOString(),
        probability: word.probability
      }));

      const action: VoiceTranscriptAction = {
        id: `voice-${actionCounter++}`,
        type: 'voice_transcript',
        timestamp: startTime.toISOString(),
        transcript: {
          text: segment.text,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          confidence: Math.exp(segment.confidence), // Convert log prob to probability
          words
        },
        audioFile,
        source: 'voice'
      };

      actions.push(action);
    }

    return actions;
  }
}
