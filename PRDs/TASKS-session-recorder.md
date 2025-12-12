# Session Recorder - Consolidated Tasks

**PRD:** [PRD-session-recorder.md](PRD-session-recorder.md)
**Last Updated:** 2025-12-12
**Overall Status:** ~97% Complete (Core recording, viewer, compression, performance, tray indicator, and lazy loading complete. Export formats pending)

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
- [x] Implement gzip compression for DOM snapshots (TR-1, 2025-12-11)

**Implementation:** [snapshotCapture.ts](../src/browser/snapshotCapture.ts), [SessionRecorder.ts](../src/node/SessionRecorder.ts)

### FR-2.2: Screenshot Capture ✅ COMPLETE

> [PRD: FR-2.2](PRD-session-recorder.md#fr-22-screenshot-capture)

- [x] Capture visible viewport screenshot
- [x] Sync screenshot with DOM snapshot (same timestamp)
- [x] Generate before/after screenshots for actions
- [x] Use JPEG format instead of PNG (TR-1, default, 2025-12-11)
- [x] Make quality configurable (default 75%, `screenshot_quality` option, 2025-12-11)
- [x] Implement screenshot compression (via JPEG format, 2025-12-11)

**Files:** `screenshots/{actionId}-before.jpg`, `screenshots/{actionId}-after.jpg` (configurable via `screenshot_format`)

### FR-2.3: Resource Capture ✅ COMPLETE

- [x] Capture CSS stylesheets
- [x] Capture JavaScript files
- [x] Capture images
- [x] Capture fonts
- [x] Implement SHA1-based content-addressable storage
- [x] Deduplicate resources across snapshots

**Implementation:** [resourceStorage.ts](../src/storage/resourceStorage.ts)

### FR-2.4: Font/Styling Issues ✅ COMPLETE

- [x] Fix custom fonts not rendering in snapshots (captured via network handler)
- [x] Implement inline `<style>` URL rewriting (`_rewriteHTML` method, 2025-12-11)
- [x] Fix CSS `url()` patterns in external stylesheets (`_rewriteCSSUrls` method)
- [x] Ensure font resources are captured correctly (font/* content types captured)

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts) - `_rewriteHTML()`, `_rewriteCSSUrls()`, `_handleNetworkResponse()`

---

## FR-3: Audio Capture

> **PRD Reference:** [FR-3: Audio Capture](PRD-session-recorder.md#fr-3-audio-capture)

### FR-3.1: Voice Recording ✅ COMPLETE

> [PRD: FR-3.1](PRD-session-recorder.md#fr-31-recording)

- [x] Implement continuous audio recording
- [x] Handle microphone permissions via Python subprocess
- [x] Create VoiceRecorder class
- [x] Add visual recording indicator during capture (TrayManager: system tray icon + desktop notifications, 2025-12-11)

**Implementation:** [VoiceRecorder.ts](../src/voice/VoiceRecorder.ts), [TrayManager.ts](../src/node/TrayManager.ts)

### FR-3.2: Audio Storage ✅ COMPLETE

> [PRD: FR-3.2](PRD-session-recorder.md#fr-32-storage)

- [x] Store audio recordings
- [x] Convert to MP3 format (`audio_format: 'mp3'` option, requires ffmpeg, 2025-12-11)
- [x] Configure bitrate (`audio_bitrate` option, default: 64k, 2025-12-11)
- [x] Configure sample rate (`audio_sample_rate` option, default: 22050 Hz, 2025-12-11)

**Output:** `audio/recording.wav` (default) or `audio/recording.mp3` (when `audio_format: 'mp3'`)

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

### FR-4.7: Viewer Performance Features ✅ COMPLETE

- [x] Lazy loading for large sessions (1000+ actions) - LazyResourceLoader with IntersectionObserver (2025-12-11)
- [x] Progressive image loading - LazyThumbnail component with preloading around selected action (2025-12-11)
- [x] Memory management for extended viewing - LRU cache with configurable limit (default 100 resources) (2025-12-11)

**Implementation:**

- [lazyResourceLoader.ts](../viewer/src/utils/lazyResourceLoader.ts) - JSZip lazy extraction with LRU cache
- [useLazyResource.ts](../viewer/src/hooks/useLazyResource.ts) - React hook with IntersectionObserver
- [LazyThumbnail.tsx](../viewer/src/components/Timeline/LazyThumbnail.tsx) - Timeline thumbnails with lazy loading
- [SnapshotViewer.tsx](../viewer/src/components/SnapshotViewer/SnapshotViewer.tsx) - Lazy snapshot loading

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

### TR-1: Compression ✅ COMPLETE

> [PRD: TR-1](PRD-session-recorder.md#tr-1-compression)

- [x] Implement gzip compression for DOM snapshots (target: 5-10x reduction, 2025-12-11)
- [x] Convert screenshots to JPEG 75% quality (default format now JPEG, 2025-12-11)
- [x] Convert audio to MP3 64kbps (optional, requires ffmpeg, 2025-12-11)

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts) - `compress_snapshots`, `screenshot_format`, `screenshot_quality`, `audio_format` options

**Expected Impact:** Session files should now be closer to PRD targets:

| Duration | PRD Target | Expected with compression |
|----------|------------|---------------------------|
| 10 min   | ~12 MB     | ~15-20 MB                 |
| 30 min   | ~35 MB     | ~40-50 MB                 |
| 1 hour   | ~70 MB     | ~80-100 MB                |

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

### TR-4: Performance ✅ COMPLETE

> [PRD: TR-4](PRD-session-recorder.md#tr-4-storage-estimates)

- [x] Basic resource capture implemented
- [x] Fix multi-tab performance degradation (6-25s page load delays)
- [x] Implement ResourceCaptureQueue for non-blocking capture (2025-12-11)
- [x] Background SHA1 hashing (inline quick hash, disk write queued, 2025-12-11)
- [x] Non-blocking response handler (disk writes deferred via queue, 2025-12-11)

**Implementation:** [ResourceCaptureQueue.ts](../src/storage/ResourceCaptureQueue.ts) - background processing with configurable batch size and concurrency

---

## Known Issues & Blockers

### Critical Priority

**1. Performance Degradation** ✅ RESOLVED

- [x] Multi-tab recording causes 6-25 second page load delays
- [x] Resource capture blocking event loop (fixed via ResourceCaptureQueue, 2025-12-11)
- [x] Full ResourceCaptureQueue implemented (2025-12-11)

**2. Font Rendering** ✅ RESOLVED

- [x] Custom fonts not rendering in snapshots (captured via network handler)
- [x] Inline `<style>` URL rewriting implemented (`_rewriteHTML`, 2025-12-11)
- [x] CSS `url()` in external stylesheets handled (`_rewriteCSSUrls`)

### Medium Priority

**3. Missing Compression** ✅ RESOLVED

- [x] DOM snapshots now gzipped (2025-12-11)
- [x] Screenshots now JPEG by default (2025-12-11)
- [x] Audio can be MP3 with `audio_format: 'mp3'` (2025-12-11)
- [x] Session sizes should be closer to PRD targets

**4. Viewer Performance with Large Sessions** ✅ RESOLVED

- [x] Lazy loading for large sessions (1000+ actions) - LazyResourceLoader (2025-12-11)
- [x] Memory management with LRU cache eviction (2025-12-11)

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
| MCP Server | TASKS-MCP.md | 12h | 🟡 MEDIUM |
| Desktop App | TASKS-DESKTOP.md | 20h | 🟡 MEDIUM |
| Session Editor | TASKS-session-editor.md | 40h | 🟢 LOW |
| Export Formats | [TASKS-export.md](TASKS-export.md) | 55h | 🟢 LOW |
| **Remaining Total** | | **~127h** | |

### Summary

| Category | Hours |
|----------|-------|
| Completed | 140h |
| Remaining | ~127h |
| **Grand Total** | **~267h** |

---

## Implementation Priority

### Medium-Term (Next Month)

1. **MCP Server** - TASKS-MCP.md (12h)
2. **Desktop App** - TASKS-DESKTOP.md (20h)

### Long-Term (Backlog)

3. **Session Editor** - TASKS-session-editor.md (40h)
4. **Export Formats** - [TASKS-export.md](TASKS-export.md) (55h)

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
| 1.4 | 2025-12-11 | Implemented TR-1 compression (gzip snapshots, JPEG screenshots, MP3 audio), TR-4 ResourceCaptureQueue, FR-2.4 font/styling fixes. Status now ~95% complete. |
| 1.5 | 2025-12-11 | Implemented FR-3.1 visual recording indicator (TrayManager with system tray + desktop notifications), FR-4.7 lazy loading (LazyResourceLoader, IntersectionObserver, LRU cache). Status now ~97% complete. |
| 1.6 | 2025-12-12 | Added TR-1 viewer support: gzip decompression in SnapshotViewer using pako library for `.html.gz` snapshots. Fixed viewer bugs: jittering loader (memoized htmlSnapshotPath), duplicate React keys (Timeline/ActionList). |
