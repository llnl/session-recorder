/**
 * Browser-side system audio capture using getDisplayMedia API
 * Captures audio from screen/tab sharing to record meeting audio, etc.
 *
 * Key behaviors:
 * - Requests getDisplayMedia with audio: true
 * - Uses MediaRecorder to capture audio stream
 * - Sends audio chunks to Node.js via exposed function
 * - Handles permission denial gracefully
 */

export interface SystemAudioCaptureOptions {
  /** Audio MIME type (default: audio/webm;codecs=opus) */
  mimeType?: string;
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

export interface SystemAudioChunk {
  timestamp: string;  // ISO 8601 UTC
  data: string;       // Base64 encoded audio data
  mimeType: string;
  index: number;
}

export function createSystemAudioCapture() {
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioTrack: MediaStreamTrack | null = null;
  let status: SystemAudioStatus = { state: 'inactive' };
  let chunkIndex = 0;
  let recordingStartTime: number = 0;

  /**
   * Check if browser supports getDisplayMedia with audio
   */
  function isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }

  /**
   * Get supported audio MIME types for MediaRecorder
   */
  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  }

  /**
   * Request system audio capture via getDisplayMedia
   * User will see browser permission dialog to select screen/tab
   *
   * @returns Promise that resolves when audio track is obtained
   */
  async function requestCapture(): Promise<SystemAudioStatus> {
    if (!isSupported()) {
      status = {
        state: 'error',
        error: 'getDisplayMedia not supported in this browser'
      };
      return status;
    }

    status = { state: 'requesting' };

    try {
      // Request display media with audio
      // Note: Chrome requires video: true, but we can set it to minimal
      // Some browsers allow audio-only with video: false or omitted
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1 },
          height: { ideal: 1 },
          frameRate: { ideal: 1 }
        },
        audio: {
          // Disable echo cancellation and noise suppression for clean capture
          // These can interfere with system audio quality
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any); // TypeScript may not have latest DisplayMediaStreamOptions

      // Check if we got an audio track
      const audioTracks = mediaStream.getAudioTracks();

      if (audioTracks.length === 0) {
        // User might have unchecked "Share audio" option
        status = {
          state: 'error',
          error: 'No audio track obtained. Make sure "Share audio" is enabled when selecting the screen/tab.'
        };

        // Stop the video track since we don't need it
        mediaStream.getVideoTracks().forEach(track => track.stop());
        mediaStream = null;

        return status;
      }

      audioTrack = audioTracks[0];

      // Get track info for debugging
      const settings = audioTrack.getSettings();
      status = {
        state: 'recording',
        trackInfo: {
          kind: audioTrack.kind,
          label: audioTrack.label,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted
        }
      };

      console.log('✅ System audio track obtained:', {
        kind: audioTrack.kind,
        label: audioTrack.label,
        settings
      });

      // Handle track ending (user stops sharing)
      audioTrack.onended = () => {
        console.log('🔇 System audio track ended');
        stopCapture();

        // Notify Node.js
        if ((window as any).__onSystemAudioEnded) {
          (window as any).__onSystemAudioEnded();
        }
      };

      // Handle track mute/unmute
      audioTrack.onmute = () => {
        console.log('🔇 System audio muted');
        if (status.trackInfo) {
          status.trackInfo.muted = true;
        }
      };

      audioTrack.onunmute = () => {
        console.log('🔊 System audio unmuted');
        if (status.trackInfo) {
          status.trackInfo.muted = false;
        }
      };

      return status;

    } catch (err: any) {
      // Handle different error types
      let errorMessage = 'Unknown error';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. User cancelled the screen sharing dialog.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No audio source available.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Could not access the audio device.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Audio constraints could not be satisfied.';
      } else if (err.name === 'AbortError') {
        errorMessage = 'Audio capture was aborted.';
      } else {
        errorMessage = err.message || String(err);
      }

      status = {
        state: 'error',
        error: errorMessage
      };

      console.error('❌ System audio capture error:', errorMessage);
      return status;
    }
  }

  /**
   * Start recording the captured audio stream
   *
   * @param options Recording options
   */
  function startRecording(options: SystemAudioCaptureOptions = {}): boolean {
    if (!mediaStream || !audioTrack) {
      console.error('❌ No audio stream to record. Call requestCapture() first.');
      return false;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.warn('⚠️ Already recording');
      return false;
    }

    const mimeType = options.mimeType || getSupportedMimeType();
    const audioBitsPerSecond = options.audioBitsPerSecond || 128000;
    const timeslice = options.timeslice || 1000;

    try {
      // Create audio-only stream from the display media
      const audioOnlyStream = new MediaStream([audioTrack]);

      mediaRecorder = new MediaRecorder(audioOnlyStream, {
        mimeType,
        audioBitsPerSecond
      });

      chunkIndex = 0;
      recordingStartTime = Date.now();

      // Handle data chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            // Convert blob to base64
            const arrayBuffer = await event.data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );

            const chunk: SystemAudioChunk = {
              timestamp: new Date().toISOString(),
              data: base64,
              mimeType: event.data.type || mimeType,
              index: chunkIndex++
            };

            // Send chunk to Node.js
            if ((window as any).__onSystemAudioChunk) {
              await (window as any).__onSystemAudioChunk(chunk);
            }
          } catch (err) {
            console.error('❌ Failed to process audio chunk:', err);
          }
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event.error);
        status = {
          ...status,
          state: 'error',
          error: `MediaRecorder error: ${event.error?.message || 'Unknown'}`
        };
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ System audio MediaRecorder stopped');
        status = { ...status, state: 'stopped' };

        // Notify Node.js
        if ((window as any).__onSystemAudioStopped) {
          (window as any).__onSystemAudioStopped({
            duration: Date.now() - recordingStartTime,
            chunks: chunkIndex
          });
        }
      };

      // Start recording with timeslice
      mediaRecorder.start(timeslice);
      console.log(`🎙️ System audio recording started (${mimeType}, ${audioBitsPerSecond}bps)`);

      return true;

    } catch (err: any) {
      console.error('❌ Failed to start MediaRecorder:', err);
      status = {
        ...status,
        state: 'error',
        error: `Failed to start recording: ${err.message || String(err)}`
      };
      return false;
    }
  }

  /**
   * Stop recording and release resources
   */
  function stopCapture(): void {
    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    mediaRecorder = null;

    // Stop all tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    mediaStream = null;
    audioTrack = null;

    status = { state: 'stopped' };
    console.log('✅ System audio capture stopped');
  }

  /**
   * Get current capture status
   */
  function getStatus(): SystemAudioStatus {
    return { ...status };
  }

  /**
   * Check if currently recording
   */
  function isRecording(): boolean {
    return mediaRecorder?.state === 'recording';
  }

  return {
    isSupported,
    getSupportedMimeType,
    requestCapture,
    startRecording,
    stopCapture,
    getStatus,
    isRecording
  };
}
