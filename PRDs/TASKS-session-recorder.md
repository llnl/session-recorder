# Session Recorder - Consolidated Tasks

**PRD:** [PRD-session-recorder.md](PRD-session-recorder.md)
**Last Updated:** 2025-12-10
**Overall Status:** ~80% Complete (Core recording and viewer complete, compression and export formats pending)

---

## Table of Contents

- [FR-1: Event Capture](#fr-1-event-capture)
- [FR-2: Snapshot Capture](#fr-2-snapshot-capture)
- [FR-3: Audio Capture](#fr-3-audio-capture)
- [FR-4: Session Viewer](#fr-4-session-viewer)
- [FR-5: Data Export](#fr-5-data-export)
- [Technical Requirements](#technical-requirements)
- [Known Issues & Blockers](#known-issues--blockers)
- [Estimated Effort](#estimated-effort)

---

## FR-1: Event Capture

> **PRD Reference:** [FR-1: Event Capture](PRD-session-recorder.md#fr-1-event-capture)

### FR-1.1: Mouse Events ✅ COMPLETE

> [PRD: FR-1.1](PRD-session-recorder.md#fr-11-mouse-events)

- [x] Capture `click` events with coordinates
- [x] Capture `dblclick` events
- [x] Capture `contextmenu` (right-click) events
- [x] Record x, y coordinates (clientX, clientY)
- [x] Record button type (left=0, middle=1, right=2)
- [x] Record modifier keys (ctrl, shift, alt, meta)
- [x] Record target element selector

**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)

### FR-1.2: Keyboard Events ✅ COMPLETE

> [PRD: FR-1.2](PRD-session-recorder.md#fr-12-keyboard-events)

- [x] Capture `keydown` events (filtered)
- [x] Filter: Enter, Tab, Escape, Delete, Backspace
- [x] Filter: Arrow keys (Up, Down, Left, Right)
- [x] Filter: Modifier key combinations (Ctrl+X, etc.)
- [x] Exclude bare modifier keys
- [x] Exclude regular character keys (captured via input event)

**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)

### FR-1.3: Form Events ✅ COMPLETE

> [PRD: FR-1.3](PRD-session-recorder.md#fr-13-form-events)

- [x] Capture `input` events with current value
- [x] Capture `change` events with type-specific values
- [x] Capture `submit` events with form target
- [x] Handle checkbox values (boolean)
- [x] Handle radio button values (string|null)
- [x] Handle select-one values (string)
- [x] Handle select-multiple values (string[])
- [x] Handle file input values (filename strings only)

**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)

### FR-1.4: Clipboard Events ✅ COMPLETE

> [PRD: FR-1.4](PRD-session-recorder.md#fr-14-clipboard-events)

- [x] Capture `copy` events
- [x] Capture `cut` events
- [x] Capture `paste` events
- [x] Record selectedText where accessible
- [x] Handle browser security restrictions for paste

**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)

### FR-1.5: Browser Events ✅ COMPLETE

> [PRD: FR-1.5](PRD-session-recorder.md#fr-15-browser-events)

- [x] Capture `navigation` events (fromUrl, toUrl, navigationType)
- [x] Capture `page_visibility` events (visible/hidden state)
- [x] Capture `media` events (play, pause, ended, seeked, volumechange)
- [x] Capture `download` events (url, filename, state, bytes)
- [x] Capture `fullscreen` events (entered/exited state)
- [x] Capture `print` events (beforeprint/afterprint)

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)
**Reference:** [actions-recorded.md](../docs/actions-recorded.md)

---

## FR-2: Snapshot Capture

> **PRD Reference:** [FR-2: Snapshot Capture](PRD-session-recorder.md#fr-2-snapshot-capture)

### FR-2.1: DOM Snapshot ✅ COMPLETE

> [PRD: FR-2.1](PRD-session-recorder.md#fr-21-dom-snapshot)

- [x] Capture complete DOM structure
- [x] Capture inline styles
- [x] Capture computed styles
- [x] Preserve form field values (`__playwright_value_`)
- [x] Preserve checkbox/radio states (`__playwright_checked_`)
- [x] Preserve select option states (`__playwright_selected_`)
- [x] Preserve scroll positions (`__playwright_scroll_top_`, `__playwright_scroll_left_`)
- [x] Mark acted-upon element (`data-selected-el="true"`)
- [x] Support Shadow DOM (`<template shadowrootmode="open">`)
- [ ] Implement gzip compression for DOM snapshots

**Implementation:** [snapshotCapture.ts](../src/browser/snapshotCapture.ts)

### FR-2.2: Screenshot Capture ⚠️ PARTIAL

> [PRD: FR-2.2](PRD-session-recorder.md#fr-22-screenshot-capture)

- [x] Capture visible viewport screenshot
- [x] Sync screenshot with DOM snapshot (same timestamp)
- [x] Generate before/after screenshots for actions
- [ ] Use JPEG format instead of PNG
- [ ] Make quality configurable (default 75%)
- [ ] Implement screenshot compression

**Files:** `screenshots/{actionId}-before.png`, `screenshots/{actionId}-after.png`

### FR-2.3: Resource Capture ✅ COMPLETE

- [x] Capture CSS stylesheets
- [x] Capture JavaScript files
- [x] Capture images
- [x] Capture fonts
- [x] Implement SHA1-based content-addressable storage
- [x] Deduplicate resources across snapshots

**Implementation:** [resourceStorage.ts](../src/storage/resourceStorage.ts)

### FR-2.4: Font/Styling Issues ❌ NOT COMPLETE

- [ ] Fix custom fonts not rendering in snapshots
- [ ] Implement inline `<style>` URL rewriting
- [ ] Fix CSS `url()` patterns in external stylesheets
- [ ] Ensure font resources are captured correctly

**Task File:** [TASKS-snapshot-styling.md](TASKS-snapshot-styling.md) (~4-6h)

---

## FR-3: Audio Capture

> **PRD Reference:** [FR-3: Audio Capture](PRD-session-recorder.md#fr-3-audio-capture)

### FR-3.1: Voice Recording ✅ COMPLETE

> [PRD: FR-3.1](PRD-session-recorder.md#fr-31-recording)

- [x] Implement continuous audio recording
- [x] Handle microphone permissions via Python subprocess
- [x] Create VoiceRecorder class
- [ ] Add visual recording indicator during capture

**Implementation:** [VoiceRecorder.ts](../src/voice/VoiceRecorder.ts)

### FR-3.2: Audio Storage ⚠️ PARTIAL

> [PRD: FR-3.2](PRD-session-recorder.md#fr-32-storage)

- [x] Store audio recordings
- [ ] Convert to MP3 format (currently WAV)
- [ ] Configure bitrate (target: 64 kbps)
- [ ] Configure sample rate (target: 22050 Hz)

**Current:** `audio/recording.wav`

### FR-3.3: Transcription ✅ COMPLETE

> [PRD: FR-3.3](PRD-session-recorder.md#fr-33-transcription)

- [x] Integrate Whisper speech-to-text
- [x] Support multiple models (tiny, base, small, medium, large)
- [x] Support GPU acceleration (CUDA, MPS, CPU fallback)
- [x] Sync timestamps with timeline (UTC aligned)
- [x] Store transcript as JSON

**Implementation:** [whisper_transcribe.py](../src/voice/whisper_transcribe.py)
**Output:** `audio/transcript.json`
**Documentation:** [VOICE_RECORDING.md](../docs/VOICE_RECORDING.md)

---

## FR-4: Session Viewer

> **PRD Reference:** [FR-4: Session Viewer](PRD-session-recorder.md#fr-4-session-viewer)

### FR-4.1: Timeline Component ✅ COMPLETE

- [x] Display screenshot thumbnails on timeline
- [x] Calculate time scale (pixels per second)
- [x] Render time markers
- [x] Handle horizontal scrolling
- [x] Implement hover preview with enlarged screenshot
- [x] Click to jump to action
- [x] Drag to select time range
- [x] Show selection duration indicator

**Implementation:** [Timeline.tsx](../viewer/src/components/Timeline/Timeline.tsx)

### FR-4.2: Action List ✅ COMPLETE

- [x] Display actions in scrollable list
- [x] Virtual scrolling for performance (TanStack Virtual)
- [x] Show action type, time, target description
- [x] Highlight selected action
- [x] Auto-scroll to selected action
- [x] Filter by timeline selection
- [x] Support voice transcript actions
- [x] Add search/filter controls - deferred to Angular migration

**Implementation:** [ActionList.tsx](../viewer/src/components/ActionList/ActionList.tsx)

### FR-4.3: Snapshot Viewer ✅ COMPLETE

- [x] Display before/after snapshots in iframes
- [x] Toggle between before and after views
- [x] Highlight acted-upon element
- [x] Auto-scroll to highlighted element
- [x] Zoom controls (50% - 200%)
- [x] Display snapshot metadata (timestamp, URL, viewport)

**Implementation:** [SnapshotViewer.tsx](../viewer/src/components/SnapshotViewer/SnapshotViewer.tsx)

### FR-4.4: Tab Panel ✅ COMPLETE

- [x] Information tab (action details)
- [x] Console tab with log level filtering
- [x] Network tab with waterfall visualization
- [x] Color-coded console entries by level
- [x] Expandable stack traces for errors
- [x] Network request/response details
- [x] Filter by resource type

**Implementation:** [TabPanel.tsx](../viewer/src/components/TabPanel/TabPanel.tsx)

### FR-4.5: Layout & Navigation ✅ COMPLETE

- [x] Grid layout (Timeline, ActionList, SnapshotViewer, TabPanel)
- [x] Resizable panels with drag handles
- [x] Save panel sizes to localStorage
- [x] Session statistics in header
- [x] Export session button
- [x] Arrow key navigation between actions

**Implementation:** [App.tsx](../viewer/src/App.tsx)

### FR-4.6: Voice Playback ✅ COMPLETE

- [x] Audio player synced to timeline
- [x] Display transcript synced to timeline
- [x] Highlight current transcript segment

**Implementation:** [VoiceTranscriptViewer.tsx](../viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.tsx)

### FR-4.7: Missing Viewer Features

- [ ] Live session replay (time-synced playback)
- [ ] Search/filtering across all actions
- [ ] Lazy loading for large sessions (1000+ actions)
- [ ] Progressive image loading
- [ ] Memory management for extended viewing

**Task File:** [TASKS-performance.md](TASKS-performance.md) Sprint 5d (~7h)

---

## FR-5: Data Export

> **PRD Reference:** [FR-5: Data Export](PRD-session-recorder.md#fr-5-data-export)

### FR-5.1: ZIP Archive ✅ COMPLETE

- [x] Export session.json (metadata + actions)
- [x] Export session.network (JSON Lines)
- [x] Export session.console (JSON Lines)
- [x] Export snapshots/ directory (HTML files)
- [x] Export screenshots/ directory (PNG files)
- [x] Export resources/ directory (SHA1 deduplicated)
- [x] Export audio/ directory (recording + transcript)
- [x] Import ZIP files in viewer

### FR-5.2 - FR-5.5: Export Features ❌ NOT STARTED

**Deferred to:** [TASKS-export.md](TASKS-export.md) (~55h)

Export features have been moved to a separate task file for future implementation:

- **FR-5.2:** Bug Report Export (Markdown, Jira, Linear, GitHub Issues)
- **FR-5.3:** Test Code Generation (Playwright, Cypress)
- **FR-5.4:** Documentation Export (Markdown, HTML, Confluence)
- **FR-5.5:** Features Export (feature_list.json, user flow mapping)

---

## Technical Requirements

> **PRD Reference:** [Technical Requirements](PRD-session-recorder.md#technical-requirements)

### TR-1: Compression ❌ NOT COMPLETE

> [PRD: TR-1](PRD-session-recorder.md#tr-1-compression)

- [ ] Implement gzip compression for DOM snapshots (target: 5-10x reduction)
- [ ] Convert screenshots to JPEG 75% quality
- [ ] Convert audio to MP3 64kbps

**Current Impact:** Session files are ~3-5x larger than optimal

| Duration | PRD Target | Current (approx.) |
|----------|------------|-------------------|
| 10 min   | ~12 MB     | ~25-35 MB         |
| 30 min   | ~35 MB     | ~70-100 MB        |
| 1 hour   | ~70 MB     | ~150-200 MB       |

### TR-2: Event Listeners ✅ COMPLETE

> [PRD: TR-2](PRD-session-recorder.md#tr-2-event-listeners)

- [x] All event listeners use capture phase
- [x] Non-blocking event handling
- [x] Proper cleanup on session end

### TR-3: Element Identification ✅ COMPLETE

> [PRD: TR-3](PRD-session-recorder.md#tr-3-element-identification)

- [x] Priority 1: `data-testid` attribute
- [x] Priority 2: `id` attribute (if unique)
- [x] Priority 3: `name` attribute
- [x] Priority 4: Unique class combination
- [x] Priority 5: CSS path from nearest ancestor
- [x] Priority 6: XPath fallback

### TR-4: Performance ⚠️ PARTIAL

> [PRD: TR-4](PRD-session-recorder.md#tr-4-storage-estimates)

- [x] Basic resource capture implemented
- [x] Fix multi-tab performance degradation (6-25s page load delays)
- [ ] Implement ResourceCaptureQueue for non-blocking capture
- [ ] Background SHA1 hashing
- [ ] Non-blocking response handler

**Task File:** [TASKS-performance.md](TASKS-performance.md) Sprint 5c (~2h remaining)

---

## Known Issues & Blockers

### Critical Priority

**1. Performance Degradation**

- [x] Multi-tab recording causes 6-25 second page load delays
- [ ] Resource capture blocking event loop
- [ ] Partial fix applied, full ResourceCaptureQueue needed

**Task:** [TASKS-performance.md](TASKS-performance.md) Sprint 5c

**2. Font Rendering**

- [ ] Custom fonts not rendering in snapshots
- [ ] Inline `<style>` URL rewriting missing
- [ ] CSS `url()` in external stylesheets not fully handled

**Task:** [TASKS-snapshot-styling.md](TASKS-snapshot-styling.md)

### Medium Priority

**3. Missing Compression**

- [ ] DOM snapshots not gzipped
- [ ] Screenshots in PNG instead of JPEG
- [ ] Audio in WAV instead of MP3
- [ ] Session sizes 3-5x larger than needed

**4. Viewer Performance with Large Sessions**
- [ ] No lazy loading for large sessions (1000+ actions)
- [ ] Memory issues with extended playback

### Low Priority

**5. Missing Export Formats**

See [TASKS-export.md](TASKS-export.md) for detailed export feature tasks.

---

## Estimated Effort

### Completed Phases ✅

| Phase | Task File | Hours | Status |
|-------|-----------|-------|--------|
| Core Recording | TASKS.md | 30h | ✅ Complete |
| Console + React Viewer | TASKS-2.md | 41h | ✅ Complete |
| Snapshot Architecture | TASKS-3.md | 21h | ✅ Phase 1-2 |
| Voice Recording | TASKS-4.md | 30h | ✅ Phase 1-2 |
| **Completed Total** | | **122h** | |

### Remaining Work

| Phase | Task File | Hours | Priority |
|-------|-----------|-------|----------|
| Performance Fix | TASKS-performance.md | 2h | 🔴 HIGH |
| Font Rendering | TASKS-snapshot-styling.md | 4-6h | 🔴 HIGH |
| Compression | (new) | 4h | 🟡 MEDIUM |
| Viewer Performance | TASKS-performance.md | 7h | 🟡 MEDIUM |
| MCP Server | TASKS-MCP.md | 12h | 🟡 MEDIUM |
| Desktop App | TASKS-DESKTOP.md | 20h | 🟡 MEDIUM |
| Session Editor | TASKS-session-editor.md | 40h | 🟢 LOW |
| Export Formats | [TASKS-export.md](TASKS-export.md) | 55h | 🟢 LOW |
| **Remaining Total** | | **~145h** | |

### Summary

| Category | Hours |
|----------|-------|
| Completed | 122h |
| Remaining | ~145h |
| **Grand Total** | **~267h** |

---

## Implementation Priority

### Immediate (This Week)

1. **Performance Fix** - TASKS-performance.md Sprint 5c (2h)
2. **Font Rendering** - TASKS-snapshot-styling.md (4-6h)

### Short-Term (Next 2 Weeks)

3. **Compression** - gzip, JPEG, MP3 (4h)
4. **Viewer Performance** - Lazy loading, memory management (7h)

### Medium-Term (Next Month)

5. **MCP Server** - TASKS-MCP.md (12h)
6. **Desktop App** - TASKS-DESKTOP.md (20h)

### Long-Term (Backlog)

7. **Session Editor** - TASKS-session-editor.md (40h)
8. **Export Formats** - [TASKS-export.md](TASKS-export.md) (55h)

---

## File Reference

### Core Recording
- [src/browser/actionListener.ts](../src/browser/actionListener.ts) - Event capture
- [src/browser/snapshotCapture.ts](../src/browser/snapshotCapture.ts) - DOM snapshots
- [src/node/SessionRecorder.ts](../src/node/SessionRecorder.ts) - Main orchestrator
- [src/node/types.ts](../src/node/types.ts) - Type definitions

### Voice Recording
- [src/voice/VoiceRecorder.ts](../src/voice/VoiceRecorder.ts) - Audio capture
- [src/voice/whisper_transcribe.py](../src/voice/whisper_transcribe.py) - Transcription

### Viewer
- [viewer/src/stores/sessionStore.ts](../viewer/src/stores/sessionStore.ts) - State management
- [viewer/src/components/](../viewer/src/components/) - React components

### Storage
- [src/storage/resourceStorage.ts](../src/storage/resourceStorage.ts) - SHA1 deduplication

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial consolidated status document |
| 1.1 | 2025-12-10 | Converted to checkbox format |
| 1.2 | 2025-12-10 | Updated status to ~80%, verified implementation against codebase |
| 1.3 | 2025-12-11 | Moved FR-5.2-5.5 export tasks to [TASKS-export.md](TASKS-export.md) |
