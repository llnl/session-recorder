# PRD-4: Production Polish & Voice Recording Integration

**Version:** 4.0
**Date:** 2025-12-05
**Status:** 🎯 PLANNED - Production Readiness & Voice Integration
**Depends On:** PRD-3.md (Snapshot Architecture Improvements)

---

## Executive Summary

Session Recorder is now functional with comprehensive browser action recording and an advanced viewer. PRD-4 focuses on making this tool **production-ready** for company-wide adoption through four key initiatives:

1. **Voice Recording in SessionRecorder:** Direct integration with Python child process for millisecond-precise transcription
2. **Viewer Voice Integration:** Timeline, action list, and transcript viewer enhancements
3. **Desktop Application:** Enable non-developers to easily record sessions
4. **MCP Server:** Enable developers with AI coding assistants to record sessions

**Target Users:**

- **Developers:** Engineers creating QA sessions, bug reports, tutorials (SessionRecorder)
- **Non-Developers:** QA testers, product managers, support staff (Desktop App)
- **AI-Assisted Developers:** Engineers using Claude Code, Cline, Continue.dev (MCP Server)

---

## 1. Problem Statement

**Current State:** Session recorder captures browser actions but lacks voice context and easy access:

- ❌ No way to capture verbal explanations during testing
- ❌ Cannot correlate spoken instructions with browser actions
- ❌ No precise timestamp alignment between speech and actions
- ❌ Non-developers cannot easily use the tool
- ❌ No integration for AI coding assistants

**Remaining Gaps:**

- ❌ Cannot capture voice explanations during recording
- ❌ No word-level timestamp synchronization
- ❌ Timeline doesn't show voice annotations
- ❌ Requires technical knowledge to use
- ❌ No MCP integration for AI assistants

---

## 2. Goals & Four Key Initiatives

### Primary Goal

Make session recording accessible and feature-rich for all users with **millisecond-precise voice integration**.

### Initiative 1: Voice Recording in SessionRecorder (Core - Phase 1)

**Target Users:** Developers, QA Testers, Technical Writers

**Requirements:**

```typescript
new SessionRecorder(sessionId, {
  browser_record: boolean,  // Capture DOM + actions
  voice_record: boolean,    // Capture audio + transcript
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium'
})
```

- At least one must be `true` (both can be `true`)
- Python child process for audio capture and Whisper transcription
- Word-level timestamps with millisecond precision
- Automatic alignment of voice segments to browser timeline

**Example Usage:**

```typescript
const recorder = new SessionRecorder('test-123', {
  browser_record: true,
  voice_record: true,
  whisper_model: 'base'
});

await recorder.start(page);
// User interacts and speaks
await recorder.stop();

const zipPath = await recorder.createZip();
// Zip contains: session.json, snapshots/, audio/, transcript
```

### Initiative 2: Viewer Voice Integration (Core - Phase 1)

**Requirements:**

- **Timeline:** Green bars showing voice segments with hover tooltips
- **Action List:** Intermix voice transcripts with browser actions chronologically
- **VoiceTranscriptViewer:** Interactive component with:
  - Full transcript display
  - Word-level highlighting during audio playback
  - Click word to seek audio
  - Speed control (0.5x - 2x)

**UI Preview:**

```
Timeline: 0s    5s    10s    15s
         │     │     │      │
         🖱️    ⌨️    🖱️     ⌨️   ← Browser actions
         ▓▓▓░░░░░░░▓▓▓▓░░   ← Voice (green bars)

Action List:
  🖱️ 2.45s click
  🎙️ 3.12s "Click on the button..." (2.3s) 97%
  ⌨️ 5.60s input
  🎙️ 6.80s "Now let me..." (1.8s) 94%
```

### Initiative 3: Desktop Application (Optional - Future Phase)

**Target Users:** QA, PM, Support, Designers

**Features:**

- One-click "Record" button
- Recording mode selector (Browser / Voice / Both)
- Auto zip creation + viewer link
- Cross-platform (Windows, macOS, Linux)

**User Flow:**

1. Launch Desktop App
2. Click "New Recording"
3. Select mode (Browser + Voice)
4. Start Recording → Browser opens
5. Perform actions & speak
6. Close browser → Auto-creates zip
7. Success notification with viewer URL

### Initiative 4: MCP Server (Optional - Future Phase)

**Target Users:** Developers using Claude Code, Cline, Continue.dev

**MCP Tools:**

- `start_combined_recording`: Browser + voice
- `start_browser_recording`: Browser only
- `start_voice_recording`: Voice only
- `stop_recording`: Stop and create zip
- `get_recording_status`: Check status

**User Flow:**

1. Developer: "Record my browser session with voice"
2. AI calls `start_combined_recording`
3. Browser opens, developer acts & speaks
4. Developer: "Stop recording"
5. AI calls `stop_recording`
6. AI provides zip path + viewer link

---

## 3. Technical Architecture

### 3.1 Voice Recording - TypeScript + Python Integration

**SessionRecorder (TypeScript):**

```typescript
// src/node/SessionRecorder.ts
export class SessionRecorder {
  private voiceRecorder: VoiceRecorder | null = null;
  private browserStartTime: number = 0;

  constructor(sessionId: string, options: SessionRecorderOptions) {
    if (!options.browser_record && !options.voice_record) {
      throw new Error('At least one must be true');
    }

    if (options.voice_record) {
      this.voiceRecorder = new VoiceRecorder({
        model: options.whisper_model || 'base',
        sessionId
      });
    }
  }

  async start(page: Page) {
    this.browserStartTime = Date.now();

    await Promise.all([
      this.options.browser_record ? this.startBrowserRecording() : null,
      this.options.voice_record ? this.voiceRecorder.start(this.browserStartTime) : null
    ]);
  }

  async stop() {
    const [, transcript] = await Promise.all([
      this.options.browser_record ? this.stopBrowserRecording() : null,
      this.options.voice_record ? this.voiceRecorder.stopAndTranscribe() : null
    ]);

    this.voiceTranscript = transcript;
  }
}
```

**VoiceRecorder (TypeScript - Child Process Wrapper):**

```typescript
// src/node/VoiceRecorder.ts
import { spawn, ChildProcess } from 'child_process';

export class VoiceRecorder {
  private pythonProcess: ChildProcess | null = null;

  async start(browserStartTime: number) {
    this.pythonProcess = spawn('python', [
      'python/record_audio.py',
      '--session-id', this.sessionId,
      '--model', this.model,
      '--browser-start-time', browserStartTime.toString()
    ]);

    // Parse: RECORDING_STARTED filepath:...
    this.pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('RECORDING_STARTED')) {
        const match = output.match(/filepath:(.+)$/);
        if (match) this.audioFilePath = match[1].trim();
      }
    });
  }

  async stopAndTranscribe(): Promise<TranscriptResult> {
    this.pythonProcess!.stdin?.write('STOP\n');

    // Wait for: TRANSCRIPT_JSON:{...}
    return new Promise((resolve, reject) => {
      let buffer = '';
      this.pythonProcess!.stdout?.on('data', (data) => {
        buffer += data.toString();
        if (buffer.includes('TRANSCRIPT_JSON:')) {
          const match = buffer.match(/TRANSCRIPT_JSON:(.+)$/s);
          if (match) resolve(JSON.parse(match[1]));
        }
      });
      setTimeout(() => reject(new Error('Timeout')), 60000);
    });
  }
}
```

**Python Audio Recorder:**

```python
# python/record_audio.py
import sounddevice as sd
import whisper
import sys
import json

class AudioRecorder:
    def __init__(self, session_id, model_name='base'):
        self.model = whisper.load_model(model_name)
        self.sample_rate = 16000

    def start_recording(self):
        self.filepath = f'audio/recording_{timestamp}.wav'
        # Start audio stream...
        print(f'RECORDING_STARTED filepath:{self.filepath}')
        sys.stdout.flush()

    def stop_and_transcribe(self):
        # Stop stream, save WAV

        result = self.model.transcribe(
            audio_float,
            word_timestamps=True  # ← CRITICAL
        )

        segments = []
        for seg in result['segments']:
            words = []
            for word in seg['words']:
                words.append({
                    'word': word['word'],
                    'start': word['start'],
                    'end': word['end'],
                    'absolute_start_ms': browser_start_ms + int(word['start'] * 1000),
                    'absolute_end_ms': browser_start_ms + int(word['end'] * 1000),
                    'probability': word.get('probability', 0.95)
                })
            segments.append({
                'id': seg['id'],
                'start': seg['start'],
                'end': seg['end'],
                'text': seg['text'],
                'words': words
            })

        transcript = {
            'text': result['text'],
            'language': result.get('language', 'en'),
            'segments': segments
        }

        print('TRANSCRIPTION_COMPLETE')
        print(f'TRANSCRIPT_JSON:{json.dumps(transcript)}')
        sys.stdout.flush()
```

### 3.2 Data Format

**Session JSON with Voice:**

```json
{
  "sessionId": "session-1733400000000",
  "startTime": "2025-12-05T10:23:45.000Z",
  "endTime": "2025-12-05T10:28:30.123Z",
  "voiceRecording": {
    "enabled": true,
    "audioFile": "audio/recording_20251205_102345.wav",
    "duration": 285.6,
    "segmentCount": 12
  },
  "transcript": {
    "text": "Click on the login button to test authentication",
    "language": "en",
    "segments": [
      {
        "id": 1,
        "start": 0.0,
        "end": 3.32,
        "text": "Click on the login button",
        "words": [
          {
            "word": "Click",
            "start": 0.0,
            "end": 0.22,
            "absolute_start_ms": 1733400225000,
            "absolute_end_ms": 1733400225220,
            "probability": 0.98
          }
        ]
      }
    ]
  },
  "actions": [
    {
      "id": "action-1",
      "timestamp": "2025-12-05T10:23:45.234Z",
      "type": "click"
    }
  ]
}
```

**Zip Structure:**

```
session-1733400000000.zip
├── session.json              ← Contains transcript with word-level timestamps
├── audio/
│   └── recording_20251205_102345.wav  ← Raw audio for playback
├── snapshots/
│   ├── action-1-before.html
│   └── action-1-after.html
└── screenshots/
    └── action-1-before.png
```

**Note:** The `session.json` file contains the complete transcript with word-level timestamps in the `transcript` field (see Data Format section above). The WAV file is only for audio playback in the viewer.

### 3.3 Viewer UI Components

**Timeline:**

```tsx
// viewer/src/components/Timeline/Timeline.tsx
const renderVoiceSegments = () => {
  return transcript.segments.map(segment => {
    const startMs = segment.words[0].absolute_start_ms;
    const endMs = segment.words[last].absolute_end_ms;
    const x = timeToPixel(startMs);
    const width = (endMs - startMs) / 1000 * PIXELS_PER_SECOND;

    ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
    ctx.fillRect(x, timelineHeight - 20, width, 15);
  });
};
```

**Action List:**

```tsx
// Merge voice with actions
const merged = [...actions];
segments.forEach(seg => {
  merged.push({
    id: `voice-${seg.id}`,
    type: 'voice_transcript',
    timestamp: seg.words[0].absolute_start_ms,
    segment: seg
  });
});

merged.sort((a, b) => a.timestamp - b.timestamp);
```

**VoiceTranscriptViewer:**

```tsx
export const VoiceTranscriptViewer = ({ segment, audioUrl }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(null);

  const handleWordClick = (i) => {
    const seekTime = (segment.words[i].absolute_start_ms -
                      segment.words[0].absolute_start_ms) / 1000;
    audioRef.current.currentTime = seekTime;
    audioRef.current.play();
  };

  return (
    <div className="transcript-text">
      {segment.words.map((word, i) => (
        <span
          className={i === currentWordIndex ? 'word active' : 'word'}
          onClick={() => handleWordClick(i)}
        >
          {word.word}{' '}
        </span>
      ))}
      <audio ref={audioRef} src={audioUrl} controls />
    </div>
  );
};
```

### 3.4 Desktop Application (Future)

**Electron Structure:**

```
session-recorder-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts           # Electron entry
│   │   └── recording.ts      # Wraps SessionRecorder
│   └── renderer/
│       ├── App.tsx
│       └── RecordingControls.tsx
```

**Recording Manager:**

```typescript
// Wraps SessionRecorder for Electron
export class RecordingManager {
  private recorder: SessionRecorder | null = null;

  async startRecording(config: {
    title: string;
    mode: 'browser' | 'voice' | 'both';
    browserType: string;
  }) {
    this.recorder = new SessionRecorder(config.title, {
      browser_record: config.mode !== 'voice',
      voice_record: config.mode !== 'browser',
      whisper_model: 'base'
    });

    await this.recorder.start(page);
  }
}
```

### 3.5 MCP Server (Future)

**MCP Tools:**

```typescript
// session-recorder-mcp/src/index.ts
import { McpServer } from '@anthropic-ai/sdk/mcp';
import { SessionRecorder } from '@session-recorder/core';

server.addTool({
  name: 'start_combined_recording',
  handler: async (input) => {
    const recorder = new SessionRecorder(input.title, {
      browser_record: true,
      voice_record: true,
      whisper_model: input.whisperModel || 'base'
    });

    await recorder.start(page);

    return {
      success: true,
      message: 'Recording started'
    };
  }
});
```

---

## 4. Implementation Roadmap

### Phase 1: Voice Recording Backend (16 hours) - **CORE**

1. **Audio Capture Enhancements** (4h)
   - Level meter visualization
   - Noise gate/detection
   - Audio quality validation

2. **Whisper Integration** (4h)
   - Python child process wrapper
   - Word-level timestamp extraction
   - GPU/CPU auto-detection

3. **Timestamp Alignment** (3h)
   - UTC reference point synchronization
   - Millisecond precision conversion
   - Browser action correlation

4. **Transcript Storage** (2h)
   - Session.json integration
   - Word-level data format

5. **Testing** (3h)
   - Unit tests for transcription
   - Integration tests for alignment
   - End-to-end voice recording tests

### Phase 2: Viewer Integration (14 hours) - **CORE**

1. **Timeline Voice Indicators** (4h)
   - Green voice segment bars
   - Hover tooltips with preview
   - Click navigation

2. **Action List Voice Entries** (3h)
   - Chronological intermixing
   - Voice entry styling
   - Confidence display

3. **VoiceTranscriptViewer Component** (4h)
   - Full transcript display
   - Word-level highlighting
   - Audio playback controls
   - Click-to-seek functionality

4. **Audio Playback Controls** (3h)
   - Speed control (0.5x - 2x)
   - Progress tracking
   - Word synchronization

### Phase 3: Testing & Documentation (Phases 1-2) (4 hours) - **CORE**

1. **Voice Recording Tests** (2h)
   - Unit and integration tests
   - Error handling scenarios

2. **Viewer Tests** (1h)
   - Timeline rendering
   - Action list ordering
   - Audio playback

3. **Documentation** (1h)
   - Voice recording guide
   - Viewer features guide

**Subtotal Core Features:** 34 hours

---

### Phase 4: MCP Server (12 hours) - **OPTIONAL FUTURE**

1. **MCP Server Setup** (3h)
   - Project initialization
   - Tool registration
   - Claude Desktop configuration

2. **Tool Implementations** (5h)
   - start_browser_recording
   - start_voice_recording
   - start_combined_recording
   - stop_recording
   - get_recording_status

3. **SessionRecorder Integration** (2h)
   - RecordingManager wrapper
   - Status tracking

4. **Error Handling** (2h)
   - Tool validation
   - Error responses

### Phase 5: Desktop Application (20 hours) - **OPTIONAL FUTURE**

1. **Electron Structure** (4h)
   - Main process setup
   - Renderer UI
   - IPC communication
   - Build configuration

2. **Recording Controls UI** (3h)
   - React components
   - Form inputs
   - Status display

3. **Voice Integration** (5h)
   - Audio capture module
   - Transcription service
   - Timestamp alignment

4. **Browser Automation** (3h)
   - RecordingManager implementation
   - Playwright integration
   - Session merging

5. **Zip + Viewer Link** (2h)
   - Auto zip creation
   - Viewer URL generation
   - Notifications

6. **Testing** (3h)
   - End-to-end scenarios
   - Error handling
   - Cross-platform validation

### Phase 6: Final Testing & Documentation (12 hours) - **OPTIONAL FUTURE**

1. **End-to-End Testing** (4h)
   - Desktop app tests
   - MCP server tests
   - Viewer integration tests

2. **User Documentation** (4h)
   - Desktop app user guide
   - MCP server setup guide
   - Troubleshooting guides

3. **Deployment Guides** (4h)
   - Desktop app distribution
   - MCP server publishing
   - Auto-update setup

**Total:** 78 hours (34h core + 44h optional future)

---

## 5. Success Criteria

### Phases 1-3 (Core - 34 hours)

- ✅ `browser_record` and `voice_record` options work
- ✅ Word-level timestamps with ms precision (±50-200ms accuracy)
- ✅ Transcription accuracy >93% (base model)
- ✅ Timeline shows green voice bars with hover tooltips
- ✅ Action list intermixes voice + browser chronologically
- ✅ Audio playback syncs with word highlighting
- ✅ Click word seeks audio to exact timestamp
- ✅ Speed control (0.5x - 2x) works
- ✅ Python Whisper auto-detects GPU with CPU fallback
- ✅ 2-hour recordings transcribe in 1-12 minutes

### Phase 4 (MCP Server)

- ✅ Claude Desktop compatible
- ✅ All 5 tools functional (start/stop browser/voice/combined, status)
- ✅ Returns zip paths and viewer URLs
- ✅ Error handling for failed recordings

### Phase 5 (Desktop Application)

- ✅ Cross-platform installation (Windows, macOS, Linux)
- ✅ One-click recording with mode selection
- ✅ Auto zip creation + viewer link
- ✅ System tray integration
- ✅ Notifications on completion

### Phase 6 (Final Testing)

- ✅ End-to-end tests pass for all user flows
- ✅ User documentation complete
- ✅ Deployment guides ready

---

## 6. Dependencies

**Python:**

```text
sounddevice>=0.4.6
numpy>=1.24.0
whisper>=1.0.0 (official OpenAI implementation for maximum accuracy)
wave>=0.0.2
```

**TypeScript:**

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "archiver": "^6.0.1"
  }
}
```

---

## 7. Out of Scope

- ❌ Cloud storage
- ❌ Multi-language (English only)
- ❌ Video recording
- ❌ Real-time transcription
- ❌ Speaker diarization

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-12-05 | All 4 initiatives: SessionRecorder voice, Viewer UI, Desktop App, MCP Server |
