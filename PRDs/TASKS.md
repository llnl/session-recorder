# Browser Session Recorder (POC 1) - Implementation Tasks

**PRD:** [PRD.md](PRD.md)
**Last Updated:** 2025-12-10
**Overall Status:** ✅ 100% Complete (POC 1 Core + Extended Features)

---

## Table of Contents

- [FR-1: Action Capture](#fr-1-action-capture)
- [FR-2: Snapshot Capture](#fr-2-snapshot-capture)
- [FR-3: Screenshot Capture](#fr-3-screenshot-capture)
- [FR-4: Data Storage](#fr-4-data-storage)
- [Extended Features](#extended-features)
- [Estimated Effort](#estimated-effort)
- [File Reference](#file-reference)
- [Document Change Log](#document-change-log)

---

## FR-1: Action Capture ✅ COMPLETE

> **PRD Reference:** [FR-1: Action Capture](PRD.md#fr-1-action-capture)

### Phase 1: Project Setup ✅ COMPLETED

### Task 1.1: Initialize project structure

- [x] Create `session-recorder/` directory
- [x] Create subdirectories: `src/browser/`, `src/node/`, `src/viewer/`, `test/`, `output/`, `docs/`
- [x] Initialize `package.json` with dependencies (includes express)
- [x] Setup `tsconfig.json` for TypeScript compilation
- [x] Add `.gitignore` for `output/` and `node_modules/`

---

## FR-2: Snapshot Capture ✅ COMPLETE

> **PRD Reference:** [FR-2: Snapshot Capture](PRD.md#fr-2-snapshot-capture)

### Task 2.1: Create snapshot capture module

- [x] Create `src/browser/snapshotCapture.ts`
- [x] Extract `visitNode` logic from Playwright's `snapshotterInjected.ts`
- [x] Implement text node handling with HTML escaping
- [x] Implement element traversal with attribute capture
- [x] Add special state attributes:
  - [x] `__playwright_value_` for input/textarea
  - [x] `__playwright_checked_` for checkbox/radio
  - [x] `__playwright_selected_` for select options
  - [x] `__playwright_scroll_top_` and `__playwright_scroll_left_`
  - [x] `__playwright_current_src_` for images
- [x] Implement Shadow DOM traversal with `<template shadowrootmode="open">`
- [x] Create `captureSnapshot()` function returning plain HTML string
- [x] Add viewport and URL capture

### Task 2.2: Simplify snapshot format

- [x] Remove caching logic
- [x] Remove mutation tracking
- [x] Remove resource override handling
- [x] Output plain HTML string instead of NodeSnapshot arrays
- [x] Ensure proper HTML entity escaping

### Phase 3: Browser-Side Action Detection ✅ COMPLETED

> [PRD: FR-1.1](PRD.md#fr-11-supported-event-types)

### Task 3.1: Create action listener module

- [x] Create `src/browser/actionListener.ts`
- [x] Implement event listeners in capture phase:
  - [x] Click events with x/y coordinates
  - [x] Input events with value
  - [x] Change events (select, checkbox, radio)
  - [x] Submit events (form)
  - [x] Keydown events (Enter, Tab, Escape)
- [x] Create `UserAction` interface
- [x] Add timestamp capture (ISO 8601 UTC)

### Task 3.2: Create browser-side coordinator

- [x] Create `src/browser/injected.ts`
- [x] Integrate snapshot capture and action listeners
- [x] Implement action flow with before/after snapshots
- [x] Add error handling with marker cleanup

---

## FR-3: Screenshot Capture ✅ COMPLETE

> **PRD Reference:** [FR-3: Screenshot Capture](PRD.md#fr-3-screenshot-capture)

### Phase 4: Node-Side Coordination ✅ COMPLETED

### Task 4.1: Create type definitions

- [x] Create `src/node/types.ts`
- [x] Define `SessionData` interface
- [x] Define `RecordedAction` interface
- [x] Define `SnapshotWithScreenshot` interface
- [x] Define `ActionDetails` interface
- [x] Add `HarEntry` and `SnapshotterBlob` interfaces

### Task 4.2: Create SessionRecorder class

- [x] Create `src/node/SessionRecorder.ts`
- [x] Implement constructor with session ID generation
- [x] Implement `start(page)` method
- [x] Implement `_handleActionBefore()`
- [x] Implement `_handleActionAfter()`
- [x] Implement `stop()` method
- [x] Implement `getSessionData()` and `getSummary()` methods
- [x] Add action queuing for sequential processing

### Task 4.3: Create public exports

- [x] Create `src/index.ts`
- [x] Export `SessionRecorder` class
- [x] Export type interfaces

## Phase 5: Screenshot Integration ✅ COMPLETED

### Task 5.1: Implement screenshot capture

- [x] Use `page.screenshot()` API in `_handleActionBefore()`
- [x] Use `page.screenshot()` API in `_handleActionAfter()`
- [x] Configure PNG format, viewport screenshots
- [x] Save to `screenshots/` directory with proper naming
- [x] Handle screenshot errors gracefully

---

## FR-4: Data Storage ✅ COMPLETE

> **PRD Reference:** [FR-4: Data Storage](PRD.md#fr-4-data-storage)

### Task 6.1: Implement session storage

- [x] Create session directory structure
- [x] Save `session.json` with proper formatting
- [x] Store relative paths for screenshots and snapshots
- [x] Add session metadata (start/end times, action count)
- [x] Validate JSON structure

## Phase 7: Testing ✅ COMPLETED

### Task 7.1: Create test HTML page

- [x] Create `test/test-page.html`
- [x] Add comprehensive test sections
- [x] Add styling for visual clarity

### Task 7.2: Create test scripts

- [x] Create `test/simple-test.ts`
- [x] Create `test/spa-test.ts`
- [x] Verify all requirements

### Task 7.3: Manual testing

- [x] Run test scripts
- [x] Verify session.json structure
- [x] Verify screenshots are captured
- [x] Verify HTML snapshots preserve state

## Phase 8: Documentation ✅ COMPLETED

### Task 8.1: Create documentation

- [x] Create `README.md` with usage examples
- [x] Create `docs/ASSET_CAPTURE.md`
- [x] Create `docs/HARTRACER_INTEGRATION.md`
- [x] Create `docs/IMPLEMENTATION_SUMMARY.md`
- [x] Create `docs/URL_REWRITING_IMPLEMENTATION.md`
- [x] Create `docs/URL_REWRITING_VS_VIEWER.md`
- [x] Create `docs/VIEWER.md`

### Task 8.2: Add code comments

- [x] Comment complex functions
- [x] Add JSDoc for public API

---

## Extended Features

> These features extend beyond the original POC 1 scope and were added during development.

### Phase 9: Resource Capture & URL Rewriting ✅ COMPLETED

### Task 9.1: Network Resource Capture

- [x] Implement network response interception via `page.on('response')`
- [x] Calculate SHA1 hashes for resource deduplication
- [x] Save resources with SHA1 filenames
- [x] Build URL → SHA1 mapping in memory
- [x] Handle content-type detection and extension mapping

### Task 9.2: URL Rewriting Implementation

- [x] Implement `_rewriteHTML()` for HTML snapshots
- [x] Implement `_rewriteCSS()` for CSS files
- [x] Implement `_resolveUrl()` for relative URL resolution
- [x] Rewrite `<link>`, `<script>`, `<img>`, `<source>` tags
- [x] Rewrite CSS `url()` references
- [x] Handle data URLs and edge cases
- [x] Make HTML snapshots work offline

## Phase 10: Express Viewer Application ✅ COMPLETED

### Task 10.1: Create Express server

- [x] Create `src/viewer/server.ts`
- [x] Implement `SessionViewer` class
- [x] Setup Express routes for serving sessions
- [x] Serve snapshots, screenshots, and resources
- [x] Create home page listing all sessions
- [x] Create session detail page with action timeline
- [x] Add npm script: `npm run viewer`

### Task 10.2: HTML rendering

- [x] Render session list with metadata cards
- [x] Render session detail with before/after screenshots
- [x] Make screenshots clickable to view HTML snapshots
- [x] Add proper styling and layout

---

## Future Enhancements (Backlog)

> These features are tracked in later PRDs or remain as future enhancements.

| Feature | Status | PRD Reference |
|---------|--------|---------------|
| Network logging | ✅ Complete | [PRD-2.md](PRD-2.md) |
| Console log capture | ✅ Complete | [PRD-2.md](PRD-2.md) |
| Custom trace viewer | ✅ Complete | [PRD-2.md](PRD-2.md) |
| Session export/import (ZIP) | ✅ Complete | [PRD-2.md](PRD-2.md) |
| Navigation events | ✅ Complete | Implemented |
| Scroll events | Future | - |
| Hover events | Future | - |
| Session replay functionality | Future | - |
| Multi-tab session recording | Future | - |

---

## Estimated Effort

### Completed Phases ✅

| Phase | Task File | Hours | Status |
|-------|-----------|-------|--------|
| Project Setup | This file | 1h | ✅ Complete |
| Browser Snapshot Capture | This file | 4h | ✅ Complete |
| Browser Action Detection | This file | 3h | ✅ Complete |
| Node Coordination | This file | 4h | ✅ Complete |
| Screenshot Integration | This file | 2h | ✅ Complete |
| Data Storage | This file | 2h | ✅ Complete |
| Testing | This file | 3h | ✅ Complete |
| Documentation | This file | 1h | ✅ Complete |
| Resource Capture & URL Rewriting | This file | 6h | ✅ Complete |
| Express Viewer | This file | 4h | ✅ Complete |
| **Completed Total** | | **30h** | |

### Summary

| Category | Hours |
|----------|-------|
| Completed | 30h |
| Remaining | 0h |
| **Grand Total** | **30h** |

---

## File Reference

### Browser Components

- [actionListener.ts](../src/browser/actionListener.ts) - Event capture and detection
- [snapshotCapture.ts](../src/browser/snapshotCapture.ts) - DOM snapshot generation
- [injected.ts](../src/browser/injected.ts) - Browser-side coordinator

### Node Components

- [SessionRecorder.ts](../src/node/SessionRecorder.ts) - Main recording orchestrator
- [types.ts](../src/node/types.ts) - TypeScript interfaces

### Viewer

- [server.ts](../src/viewer/server.ts) - Express viewer server

### Tests

- [simple-test.ts](../test/simple-test.ts) - Basic functionality tests
- [spa-test.ts](../test/spa-test.ts) - SPA recording tests

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial POC 1 tasks |
| 1.1 | December 2025 | Updated to follow template, added FR sections, implementation links |
