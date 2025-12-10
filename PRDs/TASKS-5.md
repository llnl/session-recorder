# TASKS-5: System Audio Recording Implementation Tasks

**PRD:** [PRD-5.md](./PRD-5.md)
**Last Updated:** 2025-12-10
**Overall Status:** Planning (Future Work)
**Estimated Total:** 20 hours

---

## Table of Contents

- [Phase 1: Browser Audio Capture](#phase-1-browser-audio-capture-4-hours)
- [Phase 2: Dual-Stream Recording](#phase-2-dual-stream-recording-6-hours)
- [Phase 3: Transcription with Source Markers](#phase-3-transcription-with-source-markers-4-hours)
- [Phase 4: Viewer Updates](#phase-4-viewer-updates-6-hours)
- [Overall Summary](#overall-summary)
- [File Reference](#file-reference)

---

## Overview

This document breaks down PRD-5 objectives into actionable tasks for adding system audio capture to Session Recorder, enabling meeting recording scenarios.

**Key Constraint:** Browser-based only using `getDisplayMedia` API.

---

## Phase 1: Browser Audio Capture (4 hours)

**Status:** Not Started
**Goal:** Capture system audio via browser `getDisplayMedia` API

### Task 1.1: getDisplayMedia Integration (2 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

- [ ] Research `getDisplayMedia` audio capture across browsers
- [ ] Create `SystemAudioCapture` class in browser injection code
- [ ] Implement audio stream extraction from display media
- [ ] Handle permission dialog flow
- [ ] Test on Chrome, Edge, Firefox

#### Code Location

- `src/browser-code.ts` - Add system audio capture functions
- `src/SessionRecorder.ts` - Add `system_audio_record` option

#### Acceptance Criteria

- [ ] Can request system audio via getDisplayMedia
- [ ] Audio stream successfully captured
- [ ] Permission denial handled gracefully
- [ ] Works on Chrome 94+ and Edge 94+

### Task 1.2: Audio Stream Recording (2 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

- [ ] Implement MediaRecorder for system audio stream
- [ ] Configure audio format (WAV/WebM)
- [ ] Handle audio chunks and concatenation
- [ ] Implement stream start/stop controls
- [ ] Add audio level monitoring (optional)

#### Acceptance Criteria

- [ ] System audio recorded to file
- [ ] Audio quality matches microphone recording
- [ ] Recording starts/stops cleanly
- [ ] File saved to session audio directory

---

## Phase 2: Dual-Stream Recording (6 hours)

**Status:** Not Started
**Goal:** Record microphone and system audio simultaneously

### Task 2.1: Parallel Audio Capture (3 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

- [ ] Modify VoiceRecorder to support dual streams
- [ ] Implement synchronized start for both streams
- [ ] Handle independent stream failures gracefully
- [ ] Add timestamp alignment between streams
- [ ] Test simultaneous recording stability

#### Code Location

- `src/VoiceRecorder.ts` - Extend for dual-stream support
- `src/voice/record_and_transcribe.py` - Handle multiple audio files

#### Acceptance Criteria

- [ ] Both streams record simultaneously
- [ ] Timestamps synchronized to session start
- [ ] One stream failure doesn't crash the other
- [ ] Both files saved with correct naming

### Task 2.2: Session Metadata Updates (1.5 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

- [ ] Update session.json schema for dual audio
- [ ] Add `system_audio_record` to RecordingOptions
- [ ] Store both audio file paths in metadata
- [ ] Update session loading to handle dual audio
- [ ] Backward compatibility with single-audio sessions

#### Schema Changes

```typescript
interface SessionMetadata {
  audio: {
    voice_record: boolean;
    system_audio_record: boolean;
    voice_file?: string;      // "audio/voice.wav"
    system_file?: string;     // "audio/system.wav"
  }
}
```

#### Acceptance Criteria

- [ ] Schema supports dual audio metadata
- [ ] Old sessions load without errors
- [ ] New sessions save both audio references

### Task 2.3: Recording Options API (1.5 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

- [ ] Add `system_audio_record` to RecordingOptions interface
- [ ] Update SessionRecorder constructor validation
- [ ] Add browser capability check for getDisplayMedia audio
- [ ] Implement graceful fallback if not supported
- [ ] Update documentation and types

#### Acceptance Criteria

- [ ] New option available in API
- [ ] Validation rejects invalid combinations
- [ ] Unsupported browsers handled gracefully
- [ ] TypeScript types updated

---

## Phase 3: Transcription with Source Markers (4 hours)

**Status:** Not Started
**Goal:** Transcribe both audio streams with source attribution

### Task 3.1: Dual Transcription Pipeline (2 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

- [ ] Extend Python script to accept multiple audio files
- [ ] Run Whisper on both streams (can be parallel)
- [ ] Add `source` field to transcript segments
- [ ] Preserve word-level timing for both streams
- [ ] Handle transcription failures per-stream

#### Code Location

- `src/voice/record_and_transcribe.py` - Multi-file support
- `src/VoiceRecorder.ts` - Call transcription for both files

#### Acceptance Criteria

- [ ] Both audio files transcribed
- [ ] Source field present on all segments
- [ ] Transcription timing accurate for both
- [ ] Single stream failure doesn't block other

### Task 3.2: Transcript Merging (2 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

- [ ] Merge voice and system transcripts chronologically
- [ ] Resolve overlapping segments (both speaking)
- [ ] Maintain word-level alignment across sources
- [ ] Update transcript.json format
- [ ] Test with various overlap scenarios

#### Output Format

```json
{
  "segments": [
    { "source": "voice", "text": "...", "start": "...", "end": "..." },
    { "source": "system", "text": "...", "start": "...", "end": "..." }
  ],
  "sources": {
    "voice": { "duration": 120.5, "word_count": 450 },
    "system": { "duration": 118.2, "word_count": 380 }
  }
}
```

#### Acceptance Criteria

- [ ] Merged transcript chronologically ordered
- [ ] Overlapping speech preserved (not merged)
- [ ] Source metadata included
- [ ] Compatible with existing viewer

---

## Phase 4: Viewer Updates (6 hours)

**Status:** Not Started
**Goal:** Display and playback dual-source transcripts

### Task 4.1: Timeline Visualization (2 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

- [ ] Add visual distinction for voice vs system segments
- [ ] Color coding: voice (blue), system (green)
- [ ] Show overlapping segments stacked
- [ ] Update timeline scrubbing for both streams
- [ ] Add source filter toggle

#### Code Location

- `viewer/src/components/Timeline.tsx`
- `viewer/src/components/VoiceTimeline.tsx`

#### Acceptance Criteria

- [ ] Timeline shows both sources visually distinct
- [ ] Overlapping segments visible
- [ ] Can filter to show one source only
- [ ] Scrubbing works with both streams

### Task 4.2: Transcript Panel Updates (2 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

- [ ] Add source icon/label to transcript entries
- [ ] Color code transcript text by source
- [ ] Implement source filtering in panel
- [ ] Update search to include source filter
- [ ] Highlight active segment for both sources

#### Code Location

- `viewer/src/components/TranscriptPanel.tsx`
- `viewer/src/components/VoiceSegment.tsx`

#### Acceptance Criteria

- [ ] Transcript entries show source clearly
- [ ] Can filter transcript by source
- [ ] Search works across both sources
- [ ] Active highlighting works for both

### Task 4.3: Dual Audio Playback (2 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

- [ ] Load both audio files in viewer
- [ ] Implement synchronized playback
- [ ] Add volume controls per source
- [ ] Add mute toggles per source
- [ ] Handle missing audio file gracefully

#### Code Location

- `viewer/src/hooks/useAudioPlayback.ts`
- `viewer/src/components/AudioControls.tsx`

#### Acceptance Criteria

- [ ] Both audio streams play in sync
- [ ] Individual volume/mute controls work
- [ ] Playback position synced across streams
- [ ] Missing audio handled gracefully

---

## Overall Summary

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| Phase 1: Browser Audio Capture | 2 | 4 | Not Started |
| Phase 2: Dual-Stream Recording | 3 | 6 | Not Started |
| Phase 3: Transcription with Source Markers | 2 | 4 | Not Started |
| Phase 4: Viewer Updates | 3 | 6 | Not Started |
| **Total** | **10** | **20** | **Planning** |

---

## File Reference

### Files to Create

| File | Purpose |
|------|---------|
| `src/SystemAudioCapture.ts` | Browser system audio capture via getDisplayMedia |

### Files to Modify

| File | Changes |
|------|---------|
| `src/SessionRecorder.ts` | Add `system_audio_record` option |
| `src/VoiceRecorder.ts` | Dual-stream recording support |
| `src/browser-code.ts` | getDisplayMedia audio capture |
| `src/voice/record_and_transcribe.py` | Multi-file transcription |
| `viewer/src/components/Timeline.tsx` | Dual-source visualization |
| `viewer/src/components/TranscriptPanel.tsx` | Source attribution display |
| `viewer/src/hooks/useAudioPlayback.ts` | Dual audio playback |

---

## Prerequisites

- [ ] PRD-4 Voice Recording complete (Phase 1 & 2)
- [ ] Whisper pipeline working
- [ ] Viewer voice playback working

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial task breakdown for system audio recording |
