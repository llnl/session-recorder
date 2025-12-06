# TASKS-4: Production Polish & Voice Recording Implementation Tasks

**Related PRD:** [PRD-4.md](./PRD-4.md)
**Status:** 🎯 PLANNED
**Total Estimated Time:** 78 hours (across 6 phases)
**Dependencies:** PRD-3 (Snapshot Architecture) should be complete first

---

## Overview

This document breaks down PRD-4 objectives into actionable tasks for making Session Recorder production-ready with voice recording capabilities.

---

## Phase 1: Voice Recording Backend (16 hours)

Already covered in Phase 1 Tasks 1.3 and 1.4. Additional work:

### Task 1.1: Audio Capture Enhancements (4 hours)

- Level meter visualization
- Noise gate/detection
- Audio quality validation

### Task 1.2: Whisper API Integration (4 hours)

- Already implemented in Task 5.3

### Task 1.3: Timestamp Alignment Algorithm (3 hours)

- Already implemented in Task 5.4

### Task 1.4: Transcript Storage (2 hours)

- Already implemented in Task 5.4

### Task 1.5: Testing (3 hours)

- Unit tests for transcription
- Integration tests for alignment
- End-to-end voice recording tests

---

## Phase 2: Viewer Integration (14 hours)

**Goal:** Update viewer to display voice transcripts alongside browser actions
**Deliverable:** Enhanced timeline and action list with voice support

### Task 2.1: Timeline Voice Indicators (4 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Update Timeline component** (3 hours)

```tsx
// viewer/src/components/Timeline/Timeline.tsx
const renderVoiceSegments = () => {
  if (!sessionData?.voiceRecording?.enabled) return null;

  const voiceActions = sessionData.actions.filter(a => a.type === 'voice_transcript');

  return voiceActions.map(action => {
    const startTime = new Date(action.timestamp).getTime();
    const endTime = new Date(action.transcript.endTime).getTime();
    const duration = (endTime - startTime) / 1000;

    const x = timeToPixel(startTime);
    const width = (duration / totalDuration) * canvasWidth;

    return (
      <rect
        key={action.id}
        x={x}
        y={timelineHeight - 20}
        width={width}
        height={15}
        fill="rgba(76, 175, 80, 0.6)"
        stroke="#4CAF50"
        strokeWidth={1}
        rx={3}
        onClick={() => selectAction(action)}
        style={{ cursor: 'pointer' }}
      />
    );
  });
};
```

2. **Add hover tooltip** (1 hour)

```tsx
const [hoveredVoice, setHoveredVoice] = useState<VoiceTranscript | null>(null);

// In voice segment render
onMouseEnter={() => setHoveredVoice(action)}
onMouseLeave={() => setHoveredVoice(null)}

// Tooltip
{hoveredVoice && (
  <div className="voice-tooltip" style={{ left: x, top: y }}>
    <div className="tooltip-time">{formatTime(hoveredVoice.timestamp)}</div>
    <div className="tooltip-text">{hoveredVoice.transcript.text.slice(0, 100)}...</div>
    <div className="tooltip-duration">{formatDuration(duration)}s</div>
  </div>
)}
```

#### Acceptance Criteria

- ✅ Voice segments shown as green bars on timeline
- ✅ Duration proportional to actual speech duration
- ✅ Hover shows transcript preview
- ✅ Click navigates to voice entry in action list

---

### Task 2.2: Action List Voice Entries (3 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Update ActionList component** (2 hours)

```tsx
// viewer/src/components/ActionList/ActionList.tsx
const renderActionItem = (action: RecordedAction | VoiceTranscript) => {
  if (action.type === 'voice_transcript') {
    return (
      <div className="action-item voice-item" onClick={() => onSelectAction(action)}>
        <div className="action-icon">🎙️</div>
        <div className="action-details">
          <div className="action-type">Voice Transcript</div>
          <div className="action-text">{action.transcript.text.slice(0, 80)}...</div>
          <div className="action-meta">
            <span className="timestamp">{formatTime(action.timestamp)}</span>
            <span className="duration">{formatDuration(getDuration(action))}s</span>
            <span className="confidence">
              {(action.transcript.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Existing browser action rendering...
};

const getDuration = (action: VoiceTranscript) => {
  const start = new Date(action.transcript.startTime).getTime();
  const end = new Date(action.transcript.endTime).getTime();
  return (end - start) / 1000;
};
```

2. **Add styling** (1 hour)

```css
.voice-item {
  border-left: 4px solid #4CAF50;
  background: #f1f8e9;
}

.voice-item .action-icon {
  font-size: 1.5rem;
}

.voice-item .action-text {
  font-style: italic;
  color: #555;
}

.voice-item .confidence {
  background: #4CAF50;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
}
```

#### Acceptance Criteria

- ✅ Voice transcripts shown in action list
- ✅ Intermixed with browser actions by timestamp
- ✅ Microphone icon and distinct styling
- ✅ Shows transcript preview, timestamp, duration, confidence
- ✅ Clicking selects voice entry

---

### Task 2.3: VoiceTranscriptViewer Component (4 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Create VoiceTranscriptViewer** (3 hours)

```tsx
// viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { VoiceTranscript } from '@/types/session';

interface Props {
  voiceAction: VoiceTranscript;
  audioUrl: string;
  associatedSnapshot?: SnapshotData;
}

export default function VoiceTranscriptViewer({ voiceAction, audioUrl, associatedSnapshot }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentWord, setCurrentWord] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Highlight current word
      const words = voiceAction.transcript.words;
      if (!words) return;

      const segmentStart = new Date(voiceAction.transcript.startTime).getTime();
      const currentAbsTime = segmentStart + audio.currentTime * 1000;

      const idx = words.findIndex(w => {
        const wordStart = new Date(w.startTime).getTime();
        const wordEnd = new Date(w.endTime).getTime();
        return currentAbsTime >= wordStart && currentAbsTime <= wordEnd;
      });

      setCurrentWord(idx >= 0 ? idx : null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', () => setIsPlaying(true));
      audio.removeEventListener('pause', () => setIsPlaying(false));
    };
  }, [voiceAction]);

  const handleWordClick = (wordIndex: number) => {
    const audio = audioRef.current;
    if (!audio || !voiceAction.transcript.words) return;

    const word = voiceAction.transcript.words[wordIndex];
    const segmentStart = new Date(voiceAction.transcript.startTime).getTime();
    const wordStart = new Date(word.startTime).getTime();
    const relativeTime = (wordStart - segmentStart) / 1000;

    audio.currentTime = relativeTime;
    audio.play();
  };

  return (
    <div className="voice-transcript-viewer">
      <div className="voice-header">
        <div className="voice-meta">
          <span className="timestamp">{formatTime(voiceAction.transcript.startTime)}</span>
          <span className="duration">{getDuration(voiceAction)}s</span>
          <span className="confidence">
            Confidence: {(voiceAction.transcript.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <button onClick={() => copyTranscript(voiceAction.transcript.text)}>
          Copy Transcript
        </button>
      </div>

      <div className="transcript-text">
        {voiceAction.transcript.words ? (
          voiceAction.transcript.words.map((word, idx) => (
            <span
              key={idx}
              className={`word ${idx === currentWord ? 'active' : ''}`}
              onClick={() => handleWordClick(idx)}
            >
              {word.word}{' '}
            </span>
          ))
        ) : (
          <p>{voiceAction.transcript.text}</p>
        )}
      </div>

      <div className="audio-player">
        <audio ref={audioRef} src={audioUrl} controls>
          Your browser does not support the audio element.
        </audio>
        <div className="playback-controls">
          <button onClick={() => audioRef.current?.play()}>Play</button>
          <button onClick={() => audioRef.current?.pause()}>Pause</button>
          <select
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.playbackRate = parseFloat(e.target.value);
              }
            }}
          >
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>

      {associatedSnapshot && (
        <div className="associated-snapshot">
          <h4>Associated Snapshot</h4>
          <button onClick={() => jumpToSnapshot(associatedSnapshot)}>
            View Snapshot
          </button>
        </div>
      )}
    </div>
  );
}
```

2. **Add styling** (1 hour)

```css
.voice-transcript-viewer {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.transcript-text .word {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background 0.2s;
}

.transcript-text .word:hover {
  background: #e0e0e0;
}

.transcript-text .word.active {
  background: #4CAF50;
  color: white;
}

.audio-player {
  margin-top: 1rem;
}

.audio-player audio {
  width: 100%;
}
```

#### Acceptance Criteria

- ✅ Full transcript displayed
- ✅ Audio playback controls
- ✅ Word-level highlighting during playback
- ✅ Click word to seek audio
- ✅ Speed control (0.5x - 2x)
- ✅ Copy transcript button
- ✅ Link to associated snapshot

---

### Task 2.4: Audio Playback Controls (3 hours)

Covered in Task 2.3 above.

---

## Phase 3: Testing & Documentation for Phases 1-2 (4 hours)

**Goal:** Ensure voice recording and viewer integration are production-ready
**Deliverable:** Test suite and documentation for voice features

### Task 3.1: Voice Recording Tests (2 hours)

**Priority:** 🔴 HIGH

#### Test Scenarios

1. **Unit Tests** (1 hour)
   - Audio capture initialization
   - Whisper API integration
   - Timestamp alignment accuracy
   - Transcript storage format

2. **Integration Tests** (1 hour)
   - End-to-end voice recording flow
   - Audio file creation and storage
   - Transcript generation and alignment
   - Error handling (no microphone, API failure)

---

### Task 3.2: Viewer Voice Integration Tests (1 hour)

**Priority:** 🔴 HIGH

#### Test Scenarios

1. **Timeline Tests** (30 minutes)
   - Voice segments render correctly
   - Duration proportional to actual speech
   - Click navigation to voice entries
   - Hover tooltips display properly

2. **Action List Tests** (30 minutes)
   - Voice transcripts intermixed with browser actions
   - Correct timestamp ordering
   - Voice entry styling and icons
   - Selection and playback controls

---

### Task 3.3: Documentation (1 hour)

**Priority:** 🟡 MEDIUM

#### Documents to Create

1. **Voice Recording Guide** (30 minutes)
   - How to enable voice recording
   - Microphone setup and permissions
   - Transcription quality tips
   - Troubleshooting audio issues

2. **Viewer Voice Features Guide** (30 minutes)
   - Timeline voice indicators
   - Audio playback controls
   - Word-level navigation
   - Transcript export options

---

## Phase 4: MCP Server (12 hours)

**Goal:** Enable developers to use session recorder via AI coding assistants
**Deliverable:** MCP Server with 5 tools for recording control

### Task 4.1: MCP Server Setup (3 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Initialize MCP server project** (1 hour)

```bash
mkdir session-recorder-mcp
cd session-recorder-mcp
npm init -y
npm install @anthropic-ai/sdk playwright
npm install --save-dev typescript @types/node
```

```typescript
// src/index.ts
import { McpServer } from '@anthropic-ai/sdk/mcp';
import { startBrowserRecording } from './tools/browserRecording';
import { startVoiceRecording } from './tools/voiceRecording';
import { startCombinedRecording } from './tools/combinedRecording';
import { stopRecording } from './tools/stopRecording';
import { getRecordingStatus } from './tools/getStatus';

const server = new McpServer({
  name: 'session-recorder',
  version: '1.0.0',
  description: 'Session recorder MCP server for browser and voice recording'
});

// Register tools
server.addTool({
  name: 'start_browser_recording',
  description: 'Start recording browser session with user actions, snapshots, and screenshots',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Recording title (optional, defaults to timestamp)'
      },
      url: {
        type: 'string',
        description: 'Initial URL to navigate to (optional)'
      },
      browserType: {
        type: 'string',
        enum: ['chromium', 'firefox', 'webkit'],
        description: 'Browser to use (default: chromium)'
      }
    }
  },
  handler: startBrowserRecording
});

server.addTool({
  name: 'start_voice_recording',
  description: 'Start recording voice narration with real-time transcription',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Recording title (optional)'
      },
      transcriptionModel: {
        type: 'string',
        enum: ['whisper-1', 'whisper-large-v3'],
        description: 'Speech-to-text model (default: whisper-1)'
      }
    }
  },
  handler: startVoiceRecording
});

server.addTool({
  name: 'start_combined_recording',
  description: 'Start recording both browser actions and voice narration simultaneously',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      url: { type: 'string' },
      browserType: { type: 'string', enum: ['chromium', 'firefox', 'webkit'] },
      transcriptionModel: { type: 'string' }
    }
  },
  handler: startCombinedRecording
});

server.addTool({
  name: 'stop_recording',
  description: 'Stop active recording and create session zip file',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: stopRecording
});

server.addTool({
  name: 'get_recording_status',
  description: 'Get current recording status (active/inactive, duration, action count)',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: getRecordingStatus
});

// Start server
server.listen();
console.log('Session Recorder MCP Server started');
```

2. **Create mcp-config.json** (1 hour)

```json
{
  "name": "session-recorder",
  "version": "1.0.0",
  "mcpServers": {
    "session-recorder": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

3. **Test MCP server** (1 hour)

```bash
npm run build
npm start

# Test with Claude Desktop
```

#### Acceptance Criteria

- ✅ MCP server starts without errors
- ✅ All 5 tools registered
- ✅ Claude Desktop can discover and use tools
- ✅ Tool schemas validate correctly

#### Files Created

- `session-recorder-mcp/src/index.ts`
- `session-recorder-mcp/mcp-config.json`
- `session-recorder-mcp/package.json`

---

### Task 4.2: Tool Implementations (5 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Implement recording tools** (3 hours)

```typescript
// src/tools/browserRecording.ts
import { RecordingManager } from '../recording/manager';

let manager: RecordingManager | null = null;

export async function startBrowserRecording(input: {
  title?: string;
  url?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}) {
  if (!manager) {
    manager = new RecordingManager();
  }

  const result = await manager.startRecording({
    title: input.title || `Recording ${new Date().toLocaleString()}`,
    mode: 'browser',
    browserType: input.browserType || 'chromium',
    url: input.url
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: result.success,
          sessionId: result.sessionId,
          message: result.message
        }, null, 2)
      }
    ]
  };
}

// Similar implementations for other tools...
```

2. **Implement status tool** (1 hour)

```typescript
// src/tools/getStatus.ts
export async function getRecordingStatus() {
  if (!manager) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ isRecording: false }, null, 2)
      }]
    };
  }

  const status = manager.getStatus();
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(status, null, 2)
    }]
  };
}
```

3. **Write integration tests** (1 hour)

```typescript
// test/integration.test.ts
describe('MCP Server Integration', () => {
  it('starts browser recording', async () => {
    const result = await startBrowserRecording({
      title: 'Test Recording',
      browserType: 'chromium'
    });

    expect(result.content[0].text).toContain('success');
  });

  // More tests...
});
```

#### Acceptance Criteria

- ✅ All 5 tools implemented
- ✅ Tools wrap RecordingManager correctly
- ✅ Proper error handling
- ✅ Integration tests pass

---

### Task 4.3: SessionRecorder Integration (2 hours)

This reuses the RecordingManager from Desktop app with minor adjustments for MCP context.

---

### Task 4.4: Error Handling and Status (2 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

1. **Add error handling** (1 hour)
2. **Add status reporting** (1 hour)

---

## Phase 5: Desktop Application (20 hours)

**Goal:** Create user-friendly Desktop Application for non-developers
**Deliverable:** Cross-platform Electron app with one-click recording

### Task 5.1: Electron Application Structure (4 hours)

**Priority:** 🚨 HIGH

#### Implementation Steps

1. **Initialize Electron project** (1.5 hours)

```bash
mkdir session-recorder-desktop
cd session-recorder-desktop
npm init -y
npm install electron electron-builder
npm install --save-dev typescript @types/node
npm install playwright archiver
```

```typescript
// src/main/main.ts
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { RecordingManager } from './recording';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let recordingManager: RecordingManager;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/icon.png'));
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow?.show() },
    { label: 'New Recording', click: () => startRecording() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Session Recorder');
}

app.whenReady().then(() => {
  recordingManager = new RecordingManager();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

2. **Setup build configuration** (1 hour)

```json
// electron-builder.yml
appId: com.company.session-recorder
productName: Session Recorder
directories:
  output: dist
  buildResources: build
files:
  - "!**/.vscode/*"
  - "!src/*"
  - "!electron.vite.config.{js,ts,mjs,cjs}"
  - "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}"
  - "!{.env,.env.*,.npmrc,pnpm-lock.yaml}"
asarUnpack:
  - resources/**
win:
  executableName: SessionRecorder
  target:
    - nsis
    - zip
mac:
  target:
    - dmg
    - zip
  category: public.app-category.developer-tools
linux:
  target:
    - AppImage
    - deb
  category: Development
```

3. **Create preload script** (1 hour)

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface RecordingAPI {
  startRecording: (config: RecordingConfig) => Promise<RecordingResult>;
  stopRecording: () => Promise<StopResult>;
  getStatus: () => Promise<RecordingStatus>;
  onRecordingUpdate: (callback: (update: RecordingUpdate) => void) => void;
}

contextBridge.exposeInMainWorld('recording', {
  startRecording: (config) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onRecordingUpdate: (callback) => ipcRenderer.on('recording-update', (_, update) => callback(update))
} as RecordingAPI);
```

4. **Test build** (0.5 hours)

```bash
npm run build
npm run dist
```

#### Acceptance Criteria

- ✅ Electron app runs on Windows, macOS, Linux
- ✅ Main window displays correctly
- ✅ System tray integration works
- ✅ IPC communication between main and renderer works
- ✅ Build process creates installers for all platforms

#### Files Created

- `session-recorder-desktop/src/main/main.ts`
- `session-recorder-desktop/src/main/preload.ts`
- `session-recorder-desktop/electron-builder.yml`
- `session-recorder-desktop/package.json`

---

### Task 5.2: Recording Controls UI (3 hours)

**Priority:** 🚨 HIGH

#### Implementation Steps

1. **Create React UI** (2 hours)

```tsx
// src/renderer/App.tsx
import React, { useState } from 'react';
import RecordingControls from './components/RecordingControls';
import RecordingList from './components/RecordingList';
import StatusDisplay from './components/StatusDisplay';

export default function App() {
  const [activeTab, setActiveTab] = useState<'new' | 'recent'>('new');

  return (
    <div className="app">
      <header>
        <h1>Session Recorder</h1>
        <nav>
          <button onClick={() => setActiveTab('new')}>New Recording</button>
          <button onClick={() => setActiveTab('recent')}>Recent</button>
        </nav>
      </header>

      <main>
        {activeTab === 'new' ? (
          <RecordingControls />
        ) : (
          <RecordingList />
        )}
        <StatusDisplay />
      </main>
    </div>
  );
}

// src/renderer/components/RecordingControls.tsx
import React, { useState } from 'react';

type RecordingMode = 'browser' | 'voice' | 'both';
type BrowserType = 'chromium' | 'firefox' | 'webkit';

export default function RecordingControls() {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<RecordingMode>('both');
  const [browserType, setBrowserType] = useState<BrowserType>('chromium');
  const [isRecording, setIsRecording] = useState(false);

  const handleStart = async () => {
    const result = await window.recording.startRecording({
      title: title || `Recording ${new Date().toLocaleString()}`,
      mode,
      browserType
    });

    if (result.success) {
      setIsRecording(true);
    }
  };

  const handleStop = async () => {
    const result = await window.recording.stopRecording();
    setIsRecording(false);

    if (result.success) {
      alert(`Recording saved: ${result.zipPath}\n\nOpen in viewer: ${result.viewerUrl}`);
    }
  };

  return (
    <div className="recording-controls">
      <div className="form-group">
        <label>Recording Title (optional):</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., QA Testing - Login Flow"
          disabled={isRecording}
        />
      </div>

      <div className="form-group">
        <label>Recording Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as RecordingMode)}
          disabled={isRecording}
        >
          <option value="browser">Browser Only</option>
          <option value="voice">Voice Only</option>
          <option value="both">Browser + Voice</option>
        </select>
      </div>

      {(mode === 'browser' || mode === 'both') && (
        <div className="form-group">
          <label>Browser:</label>
          <select
            value={browserType}
            onChange={(e) => setBrowserType(e.target.value as BrowserType)}
            disabled={isRecording}
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">Safari</option>
          </select>
        </div>
      )}

      <div className="actions">
        {!isRecording ? (
          <button className="btn-primary" onClick={handleStart}>
            Start Recording
          </button>
        ) : (
          <button className="btn-danger" onClick={handleStop}>
            Stop Recording
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="red-dot">●</span> Recording in progress...
        </div>
      )}
    </div>
  );
}
```

2. **Add styling** (1 hour)

```css
/* src/renderer/styles.css */
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #2c3e50;
  color: white;
  padding: 1rem;
}

.recording-controls {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-primary {
  background: #3498db;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-danger {
  background: #e74c3c;
}

.recording-indicator {
  margin-top: 1rem;
  text-align: center;
  color: #e74c3c;
  font-weight: 500;
}

.red-dot {
  display: inline-block;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

#### Acceptance Criteria

- ✅ Recording controls UI displays correctly
- ✅ All form inputs work (title, mode, browser type)
- ✅ Start/Stop recording buttons function
- ✅ Recording indicator shows during active recording
- ✅ Success notification shows zip path and viewer URL

#### Files Created

- `session-recorder-desktop/src/renderer/App.tsx`
- `session-recorder-desktop/src/renderer/components/RecordingControls.tsx`
- `session-recorder-desktop/src/renderer/components/StatusDisplay.tsx`
- `session-recorder-desktop/src/renderer/styles.css`

---

### Task 5.3: Voice Capture Integration (5 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Install audio recording dependencies** (0.5 hours)

```bash
npm install node-record-lpcm16 @google-cloud/speech # For local recording
npm install openai # For Whisper API transcription
```

2. **Create voice capture module** (2.5 hours)

```typescript
// src/main/voiceCapture.ts
import recorder from 'node-record-lpcm16';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface VoiceCaptureOptions {
  sessionId: string;
  outputDir: string;
  format?: 'webm' | 'mp3';
  sampleRate?: number;
}

export class VoiceCapture {
  private recording: any = null;
  private outputPath: string;
  private startTime: Date;
  private audioData: Buffer[] = [];

  constructor(private options: VoiceCaptureOptions) {
    const ext = options.format || 'webm';
    this.outputPath = path.join(options.outputDir, 'audio', `recording.${ext}`);
  }

  async start(): Promise<void> {
    // Ensure audio directory exists
    const audioDir = path.dirname(this.outputPath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    this.startTime = new Date();
    this.audioData = [];

    // Start recording
    this.recording = recorder.record({
      sampleRate: this.options.sampleRate || 16000,
      channels: 1, // Mono
      compress: false,
      threshold: 0,
      silence: '10.0'
    });

    // Collect audio data
    this.recording.stream().on('data', (chunk: Buffer) => {
      this.audioData.push(chunk);
    });

    console.log('Voice recording started');
  }

  async stop(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    // Stop recording
    this.recording.stop();
    this.recording = null;

    // Combine audio chunks
    const audioBuffer = Buffer.concat(this.audioData);

    // Save audio file
    fs.writeFileSync(this.outputPath, audioBuffer);

    console.log(`Voice recording saved: ${this.outputPath}`);
    return this.outputPath;
  }

  getDuration(): number {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime.getTime()) / 1000;
  }
}
```

3. **Create transcription module** (2 hours)

```typescript
// src/main/transcription.ts
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  confidence: number;
  words?: Array<{
    word: string;
    startTime: string;
    endTime: string;
    confidence: number;
  }>;
}

export interface TranscriptData {
  version: string;
  audioFile: string;
  duration: number;
  language: string;
  segments: TranscriptSegment[];
}

export class TranscriptionService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async transcribe(
    audioFilePath: string,
    sessionStartTime: Date
  ): Promise<TranscriptData> {
    console.log('Starting transcription...');

    // Read audio file
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Call Whisper API
    const response = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word']
    });

    // Convert relative timestamps to absolute UTC timestamps
    const segments: TranscriptSegment[] = response.segments.map((seg, idx) => {
      const startTime = new Date(sessionStartTime.getTime() + seg.start * 1000);
      const endTime = new Date(sessionStartTime.getTime() + seg.end * 1000);

      const words = seg.words?.map(w => ({
        word: w.word,
        startTime: new Date(sessionStartTime.getTime() + w.start * 1000).toISOString(),
        endTime: new Date(sessionStartTime.getTime() + w.end * 1000).toISOString(),
        confidence: w.confidence || 0.95
      }));

      return {
        id: `segment-${idx + 1}`,
        text: seg.text,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        confidence: seg.confidence || 0.95,
        words
      };
    });

    const transcriptData: TranscriptData = {
      version: '1.0',
      audioFile: path.basename(audioFilePath),
      duration: response.duration,
      language: response.language || 'en',
      segments
    };

    // Save transcript to JSON
    const transcriptPath = audioFilePath.replace(/\.(webm|mp3)$/, '-transcript.json');
    fs.writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2));

    console.log(`Transcription complete: ${transcriptPath}`);
    return transcriptData;
  }
}
```

#### Acceptance Criteria

- ✅ Voice capture starts when recording begins
- ✅ Audio saved as WebM or MP3 file
- ✅ Transcription service converts audio to text with timestamps
- ✅ UTC timestamps align with browser action timestamps
- ✅ Word-level timestamps captured
- ✅ Transcript JSON saved to session directory

#### Files Created

- `session-recorder-desktop/src/main/voiceCapture.ts`
- `session-recorder-desktop/src/main/transcription.ts`

---

### Task 5.4: Browser Automation Integration (3 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Create recording manager** (2 hours)

```typescript
// src/main/recording.ts
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import { SessionRecorder } from '../../src/node/SessionRecorder'; // Existing recorder
import { VoiceCapture } from './voiceCapture';
import { TranscriptionService } from './transcription';
import path from 'path';

export interface RecordingConfig {
  title: string;
  mode: 'browser' | 'voice' | 'both';
  browserType?: 'chromium' | 'firefox' | 'webkit';
  url?: string;
}

export interface RecordingResult {
  success: boolean;
  sessionId: string;
  message: string;
}

export class RecordingManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private sessionRecorder: SessionRecorder | null = null;
  private voiceCapture: VoiceCapture | null = null;
  private transcriptionService: TranscriptionService;
  private isRecording: boolean = false;

  constructor() {
    // Initialize transcription service
    const apiKey = process.env.OPENAI_API_KEY || '';
    this.transcriptionService = new TranscriptionService(apiKey);
  }

  async startRecording(config: RecordingConfig): Promise<RecordingResult> {
    if (this.isRecording) {
      return {
        success: false,
        sessionId: '',
        message: 'Recording already in progress'
      };
    }

    try {
      const sessionId = `session-${Date.now()}`;
      const outputDir = path.join(process.cwd(), 'output', sessionId);

      // Start browser recording
      if (config.mode === 'browser' || config.mode === 'both') {
        const browserType = config.browserType || 'chromium';
        this.browser = await this.launchBrowser(browserType);
        this.page = await this.browser.newPage();

        this.sessionRecorder = new SessionRecorder(sessionId);
        await this.sessionRecorder.start(this.page);

        if (config.url) {
          await this.page.goto(config.url);
        }
      }

      // Start voice recording
      if (config.mode === 'voice' || config.mode === 'both') {
        this.voiceCapture = new VoiceCapture({
          sessionId,
          outputDir,
          format: 'webm',
          sampleRate: 16000
        });
        await this.voiceCapture.start();
      }

      this.isRecording = true;

      return {
        success: true,
        sessionId,
        message: 'Recording started successfully'
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return {
        success: false,
        sessionId: '',
        message: `Failed to start recording: ${error.message}`
      };
    }
  }

  async stopRecording(): Promise<{
    success: boolean;
    zipPath?: string;
    viewerUrl?: string;
    message: string;
  }> {
    if (!this.isRecording) {
      return {
        success: false,
        message: 'No active recording'
      };
    }

    try {
      let zipPath: string | undefined;
      let sessionId: string | undefined;

      // Stop browser recording
      if (this.sessionRecorder) {
        sessionId = this.sessionRecorder.getSessionData().sessionId;
        await this.sessionRecorder.stop();

        // Create zip
        zipPath = await this.sessionRecorder.createZip();
      }

      // Stop voice recording
      if (this.voiceCapture) {
        const audioPath = await this.voiceCapture.stop();

        // Transcribe audio
        const sessionStartTime = this.sessionRecorder?.getSessionData().startTime
          ? new Date(this.sessionRecorder.getSessionData().startTime)
          : new Date();

        const transcript = await this.transcriptionService.transcribe(
          audioPath,
          sessionStartTime
        );

        // Merge transcript into session data
        if (this.sessionRecorder) {
          await this.mergeTranscriptIntoSession(transcript, sessionId!);
          // Re-create zip with transcript
          zipPath = await this.sessionRecorder.createZip();
        }
      }

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }

      this.isRecording = false;

      const viewerUrl = zipPath
        ? `http://localhost:3001?zip=file://${zipPath}`
        : undefined;

      return {
        success: true,
        zipPath,
        viewerUrl,
        message: 'Recording stopped and saved successfully'
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return {
        success: false,
        message: `Failed to stop recording: ${error.message}`
      };
    }
  }

  private async launchBrowser(type: string): Promise<Browser> {
    switch (type) {
      case 'firefox':
        return await firefox.launch({ headless: false });
      case 'webkit':
        return await webkit.launch({ headless: false });
      default:
        return await chromium.launch({ headless: false });
    }
  }

  private async mergeTranscriptIntoSession(
    transcript: TranscriptData,
    sessionId: string
  ): Promise<void> {
    // Read session.json
    const sessionPath = path.join(process.cwd(), 'output', sessionId, 'session.json');
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

    // Add voice recording metadata
    sessionData.voiceRecording = {
      enabled: true,
      audioFile: `audio/${transcript.audioFile}`,
      transcriptFile: 'audio/transcript.json',
      duration: transcript.duration,
      segmentCount: transcript.segments.length
    };

    // Convert transcript segments to action entries
    const voiceActions = transcript.segments.map(seg => ({
      id: seg.id,
      type: 'voice_transcript',
      timestamp: seg.startTime,
      transcript: {
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        confidence: seg.confidence,
        words: seg.words
      },
      nearestSnapshot: this.findNearestSnapshot(seg.startTime, sessionData.actions)
    }));

    // Merge and sort actions by timestamp
    sessionData.actions = [...sessionData.actions, ...voiceActions]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Save updated session.json
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

    // Copy transcript.json to session directory
    const transcriptSrc = /* path from transcription service */;
    const transcriptDest = path.join(process.cwd(), 'output', sessionId, 'audio', 'transcript.json');
    fs.copyFileSync(transcriptSrc, transcriptDest);
  }

  private findNearestSnapshot(voiceTimestamp: string, actions: any[]): string | null {
    const voiceTime = new Date(voiceTimestamp).getTime();
    let nearest = null;
    let minDiff = Infinity;

    for (const action of actions) {
      if (action.type === 'voice_transcript') continue;

      const actionTime = new Date(action.timestamp).getTime();
      const diff = Math.abs(voiceTime - actionTime);

      if (diff < minDiff) {
        minDiff = diff;
        nearest = action;
      }
    }

    return nearest ? `${nearest.id}-after` : null;
  }

  getStatus(): { isRecording: boolean; duration?: number } {
    return {
      isRecording: this.isRecording,
      duration: this.voiceCapture?.getDuration()
    };
  }
}
```

#### Acceptance Criteria

- ✅ Recording manager starts browser and voice capture
- ✅ Browser actions recorded using existing SessionRecorder
- ✅ Voice and browser recordings run simultaneously
- ✅ Transcripts merged into session.json with proper timestamps
- ✅ Zip file created with all recordings
- ✅ Viewer URL generated correctly

#### Files Created

- `session-recorder-desktop/src/main/recording.ts`

---

### Task 5.5: Zip Creation and Viewer Link (2 hours)

**Priority:** 🔴 HIGH

This is largely handled by existing `SessionRecorder.createZip()` method. Just need to ensure it includes audio files.

#### Implementation Steps

1. **Update zip creation** (1 hour)

```typescript
// In SessionRecorder.createZip(), ensure audio directory is included
const audioDir = path.join(this.sessionDir, 'audio');
if (fs.existsSync(audioDir)) {
  archive.directory(audioDir, 'audio');
}
```

2. **Generate viewer link** (1 hour)

```typescript
// In RecordingManager.stopRecording()
const viewerUrl = `http://localhost:3001?zip=file://${encodeURIComponent(zipPath)}`;

// Show notification
import { Notification } from 'electron';

new Notification({
  title: 'Recording Complete',
  body: `Session saved: ${zipPath}`,
  actions: [
    { type: 'button', text: 'Open in Viewer' }
  ]
}).show();
```

#### Acceptance Criteria

- ✅ Zip includes audio/ directory with recording and transcript
- ✅ Viewer URL opens correctly in browser
- ✅ Notification shows with clickable link

---

### Task 5.6: Testing and Polish (3 hours)

**Priority:** 🟡 MEDIUM

#### Test Scenarios

1. Browser-only recording
2. Voice-only recording
3. Combined browser + voice recording
4. Error handling (no microphone, browser crash)
5. Large session (1000+ actions, long voice recording)
6. Zip creation and viewer loading

---

## Phase 6: Final Testing & Documentation (12 hours)

**Goal:** Comprehensive testing and user documentation
**Deliverable:** Test suite and user guides

### Task 6.1: End-to-End Testing (4 hours)

**Priority:** 🟡 MEDIUM

#### Test Scenarios

1. **Desktop App Tests** (2 hours)
   - Browser-only recording
   - Voice-only recording
   - Combined recording
   - Zip creation and viewer launch

2. **MCP Server Tests** (1 hour)
   - Tool invocation from Claude Desktop
   - Recording lifecycle management
   - Error handling

3. **Viewer Tests** (1 hour)
   - Load session with voice
   - Timeline voice indicators
   - Action list voice entries
   - Audio playback

---

### Task 5.2: User Documentation (2 hours)

**Priority:** 🟡 MEDIUM

#### Documents to Create

1. **Desktop App User Guide** (1 hour)
   - Installation instructions
   - Recording workflow
   - Troubleshooting

2. **MCP Server Setup Guide** (1 hour)
   - Installation
   - Configuration
   - Usage examples

---

### Task 5.3: Deployment Guides (2 hours)

**Priority:** 🟢 LOW

#### Guides

1. **Desktop App Deployment** (1 hour)
   - Build instructions
   - Distribution (Windows, macOS, Linux)
   - Auto-update setup

2. **MCP Server Deployment** (1 hour)
   - npm publishing
   - Configuration for different environments

---

## Summary

### Total Estimated Effort: 78 hours

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Voice Recording Backend | 16 | 🔴 HIGH |
| Phase 2: Viewer Integration | 14 | 🔴 HIGH |
| Phase 3: Testing & Documentation (Phases 1-2) | 4 | 🔴 HIGH |
| Phase 4: MCP Server | 12 | 🔴 HIGH |
| Phase 5: Desktop Application | 20 | 🚨 HIGH |
| Phase 6: Final Testing & Documentation | 12 | 🟡 MEDIUM |

### Implementation Priority

**Must Have (Core Voice & Viewer - 34 hours):**

1. Voice Recording Backend (16h)
2. Viewer Integration (14h)
3. Testing & Documentation for Phases 1-2 (4h)

**Should Have (Full Production - 78 hours):**
4. MCP Server (12h)
5. Desktop Application (20h)
6. Final Testing & Documentation (12h)

### Success Metrics

| Metric | Target |
|--------|--------|
| Desktop app installation success rate | >95% |
| Recording start time | <3 seconds |
| Transcription accuracy | >90% |
| Zip creation time | <10 seconds |
| MCP tool response time | <500ms |
| Viewer load time with voice | <5 seconds |

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-05 | Initial task breakdown for PRD-4 | Claude |
