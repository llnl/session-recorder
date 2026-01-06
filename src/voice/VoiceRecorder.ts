/**
 * Voice recording module for SessionRecorder
 * Captures audio and transcribes using Python child process
 * Python handles BOTH recording and transcription
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface VoiceRecordingOptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  device?: 'cuda' | 'mps' | 'cpu';
  sampleRate?: number;
  channels?: number;
  // TR-1: Audio compression options
  outputFormat?: 'wav' | 'mp3';  // Default: wav (mp3 requires ffmpeg)
  mp3Bitrate?: string;           // Default: 64k
  mp3SampleRate?: number;        // Default: 22050
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  words: WhisperWord[];
}

export interface TranscriptResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
  words?: WhisperWord[];
  device?: string;
  model?: string;
  timestamp?: string;
  error?: string;
  audio_path?: string;
  recording?: {
    duration: number;
    sample_rate: number;
    channels: number;
  };
}

export interface VoiceTranscriptAction {
  id: string;
  type: 'voice_transcript';
  timestamp: string;  // ISO 8601 UTC - when segment started
  transcript: {
    text: string;
    startTime: string;  // ISO 8601 UTC
    endTime: string;    // ISO 8601 UTC
    confidence: number;
    words?: Array<{
      word: string;
      startTime: string;  // ISO 8601 UTC
      endTime: string;    // ISO 8601 UTC
      probability: number;
    }>;
    // Merged segment metadata (for consecutive voice transcript merging)
    mergedSegments?: {
      count: number;           // Number of original segments merged
      originalIds: string[];   // Original segment IDs for debugging
    };
  };
  audioFile?: string;  // Relative path to audio segment
  nearestSnapshotId?: string;
}

export class VoiceRecorder {
  private recording: boolean = false;
  private pythonProcess: ChildProcess | null = null;
  private audioFilePath: string | null = null;
  private outputBuffer: string = '';
  private options: VoiceRecordingOptions;
  private sessionStartTime: number = 0;

  constructor(options: VoiceRecordingOptions = {}) {
    this.options = {
      model: options.model || 'base',
      device: options.device,
      sampleRate: options.sampleRate || 16000,
      channels: options.channels || 1,
      // TR-1: Audio compression defaults
      outputFormat: options.outputFormat || 'wav',
      mp3Bitrate: options.mp3Bitrate || '64k',
      mp3SampleRate: options.mp3SampleRate || 22050
    };
  }

  /**
   * Start audio recording via Python
   * Returns a Promise that resolves when recording has actually started
   * Python will handle both recording AND transcription when stopped
   */
  async startRecording(audioDir: string, sessionStartTime: number): Promise<void> {
    if (this.recording) {
      throw new Error('Recording already in progress');
    }

    this.sessionStartTime = sessionStartTime;
    this.audioFilePath = path.join(audioDir, 'recording.wav');

    // Ensure audio directory exists
    fs.mkdirSync(audioDir, { recursive: true });

    // Use Python script from source directory (not dist)
    // __dirname when running from dist will be: dist/src/voice
    // We need to go to: src/voice
    // From dist/src/voice -> ../../.. gets to project root, then src/voice
    const projectRoot = path.join(__dirname, '..', '..', '..');
    const srcVoiceDir = path.join(projectRoot, 'src', 'voice');
    const pythonScript = path.join(srcVoiceDir, 'record_and_transcribe.py');

    console.log(`📂 Source voice dir: ${srcVoiceDir}`);
    console.log(`🐍 Python script: ${pythonScript}`);

    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      throw new Error(`Python recording script not found: ${pythonScript}`);
    }

    // Use Python from .venv (where packages are installed)
    const venvDir = path.join(srcVoiceDir, '.venv');
    const pythonExecutable = process.platform === 'win32'
      ? path.join(venvDir, 'Scripts', 'python.exe')
      : path.join(venvDir, 'bin', 'python');

    // Check if venv Python exists, fallback to system python3
    const pythonCmd = fs.existsSync(pythonExecutable) ? pythonExecutable : 'python3';

    if (!fs.existsSync(pythonExecutable)) {
      console.warn(`⚠️  Virtual environment not found at ${venvDir}, using system python3`);
    } else {
      console.log(`✅ Found venv Python at ${pythonExecutable}`);
    }

    const args = [
      pythonScript,
      this.audioFilePath,
      '--model', this.options.model!,
      '--sample-rate', this.options.sampleRate!.toString(),
      '--channels', this.options.channels!.toString()
    ];

    if (this.options.device) {
      args.push('--device', this.options.device);
    }

    // TR-1: Add MP3 conversion options
    if (this.options.outputFormat === 'mp3') {
      args.push('--output-format', 'mp3');
      args.push('--mp3-bitrate', this.options.mp3Bitrate!);
      args.push('--mp3-sample-rate', this.options.mp3SampleRate!.toString());
    }

    console.log(`🐍 Using Python: ${pythonCmd}`);
    console.log(`🎙️  Starting voice recorder...`);

    // Return a promise that resolves when recording has actually started
    return new Promise((resolve, reject) => {
      // Spawn Python process for recording
      this.pythonProcess = spawn(pythonCmd, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.outputBuffer = '';
      let recordingStarted = false;

      // Capture status messages on stdout
      this.pythonProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer += output;

        // Log status messages with unified formatting
        const lines = output.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'status') {
                console.log(`🎙️  ${msg.message}`);
                // Check if recording has started
                if (msg.message === 'Recording started' && !recordingStarted) {
                  recordingStarted = true;
                  this.recording = true;
                  // Use the actual recording start time from Python for accurate timestamp alignment
                  if (msg.recording_start_time) {
                    const oldStartTime = this.sessionStartTime;
                    this.sessionStartTime = msg.recording_start_time;
                    const offsetMs = this.sessionStartTime - oldStartTime;
                    console.log(`🕐 Recording start offset: ${offsetMs}ms (adjusted for accurate alignment)`);
                  }
                  console.log(`✅ Voice recording ready: ${this.audioFilePath}`);
                  resolve();
                }
              } else if (msg.type === 'ready') {
                console.log(`✅ ${msg.message}`);
              } else if (msg.type === 'error') {
                console.error(`❌ ${msg.message}`);
                if (!recordingStarted) {
                  reject(new Error(msg.message));
                }
              } else if (msg.success !== undefined) {
                // This is a result object, log it
                console.log(`📋 Result: ${JSON.stringify(msg).substring(0, 200)}...`);
              }
            } catch (e) {
              // Not JSON, log as raw output
              console.log(`🎙️  ${line}`);
            }
          } else if (line.trim()) {
            // Non-JSON output from Python
            console.log(`🎙️  ${line}`);
          }
        }
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        const errors = data.toString().split('\n').filter((l: string) => l.trim());
        errors.forEach((err: string) => console.error(`⚠️  Python stderr: ${err}`));
      });

      this.pythonProcess.on('error', (error) => {
        console.error('❌ Python recording process error:', error);
        this.recording = false;
        if (!recordingStarted) {
          reject(error);
        }
      });

      this.pythonProcess.on('exit', (code, signal) => {
        console.log(`🎙️  Python process exited (code: ${code}, signal: ${signal})`);
        if (!recordingStarted) {
          reject(new Error(`Python process exited before recording started (code: ${code})`));
        }
      });
    });
  }

  /**
   * Stop recording and get transcription
   * Python handles both stopping the recording AND running transcription
   */
  async stopRecording(): Promise<TranscriptResult | null> {
    if (!this.recording || !this.pythonProcess) {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.pythonProcess) {
        resolve(null);
        return;
      }

      // Listen for process exit to get final transcription result
      this.pythonProcess.on('close', (code) => {
        this.recording = false;

        if (code !== 0 && code !== null) {
          console.error(`❌ Recording/transcription failed (exit code: ${code})`);
          resolve({
            success: false,
            error: `Process exited with code ${code}`
          });
          return;
        }

        try {
          // Extract the final JSON result from output buffer
          console.log(`📝 Output buffer length: ${this.outputBuffer.length} bytes`);

          // The result JSON is pretty-printed (multi-line), so we need to find it differently
          // Look for the final JSON object that starts with { and has "success":
          const successMatch = this.outputBuffer.match(/\{\s*\n?\s*"success":\s*true[\s\S]*?"recording":\s*\{[\s\S]*?\}\s*\}/);

          let result: TranscriptResult | null = null;

          if (successMatch) {
            try {
              result = JSON.parse(successMatch[0]);
              console.log(`✅ Found success result via regex`);
            } catch (e) {
              console.error(`Failed to parse matched JSON: ${e}`);
            }
          }

          // Fallback: try to find any JSON with segments (single line)
          if (!result) {
            const lines = this.outputBuffer.split('\n').filter(l => l.trim());
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i];
              if (line.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.segments !== undefined || parsed.success !== undefined) {
                    result = parsed;
                    console.log(`✅ Found result at line ${i}: success=${parsed.success}`);
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
            }
          }

          if (result && result.success) {
            const preview = result.text ? result.text.slice(0, 80) : '';
            const duration = result.duration ? ` (${result.duration.toFixed(1)}s)` : '';
            console.log(`✅ Transcribed${duration}: "${preview}${result.text && result.text.length > 80 ? '...' : ''}"`);
            resolve(result);
          } else {
            console.error(`❌ Transcription failed: ${result?.error || 'Unable to parse result'}`);
            console.error(`📝 Full output buffer:\n${this.outputBuffer}`);
            resolve({
              success: false,
              error: result?.error || 'Failed to parse transcription result'
            });
          }
        } catch (error) {
          console.error(`❌ Parse error: ${error}`);
          console.error(`📝 Full output buffer:\n${this.outputBuffer}`);
          resolve({
            success: false,
            error: `Failed to parse transcription: ${error}`
          });
        }
      });

      // Send SIGINT to stop recording and trigger transcription
      console.log('⏹️  Stopping recording and transcribing...');
      console.log('   (Whisper model may download on first run - please wait)');

      // For Windows compatibility: Send STOP command via stdin, then close it
      try {
        this.pythonProcess.stdin?.write('STOP\n');
        this.pythonProcess.stdin?.end();
        console.log('📝 Sent STOP command to Python process');
      } catch (e) {
        console.error('Failed to send STOP command:', e);
      }

      // DON'T send SIGINT on Windows - it kills the process immediately
      // Only send on non-Windows platforms as a backup
      if (process.platform !== 'win32') {
        try {
          this.pythonProcess.kill('SIGINT');
        } catch (e) {
          console.error('Failed to send SIGINT:', e);
        }
      }

      // No timeout - just wait for the process to complete naturally
      // The process will exit when transcription is done
    });
  }

  /**
   * Convert Whisper transcript to SessionRecorder voice actions
   * @param transcript - The Whisper transcript result
   * @param audioFile - Relative path to the audio file
   * @param nearestSnapshotFinder - Optional function to find nearest snapshot
   * @param source - Audio source: 'voice' for microphone, 'system' for display audio
   * @param idPrefix - Prefix for action IDs (default: 'voice')
   */
  convertToVoiceActions(
    transcript: TranscriptResult,
    audioFile: string,
    nearestSnapshotFinder?: (timestamp: string) => string | undefined,
    source?: 'voice' | 'system',
    idPrefix?: string
  ): VoiceTranscriptAction[] {
    if (!transcript.success || !transcript.segments) {
      return [];
    }

    const prefix = idPrefix || (source === 'system' ? 'system' : 'voice');
    const actions: VoiceTranscriptAction[] = [];
    let actionCounter = 1;

    for (const segment of transcript.segments) {
      // Convert relative timestamps to absolute UTC
      const startTime = new Date(this.sessionStartTime + segment.start * 1000);
      const endTime = new Date(this.sessionStartTime + segment.end * 1000);

      // Convert words to absolute timestamps
      const words = segment.words?.map(word => ({
        word: word.word,
        startTime: new Date(this.sessionStartTime + word.start * 1000).toISOString(),
        endTime: new Date(this.sessionStartTime + word.end * 1000).toISOString(),
        probability: word.probability
      }));

      const action: VoiceTranscriptAction = {
        id: `${prefix}-${actionCounter++}`,
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
        ...(source && { source })  // Only include source if defined
      };

      // Find nearest snapshot if finder provided
      if (nearestSnapshotFinder) {
        action.nearestSnapshotId = nearestSnapshotFinder(action.timestamp);
      }

      actions.push(action);
    }

    return actions;
  }

  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Transcribe an existing audio file using Whisper
   * This is a static-like method that doesn't require recording state
   *
   * @param audioFilePath - Absolute path to the audio file
   * @param options - Transcription options
   * @returns TranscriptResult
   */
  async transcribeFile(
    audioFilePath: string,
    options?: {
      model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
      device?: 'cuda' | 'mps' | 'cpu';
    }
  ): Promise<TranscriptResult> {
    const model = options?.model || this.options.model || 'base';
    const device = options?.device || this.options.device;

    // Use Python script for transcription only (using --transcribe-only flag)
    const projectRoot = path.join(__dirname, '..', '..');
    const srcVoiceDir = path.join(projectRoot, 'src', 'voice');
    const pythonScript = path.join(srcVoiceDir, 'record_and_transcribe.py');

    if (!fs.existsSync(pythonScript)) {
      return {
        success: false,
        error: `Python script not found: ${pythonScript}`
      };
    }

    // Use Python from .venv
    const venvDir = path.join(srcVoiceDir, '.venv');
    const pythonExecutable = process.platform === 'win32'
      ? path.join(venvDir, 'Scripts', 'python.exe')
      : path.join(venvDir, 'bin', 'python');

    const pythonCmd = fs.existsSync(pythonExecutable) ? pythonExecutable : 'python3';

    const args = [
      pythonScript,
      audioFilePath,
      '--model', model,
      '--transcribe-only'
    ];

    if (device) {
      args.push('--device', device);
    }

    console.log(`🎙️  Transcribing audio file: ${audioFilePath}`);
    console.log(`   Using model: ${model}, device: ${device || 'auto'}`);

    return new Promise((resolve) => {
      const pythonProcess = spawn(pythonCmd, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputBuffer = '';

      pythonProcess.stdout?.on('data', (data) => {
        outputBuffer += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        const errors = data.toString().split('\n').filter((l: string) => l.trim());
        errors.forEach((err: string) => console.error(`⚠️  Whisper stderr: ${err}`));
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`❌ Transcription failed (exit code: ${code})`);
          resolve({
            success: false,
            error: `Process exited with code ${code}`
          });
          return;
        }

        try {
          // Parse result from output
          const successMatch = outputBuffer.match(/\{\s*\n?\s*"success":\s*true[\s\S]*?"segments":\s*\[[\s\S]*?\]\s*\}/);

          if (successMatch) {
            const result = JSON.parse(successMatch[0]);
            console.log(`✅ Transcription complete: ${result.text?.slice(0, 80)}...`);
            resolve(result);
          } else {
            // Try to find any JSON with segments (single line)
            const lines = outputBuffer.split('\n').filter(l => l.trim());
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i];
              if (line.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.segments !== undefined || parsed.success !== undefined) {
                    if (parsed.success) {
                      console.log(`✅ Transcription complete: ${parsed.text?.slice(0, 80)}...`);
                    }
                    resolve(parsed);
                    return;
                  }
                } catch {
                  continue;
                }
              }
            }

            console.error('❌ Could not parse transcription result');
            resolve({
              success: false,
              error: 'Failed to parse transcription result'
            });
          }
        } catch (error) {
          console.error(`❌ Parse error: ${error}`);
          resolve({
            success: false,
            error: `Failed to parse transcription: ${error}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('❌ Transcription process error:', error);
        resolve({
          success: false,
          error: `Process error: ${error.message}`
        });
      });
    });
  }

  /**
   * Set session start time (used for timestamp alignment when transcribing external files)
   */
  setSessionStartTime(startTime: number): void {
    this.sessionStartTime = startTime;
  }

  /**
   * Get session start time
   */
  getSessionStartTime(): number {
    return this.sessionStartTime;
  }
}
