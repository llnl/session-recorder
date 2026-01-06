/**
 * Node.js wrapper for browser-side system audio capture
 * Handles receiving audio chunks and saving them to files
 */

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemAudioChunk {
  timestamp: string;
  data: string;  // Base64 encoded
  mimeType: string;
  index: number;
}

export interface SystemAudioRecorderOptions {
  /** Output directory for audio files */
  outputDir: string;
  /** Audio bitrate in bps (default: 128000) */
  audioBitsPerSecond?: number;
  /** Chunk interval in ms (default: 1000) */
  timeslice?: number;
}

export interface SystemAudioStatus {
  state: 'inactive' | 'requesting' | 'recording' | 'stopped' | 'error';
  error?: string;
  trackInfo?: {
    kind: string;
    label: string;
    enabled: boolean;
    muted: boolean;
  };
}

export interface SystemAudioResult {
  success: boolean;
  audioFile?: string;  // Path to the recorded audio file
  duration?: number;   // Recording duration in ms
  chunks?: number;     // Number of chunks recorded
  error?: string;
}

export class SystemAudioRecorder {
  private page: Page | null = null;
  private outputDir: string;
  private options: SystemAudioRecorderOptions;
  private audioChunks: Buffer[] = [];
  private recording: boolean = false;
  private recordingStartTime: number = 0;
  private mimeType: string = 'audio/webm';

  constructor(options: SystemAudioRecorderOptions) {
    this.outputDir = options.outputDir;
    this.options = {
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      timeslice: options.timeslice || 1000,
      ...options
    };
  }

  /**
   * Attach to a page and set up the system audio capture
   */
  async attach(page: Page): Promise<void> {
    this.page = page;

    // Ensure output directory exists
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Expose callback for audio chunks
    try {
      await page.exposeFunction('__onSystemAudioChunk', async (chunk: SystemAudioChunk) => {
        this._handleAudioChunk(chunk);
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Expose callback for recording stopped
    try {
      await page.exposeFunction('__onSystemAudioStopped', async (result: { duration: number; chunks: number }) => {
        console.log(`🎙️ System audio recording stopped: ${result.duration}ms, ${result.chunks} chunks`);
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Expose callback for track ended (user stopped sharing)
    try {
      await page.exposeFunction('__onSystemAudioEnded', async () => {
        console.log('🔇 System audio track ended by user');
        this.recording = false;
      });
    } catch (e: any) {
      if (!e.message?.includes('already been registered')) throw e;
    }

    // Inject the SystemAudioCapture module
    await this._injectModule();

    console.log('✅ SystemAudioRecorder attached to page');
  }

  /**
   * Inject the browser-side SystemAudioCapture module
   */
  private async _injectModule(): Promise<void> {
    if (!this.page) {
      throw new Error('No page attached');
    }

    // Read and inject the compiled module
    const browserDir = this._getBrowserDir();
    const modulePath = path.join(browserDir, 'systemAudioCapture.js');

    if (!fs.existsSync(modulePath)) {
      throw new Error(`SystemAudioCapture module not found at ${modulePath}. Run npm run build first.`);
    }

    const moduleCode = fs.readFileSync(modulePath, 'utf-8');

    // Inject the module
    await this.page.addInitScript(`
      (function() {
        if (window.__systemAudioCapture) {
          console.log('⏩ SystemAudioCapture already loaded');
          return;
        }

        // Inject module code
        ${moduleCode.replace(/exports\.\w+\s*=/g, '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}

        // Create and expose the capture instance
        window.__systemAudioCapture = createSystemAudioCapture();
        console.log('✅ SystemAudioCapture module injected');
      })();
    `);

    // Also evaluate immediately for already-loaded pages
    try {
      const alreadyLoaded = await this.page.evaluate(() => !window.__systemAudioCapture);
      if (alreadyLoaded) {
        await this.page.evaluate(`
          (function() {
            if (window.__systemAudioCapture) return;
            ${moduleCode.replace(/exports\.\w+\s*=/g, '').replace('Object.defineProperty(exports, "__esModule", { value: true });', '')}
            window.__systemAudioCapture = createSystemAudioCapture();
          })();
        `);
      }
    } catch (e) {
      // Page might be closed or in a weird state
    }
  }

  /**
   * Get the browser code directory
   */
  private _getBrowserDir(): string {
    let browserDir = path.join(__dirname, '../browser');
    if (!fs.existsSync(path.join(browserDir, 'systemAudioCapture.js'))) {
      browserDir = path.join(__dirname, '../../dist/src/browser');
    }
    return browserDir;
  }

  /**
   * Request system audio capture permission
   * This will show the browser's screen sharing dialog
   *
   * @returns Status of the capture request
   */
  async requestCapture(): Promise<SystemAudioStatus> {
    if (!this.page) {
      throw new Error('No page attached. Call attach() first.');
    }

    console.log('🎙️ Requesting system audio capture...');
    console.log('   User will see screen sharing dialog.');
    console.log('   Make sure to check "Share audio" option.');

    const status = await this.page.evaluate(async () => {
      if (!window.__systemAudioCapture) {
        return {
          state: 'error' as const,
          error: 'SystemAudioCapture not initialized'
        };
      }
      return await window.__systemAudioCapture.requestCapture();
    });

    if (status.state === 'error') {
      console.error(`❌ System audio capture failed: ${status.error}`);
    } else if (status.state === 'recording') {
      console.log('✅ System audio track obtained:', status.trackInfo);
    }

    return status;
  }

  /**
   * Start recording the captured audio
   */
  async startRecording(): Promise<boolean> {
    if (!this.page) {
      throw new Error('No page attached. Call attach() first.');
    }

    this.audioChunks = [];
    this.recordingStartTime = Date.now();

    const success = await this.page.evaluate(async (options) => {
      if (!window.__systemAudioCapture) {
        return false;
      }
      return window.__systemAudioCapture.startRecording({
        audioBitsPerSecond: options.audioBitsPerSecond,
        timeslice: options.timeslice
      });
    }, {
      audioBitsPerSecond: this.options.audioBitsPerSecond,
      timeslice: this.options.timeslice
    });

    if (success) {
      this.recording = true;
      console.log('🎙️ System audio recording started');
    } else {
      console.error('❌ Failed to start system audio recording');
    }

    return success;
  }

  /**
   * Stop recording and save the audio file
   */
  async stopRecording(): Promise<SystemAudioResult> {
    if (!this.page) {
      return {
        success: false,
        error: 'No page attached'
      };
    }

    if (!this.recording && this.audioChunks.length === 0) {
      return {
        success: false,
        error: 'Not recording'
      };
    }

    // Stop browser-side recording
    await this.page.evaluate(() => {
      if (window.__systemAudioCapture) {
        window.__systemAudioCapture.stopCapture();
      }
    });

    this.recording = false;
    const duration = Date.now() - this.recordingStartTime;

    // Save audio chunks to file
    if (this.audioChunks.length > 0) {
      const audioFile = this._saveAudioFile();
      return {
        success: true,
        audioFile,
        duration,
        chunks: this.audioChunks.length
      };
    }

    return {
      success: false,
      error: 'No audio data captured',
      duration,
      chunks: 0
    };
  }

  /**
   * Handle an audio chunk from the browser
   */
  private _handleAudioChunk(chunk: SystemAudioChunk): void {
    try {
      // Decode base64 to buffer
      const buffer = Buffer.from(chunk.data, 'base64');
      this.audioChunks.push(buffer);
      this.mimeType = chunk.mimeType;

      // Log progress periodically
      if (chunk.index % 10 === 0) {
        console.log(`📦 System audio: ${chunk.index + 1} chunks (${this._getTotalSize()} bytes)`);
      }
    } catch (err) {
      console.error('❌ Failed to handle audio chunk:', err);
    }
  }

  /**
   * Get total size of recorded audio
   */
  private _getTotalSize(): number {
    return this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  /**
   * Save the recorded audio chunks to a file
   */
  private _saveAudioFile(): string {
    // Determine file extension from MIME type
    let ext = '.webm';
    if (this.mimeType.includes('ogg')) {
      ext = '.ogg';
    } else if (this.mimeType.includes('mp4')) {
      ext = '.mp4';
    }

    const filename = `system${ext}`;
    const filepath = path.join(this.outputDir, filename);

    // Concatenate all chunks
    const audioData = Buffer.concat(this.audioChunks);
    fs.writeFileSync(filepath, audioData);

    console.log(`✅ System audio saved: ${filepath} (${audioData.length} bytes)`);
    return filename;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Get the current status
   */
  async getStatus(): Promise<SystemAudioStatus> {
    if (!this.page) {
      return { state: 'inactive' };
    }

    return await this.page.evaluate(() => {
      if (!window.__systemAudioCapture) {
        return { state: 'inactive' as const };
      }
      return window.__systemAudioCapture.getStatus();
    });
  }
}

// Add window interface for TypeScript
declare global {
  interface Window {
    __systemAudioCapture?: {
      isSupported: () => boolean;
      getSupportedMimeType: () => string;
      requestCapture: () => Promise<SystemAudioStatus>;
      startRecording: (options?: any) => boolean;
      stopCapture: () => void;
      getStatus: () => SystemAudioStatus;
      isRecording: () => boolean;
    };
  }
}
