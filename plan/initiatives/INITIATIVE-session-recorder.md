# Initiative: Session Recorder (Core)

<initiative>
  <name>session-recorder</name>
  <status>tested</status>
  <goal>Comprehensive browser session recording with voice narration, DOM snapshots, and resource capture</goal>
  <description>
    Core recording functionality that captures user interactions in the browser with before/after HTML snapshots,
    screenshots, console logs, network requests, and voice transcription. This is the foundation of the entire
    session recorder ecosystem.
  </description>

  <epics>
    <epic id="core" status="tested" blocks="">Browser Recording Core (PRD.md)</epic>
    <epic id="snapshot" status="tested" blocks="core">Snapshot Architecture (PRD-3.md)</epic>
    <epic id="voice" status="tested" blocks="core">Voice Recording (PRD-4.md)</epic>
    <epic id="completion" status="tested" blocks="core,snapshot,voice">Session Recorder Completion (PRD-session-recorder.md)</epic>
    <epic id="performance" status="tested" blocks="core">Performance Optimizations (PRD-performance.md)</epic>
    <epic id="export" status="tested" blocks="completion">Markdown Export (PRD-markdown-export.md)</epic>
    <epic id="system-audio" status="todo" blocks="voice">System Audio Recording (PRD-5.md)</epic>
    <epic id="ux" status="implementing" blocks="core">Recording UX Improvements (viewport, jitter)</epic>
  </epics>

  <success_criteria>
    <criterion status="done">Browser actions captured with before/after snapshots</criterion>
    <criterion status="done">Voice recording with Whisper transcription</criterion>
    <criterion status="done">Resource deduplication with SHA1 hashing</criterion>
    <criterion status="done">Gzip compression for snapshots</criterion>
    <criterion status="done">JPEG screenshots with configurable quality</criterion>
    <criterion status="done">Non-blocking resource capture queue</criterion>
    <criterion status="done">Visual recording indicator (TrayManager)</criterion>
    <criterion status="done">Markdown export auto-generation</criterion>
    <criterion status="todo">Dynamic viewport (not fixed 1280x720)</criterion>
    <criterion status="todo">Non-blocking screenshot capture (no jitter)</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [core](../epics/epic-recorder-core.md) | tested | [tasks](../tasks/tasks-recorder-core.json) | Browser action capture, DOM snapshots, screenshots |
| [snapshot](../epics/epic-recorder-snapshot.md) | tested | [tasks](../tasks/tasks-recorder-snapshot.json) | Snapshot restoration, resource storage, Shadow DOM |
| [voice](../epics/epic-recorder-voice.md) | tested | [tasks](../tasks/tasks-recorder-voice.json) | Python voice recording, Whisper transcription |
| [completion](../epics/epic-recorder-completion.md) | tested | [tasks](../tasks/tasks-recorder-completion.json) | Multi-tab, CDP connection, zip archive |
| [performance](../epics/epic-recorder-performance.md) | tested | [tasks](../tasks/tasks-recorder-performance.json) | Compression, non-blocking capture |
| [export](../epics/epic-recorder-export.md) | tested | [tasks](../tasks/tasks-recorder-export.json) | Markdown generation |
| [system-audio](../epics/epic-system-audio.md) | todo | [tasks](../tasks/tasks-system-audio.json) | System audio capture |
| [ux](../epics/epic-recorder-ux.md) | implementing | [tasks](../tasks/tasks-recorder-ux.json) | Viewport flexibility, screenshot jitter fix |

---

## Technical Architecture

```
src/
├── browser/                    # Injected JavaScript (runs in browser)
│   ├── actionListener.ts       # Capture phase event listeners
│   ├── snapshotCapture.ts      # HTML snapshot with form state
│   ├── snapshotRestoration.ts  # Restoration script
│   ├── consoleCapture.ts       # Console log interception
│   └── injected.ts             # Coordination module
│
├── node/                       # Node.js orchestration
│   ├── SessionRecorder.ts      # Main API class
│   ├── TrayManager.ts          # System tray indicator
│   └── types.ts                # TypeScript interfaces
│
├── storage/                    # Data storage
│   ├── ResourceStorage.ts      # SHA1 deduplication
│   └── ResourceCaptureQueue.ts # Non-blocking capture
│
├── export/                     # Export utilities
│   └── MarkdownExporter.ts     # Generate markdown files
│
└── voice/                      # Voice recording
    ├── VoiceRecorder.ts        # Node wrapper
    └── record_and_transcribe.py # Python audio + Whisper
```

---

## Key Features

### Browser Layer
- Capture phase event listeners for user actions
- Form state preservation (inputs, checkboxes, selects)
- Scroll position capture
- Shadow DOM support
- Canvas bounding rect capture

### Storage Layer
- SHA1-based resource deduplication
- Gzip compression for HTML snapshots
- JPEG screenshots (75% quality)
- MP3 audio conversion
- Non-blocking capture queue

### Voice Layer
- Python sounddevice for audio capture
- OpenAI Whisper for transcription
- Word-level timestamps
- GPU auto-detection (CUDA/MPS/CPU)
- Transcript merging with browser actions

### Export Layer
- transcript.md - Voice transcription timeline
- actions.md - Chronological action list
- console-summary.md - Grouped console logs
- network-summary.md - Request statistics

---

## Original PRD References

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD.md | Complete | Core browser recording |
| PRDs/PRD-3.md | Complete | Snapshot architecture |
| PRDs/PRD-4.md | Phases 1-2 Complete | Voice recording |
| PRDs/PRD-session-recorder.md | Complete | Session recorder completion |
| PRDs/PRD-performance.md | Complete | Performance optimizations |
| PRDs/PRD-markdown-export.md | Complete | Markdown export |

---

## Change Log (from original PRDs)

| Date | Source | Changes |
|------|--------|---------|
| Dec 2024 | PRD.md | Initial POC 1 PRD |
| Dec 2025 | PRD.md | Updated to follow template, added FR/TR/QA numbering |
| 2025-12-05 | PRD-3.md | Initial PRD based on Playwright analysis; Phase 1 & 2 complete |
| 2025-12-05 | PRD-4.md | All 4 initiatives: SessionRecorder voice, Viewer UI, Desktop App, MCP Server |
| 2025-12-05 | PRD-performance.md | Extracted performance requirements from PRD-3 |
| 2025-12-10 | TASKS-session-recorder.md | Initial consolidated status document; ~80% complete |
| 2025-12-11 | TASKS-session-recorder.md | TR-1 compression, TR-4 ResourceCaptureQueue, FR-2.4 font/styling fixes (~95%) |
| 2025-12-11 | TASKS-session-recorder.md | FR-3.1 visual indicator, FR-4.7 lazy loading (~97%) |
| 2025-12-11 | PRD-markdown-export.md | Initial document |
| 2025-12-12 | TASKS-session-recorder.md | Added TR-1 viewer support: gzip decompression |
| 2025-12-13 | TASKS-performance.md | Sprint 5c Complete: ResourceCaptureQueue implemented |
| 2025-12-13 | PRD-markdown-export.md | Marked as complete - all features implemented |
| 2025-12-13 | TASKS-markdown-export.md | All tasks implemented: FR-1 through FR-6 |
| 2025-12-17 | epic-recorder-ux.md | Added new epic for UX improvements: viewport fix, screenshot jitter |
