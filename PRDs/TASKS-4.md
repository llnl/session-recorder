# TASKS-4: Production Polish & Voice Recording Implementation Tasks

**PRD:** [PRD-4.md](./PRD-4.md)
**Last Updated:** 2025-12-10
**Overall Status:** ~38% Complete (Phases 1 & 2 Complete - 30h/78h)

---

## Table of Contents

- [Phase 1: Voice Recording Backend](#phase-1-voice-recording-backend-16-hours----complete-2025-12-06)
- [Phase 2: Viewer Integration](#phase-2-viewer-integration-14-hours----complete-2025-12-06)
- [Phase 3: Testing & Documentation](#phase-3-testing--documentation-for-phases-1-2-4-hours)
- [Phase 4: MCP Server](#phase-4-mcp-server-12-hours---see-tasks-mcpmd)
- [Phase 5: Desktop Application](#phase-5-desktop-application-20-hours---see-tasks-desktopmd)
- [Phase 6: Final Testing & Documentation](#phase-6-final-testing--documentation-12-hours)
- [Overall Summary](#overall-summary)
- [File Reference](#file-reference)
- [Document Change Log](#document-change-log)

---

## Overview

This document breaks down PRD-4 objectives into actionable tasks for making Session Recorder production-ready with voice recording capabilities.

**Document Structure:**

- **This file (TASKS-4.md):** Voice Recording Backend and Viewer Integration (Phases 1-3)
- **[TASKS-MCP.md](./TASKS-MCP.md):** MCP Server implementation (Phase 4)
- **[TASKS-DESKTOP.md](./TASKS-DESKTOP.md):** Desktop Application implementation (Phase 5)

**Latest Progress:**

- ✅ **Phase 1 Complete (16 hours):** Voice Recording Backend fully implemented
- ✅ **Phase 2 Complete (14 hours):** Viewer Integration fully implemented
- 🎯 **Next Options:**
  - Phase 3 - Testing & Documentation (4 hours) - Optional
  - [TASKS-MCP.md](./TASKS-MCP.md) - MCP Server (12 hours)
  - [TASKS-DESKTOP.md](./TASKS-DESKTOP.md) - Desktop App (20 hours)

---

## Phase 1: Voice Recording Backend (16 hours) - ✅ COMPLETE (2025-12-06)

**Status:** ✅ COMPLETE
**Implementation Summary:**

- Created `VoiceRecorder.ts` with audio capture and Whisper transcription
- Created `whisper_transcribe.py` Python script with GPU auto-detection
- Updated `SessionRecorder.ts` with `browser_record` and `voice_record` flags
- Implemented timestamp alignment and voice action merging
- Added comprehensive documentation in `docs/VOICE_RECORDING.md`
- Created test file `test/voice-test.ts`

### Task 1.1: Audio Capture Implementation (4 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Setup audio recording library** (1 hour)
   - Install node-record-lpcm16 or similar
   - Configure microphone access permissions
   - Test audio input detection

2. **Implement audio capture** (2 hours)
   - Record audio stream to WebM/MP3
   - Add level meter visualization
   - Implement noise gate/detection
   - Audio quality validation

3. **Error handling** (1 hour)
   - No microphone detected
   - Permission denied
   - Audio quality issues

#### Acceptance Criteria

- ✅ Audio captured from system microphone
- ✅ Level meter shows real-time audio levels
- ✅ Noise gate filters background noise
- ✅ Error handling for common issues

---

### Task 1.2: Whisper Integration (4 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH
**Status:** ✅ COMPLETE

**Implementation:**

- Created `whisper_transcribe.py` using official OpenAI Whisper
- Auto-detects GPU (CUDA/MPS) with CPU fallback
- Word-level timestamps with millisecond precision
- Returns confidence scores for segments and words
- Handles errors gracefully

**Files Created:**

- `src/voice/whisper_transcribe.py` - Python Whisper transcription script

#### Acceptance Criteria

- ✅ Audio successfully transcribed using Python Whisper (not API)
- ✅ Transcription returned with segment timestamps
- ✅ Word-level timestamps extracted
- ✅ Confidence scores captured
- ✅ GPU auto-detection implemented

---

### Task 1.3: Timestamp Alignment Algorithm (3 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH
**Status:** ✅ COMPLETE

**Implementation:**

- Implemented `convertToVoiceActions()` in VoiceRecorder
- Converts relative Whisper timestamps to absolute UTC
- Aligns voice segments with browser actions chronologically
- Finds nearest snapshot for each voice segment

**Code Location:**

- `src/voice/VoiceRecorder.ts` - `convertToVoiceActions()` method
- `src/node/SessionRecorder.ts` - `_findNearestSnapshot()` method

#### Acceptance Criteria

- ✅ Transcript timestamps in UTC
- ✅ Voice segments aligned with browser timeline
- ✅ Each voice segment linked to nearest snapshot

---

### Task 1.4: Transcript Storage (2 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH
**Status:** ✅ COMPLETE

**Implementation:**

- Extended `SessionData` type with `voiceRecording` metadata
- Created `VoiceTranscriptAction` type for voice actions
- Merges voice actions with browser actions chronologically
- Saves full transcript as `transcript.json`
- Stores audio as `audio/recording.wav`

**Files Modified:**

- `src/node/types.ts` - Added `VoiceTranscriptAction` and voice metadata
- `src/node/SessionRecorder.ts` - Voice action merging in `stop()` method

#### Acceptance Criteria

- ✅ Transcript saved as transcript.json
- ✅ Voice actions merged into session.json
- ✅ Audio file stored in session directory

---

### Task 1.5: Testing & Documentation (3 hours) - ✅ COMPLETE

**Status:** ✅ COMPLETE

**Implementation:**

- Created `test/voice-test.ts` for end-to-end testing
- Created `docs/VOICE_RECORDING.md` comprehensive guide
- Updated `package.json` with `test:voice` script
- Fixed type guards in existing tests

**Files Created/Modified:**

- `test/voice-test.ts` - Voice recording test suite
- `docs/VOICE_RECORDING.md` - Complete setup and usage guide
- `package.json` - Added test:voice script
- `test/simple-test.ts`, `test/spa-test.ts` - Type guard fixes

**Documentation Includes:**

- Python dependency installation
- GPU acceleration setup
- Whisper model comparison
- Usage examples
- Troubleshooting guide
- Output structure documentation

---

## Phase 2: Viewer Integration (14 hours) - ✅ COMPLETE (2025-12-06)

**Goal:** Update viewer to display voice transcripts alongside browser actions
**Deliverable:** Enhanced timeline and action list with voice support
**Status:** ✅ COMPLETE

**Implementation Summary:**

- Updated viewer types to support `VoiceTranscriptAction`
- Enhanced Timeline with green bars for voice segments
- Added hover tooltips for voice segments with transcript preview
- Updated ActionList to display voice entries with microphone icon
- Created VoiceTranscriptViewer component with audio playback
- Added Voice tab to TabPanel with auto-show when voice enabled
- Updated SessionLoader to load audio files from zip
- Comprehensive voice-related CSS styling

**Files Created:**

- `viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.tsx`
- `viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.css`
- `viewer/src/components/VoiceTranscriptViewer/index.ts`

**Files Modified:**

- `viewer/src/types/session.ts` - Added voice types
- `viewer/src/stores/sessionStore.ts` - Added voice tab and audioBlob
- `viewer/src/components/Timeline/Timeline.tsx` - Voice indicators
- `viewer/src/components/Timeline/Timeline.css` - Voice styling
- `viewer/src/components/ActionList/ActionList.tsx` - Voice entries
- `viewer/src/components/ActionList/ActionList.css` - Voice item styling
- `viewer/src/components/TabPanel/TabPanel.tsx` - Voice tab
- `viewer/src/components/SnapshotViewer/SnapshotViewer.tsx` - Voice guard
- `viewer/src/utils/zipHandler.ts` - Audio file loading
- `viewer/src/utils/sessionLoader.ts` - Audio file loading
- `viewer/src/hooks/useFilteredActions.ts` - Voice action support

### Task 2.1: Timeline Voice Indicators (4 hours) - ✅ COMPLETE

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

### Task 2.2: Action List Voice Entries (3 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH
**Status:** ✅ COMPLETE

#### Acceptance Criteria

- ✅ Voice transcripts shown in action list
- ✅ Intermixed with browser actions by timestamp
- ✅ Microphone icon and distinct styling
- ✅ Shows transcript preview, timestamp, duration, confidence
- ✅ Clicking selects voice entry

---

### Task 2.3: VoiceTranscriptViewer Component (4 hours) - ✅ COMPLETE

**Priority:** 🔴 HIGH
**Status:** ✅ COMPLETE

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

## Phase 4: MCP Server (12 hours) - See [TASKS-MCP.md](./TASKS-MCP.md)

**Goal:** Enable developers to use session recorder via AI coding assistants
**Deliverable:** MCP Server with 5 tools for recording control

**Full implementation details:** [TASKS-MCP.md](./TASKS-MCP.md) | [PRD-MCP.md](./PRD-MCP.md)

### MCP Tasks Overview

| Task | Hours | Priority |
|------|-------|----------|
| Task 4.1: MCP Server Setup | 4 | HIGH |
| Task 4.2: Tool Implementations | 5 | HIGH |
| Task 4.3: Integration & Testing | 3 | HIGH |

### MCP Deliverables

- MCP server with 5 tools: `start_browser_recording`, `start_voice_recording`, `start_combined_recording`, `stop_recording`, `get_recording_status`
- Claude Desktop integration
- RecordingManager wrapper for SessionRecorder
- Integration tests and documentation

---

## Phase 5: Desktop Application (20 hours) - See [TASKS-DESKTOP.md](./TASKS-DESKTOP.md)

**Goal:** Create user-friendly Desktop Application for non-developers
**Deliverable:** Cross-platform Electron app with one-click recording

**Full implementation details:** [TASKS-DESKTOP.md](./TASKS-DESKTOP.md) | [PRD-DESKTOP.md](./PRD-DESKTOP.md)

### Desktop Tasks Overview

| Task | Hours | Priority |
|------|-------|----------|
| Phase 1: Core Electron App | 4 | HIGH |
| Phase 2: Recording Integration | 5 | HIGH |
| Phase 3: UI Polish | 4 | HIGH |
| Phase 4: System Integration | 4 | MEDIUM |
| Phase 5: Testing & Distribution | 3 | HIGH |

### Desktop Deliverables

- Cross-platform Electron app (Windows, macOS, Linux)
- One-click recording with mode selection (Browser / Voice / Both)
- System tray integration with quick recording
- Recent recordings management
- Settings persistence
- Auto-open viewer on completion

---

## Phase 6: Final Testing & Documentation (12 hours)

**Goal:** Comprehensive testing and user documentation
**Deliverable:** Test suite and user guides

### Task 6.1: End-to-End Testing (4 hours)

**Priority:** MEDIUM

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

### Task 6.2: User Documentation (4 hours)

**Priority:** MEDIUM

#### Documents to Create

1. **Desktop App User Guide** (2 hours)
   - Installation instructions per platform
   - Recording workflow with screenshots
   - Settings configuration
   - Troubleshooting common issues

2. **MCP Server Setup Guide** (2 hours)
   - Installation and dependencies
   - Claude Desktop configuration
   - Usage examples and prompts
   - Troubleshooting

---

### Task 6.3: Deployment Guides (4 hours)

**Priority:** LOW

#### Guides

1. **Desktop App Deployment** (2 hours)
   - Build instructions for each platform
   - Code signing (Windows, macOS)
   - Distribution channels
   - Auto-update setup (optional)

2. **MCP Server Deployment** (2 hours)
   - npm publishing
   - Configuration for different environments
   - Version management

---

## Overall Summary

### Total Estimated Effort: 78 hours

| Phase | Hours | Priority | Status |
|-------|-------|----------|--------|
| Phase 1: Voice Recording Backend | 16 | HIGH | ✅ COMPLETE |
| Phase 2: Viewer Integration | 14 | HIGH | ✅ COMPLETE |
| Phase 3: Testing & Documentation (Phases 1-2) | 4 | HIGH | Optional |
| Phase 4: MCP Server ([TASKS-MCP.md](./TASKS-MCP.md)) | 12 | HIGH | Not Started |
| Phase 5: Desktop Application ([TASKS-DESKTOP.md](./TASKS-DESKTOP.md)) | 20 | HIGH | Not Started |
| Phase 6: Final Testing & Documentation | 12 | MEDIUM | Not Started |

### Implementation Priority

**✅ Complete (Core Voice & Viewer - 30 hours):**

1. Voice Recording Backend (16h) ✅
2. Viewer Integration (14h) ✅

**Next Steps (Choose Based on Priority):**

- [TASKS-MCP.md](./TASKS-MCP.md) - MCP Server (12h) - For AI assistant integration
- [TASKS-DESKTOP.md](./TASKS-DESKTOP.md) - Desktop Application (20h) - For non-developer access
- Testing & Documentation for Phases 1-2 (4h) - Optional polish
- Final Testing & Documentation (12h) - Production polish

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

## File Reference

### Voice Recording Components

- [VoiceRecorder.ts](../src/voice/VoiceRecorder.ts) - Audio capture and Whisper transcription
- [whisper_transcribe.py](../src/voice/whisper_transcribe.py) - Python Whisper script with GPU auto-detection

### Node Components

- [SessionRecorder.ts](../src/node/SessionRecorder.ts) - Voice action merging and storage
- [types.ts](../src/node/types.ts) - VoiceTranscriptAction type definitions

### Viewer Components

- [VoiceTranscriptViewer.tsx](../viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.tsx) - Audio playback with word highlighting
- [Timeline.tsx](../viewer/src/components/Timeline/Timeline.tsx) - Voice segment indicators
- [ActionList.tsx](../viewer/src/components/ActionList/ActionList.tsx) - Voice entry display
- [TabPanel.tsx](../viewer/src/components/TabPanel/TabPanel.tsx) - Voice tab integration
- [sessionStore.ts](../viewer/src/stores/sessionStore.ts) - Voice tab and audio blob state

### Tests

- [voice-test.ts](../test/voice-test.ts) - End-to-end voice recording tests

### Documentation

- [VOICE_RECORDING.md](../docs/VOICE_RECORDING.md) - Setup and usage guide

### Related Task Files

- [TASKS-MCP.md](./TASKS-MCP.md) - MCP Server implementation tasks
- [TASKS-DESKTOP.md](./TASKS-DESKTOP.md) - Desktop Application implementation tasks

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-05 | Initial task breakdown for PRD-4 |
| 1.1 | 2025-12-06 | Separated MCP and Desktop to dedicated files |
| 1.2 | 2025-12-10 | Updated to follow template, added Table of Contents and File Reference |
