# Epic: System Audio Recording

<epic>
  <id>system-audio</id>
  <name>System Audio Recording</name>
  <status>tested</status>
  <initiative>session-recorder</initiative>
  <depends_on>recorder-voice</depends_on>
  <estimated_effort>20 hours</estimated_effort>
</epic>

## Overview

Extend Session Recorder's voice capabilities to capture **system audio** (meeting participants, videos, etc.) alongside the existing microphone recording. This enables recording browser sessions during meetings where both the user's narration AND what others are saying need to be captured and transcribed.

**Source PRD:** [PRD-5.md](../../PRDs/PRD-5.md)

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| Developers in Meetings | Record browser actions while on calls with stakeholders |
| QA Testers | Capture verbal feedback during live testing sessions |
| Support Staff | Record customer calls while demonstrating solutions |
| Product Managers | Document discussions while showing product features |

## Problem Statement

**Current State:** Session recorder captures microphone audio (user's voice) but cannot capture what others are saying in meetings.

- User can narrate their own actions with voice recording
- Cannot capture meeting participant voices (Zoom, Teams, Meet)
- Cannot capture video/audio playing in other tabs
- Context from conversations is lost in recordings

**Target State:**

- Capture both microphone (user) AND system audio (others)
- Transcribe both streams with source attribution
- Align all audio with browser action timestamps
- Viewer displays who said what during the session

## Goals

### Primary Goal
Enable dual-audio recording (microphone + system) for meeting scenarios with source-attributed transcription.

### Success Metrics

| Metric | Target |
|--------|--------|
| Audio sync accuracy | < 100ms drift between streams |
| Transcription accuracy | Same as existing voice (Whisper) |
| Source attribution accuracy | > 95% correct speaker identification |
| User adoption | Recording option used in > 20% of sessions |

## Features

### F1: Browser Audio Capture
- Use `getDisplayMedia` API with audio
- Extract audio track from screen share
- Handle browser permission dialog
- Support Chrome, Edge, Firefox

### F2: Dual-Stream Recording
- Simultaneous microphone and system audio capture
- Separate audio files for each stream
- Synchronized timestamps
- Handle echo/feedback prevention

### F3: Source-Attributed Transcription
- Transcribe both streams via Whisper
- Mark segments with source (voice/system)
- Merge transcripts chronologically
- Preserve word-level timestamps

### F4: Viewer Updates
- Timeline shows voice segments (blue) and system segments (green)
- Transcript panel displays speaker source icons
- Playback can toggle between streams or play both
- Search works across both transcript sources

## Technical Approach

### Browser API: `getDisplayMedia` with Audio

```typescript
// Capture system audio via screen/tab share
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: { width: 1, height: 1 },  // Minimal video (required by API)
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 44100
  }
});

// Extract audio track only
const audioTrack = stream.getAudioTracks()[0];
```

### Why Browser-Based Only

1. **No new dependencies** - Reuses existing Python/Whisper pipeline
2. **User consent** - Browser permission dialog ensures explicit consent
3. **Cross-platform** - Works on Windows, Mac, Linux without native code
4. **Web meeting compatible** - Google Meet, Zoom Web, Teams Web all work

### Limitations (Accepted)

- Requires user to share screen/tab with audio enabled
- Native desktop meeting apps (Zoom.exe, Teams.exe) won't work - must use web versions
- Some browsers may not support audio capture in getDisplayMedia
- Cannot capture system audio without screen share permission

## Data Model Changes

### Transcript with Source Attribution

```json
{
  "segments": [
    {
      "source": "voice",
      "text": "Let me show you the dashboard",
      "start": "2025-12-10T14:23:45.123Z",
      "end": "2025-12-10T14:23:47.456Z"
    },
    {
      "source": "system",
      "text": "Can you click on the settings icon?",
      "start": "2025-12-10T14:23:48.000Z",
      "end": "2025-12-10T14:23:50.200Z"
    }
  ]
}
```

### API Extension

```typescript
interface RecordingOptions {
  browser_record?: boolean;        // Capture DOM + actions (existing)
  voice_record?: boolean;          // Capture microphone audio (existing)
  system_audio_record?: boolean;   // Capture system audio (NEW)
  whisper_model?: WhisperModel;    // Transcription model (existing)
}
```

## Dependencies

- Voice Recording complete (epic-recorder-voice)
- Browser Support: Chrome 94+, Edge 94+, Firefox 91+ (with caveats)
- Whisper Model: Same models as voice recording

## Out of Scope

- Native system audio loopback (requires platform-specific code)
- Speaker diarization (who specifically is speaking)
- Real-time transcription during recording
- Automatic meeting app detection
- Integration with meeting platform APIs (Zoom SDK, etc.)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser API inconsistencies | Some browsers may not capture audio | Document supported browsers, graceful fallback |
| Echo/feedback loops | Audio quality issues | Disable echo cancellation, document best practices |
| Large audio files | Storage/bandwidth | Compress to MP3, same as voice recording |
| Privacy concerns | Accidental capture of sensitive audio | Clear permission dialogs, easy to disable |

## Implementation Phases

| Phase | Focus | Estimate |
|-------|-------|----------|
| Phase 1 | Browser audio capture (`getDisplayMedia`) | 4 hours |
| Phase 2 | Dual-stream recording infrastructure | 6 hours |
| Phase 3 | Transcription with source markers | 4 hours |
| Phase 4 | Viewer updates for dual-source display | 6 hours |
| **Total** | | **20 hours** |
