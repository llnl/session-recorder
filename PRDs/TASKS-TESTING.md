# TASKS-TESTING: Testing Checklist & Feature List Generation

**Purpose:** Consolidated test checklist for session-recorder, session-viewer, and session-editor
**Last Updated:** 2025-12-10
**Overall Status:** Building feature_list.json

---

## Table of Contents

- [Quick Start](#quick-start)
- [Test Files Reference](#test-files-reference)
- [Session Recorder Tests](#session-recorder-tests)
- [Session Viewer Tests](#session-viewer-tests)
- [Session Editor Tests](#session-editor-tests)
- [Pending Tests](#pending-tests)
- [Feature List Generation](#feature-list-generation)
- [Document Change Log](#document-change-log)

---

## Quick Start

- [ ] **Record a test session** - Run `npx ts-node test/record-session.ts` to create a fresh session for testing

---

## Test Files Reference

| Test File | Purpose | Status |
|-----------|---------|--------|
| [simple-test.ts](../test/simple-test.ts) | POC 1 requirements test | Ready |
| [spa-test.ts](../test/spa-test.ts) | SPA recording test (Angular Material) | Ready |
| [network-test.ts](../test/network-test.ts) | Network logging verification | Ready |
| [console-test.ts](../test/console-test.ts) | Console capture verification | Ready |
| [voice-test.ts](../test/voice-test.ts) | Voice recording test | Ready |
| [record-session.ts](../test/record-session.ts) | Production CLI recorder | Ready |

---

## Session Recorder Tests

### Core Recording (POC 1) - Complete

- [x] Browser launch and context creation
- [x] Session recorder initialization
- [x] Navigation capture
- [x] Click action recording
- [x] Timestamp in UTC format
- [x] BEFORE snapshot file creation
- [x] BEFORE screenshot path exists
- [x] AFTER snapshot file creation
- [x] AFTER screenshot path exists
- [x] Snapshot contains `data-recorded-el` attribute

### Console & Network Logging (POC 2) - Complete

- [x] Console log file exists (session.console)
- [x] Multiple log levels captured (log, error, warn, info, debug)
- [x] Timestamps in ISO 8601 format
- [x] Args array present in all entries
- [x] Error/Warn logs have stack traces
- [x] Object serialization works
- [x] Array serialization works
- [x] JSON Lines format is valid
- [x] Console metadata in session.json
- [x] Network log file exists (session.network)
- [x] Network metadata in session.json

### Snapshot State Capture (POC 3) - Complete

- [x] Input fields show typed values (`__playwright_value_`)
- [x] Checkboxes show correct checked state (`__playwright_checked_`)
- [x] Radio buttons show correct selection
- [x] Select dropdowns show correct option (`__playwright_selected_`)
- [x] Scroll positions are restored (`__playwright_scroll_top_`, `__playwright_scroll_left_`)
- [x] Shadow DOM components render (`<template shadowrootmode="open">`)
- [x] Popover state captured (`__playwright_popover_open_`)
- [x] Dialog state captured (`__playwright_dialog_open_`)
- [x] Canvas bounding rect captured (`__playwright_bounding_rect__`)

### Resource Management - Complete

- [x] External stylesheets extracted
- [x] Small images converted to data URLs
- [x] CORS issues handled gracefully
- [x] SHA1-based resource storage
- [x] Resource deduplication
- [x] Resource metadata in session.json

### Voice Recording (Phase 1) - Complete

- [x] Audio capture from microphone
- [x] Whisper transcription (Python script)
- [x] GPU auto-detection (CUDA/MPS/CPU)
- [x] Timestamp alignment with browser actions
- [x] Transcript storage (transcript.json)
- [x] Audio file storage (audio/recording.wav)
- [x] Voice action type in session.json

### Multi-Tab Recording - Complete

- [x] Multiple browser tabs tracked
- [x] Actions recorded from all tabs
- [x] Tab context preserved in actions
- [x] Connect to existing Chrome via CDP
- [x] Attach to existing pages

### Zip Archive - Complete

- [x] Zip file created successfully
- [x] All session files included
- [x] Correct directory structure
- [x] Resources folder included

---

## Session Viewer Tests

### Session Loading - Complete

- [x] Load session from zip file
- [x] Load session.json parsing
- [x] Load session.network parsing (JSON Lines)
- [x] Load session.console parsing (JSON Lines)
- [x] Load audio file (if voice enabled)
- [x] Load transcript.json (if voice enabled)

### Timeline Display - Complete

- [x] Canvas timeline renders
- [x] Action indicators displayed
- [x] Thumbnail rendering at positions
- [x] Click to select action
- [x] Hover state with tooltip
- [x] Selection highlight

### Action List - Complete

- [x] Virtual scroll performance
- [x] Action items display correctly
- [x] Click action selection
- [x] Auto-scroll to selected action
- [x] Action type icons and styling
- [x] Timestamp display

### Snapshot Viewer - Complete

- [x] Snapshot HTML renders in iframe
- [x] Before/After toggle works
- [x] Element highlighting works
- [x] Auto-scroll to highlighted element
- [x] Snapshot restoration script runs
- [x] Form values display correctly
- [x] Checkbox/radio states correct
- [x] Scroll positions restored

### Tab Panel - Complete

- [x] Information tab displays action details
- [x] Console tab shows log entries
- [x] Console log level filtering
- [x] Network tab shows requests
- [x] Network waterfall visualization
- [x] Network resource type filtering

### Voice Integration (Phase 2) - Complete

- [x] Voice segments on timeline (green bars)
- [x] Duration proportional to speech
- [x] Hover shows transcript preview
- [x] Click navigates to voice entry
- [x] Voice transcripts in action list
- [x] Intermixed with browser actions by timestamp
- [x] Microphone icon and styling
- [x] VoiceTranscriptViewer component
- [x] Audio playback controls
- [x] Word-level highlighting
- [x] Click word to seek audio
- [x] Speed control (0.5x - 2x)
- [x] Copy transcript button
- [x] Voice tab in TabPanel

---

## Session Editor Tests

> **Note:** Session Editor is an Angular v20 migration. See [TASKS-angular-migration.md](TASKS-angular-migration.md) for full implementation tasks.

### Core Layout - Pending

- [ ] Resizable layout with Angular CDK
- [ ] Timeline panel (resizable height)
- [ ] ActionList panel (resizable width)
- [ ] SnapshotViewer (main area)
- [ ] TabPanel (resizable height)
- [ ] Panel size persistence (localStorage)

### Edit Operations - Pending

- [ ] Add note (insert after action)
- [ ] Edit note (markdown support)
- [ ] Edit action field (inline editor)
- [ ] Delete action
- [ ] Delete bulk actions (time range)
- [ ] Undo operation
- [ ] Redo operation

### Persistence - Pending

- [ ] IndexedDB storage works
- [ ] Session edit state saved
- [ ] Edit state restored on reload
- [ ] Export modified session
- [ ] Zip export with edits applied

---

## Pending Tests

### Voice Recording Tests (From TASKS-4.md Phase 3)

- [ ] **Unit Tests** (1 hour)
  - [ ] Audio capture initialization
  - [ ] Whisper API integration
  - [ ] Timestamp alignment accuracy
  - [ ] Transcript storage format

- [ ] **Integration Tests** (1 hour)
  - [ ] End-to-end voice recording flow
  - [ ] Audio file creation and storage
  - [ ] Transcript generation and alignment
  - [ ] Error handling (no microphone, API failure)

### Viewer Voice Integration Tests (From TASKS-4.md Phase 3)

- [ ] **Timeline Tests** (30 minutes)
  - [ ] Voice segments render correctly
  - [ ] Duration proportional to actual speech
  - [ ] Click navigation to voice entries
  - [ ] Hover tooltips display properly

- [ ] **Action List Tests** (30 minutes)
  - [ ] Voice transcripts intermixed with browser actions
  - [ ] Correct timestamp ordering
  - [ ] Voice entry styling and icons
  - [ ] Selection and playback controls

### E2E Tests (From TASKS-4.md Phase 6)

- [ ] **Desktop App Tests** (2 hours)
  - [ ] Browser-only recording
  - [ ] Voice-only recording
  - [ ] Combined recording
  - [ ] Zip creation and viewer launch

- [ ] **MCP Server Tests** (1 hour)
  - [ ] Tool invocation from Claude Desktop
  - [ ] Recording lifecycle management
  - [ ] Error handling

- [ ] **Viewer Tests** (1 hour)
  - [ ] Load session with voice
  - [ ] Timeline voice indicators
  - [ ] Action list voice entries
  - [ ] Audio playback

### Known Issues to Fix

- [ ] MutationObserver error in snapshot injection (console error, non-blocking) → Deferred to [TASKS-angular-migration.md](TASKS-angular-migration.md)

---

## Feature List Generation

This section documents features for generating `feature_list.json`.

### session-recorder Features

```json
{
  "component": "session-recorder",
  "features": [
    {
      "id": "sr-001",
      "name": "Browser Recording",
      "description": "Record user interactions in the browser",
      "status": "complete",
      "tests": ["simple-test.ts", "spa-test.ts"]
    },
    {
      "id": "sr-002",
      "name": "Console Logging",
      "description": "Capture browser console messages with stack traces",
      "status": "complete",
      "tests": ["console-test.ts"]
    },
    {
      "id": "sr-003",
      "name": "Network Logging",
      "description": "Capture network requests and responses",
      "status": "complete",
      "tests": ["network-test.ts"]
    },
    {
      "id": "sr-004",
      "name": "Snapshot Capture",
      "description": "Capture DOM snapshots with form state preservation",
      "status": "complete",
      "tests": ["simple-test.ts"]
    },
    {
      "id": "sr-005",
      "name": "Voice Recording",
      "description": "Record voice narration with Whisper transcription",
      "status": "complete",
      "tests": ["voice-test.ts"]
    },
    {
      "id": "sr-006",
      "name": "Multi-Tab Recording",
      "description": "Track and record multiple browser tabs",
      "status": "complete",
      "tests": ["record-session.ts"]
    },
    {
      "id": "sr-007",
      "name": "CDP Connection",
      "description": "Connect to existing Chrome via CDP for authenticated sessions",
      "status": "complete",
      "tests": ["record-session.ts"]
    },
    {
      "id": "sr-008",
      "name": "Zip Archive",
      "description": "Create portable zip archives of sessions",
      "status": "complete",
      "tests": ["spa-test.ts", "voice-test.ts"]
    },
    {
      "id": "sr-009",
      "name": "Resource Deduplication",
      "description": "SHA1-based resource storage with deduplication",
      "status": "complete",
      "tests": []
    }
  ]
}
```

### session-viewer Features

```json
{
  "component": "session-viewer",
  "features": [
    {
      "id": "sv-001",
      "name": "Session Loading",
      "description": "Load sessions from zip files or directories",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-002",
      "name": "Timeline Display",
      "description": "Canvas-based timeline with action indicators",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-003",
      "name": "Action List",
      "description": "Virtual scrolling action list with filtering",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-004",
      "name": "Snapshot Viewer",
      "description": "HTML snapshot rendering with state restoration",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-005",
      "name": "Console Panel",
      "description": "Console log display with level filtering",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-006",
      "name": "Network Panel",
      "description": "Network request waterfall visualization",
      "status": "complete",
      "tests": []
    },
    {
      "id": "sv-007",
      "name": "Voice Playback",
      "description": "Audio playback with word-level highlighting",
      "status": "complete",
      "tests": []
    }
  ]
}
```

### session-editor Features (Planned)

```json
{
  "component": "session-editor",
  "features": [
    {
      "id": "se-001",
      "name": "Note Adding",
      "description": "Add markdown notes between actions",
      "status": "planned",
      "tests": []
    },
    {
      "id": "se-002",
      "name": "Action Editing",
      "description": "Edit action fields inline",
      "status": "planned",
      "tests": []
    },
    {
      "id": "se-003",
      "name": "Bulk Delete",
      "description": "Delete actions within a time range",
      "status": "planned",
      "tests": []
    },
    {
      "id": "se-004",
      "name": "Undo/Redo",
      "description": "Full undo/redo support for all edits",
      "status": "planned",
      "tests": []
    },
    {
      "id": "se-005",
      "name": "Local Persistence",
      "description": "IndexedDB storage for edit state",
      "status": "planned",
      "tests": []
    },
    {
      "id": "se-006",
      "name": "Export Modified",
      "description": "Export edited session as new zip",
      "status": "planned",
      "tests": []
    }
  ]
}
```

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial testing checklist consolidation |
