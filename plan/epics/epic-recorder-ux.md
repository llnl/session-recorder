# Epic: Recording UX Improvements

<epic>
  <id>recorder-ux</id>
  <initiative>session-recorder</initiative>
  <status>implementing</status>
  <name>Recording UX Improvements</name>
  <goal>Improve recording responsiveness and viewport flexibility</goal>

  <summary>
    Fix two UX issues with browser recording: hardcoded viewport size preventing flexible window sizing,
    and screenshot capture blocking the browser causing visible jitter during recording.
  </summary>

  <problem>
    <current_state>
      1. Browser viewport is hardcoded to 1280x720 in desktop-app/src/main/recorder.ts
         - Pages don't respond to window resize
         - Users can't record at different screen sizes
      2. Screenshot capture blocks browser for ~700ms per action
         - Browser awaits Node.js callbacks synchronously
         - 100ms hardcoded delay adds to latency
         - Visible freeze/jitter during rapid interactions
    </current_state>
    <impact>
      - Poor recording experience with visible lag
      - Cannot test responsive designs at different viewport sizes
      - Recording feels sluggish compared to normal browser usage
    </impact>
  </problem>

  <requirements>
    <requirement id="UX-1" status="todo">
      <title>Dynamic Viewport Size</title>
      - Remove fixed 1280x720 viewport constraint
      - Browser window resize reflects in page viewport
      - Screenshots capture at actual window size
    </requirement>
    <requirement id="UX-2" status="todo">
      <title>Non-blocking Screenshot Capture</title>
      - Create ScreenshotQueue for async capture
      - Browser callbacks return immediately after queuing
      - Maintain screenshot ordering and accuracy
      - Reduce per-action latency from ~700ms to ~150ms
    </requirement>
  </requirements>

  <acceptance_criteria>
    - [ ] Start recording → Page fills entire browser window (not constrained to 1280x720)
    - [ ] Resize browser window during recording → Page content resizes with window
    - [ ] Captured screenshots match actual window dimensions (not fixed 1280x720)
    - [ ] Click rapidly 10 times → No visible freeze/jitter between clicks
    - [ ] All 10 rapid clicks → Each has before/after screenshots captured correctly
    - [ ] Stop recording → session.json contains all actions with correct timestamps
    - [ ] Performance: Per-action callback time < 100ms (measured via console.time)
  </acceptance_criteria>

  <technical_notes>
    ## Viewport Fix
    Change `viewport: { width: 1280, height: 720 }` to `viewport: null` in newContext().
    Playwright docs: null viewport means page uses browser window size.

    ## Non-blocking Screenshots
    1. Create ScreenshotQueue.ts (modeled after ResourceCaptureQueue.ts)
       - enqueue() returns immediately
       - Background processing with ordering
       - flush() for session stop

    2. Modify SessionRecorder.ts
       - Replace `await page.screenshot()` with `screenshotQueue.enqueue()`
       - Add flush() call in stop() method

    3. Modify injected.ts
       - Add withTimeout wrapper for callbacks (50ms max)
       - Reduce fixed delay from 100ms to 50ms
  </technical_notes>

  <out_of_scope>
    - Voice recording fixes (separate issue)
    - Custom viewport size configuration UI
    - Screenshot quality/format changes
  </out_of_scope>

  <dependencies>
    <dependency type="epic">recorder-performance</dependency>
  </dependencies>

  <files>
    <file action="modify">desktop-app/src/main/recorder.ts</file>
    <file action="create">src/node/ScreenshotQueue.ts</file>
    <file action="modify">src/node/SessionRecorder.ts</file>
    <file action="modify">src/browser/injected.ts</file>
  </files>
</epic>

---

## Overview

This epic addresses two UX issues discovered during recording sessions:

1. **Fixed Viewport**: Browser viewport hardcoded to 1280x720, ignoring actual window size
2. **Screenshot Jitter**: Synchronous screenshot capture blocks browser for ~700ms per action

## Key Changes

| Component | Current | After |
|-----------|---------|-------|
| Viewport | Fixed 1280x720 | Dynamic (null) |
| Screenshot | Sync await | Async queue |
| Callback latency | ~300ms | ~50ms |
| Per-action total | ~700ms | ~150ms |

## Change Log

| Date | Changes |
|------|---------|
| 2025-12-17 | Initial epic creation from user-reported issues |
