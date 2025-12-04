# Implementation Tasks: Browser Session Recorder

## Phase 1: Project Setup ✅ COMPLETED

### Task 1.1: Initialize project structure

- [x] Create `session-recorder/` directory
- [x] Create subdirectories: `src/browser/`, `src/node/`, `src/viewer/`, `test/`, `output/`, `docs/`
- [x] Initialize `package.json` with dependencies (includes express)
- [x] Setup `tsconfig.json` for TypeScript compilation
- [x] Add `.gitignore` for `output/` and `node_modules/`

## Phase 2: Browser-Side Snapshot Capture ✅ COMPLETED

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

## Phase 3: Browser-Side Action Detection ✅ COMPLETED

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

## Phase 4: Node-Side Coordination ✅ COMPLETED

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

## Phase 6: Data Storage ✅ COMPLETED

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

## ADDITIONAL PHASES COMPLETED (Beyond Original Plan)

## Phase 9: Resource Capture & URL Rewriting ✅ COMPLETED

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

## NEXT PHASE: Network Logging (In Progress)

## Phase 11: Enhanced Network Logging 🚧 IN PROGRESS

### Task 11.1: Design network log format

- [ ] Define enhanced network entry interface
- [ ] Choose between minimal vs HAR-compatible format
- [ ] Plan JSON Lines (.jsonl) file format

### Task 11.2: Implement network logging

- [ ] Create network log file (`session.network`)
- [ ] Capture network request/response metadata
- [ ] Include timing breakdown (dns, connect, ttfb, download)
- [ ] Add resource type detection
- [ ] Link to captured resource SHA1s
- [ ] Write entries in real-time (append mode)

### Task 11.3: Update types and interfaces

- [ ] Update `SessionData` interface with network reference
- [ ] Create `NetworkEntry` interface
- [ ] Add network statistics to session metadata

### Task 11.4: Viewer integration

- [ ] Add network waterfall view to viewer
- [ ] Display request/response details
- [ ] Show timing breakdown visualization
- [ ] Link network entries to resources

### Task 11.5: Documentation

- [ ] Document network log format
- [ ] Add examples to README
- [ ] Update VIEWER.md with network features

---

## FUTURE ENHANCEMENTS (Backlog)

### Additional Action Types

- [ ] Navigation events (page URL changes)
- [ ] Scroll events (with debouncing)
- [ ] Hover events (with debouncing)
- [ ] Double-click events
- [ ] Right-click events
- [ ] File upload events
- [ ] Focus/blur events
- [ ] Drag and drop events

### Advanced Features

- [ ] Session replay functionality
- [ ] Network request filtering
- [ ] Console log capture
- [ ] Performance metrics (Core Web Vitals)
- [ ] Mobile device emulation support
- [ ] Multi-tab session recording
- [ ] Real-time session monitoring
- [ ] Session export/import (ZIP)
- [ ] Session comparison tools

---

## Estimated Effort

| Phase | Status | Hours |
|-------|--------|-------|
| 1. Project Setup | ✅ Done | 1 |
| 2. Browser Snapshot Capture | ✅ Done | 4 |
| 3. Browser Action Detection | ✅ Done | 3 |
| 4. Node Coordination | ✅ Done | 4 |
| 5. Screenshot Integration | ✅ Done | 2 |
| 6. Data Storage | ✅ Done | 2 |
| 7. Testing | ✅ Done | 3 |
| 8. Documentation | ✅ Done | 1 |
| 9. Resource Capture & URL Rewriting | ✅ Done | 6 |
| 10. Express Viewer | ✅ Done | 4 |
| **11. Network Logging** | 🚧 In Progress | **3** |
| **Completed Total** | | **30 hours** |
| **Remaining** | | **3 hours** |

---

## Success Criteria

### Functional Requirements ✅ ALL MET

- ✅ Captures user actions (not programmatic)
- ✅ Before/after snapshots for each action
- ✅ Before/after screenshots for each action
- ✅ `data-recorded-el` attribute in before snapshot only
- ✅ UTC timestamps (ISO 8601)
- ✅ Preserves form state (values, checked, selected)
- ✅ Captures Shadow DOM
- ✅ Valid JSON output
- ✅ Resources captured with SHA1 deduplication
- ✅ URL rewriting for offline HTML viewing
- ✅ Express viewer for session browsing

### Quality Requirements ✅ ALL MET

- ✅ No browser crashes from recording
- ✅ Minimal performance impact (<100ms per action)
- ✅ Clean error handling
- ✅ Works across Chromium, Firefox, WebKit
- ✅ Comprehensive documentation
- ✅ Working test suite

### New Requirements (Phase 11)

- [ ] Network requests logged with timing data
- [ ] URL → Resource mapping persisted
- [ ] Network waterfall visualization
- [ ] Request/response metadata accessible
