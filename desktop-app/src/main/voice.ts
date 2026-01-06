/**
 * Voice Recorder Process Manager
 *
 * Handles spawning and communicating with the voice-recorder executable
 * or Python fallback in development mode.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface VoiceRecorderOptions {
  executablePath: string;
  usePythonFallback: boolean;
  pythonScriptPath?: string;
  outputPath: string;
  format: 'wav' | 'mp3';
  model: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  device?: string;  // Audio device index or name
  mp3Bitrate?: string;
  mp3SampleRate?: number;
}

export interface TranscriptResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  segments?: TranscriptSegment[];
  words?: TranscriptWord[];
  error?: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  words: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export class VoiceRecorderProcess extends EventEmitter {
  private options: VoiceRecorderOptions;
  private process: ChildProcess | null = null;
  private isRunning = false;
  private outputBuffer = '';
  private errorBuffer = '';

  constructor(options: VoiceRecorderOptions) {
    super();
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Voice recorder is already running');
    }

    // Build command and arguments
    const { command, args } = this.buildCommand();

    console.log(`Starting voice recorder: ${command} ${args.join(' ')}`);

    // Ensure output directory exists
    const outputDir = path.dirname(this.options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Spawn process
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    this.isRunning = true;

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const text = data.toString();
      this.outputBuffer += text;
      this.parseOutput(text);
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      const text = data.toString();
      this.errorBuffer += text;
      console.error('Voice recorder stderr:', text);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });

    // Handle process error
    this.process.on('error', (error) => {
      this.isRunning = false;
      this.emit('error', error);
    });

    // Wait for "Recording started" message
    await this.waitForStart();
  }

  async stop(): Promise<TranscriptResult | null> {
    if (!this.isRunning || !this.process) {
      console.warn('Voice recorder is not running');
      return null;
    }

    console.log('Stopping voice recorder...');

    // Send STOP command to stdin
    this.process.stdin?.write('STOP\n');

    // Wait for process to exit and parse final output
    // No timeout - transcription of long recordings can take significant time
    return new Promise((resolve) => {
      this.process?.on('exit', () => {
        // Parse final result from output
        const result = this.parseFinalResult();
        resolve(result);
      });
    });
  }

  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.isRunning = false;
    }
  }

  isRecording(): boolean {
    return this.isRunning;
  }

  private buildCommand(): { command: string; args: string[] } {
    const args: string[] = [];

    if (this.options.usePythonFallback && this.options.pythonScriptPath) {
      // Use Python script (development mode)
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      args.push(this.options.pythonScriptPath);
      args.push('record');
      args.push('--output', this.options.outputPath);
      args.push('--format', this.options.format);
      args.push('--model', this.options.model);

      if (this.options.device) {
        args.push('--device', this.options.device);
      }

      if (this.options.format === 'mp3') {
        if (this.options.mp3Bitrate) {
          args.push('--mp3-bitrate', this.options.mp3Bitrate);
        }
        if (this.options.mp3SampleRate) {
          args.push('--mp3-sample-rate', this.options.mp3SampleRate.toString());
        }
      }

      return { command: pythonCmd, args };
    } else {
      // Use bundled executable
      args.push('record');
      args.push('--output', this.options.outputPath);
      args.push('--format', this.options.format);
      args.push('--model', this.options.model);

      if (this.options.device) {
        args.push('--device', this.options.device);
      }

      if (this.options.format === 'mp3') {
        if (this.options.mp3Bitrate) {
          args.push('--mp3-bitrate', this.options.mp3Bitrate);
        }
        if (this.options.mp3SampleRate) {
          args.push('--mp3-sample-rate', this.options.mp3SampleRate.toString());
        }
      }

      return { command: this.options.executablePath, args };
    }
  }

  private async waitForStart(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Voice recorder start timed out'));
      }, 30000);  // 30 second timeout

      const checkStart = () => {
        if (this.outputBuffer.includes('"message": "Recording started"') ||
            this.outputBuffer.includes('"type": "ready"')) {
          clearTimeout(timeout);
          resolve();
        } else if (!this.isRunning) {
          clearTimeout(timeout);
          reject(new Error(`Voice recorder exited unexpectedly: ${this.errorBuffer}`));
        } else {
          setTimeout(checkStart, 100);
        }
      };

      checkStart();
    });
  }

  private parseOutput(text: string): void {
    // Parse JSON messages from voice recorder
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);

        if (message.type === 'status') {
          this.emit('status', message);
        } else if (message.type === 'warning') {
          this.emit('warning', message);
        } else if (message.type === 'error') {
          this.emit('error', new Error(message.message || message.error));
        }
      } catch {
        // Not a JSON line, ignore
      }
    }
  }

  private parseFinalResult(): TranscriptResult | null {
    // Find the final JSON result in output buffer
    const lines = this.outputBuffer.split('\n').filter(line => line.trim());

    // Look for result from the end
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const result = JSON.parse(lines[i]);

        // Check if this looks like a final result
        if ('success' in result && ('text' in result || 'error' in result)) {
          return {
            success: result.success,
            text: result.text,
            language: result.language,
            duration: result.duration,
            segments: result.segments,
            words: result.words,
            error: result.error
          };
        }

        // Check for transcription result nested in response
        if (result.transcription) {
          return {
            success: result.transcription.success,
            text: result.transcription.text,
            language: result.transcription.language,
            duration: result.transcription.duration,
            segments: result.transcription.segments,
            words: result.transcription.words,
            error: result.transcription.error
          };
        }
      } catch {
        // Not a valid JSON line
      }
    }

    return null;
  }
}
