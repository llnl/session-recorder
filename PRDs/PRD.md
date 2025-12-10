# Browser Session Recorder (POC 1) - Product Requirements Document

**Version:** 1.1
**Last Updated:** December 2025
**Status:** ✅ Complete

---

## Executive Summary

The Browser Session Recorder is a Playwright-based recording tool that captures USER actions (manual clicks, typing, navigation) with before/after HTML snapshots and screenshots. Unlike Playwright's built-in tracing which records programmatic API calls, this tool records actual user interactions for behavior analysis and voice recording alignment. The system prioritizes complete state capture to enable accurate session replay and debugging.

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Developers** | Debug user interaction flows, capture reproduction steps for bugs |
| **QA Engineers** | Record test scenarios, document bug reproduction steps |
| **AI Systems** | Provide context for voice recording alignment and behavior analysis |

---

## Problem Statement

**Current Gap**: Playwright's existing tracing and codegen tools capture **programmatic** actions (test scripts, MCP tool calls), but we need to capture **USER** actions (manual clicks, typing, navigation) for user behavior analysis and voice recording alignment.

**Core Difference**:

- **Playwright Trace**: Records `page.click()`, `page.fill()` API calls from test scripts
- **Session Recorder**: Records actual user interactions in the browser (what the user manually does)

---

## Use Cases

### UC-1: Bug Reproduction Recording

**Actor:** Developer or QA Engineer
**Duration:** 1-30 minutes
**Scenario:** User records their browser interactions while reproducing a bug, capturing every click, input, and navigation with before/after state snapshots.

**Requirements:**
- Capture all user actions with precise timestamps
- Provide visual evidence via screenshots
- Preserve DOM state for debugging

### UC-2: Session Replay Preparation

**Actor:** Developer
**Duration:** Variable
**Scenario:** User records a session that will later be viewed in a trace viewer or analyzed by an AI system for behavior understanding.

**Requirements:**
- Complete state capture (form values, scroll positions)
- Element identification for replay
- Structured data output (JSON)

---

## Functional Requirements

### FR-1: Action Capture ✅ COMPLETE

**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)

#### FR-1.1: Supported Event Types ✅

| Event Type | Data Captured | Status |
|------------|---------------|--------|
| Click | x/y coordinates, button type | ✅ Complete |
| Input | Value, target element | ✅ Complete |
| Change | New value (select, checkbox, radio) | ✅ Complete |
| Submit | Form identifier | ✅ Complete |
| Keydown | Key (Enter, Tab, Escape) | ✅ Complete |

#### FR-1.2: Element Marking ✅

- Mark interacted elements with `data-recorded-el` attribute in before snapshot
- Remove marker after capturing after snapshot

### FR-2: Snapshot Capture ✅ COMPLETE

**Implementation:** [snapshotCapture.ts](../src/browser/snapshotCapture.ts)

#### FR-2.1: HTML Snapshot Content ✅

- Full HTML with interactive state preserved
- Form field values captured (input, textarea, select)
- Checkbox/radio button states
- Scroll positions
- Shadow DOM content
- Current src for images

#### FR-2.2: Special State Attributes ✅

| Attribute | Purpose |
|-----------|---------|
| `__playwright_value_` | Input/textarea values |
| `__playwright_checked_` | Checkbox/radio states |
| `__playwright_selected_` | Select option states |
| `__playwright_scroll_top_` | Vertical scroll position |
| `__playwright_scroll_left_` | Horizontal scroll position |
| `__playwright_shadow_root_` | Shadow DOM marker |
| `__playwright_current_src__` | Current image source |

### FR-3: Screenshot Capture ✅ COMPLETE

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)

- PNG format screenshots
- Viewport screenshots (not full page for performance)
- Before and after for each action

### FR-4: Data Storage ✅ COMPLETE

- JSON format for session metadata
- Separate PNG files for screenshots
- Organized directory structure per session

### POC 2 Features (See [PRD-2.md](PRD-2.md))

- Console logs for each action
- Network requests/responses for each action
- Custom trace viewer application

---

## Technical Requirements

### TR-1: Performance ✅ COMPLETE

| Metric | Target | Status |
|--------|--------|--------|
| Action-to-capture delay | ~100ms | ✅ Achieved |
| Recording overhead | Non-blocking | ✅ Achieved |
| Snapshot generation | Plain HTML (efficient) | ✅ Achieved |

### TR-2: Cross-Browser Support ✅ COMPLETE

- Chromium (Chrome, Edge)
- Firefox
- WebKit (Safari)

### TR-3: Error Handling ✅ COMPLETE

- Continue recording on individual action errors
- One failed action does not break entire session
- Graceful cleanup of markers on error

---

## Implementation Specifications

### IS-1: Recording Flow

1. User creates `SessionRecorder` instance
2. User starts recording with `recorder.start(page)`
3. Recording script is injected via `page.addInitScript()`
4. User navigates to target page
5. User performs manual actions (clicks, typing, etc.)
6. For each action:
   - Browser detects event in capture phase
   - Adds `data-recorded-el` attribute to target element
   - Captures before HTML snapshot (with marker)
   - Takes before screenshot
   - Lets action execute
   - Waits 100ms for DOM updates
   - Captures after HTML snapshot
   - Takes after screenshot
   - Removes `data-recorded-el` attribute
   - Saves data to session directory
7. User calls `recorder.stop()` to finalize session
8. Session data saved to `output/session-{id}/session.json`

---

## Quality Attributes

### QA-1: Reliability ✅ COMPLETE

- No recording failures cause browser crashes
- Graceful error handling per action
- Valid JSON output for all sessions

### QA-2: Completeness ✅ COMPLETE

- Captures complete before/after state for each user action
- Before snapshot includes `data-recorded-el="true"` on interacted element
- All timestamps are ISO 8601 UTC format
- Preserves form state (values, checked, selected)
- Captures Shadow DOM content
- Screenshots show visual state before/after

### QA-3: Compatibility ✅ COMPLETE

- Works across Chrome, Firefox, Safari (Playwright browsers)

---

## Future Considerations

### Not In Scope (POC 1)

| Feature | Rationale |
|---------|-----------|
| Console log capture | Moved to POC 2 ([PRD-2.md](PRD-2.md)) |
| Network request/response capture | Moved to POC 2 ([PRD-2.md](PRD-2.md)) |
| UI viewer for sessions | Moved to POC 2 ([PRD-2.md](PRD-2.md)) |
| Selector generation | Future enhancement |
| Action replay functionality | Future enhancement |
| Multi-tab recording | Future enhancement |
| Mobile gesture support | Future enhancement |
| Performance profiling | Future enhancement |
| Full-page screenshots | Performance trade-off |

### Implemented in Later PRDs

- Console logging → [PRD-2.md](PRD-2.md)
- Custom trace viewer → [PRD-2.md](PRD-2.md)
- Snapshot architecture improvements → [PRD-3.md](PRD-3.md)
- Voice recording → [PRD-4.md](PRD-4.md)

---

## Data Schema

### SessionData Interface

```typescript
interface SessionData {
  sessionId: string;
  startTime: string;  // ISO 8601 UTC
  endTime: string;    // ISO 8601 UTC
  actions: RecordedAction[];
}

interface RecordedAction {
  id: string;
  timestamp: string;
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';
  before: SnapshotWithScreenshot;
  action: ActionDetails;
  after: SnapshotWithScreenshot;
}

interface SnapshotWithScreenshot {
  timestamp: string;
  html: string;
  screenshot: string;  // Relative path
  url: string;
  viewport: { width: number; height: number };
}
```

### Example session.json

```json
{
  "sessionId": "session-1733097000000",
  "startTime": "2024-12-01T18:30:00.000Z",
  "endTime": "2024-12-01T18:35:45.123Z",
  "actions": [
    {
      "id": "action-1",
      "timestamp": "2024-12-01T18:30:15.234Z",
      "type": "click",
      "before": {
        "timestamp": "2024-12-01T18:30:15.230Z",
        "html": "<!DOCTYPE html><html>...<button data-recorded-el=\"true\">Click</button>...</html>",
        "screenshot": "screenshots/action-1-before.png",
        "url": "file:///test-page.html",
        "viewport": {"width": 1280, "height": 720}
      },
      "action": {
        "type": "click",
        "x": 450,
        "y": 300,
        "timestamp": "2024-12-01T18:30:15.234Z"
      },
      "after": {
        "timestamp": "2024-12-01T18:30:15.350Z",
        "html": "<!DOCTYPE html><html>...<span>Button clicked!</span>...</html>",
        "screenshot": "screenshots/action-1-after.png",
        "url": "file:///test-page.html",
        "viewport": {"width": 1280, "height": 720}
      }
    }
  ]
}
```

---

## Appendix A: Architecture Decisions

### Files Extracted from Playwright

- **snapshotterInjected.ts** (lines 40-52, 335-579): Core snapshot logic
- **snapshot.ts**: Type definitions (adapted for plain HTML format)

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Snapshot Format | Plain HTML with special attributes | Simpler, can load in iframe, smaller file size |
| Action Capture Timing | Marker → Before → Execute → 100ms delay → After | Before shows what was clicked, delay allows DOM updates |
| Screenshot Strategy | Viewport screenshots via `page.screenshot()` | Faster, matches user view, cross-browser compatible |
| Error Handling | Continue recording on errors | One failed action shouldn't break entire session |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial POC 1 PRD |
| 1.1 | December 2025 | Updated to follow template, added FR/TR/QA numbering, implementation links |
