# PRD-4: Production Polish & Voice Recording Integration

**Version:** 4.0
**Date:** 2025-12-05
**Status:** 🎯 PLANNED - Production Readiness & Voice Integration
**Depends On:** PRD-3.md (Snapshot Architecture Improvements)

---

## Executive Summary

Session Recorder is now functional with comprehensive browser action recording and an advanced viewer. PRD-4 focuses on making this tool **production-ready** for company-wide adoption through two key initiatives:

1. **Production Deployment:** Enable non-developers and developers to easily record sessions
2. **Voice Recording Integration:** Capture voice narration alongside browser actions for richer context

**Target Users:**
- **Non-Developers:** QA testers, product managers, support staff (Desktop App)
- **Developers:** Engineers with AI coding assistants (MCP Server)

---

## 1. Problem Statement

**Current State:** Session recorder works well but requires technical knowledge:
- Must run `npm run test:spa` manually
- Requires Node.js and project setup
- No simple "record button" for non-technical users
- No voice narration capability

**Remaining Gaps:**
- ❌ Non-developers cannot easily use the tool
- ❌ No MCP integration for AI coding assistants
- ❌ Cannot capture voice explanations during recording
- ❌ Timeline doesn't show voice annotations

---

## 2. Goals

### Primary Goal
Make session recording accessible to **all company employees** regardless of technical skill level.

### POC 4 Objectives

#### 2.1 User Flow 1: Non-Developer Desktop Application
**Target Users:** QA, PM, Support, Designers

**Requirements:**
- Simple Desktop Application (Electron-based)
- One-click "Record" button
- Optional recording title input
- Choice of recording mode:
  - Browser only
  - Voice only
  - Browser + Voice
- Automatic zip creation after recording
- Automatic viewer link generation
- Cross-platform support (Windows, macOS, Linux)

**User Flow:**
1. Launch Desktop App
2. Click "New Recording" button
3. Enter recording title (optional)
4. Select recording mode (Browser / Voice / Both)
5. Click "Start Recording"
6. Desktop app opens browser window
7. User performs actions and/or speaks
8. User closes browser to finish
9. App automatically creates zip file
10. App shows success notification with:
    - Zip file location
    - Clickable link to open in viewer: `localhost:3001?zip=file:///path/to/session.zip`

#### 2.2 User Flow 2: Developer MCP Server
**Target Users:** Developers using Claude Code, Cline, Continue.dev, etc.

**Requirements:**
- MCP Server wrapping recording functionality
- Exposed MCP tools:
  - `start_browser_recording`: Start browser session recording
  - `start_voice_recording`: Start voice recording
  - `start_combined_recording`: Start both browser and voice
  - `stop_recording`: Stop active recording
  - `get_recording_status`: Check if recording is active
- Returns zip file path on completion
- Compatible with Claude Desktop, VS Code extensions

**User Flow:**
1. Developer asks AI assistant: "Record my browser session"
2. AI calls MCP tool `start_browser_recording`
3. Browser opens, developer performs actions
4. Developer asks AI: "Stop recording"
5. AI calls MCP tool `stop_recording`
6. AI provides zip file path and viewer link

#### 2.3 Voice Recording Integration

**Requirements:**
- **Capture:** Record system microphone audio
- **Transcription:** Real-time or post-recording speech-to-text
- **Timestamps:** UTC timestamps matching browser recording precision
- **Storage:** Audio file (WebM/MP3) + transcript JSON
- **Timeline:** Visual representation in viewer timeline
- **Playback:** Audio playback synchronized with browser actions

**Data Format:**
```json
{
  "sessionId": "session-1733097000000",
  "startTime": "2024-12-01T18:30:00.000Z",
  "endTime": "2024-12-01T18:35:45.123Z",
  "voiceRecording": {
    "audioFile": "audio/recording.webm",
    "transcript": "audio/transcript.json",
    "enabled": true
  },
  "actions": [
    {
      "id": "action-1",
      "timestamp": "2024-12-01T18:30:15.234Z",
      "type": "click",
      "before": { /* ... */ },
      "after": { /* ... */ }
    },
    {
      "id": "voice-1",
      "timestamp": "2024-12-01T18:30:16.100Z",
      "type": "voice_transcript",
      "transcript": {
        "text": "I'm clicking the login button to test authentication",
        "startTime": "2024-12-01T18:30:16.100Z",
        "endTime": "2024-12-01T18:30:19.450Z",
        "confidence": 0.95
      },
      "nearestSnapshot": "action-1-after"
    }
  ]
}
```

**Transcript Entry Format:**
```json
{
  "segments": [
    {
      "id": "segment-1",
      "text": "I'm clicking the login button",
      "startTime": "2024-12-01T18:30:16.100Z",
      "endTime": "2024-12-01T18:30:19.450Z",
      "confidence": 0.95,
      "words": [
        {
          "word": "I'm",
          "startTime": "2024-12-01T18:30:16.100Z",
          "endTime": "2024-12-01T18:30:16.300Z",
          "confidence": 0.98
        }
        // ... more words
      ]
    }
  ]
}
```

---

## 3. Technical Requirements

### 3.1 Desktop Application (Electron)

**Architecture:**
- Electron main process: Handles recording orchestration
- Renderer process: UI for recording controls
- Playwright integration: Browser automation
- Audio capture: Web Audio API or native node modules

**Core Features:**
- Recording title input with default timestamp
- Recording mode selector (Browser / Voice / Both)
- Start/Stop recording buttons
- Status indicator (recording, processing, complete)
- Progress notifications
- System tray integration for quick access
- Auto-update mechanism

**File Structure:**
```
session-recorder-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts                 # Electron main process
│   │   ├── recording.ts            # Recording orchestration
│   │   ├── voiceCapture.ts         # Voice recording
│   │   └── transcription.ts        # Speech-to-text
│   ├── renderer/
│   │   ├── App.tsx                 # Main UI
│   │   ├── RecordingControls.tsx  # Record button, settings
│   │   └── StatusDisplay.tsx       # Recording status
│   └── shared/
│       └── types.ts                # Shared interfaces
├── package.json
└── electron-builder.yml            # Build configuration
```

**Dependencies:**
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "playwright": "^1.40.0",
    "@anthropic-ai/sdk": "^0.9.0",
    "whisper-node": "^1.0.0",
    "archiver": "^6.0.1"
  }
}
```

### 3.2 MCP Server

**Architecture:**
- Node.js MCP server
- Exposes session recording tools to MCP clients
- Wraps existing SessionRecorder class
- Manages recording lifecycle

**MCP Tools:**

**Tool 1: `start_browser_recording`**
```typescript
{
  name: "start_browser_recording",
  description: "Start recording browser session with user actions, snapshots, and screenshots",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Recording title (optional, defaults to timestamp)"
      },
      url: {
        type: "string",
        description: "Initial URL to navigate to (optional)"
      },
      browserType: {
        type: "string",
        enum: ["chromium", "firefox", "webkit"],
        description: "Browser to use (default: chromium)"
      }
    }
  }
}
```

**Tool 2: `start_voice_recording`**
```typescript
{
  name: "start_voice_recording",
  description: "Start recording voice narration with real-time transcription",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Recording title (optional)"
      },
      transcriptionModel: {
        type: "string",
        enum: ["whisper-1", "whisper-large-v3"],
        description: "Speech-to-text model (default: whisper-1)"
      }
    }
  }
}
```

**Tool 3: `start_combined_recording`**
```typescript
{
  name: "start_combined_recording",
  description: "Start recording both browser actions and voice narration simultaneously",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      url: { type: "string" },
      browserType: { type: "string", enum: ["chromium", "firefox", "webkit"] },
      transcriptionModel: { type: "string" }
    }
  }
}
```

**Tool 4: `stop_recording`**
```typescript
{
  name: "stop_recording",
  description: "Stop active recording and create session zip file",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

**Tool 5: `get_recording_status`**
```typescript
{
  name: "get_recording_status",
  description: "Get current recording status (active/inactive, duration, action count)",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

**File Structure:**
```
session-recorder-mcp/
├── src/
│   ├── index.ts                # MCP server entry point
│   ├── tools/
│   │   ├── browserRecording.ts
│   │   ├── voiceRecording.ts
│   │   └── combinedRecording.ts
│   └── types.ts
├── package.json
└── mcp-config.json             # MCP server configuration
```

### 3.3 Voice Recording Capture

**Recording:**
- Use Web Audio API or native node audio capture
- Format: WebM Opus (best compatibility) or MP3
- Sample rate: 16kHz or 44.1kHz
- Mono audio (sufficient for speech)
- Real-time level meter for user feedback

**Transcription:**
- **Option 1:** OpenAI Whisper API (cloud-based, high accuracy)
- **Option 2:** Whisper.cpp (local, privacy-focused, lower accuracy)
- **Option 3:** Web Speech API (browser-based, limited accuracy)

**Recommended:** OpenAI Whisper API for production (best accuracy), Whisper.cpp for offline/privacy scenarios

**Timestamp Alignment:**
```typescript
interface VoiceSegment {
  id: string;
  text: string;
  startTime: string; // ISO 8601 UTC (e.g., "2024-12-01T18:30:16.100Z")
  endTime: string;   // ISO 8601 UTC
  confidence: number; // 0.0-1.0
  nearestSnapshot?: string; // Reference to closest snapshot
}

// Timestamp alignment algorithm
function alignVoiceToSnapshot(
  voiceSegment: VoiceSegment,
  actions: RecordedAction[]
): string | null {
  // Find action with timestamp closest to voice segment
  let closestAction: RecordedAction | null = null;
  let minDiff = Infinity;

  for (const action of actions) {
    const voiceTime = new Date(voiceSegment.startTime).getTime();
    const actionTime = new Date(action.timestamp).getTime();
    const diff = Math.abs(voiceTime - actionTime);

    if (diff < minDiff) {
      minDiff = diff;
      closestAction = action;
    }
  }

  return closestAction ? `${closestAction.id}-after` : null;
}
```

### 3.4 Viewer Enhancements

**Timeline Updates:**
- Visual indicators for voice segments
- Different styling for browser actions vs. voice transcripts
- Color coding: Blue (browser actions), Green (voice segments)
- Hover shows transcript preview
- Click voice segment to view full transcript

**Action List Updates:**
- Intermixed browser actions and voice transcripts
- Voice transcript entries:
  - Icon: 🎙️ microphone
  - Text preview (first 50 characters)
  - Timestamp
  - Duration badge
- Clicking voice entry shows:
  - Full transcript text
  - Associated snapshot (closest in time)
  - Audio playback controls

**New Component: VoiceTranscriptViewer**
```tsx
interface VoiceTranscriptViewerProps {
  segment: VoiceSegment;
  audioUrl: string;
  associatedSnapshot?: SnapshotData;
}

// Features:
// - Full transcript text display
// - Audio playback with waveform visualization
// - Word-level highlighting during playback
// - Jump to associated snapshot button
// - Confidence indicator
// - Copy transcript button
```

**Audio Playback:**
- HTML5 audio player with custom controls
- Waveform visualization (optional)
- Speed control (0.5x, 1x, 1.5x, 2x)
- Word-level highlighting synchronized with audio
- Seek by clicking transcript text

---

## 4. User Flows

### 4.1 Non-Developer Flow (Desktop App)

**Recording:**
1. User opens Session Recorder Desktop App
2. UI shows:
   - "New Recording" button
   - List of recent recordings
3. User clicks "New Recording"
4. Modal appears:
   - Title input: "QA Testing - Login Flow" (optional)
   - Recording mode dropdown: "Browser + Voice" (default)
   - Browser type: Chromium / Firefox / Safari
   - "Start Recording" button
5. User selects "Browser + Voice" and clicks "Start Recording"
6. Desktop app:
   - Starts microphone capture
   - Opens browser window
   - Shows recording indicator (red dot in system tray)
7. User performs actions and speaks:
   - "I'm testing the login functionality"
   - Clicks username field, types "test@example.com"
   - "Now entering the password"
   - Clicks password field, types password
   - "Clicking the login button"
   - Clicks login button
8. User closes browser window (signals end of recording)
9. Desktop app:
   - Stops microphone capture
   - Processes audio transcription
   - Creates session zip file
   - Shows success notification:
     - "Recording Complete!"
     - Zip location: `/Users/username/SessionRecordings/qa-testing-login-flow-20241201.zip`
     - Button: "Open in Viewer"
10. User clicks "Open in Viewer"
11. Browser opens to: `http://localhost:3001?zip=file:///Users/username/SessionRecordings/qa-testing-login-flow-20241201.zip`

**Viewing:**
1. Viewer loads session from zip
2. Timeline shows:
   - Browser actions (blue dots)
   - Voice segments (green bars)
3. Action list shows:
   - 🖱️ "Click on username field" - 18:30:15
   - 🎙️ "I'm testing the login functionality" - 18:30:14 (3.2s)
   - ⌨️ "Input text: test@example.com" - 18:30:16
   - 🎙️ "Now entering the password" - 18:30:18 (1.8s)
   - 🖱️ "Click on password field" - 18:30:19
4. User clicks voice transcript entry
5. Viewer shows:
   - Full transcript with word-level timestamps
   - Audio player with playback controls
   - Associated snapshot (closest browser action)

### 4.2 Developer Flow (MCP Server)

**Setup:**
1. Developer installs MCP server: `npm install -g @session-recorder/mcp-server`
2. Configures Claude Desktop to use MCP server
3. Restarts Claude Desktop

**Recording:**
1. Developer opens Claude Code
2. Developer: "I need to record my browser session while I test the new feature"
3. Claude calls MCP tool:
   ```json
   {
     "tool": "start_combined_recording",
     "input": {
       "title": "Feature Testing - User Dashboard",
       "url": "http://localhost:3000",
       "browserType": "chromium"
     }
   }
   ```
4. MCP server responds:
   ```json
   {
     "success": true,
     "sessionId": "session-1733097000000",
     "message": "Recording started. Browser opened. Close browser or say 'stop recording' to finish."
   }
   ```
5. Developer performs testing while narrating
6. Developer: "Stop recording"
7. Claude calls MCP tool:
   ```json
   {
     "tool": "stop_recording",
     "input": {}
   }
   ```
8. MCP server processes and responds:
   ```json
   {
     "success": true,
     "sessionId": "session-1733097000000",
     "zipPath": "/Users/dev/session-recordings/feature-testing-user-dashboard.zip",
     "stats": {
       "duration": "5m 45s",
       "actions": 42,
       "voiceSegments": 12
     },
     "viewerUrl": "http://localhost:3001?zip=file:///Users/dev/session-recordings/feature-testing-user-dashboard.zip"
   }
   ```
9. Claude: "Recording complete! I've created a session zip with 42 browser actions and 12 voice segments. You can view it here: [link]"

---

## 5. Success Criteria

### 5.1 Desktop Application
- ✅ Installs on Windows, macOS, Linux
- ✅ Simple one-click recording workflow
- ✅ Supports browser-only, voice-only, and combined recording
- ✅ Automatic zip creation and viewer link generation
- ✅ Non-technical users can record sessions without help
- ✅ System tray integration for quick access
- ✅ Auto-update mechanism for new versions

### 5.2 MCP Server
- ✅ Installable via npm
- ✅ Compatible with Claude Desktop, VS Code extensions
- ✅ All 5 MCP tools work correctly
- ✅ Returns proper zip paths and viewer URLs
- ✅ Handles concurrent recording requests gracefully
- ✅ Proper error handling and status reporting

### 5.3 Voice Recording
- ✅ Audio captured in high quality (clear speech)
- ✅ Transcription accuracy >90% for clear speech
- ✅ UTC timestamps match browser action timestamps
- ✅ Voice segments aligned with nearest snapshots
- ✅ Audio playback synchronized with transcript
- ✅ Word-level highlighting during playback

### 5.4 Viewer Integration
- ✅ Timeline shows browser actions and voice segments
- ✅ Action list intermixes browser and voice entries
- ✅ Clicking voice entry shows transcript and snapshot
- ✅ Audio playback with waveform visualization
- ✅ Transcript search functionality
- ✅ Export transcript as text/JSON

### 5.5 Performance
- ✅ Desktop app launches <2 seconds
- ✅ Recording starts <3 seconds after button click
- ✅ Transcription completes within 30 seconds after recording
- ✅ Zip creation <10 seconds for typical session
- ✅ MCP server responds to commands <500ms

---

## 6. Non-Goals (Out of Scope for POC 4)

- ❌ Cloud storage for recordings
- ❌ Team collaboration features
- ❌ Video recording (only audio narration)
- ❌ Multi-language transcription (English only)
- ❌ Real-time collaboration/streaming
- ❌ Mobile app version
- ❌ Browser extension version
- ❌ Advanced audio editing
- ❌ Custom transcription models
- ❌ Screen recording (only browser DOM capture)

---

## 7. Dependencies

### Desktop Application
- Electron 28+
- Playwright (existing integration)
- OpenAI Whisper API or Whisper.cpp
- Archiver (zip creation)
- Node Audio Recorder or similar

### MCP Server
- @anthropic-ai/sdk
- Node.js 18+
- Existing SessionRecorder class

### Viewer Updates
- React 18+
- HTML5 Audio API
- WaveSurfer.js (optional, for waveform visualization)

---

## 8. Technical Specifications

### 8.1 Voice Recording Format

**Audio File:**
```
Format: WebM (Opus codec) or MP3
Sample Rate: 16kHz (sufficient for speech recognition)
Channels: Mono
Bitrate: 32kbps (speech optimized)
File naming: audio/recording.webm
```

**Transcript File:**
```json
{
  "version": "1.0",
  "audioFile": "audio/recording.webm",
  "duration": 345.6,
  "language": "en-US",
  "segments": [
    {
      "id": "segment-1",
      "text": "I'm clicking the login button to test authentication",
      "startTime": "2024-12-01T18:30:16.100Z",
      "endTime": "2024-12-01T18:30:19.450Z",
      "confidence": 0.95,
      "words": [
        {
          "word": "I'm",
          "startTime": "2024-12-01T18:30:16.100Z",
          "endTime": "2024-12-01T18:30:16.300Z",
          "confidence": 0.98
        },
        {
          "word": "clicking",
          "startTime": "2024-12-01T18:30:16.350Z",
          "endTime": "2024-12-01T18:30:16.750Z",
          "confidence": 0.97
        }
        // ... more words
      ]
    }
  ]
}
```

### 8.2 Session Data Structure Updates

```typescript
interface SessionData {
  sessionId: string;
  startTime: string;
  endTime: string;

  // NEW: Voice recording metadata
  voiceRecording?: {
    enabled: boolean;
    audioFile: string;           // "audio/recording.webm"
    transcriptFile: string;      // "audio/transcript.json"
    duration: number;            // seconds
    segmentCount: number;
  };

  // Updated: Actions now include voice transcripts
  actions: Array<BrowserAction | VoiceTranscript>;
}

interface BrowserAction {
  id: string;
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';
  timestamp: string;
  before: SnapshotWithScreenshot;
  after: SnapshotWithScreenshot;
  action: ActionDetails;
}

interface VoiceTranscript {
  id: string;
  type: 'voice_transcript';
  timestamp: string; // Start time of transcript segment
  transcript: {
    text: string;
    startTime: string;
    endTime: string;
    confidence: number;
    words?: Array<{
      word: string;
      startTime: string;
      endTime: string;
      confidence: number;
    }>;
  };
  nearestSnapshot: string; // Reference to closest action snapshot (e.g., "action-5-after")
}
```

### 8.3 Zip File Structure

```
session-1733097000000.zip
├── session.json                     # Session metadata (includes voiceRecording)
├── session.network                  # Network requests (JSON Lines)
├── session.console                  # Console logs (JSON Lines)
├── audio/
│   ├── recording.webm              # Audio file
│   └── transcript.json             # Full transcript with word-level timing
├── snapshots/
│   ├── action-1-before.html
│   ├── action-1-after.html
│   └── ...
├── screenshots/
│   ├── action-1-before.png
│   ├── action-1-after.png
│   └── ...
└── resources/
    ├── sha1-hash-1.css
    ├── sha1-hash-2.png
    └── ...
```

---

## 9. Implementation Roadmap

### Phase 1: Voice Recording Backend (16 hours)
- Audio capture enhancements (4h)
- Whisper API integration (4h)
- Timestamp alignment algorithm (3h)
- Transcript storage (2h)
- Testing (3h)

### Phase 2: Viewer Integration (14 hours)
- Timeline voice indicators (4h)
- Action list voice entries (3h)
- VoiceTranscriptViewer component (4h)
- Audio playback controls (3h)

### Phase 3: Testing & Documentation for Phases 1-2 (4 hours)
- Voice recording tests (2h)
- Viewer voice integration tests (1h)
- Documentation (1h)

### Phase 4: MCP Server (12 hours)
- MCP server setup (3h)
- Tool implementations (5h)
- SessionRecorder integration (2h)
- Error handling and status (2h)

### Phase 5: Desktop Application (20 hours)
- Electron app structure (4h)
- Recording controls UI (3h)
- Voice capture integration (5h)
- Browser automation integration (3h)
- Zip creation and viewer link (2h)
- Testing and polish (3h)

### Phase 6: Final Testing & Documentation (12 hours)
- End-to-end testing (4h)
- User documentation (4h)
- Deployment guides (4h)

**Total Estimated Effort:** 78 hours

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Transcription accuracy <90% | High | Use OpenAI Whisper API (proven accuracy), allow manual transcript editing |
| Electron app size too large | Medium | Use electron-builder compression, exclude dev dependencies |
| MCP server compatibility issues | Medium | Test with multiple MCP clients (Claude Desktop, Cline, Continue.dev) |
| Audio sync drift over long recordings | Low | Use UTC timestamps with millisecond precision, periodic sync checks |
| Desktop app auto-update failures | Medium | Implement fallback update mechanism, manual download option |
| Voice recording privacy concerns | High | Add clear privacy notices, local-only option (Whisper.cpp), encrypted storage |

---

## 11. Future Enhancements (Post-POC 4)

- Multi-language transcription support
- Speaker diarization (identify multiple speakers)
- Real-time transcription preview during recording
- Custom vocabulary for domain-specific terms
- Transcript editing interface
- Team sharing and collaboration
- Cloud storage integration
- Advanced audio processing (noise reduction, normalization)
- Video recording integration
- Mobile companion app
- Browser extension alternative to Desktop app

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 4.0 | 2025-12-05 | Initial PRD for production polish and voice integration | Claude |
