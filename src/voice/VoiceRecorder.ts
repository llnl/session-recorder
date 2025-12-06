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
      channels: options.channels || 1
    };
  }

  /**
   * Start audio recording via Python
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

    console.log(`🐍 Using Python: ${pythonCmd}`);

    // Spawn Python process for recording
    this.pythonProcess = spawn(pythonCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']  // pipe stdin for Windows compatibility
    });

    this.outputBuffer = '';

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
            } else if (msg.type === 'ready') {
              console.log(`✅ ${msg.message}`);
            } else if (msg.type === 'error') {
              console.error(`❌ ${msg.message}`);
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
    });

    this.pythonProcess.on('exit', (code, signal) => {
      console.log(`🎙️  Python process exited (code: ${code}, signal: ${signal})`);
    });

    this.recording = true;
    console.log(`🎙️  Voice recording started: ${this.audioFilePath}`);
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
          const lines = this.outputBuffer.split('\n').filter(l => l.trim());

          // The last valid JSON line should be the transcription result
          let result: TranscriptResult | null = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(line);
                // Look for transcription result (has segments or success field)
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

      // 3. If process doesn't exit within 10 seconds, force kill
      const forceKillTimer = setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          console.error('⚠️  Force killing Python process (timeout after 10s)');
          console.error('Output buffer so far:', this.outputBuffer);
          this.pythonProcess.kill('SIGKILL');
        }
      }, 10000);

      // Clear timer if process exits normally
      this.pythonProcess.on('close', () => {
        clearTimeout(forceKillTimer);
      });
    });
  }

  /**
   * Convert Whisper transcript to SessionRecorder voice actions
   */
  convertToVoiceActions(
    transcript: TranscriptResult,
    audioFile: string,
    nearestSnapshotFinder?: (timestamp: string) => string | undefined
  ): VoiceTranscriptAction[] {
    if (!transcript.success || !transcript.segments) {
      return [];
    }

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
        audioFile
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
}
