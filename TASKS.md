# Implementation Tasks: Browser Session Recorder

## Phase 1: Project Setup (1 hour)

### Task 1.1: Initialize project structure
- [x] Create `session-recorder/` directory
- [x] Create subdirectories: `src/browser/`, `src/node/`, `test/`, `output/`
- [ ] Initialize `package.json` with dependencies
- [ ] Setup `tsconfig.json` for TypeScript compilation
- [ ] Add `.gitignore` for `output/` and `node_modules/`

**Dependencies**:
```json
{
  "name": "session-recorder",
  "version": "1.0.0",
  "dependencies": {
    "@playwright/test": "^1.40.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0"
  }
}
```

## Phase 2: Browser-Side Snapshot Capture (4 hours)

### Task 2.1: Create snapshot capture module
- [ ] Create `src/browser/snapshotCapture.ts`
- [ ] Extract `visitNode` logic from Playwright's `snapshotterInjected.ts`
- [ ] Implement text node handling with HTML escaping
- [ ] Implement element traversal with attribute capture
- [ ] Add special state attributes:
  - [ ] `__playwright_value_` for input/textarea
  - [ ] `__playwright_checked_` for checkbox/radio
  - [ ] `__playwright_selected_` for select options
  - [ ] `__playwright_scroll_top_` and `__playwright_scroll_left_`
  - [ ] `__playwright_current_src_` for images
- [ ] Implement Shadow DOM traversal with `<template shadowrootmode="open">`
- [ ] Create `captureSnapshot()` function returning plain HTML string
- [ ] Add viewport and URL capture

**Source Reference**:
- `C:\Workspace\playwright\packages\playwright-core\src\server\trace\recorder\snapshotterInjected.ts`
  - Lines 40-52: Attribute constants
  - Lines 335-579: visitNode logic
  - Lines 478-482: Shadow DOM handling
  - Lines 426-477: Form state capture

### Task 2.2: Simplify snapshot format
- [ ] Remove caching logic
- [ ] Remove mutation tracking
- [ ] Remove resource override handling
- [ ] Output plain HTML string instead of NodeSnapshot arrays
- [ ] Ensure proper HTML entity escaping

## Phase 3: Browser-Side Action Detection (3 hours)

### Task 3.1: Create action listener module
- [ ] Create `src/browser/actionListener.ts`
- [ ] Implement event listeners in capture phase:
  - [ ] Click events with x/y coordinates
  - [ ] Input events with value
  - [ ] Change events (select, checkbox, radio)
  - [ ] Submit events (form)
  - [ ] Keydown events (Enter, Tab, Escape)
- [ ] Create `UserAction` interface
- [ ] Add timestamp capture (ISO 8601 UTC)

### Task 3.2: Create browser-side coordinator
- [ ] Create `src/browser/injected.ts`
- [ ] Integrate snapshot capture and action listeners
- [ ] Implement action flow:
  1. On action detected → add `data-recorded-el` attribute
  2. Capture before snapshot (with marker)
  3. Call Node.js via `window.__recordActionBefore()`
  4. Wait 100ms for DOM updates
  5. Capture after snapshot
  6. Call Node.js via `window.__recordActionAfter()`
  7. Remove `data-recorded-el` attribute
- [ ] Add error handling with marker cleanup

## Phase 4: Node-Side Coordination (4 hours)

### Task 4.1: Create type definitions
- [ ] Create `src/node/types.ts`
- [ ] Define `SessionData` interface
- [ ] Define `RecordedAction` interface
- [ ] Define `SnapshotWithScreenshot` interface
- [ ] Define `ActionDetails` interface

### Task 4.2: Create SessionRecorder class
- [ ] Create `src/node/SessionRecorder.ts`
- [ ] Implement constructor with session ID generation
- [ ] Implement `start(page)` method:
  - [ ] Create session directories
  - [ ] Read and bundle browser-side code
  - [ ] Inject via `page.addInitScript()`
  - [ ] Expose `__recordActionBefore` function
  - [ ] Expose `__recordActionAfter` function
- [ ] Implement `_handleActionBefore()`:
  - [ ] Generate action ID
  - [ ] Take before screenshot
  - [ ] Store partial action data
- [ ] Implement `_handleActionAfter()`:
  - [ ] Take after screenshot
  - [ ] Complete action data
  - [ ] Add to session actions array
- [ ] Implement `stop()` method:
  - [ ] Wait for pending actions
  - [ ] Save session.json
  - [ ] Clean up
- [ ] Implement `getSessionData()` and `getSummary()` methods
- [ ] Add action queuing for sequential processing

### Task 4.3: Create public exports
- [ ] Create `src/index.ts`
- [ ] Export `SessionRecorder` class
- [ ] Export type interfaces

## Phase 5: Screenshot Integration (2 hours)

### Task 5.1: Implement screenshot capture
- [ ] Use `page.screenshot()` API in `_handleActionBefore()`
- [ ] Use `page.screenshot()` API in `_handleActionAfter()`
- [ ] Configure PNG format, viewport screenshots
- [ ] Save to `screenshots/` directory with naming: `action-{n}-before.png`, `action-{n}-after.png`
- [ ] Handle screenshot errors gracefully

## Phase 6: Data Storage (2 hours)

### Task 6.1: Implement session storage
- [ ] Create session directory structure
- [ ] Save `session.json` with proper formatting
- [ ] Store relative paths for screenshots
- [ ] Add session metadata (start/end times, action count)
- [ ] Validate JSON structure

### Task 6.2: Create storage utilities
- [ ] Create `src/node/storage.ts`
- [ ] Add utility for loading sessions
- [ ] Add utility for listing sessions

## Phase 7: Test Implementation (3 hours)

### Task 7.1: Create test HTML page
- [ ] Create `test/test-page.html`
- [ ] Add click test section with 3 buttons
- [ ] Add text input test section
- [ ] Add checkbox/radio test section
- [ ] Add select/textarea test section
- [ ] Add Shadow DOM test section
- [ ] Add result display area
- [ ] Add styling for visual clarity

### Task 7.2: Create test script
- [ ] Create `test/simple-test.ts`
- [ ] Launch browser in non-headless mode
- [ ] Create and start SessionRecorder
- [ ] Navigate to test page
- [ ] Display instructions to user
- [ ] Wait for Enter key press
- [ ] Stop recording
- [ ] Display session summary
- [ ] Verify all requirements:
  - [ ] Before snapshot has `data-recorded-el`
  - [ ] Before screenshot exists
  - [ ] After snapshot exists
  - [ ] After screenshot exists
  - [ ] Timestamps are UTC
  - [ ] Form state preserved

### Task 7.3: Manual testing
- [ ] Run test script
- [ ] Perform various actions (clicks, typing, checkboxes, etc.)
- [ ] Verify session.json structure
- [ ] Verify screenshots are captured
- [ ] Verify HTML snapshots preserve state

## Phase 8: Documentation (1 hour)

### Task 8.1: Create README
- [ ] Create `session-recorder/README.md`
- [ ] Add usage examples
- [ ] Document API
- [ ] Add requirements

### Task 8.2: Add code comments
- [ ] Comment complex functions
- [ ] Add JSDoc for public API

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| 1. Project Setup | 1 |
| 2. Browser Snapshot Capture | 4 |
| 3. Browser Action Detection | 3 |
| 4. Node Coordination | 4 |
| 5. Screenshot Integration | 2 |
| 6. Data Storage | 2 |
| 7. Testing | 3 |
| 8. Documentation | 1 |
| **Total** | **20 hours** |

---

## Success Criteria

### Functional Requirements
- ✅ Captures user actions (not programmatic)
- ✅ Before/after snapshots for each action
- ✅ Before/after screenshots for each action
- ✅ `data-recorded-el` attribute in before snapshot only
- ✅ UTC timestamps (ISO 8601)
- ✅ Preserves form state (values, checked, selected)
- ✅ Captures Shadow DOM
- ✅ Valid JSON output

### Quality Requirements
- ✅ No browser crashes from recording
- ✅ Minimal performance impact (<100ms per action)
- ✅ Clean error handling
- ✅ Works across Chromium, Firefox, WebKit
