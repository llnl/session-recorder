# Voice Recording Setup

## Architecture

**Python handles BOTH audio recording AND transcription** in a single unified process:

- TypeScript spawns `record_and_transcribe.py`
- Python records audio using `sounddevice`
- On stop signal (SIGINT), Python transcribes with Whisper
- Final transcript returned as JSON to TypeScript

This architecture simplifies IPC and eliminates TypeScript audio dependencies.

## Python Dependencies

The voice recording feature requires Python 3.8+ and the following packages.

### Quick Install

```bash
cd src/voice
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

### Manual Install

```bash
# Required packages
pip install sounddevice soundfile openai-whisper torch numpy
```

### Optional: GPU Acceleration

For **10x faster transcription**, install GPU support:

**CUDA (NVIDIA GPUs):**

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

**MPS (Apple Silicon M1/M2/M3):**

```bash
# PyTorch with MPS support is included by default on macOS
pip install torch
```

### System Requirements

**macOS:**

- No additional system dependencies
- Python packages handle audio capture

**Windows:**

- No additional system dependencies
- Python packages handle audio capture

**Linux:**

- May need: `sudo apt install portaudio19-dev python3-dev`

## Whisper Models

Available models (trade-off between speed and accuracy):

| Model  | Size | Speed (CPU) | Speed (GPU) | Accuracy | Use Case |
|--------|------|-------------|-------------|----------|----------|
| tiny   | 39M  | ~10s / min  | ~1s / min   | Good     | Quick tests |
| base   | 74M  | ~20s / min  | ~2s / min   | Better   | **Default - balanced** |
| small  | 244M | ~60s / min  | ~5s / min   | Great    | High quality |
| medium | 769M | ~120s / min | ~10s / min  | Excellent| Production |
| large  | 1.5G | ~300s / min | ~20s / min  | Best     | Maximum accuracy |

**Recommendation:** Use `base` (default) for most cases. The model is downloaded automatically on first use.

## Usage

### Basic Usage

```typescript
import { SessionRecorder } from './src/node/SessionRecorder';

const recorder = new SessionRecorder('session-1', {
  browser_record: true,   // Capture DOM + actions
  voice_record: true,     // Capture audio + transcript
  whisper_model: 'base'   // Optional: default is 'base'
});

await recorder.start(page);
// User interacts and speaks
await recorder.stop();
await recorder.createZip();
```

### Voice-Only Recording

```typescript
const recorder = new SessionRecorder('voice-only', {
  browser_record: false,  // No DOM snapshots
  voice_record: true,
  whisper_model: 'tiny'   // Faster for voice-only
});
```

### Browser-Only Recording (Original Behavior)

```typescript
const recorder = new SessionRecorder('browser-only', {
  browser_record: true,
  voice_record: false     // No voice (default)
});

// Or simply:
const recorder = new SessionRecorder('browser-only');
```

## Testing

Run the voice recording test:

```bash
npm run build
npm run test:voice
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:voice": "node dist/test/voice-test.js"
  }
}
```

## Troubleshooting

### "Python process exited with code 1"

**Solution:** Install Python dependencies:

```bash
cd src/voice
pip install -r requirements.txt
```

### "Python recording script not found"

**Solution:** Ensure TypeScript is compiled:

```bash
npm run build
```

The script should be at: `dist/voice/record_and_transcribe.py`

### "Required packages not installed" error

**Solution:** Install missing packages:

```bash
pip install sounddevice soundfile openai-whisper torch numpy
```

Or use requirements.txt:

```bash
pip install -r src/voice/requirements.txt
```

### "Failed to start recording: microphone not found"

**Solutions:**

- Check microphone permissions in system settings
- Ensure microphone is connected and not in use by another app
- On Linux, you may need: `sudo apt install portaudio19-dev`
- Test microphone with: `python -c "import sounddevice; print(sounddevice.query_devices())"`

### Slow transcription (CPU fallback)

**Solution:** Install GPU support for 10x speedup:

- **NVIDIA**: `pip install torch --index-url https://download.pytorch.org/whl/cu118`
- **Apple Silicon**: PyTorch automatically uses MPS
- **Check device**: Look for `"device": "cuda"/"mps"/"cpu"` in console output or transcript.json

### ImportError: No module named 'sounddevice'

**Solution:** Install sounddevice:

```bash
pip install sounddevice soundfile
```

On Linux, you may also need system libraries:

```bash
sudo apt install portaudio19-dev python3-dev
```

## How It Works

1. **Recording Start**
   - TypeScript spawns `record_and_transcribe.py` with output path and model
   - Python starts recording audio to memory buffer using `sounddevice`
   - Status messages streamed to TypeScript: `{"type": "status", "message": "Recording started"}`

2. **Recording Active**
   - Python continuously captures audio frames
   - TypeScript monitors status messages
   - User speaks and interacts with browser

3. **Recording Stop**
   - TypeScript sends SIGINT signal to Python process
   - Python stops recording and saves WAV file
   - Python loads Whisper model and transcribes with word-level timestamps
   - Python outputs final JSON with recording info + transcription
   - TypeScript parses result and merges voice actions with browser actions

4. **Result**
   - Voice transcript segments become `voice_transcript` actions
   - Actions sorted chronologically (browser + voice intermixed)
   - Nearest snapshot ID attached to each voice action for context

## Output Structure

After recording with voice enabled:

```text
session-id/
├── session.json           # Session metadata + actions (browser + voice)
├── transcript.json        # Full Whisper transcript with word-level timestamps
├── audio/
│   └── recording.wav      # Raw audio recording (16kHz, mono, WAV)
├── snapshots/            # HTML snapshots (if browser_record=true)
│   ├── action-1-before.html
│   └── ...
├── screenshots/          # Screenshots (if browser_record=true)
│   ├── action-1-before.png
│   └── ...
└── resources/           # CSS, JS, images (if browser_record=true)
    └── ...
```

## session.json Structure

Voice transcript actions are merged with browser actions chronologically:

```json
{
  "sessionId": "session-1",
  "startTime": "2025-12-06T10:00:00.000Z",
  "endTime": "2025-12-06T10:05:00.000Z",
  "actions": [
    {
      "id": "action-1",
      "type": "click",
      "timestamp": "2025-12-06T10:00:05.000Z",
      "before": { "snapshotFile": "snapshots/action-1-before.html", ... },
      "action": { "type": "click", "selector": "#submit-btn", ... },
      "after": { "snapshotFile": "snapshots/action-1-after.html", ... }
    },
    {
      "id": "voice-1",
      "type": "voice_transcript",
      "timestamp": "2025-12-06T10:00:06.000Z",
      "transcript": {
        "text": "Now I'm going to click the submit button",
        "startTime": "2025-12-06T10:00:06.000Z",
        "endTime": "2025-12-06T10:00:08.500Z",
        "confidence": 0.95,
        "words": [
          {
            "word": "Now",
            "startTime": "2025-12-06T10:00:06.000Z",
            "endTime": "2025-12-06T10:00:06.200Z",
            "probability": 0.98
          },
          {
            "word": "I'm",
            "startTime": "2025-12-06T10:00:06.200Z",
            "endTime": "2025-12-06T10:00:06.400Z",
            "probability": 0.99
          }
          // ... more words
        ]
      },
      "audioFile": "audio/recording.wav",
      "nearestSnapshotId": "action-1"
    }
  ],
  "voiceRecording": {
    "enabled": true,
    "audioFile": "audio/recording.wav",
    "transcriptFile": "transcript.json",
    "model": "base",
    "device": "cuda",  // or "mps" or "cpu"
    "language": "en",
    "duration": 45.2
  }
}
```

## transcript.json Structure

Full Whisper transcription with all metadata:

```json
{
  "success": true,
  "text": "Now I'm going to click the submit button. Then I'll verify the form was submitted correctly.",
  "language": "en",
  "duration": 8.5,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 2.5,
      "text": "Now I'm going to click the submit button",
      "confidence": -0.051,  // log probability
      "words": [ /* word-level data */ ]
    }
  ],
  "words": [ /* all words from all segments */ ],
  "device": "cuda",
  "model": "base",
  "timestamp": "2025-12-06T10:05:00.123Z",
  "audio_path": "/path/to/audio/recording.wav",
  "recording": {
    "duration": 8.5,
    "sample_rate": 16000,
    "channels": 1
  }
}
```

## Viewer Integration

The session viewer displays voice transcripts alongside browser actions:

### Timeline

- **Green bars** represent voice segments
- **Hover** shows transcript preview tooltip
- **Click** jumps to voice tab and plays audio

### Action List

- Voice entries intermixed with browser actions chronologically
- **Microphone icon** indicates voice transcript
- Shows transcript text and confidence percentage
- Click to play audio and highlight words

### Voice Tab

- Full transcript with word-level highlighting
- Audio playback controls (play/pause, speed control)
- Click any word to seek to that position
- Progress bar synced with audio

## API Reference

### SessionRecorder Options

```typescript
interface SessionRecorderOptions {
  browser_record?: boolean;     // Capture DOM snapshots (default: true)
  voice_record?: boolean;        // Capture voice + transcript (default: false)
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';  // default: 'base'
  whisper_device?: 'cuda' | 'mps' | 'cpu';  // Auto-detected if not specified
}
```

### VoiceRecorder Options

```typescript
interface VoiceRecordingOptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';  // default: 'base'
  device?: 'cuda' | 'mps' | 'cpu';      // Auto-detected if not specified
  sampleRate?: number;                   // default: 16000
  channels?: number;                     // default: 1 (mono)
}
```

### VoiceTranscriptAction

```typescript
interface VoiceTranscriptAction {
  id: string;                    // e.g., "voice-1"
  type: 'voice_transcript';
  timestamp: string;             // ISO 8601 UTC
  transcript: {
    text: string;                // Segment text
    startTime: string;           // ISO 8601 UTC
    endTime: string;             // ISO 8601 UTC
    confidence: number;          // 0.0 - 1.0
    words?: Array<{
      word: string;
      startTime: string;         // ISO 8601 UTC
      endTime: string;           // ISO 8601 UTC
      probability: number;       // 0.0 - 1.0
    }>;
  };
  audioFile?: string;            // Relative path to audio
  nearestSnapshotId?: string;    // Closest browser action
}
```
