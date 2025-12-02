# Product Requirements Document: Browser Session Recorder

## 1. Problem Statement

**Current Gap**: Playwright's existing tracing and codegen tools capture **programmatic** actions (test scripts, MCP tool calls), but we need to capture **USER** actions (manual clicks, typing, navigation) for user behavior analysis and voice recording alignment.

**Core Difference**:
- **Playwright Trace**: Records `page.click()`, `page.fill()` API calls from test scripts
- **Session Recorder**: Records actual user interactions in the browser (what the user manually does)

## 2. Goals

### POC 1 Goals (Initial Release)
- ✅ Capture before/after HTML snapshots with full interactive state
- ✅ Capture before/after screenshots
- ✅ Detect and record user actions (click, input, change, submit, keydown)
- ✅ Mark interacted elements with `data-recorded-el` attribute in before snapshot
- ✅ Store all data with UTC timestamps for voice recording synchronization
- ✅ Preserve form state (input values, checkbox states, select options)
- ✅ Support Shadow DOM capture

### POC 2 Goals (Future)
- Console logs for each action
- Network requests/responses for each action

## 3. Technical Requirements

### Snapshot Requirements
- Full HTML with interactive state preserved
- Form field values captured (input, textarea, select)
- Checkbox/radio button states
- Scroll positions
- Shadow DOM content
- Current src for images
- Special attributes: `__playwright_value_`, `__playwright_checked_`, `__playwright_selected_`, `__playwright_scroll_top_`, `__playwright_scroll_left_`, `__playwright_shadow_root_`, `__playwright_current_src__`

### Screenshot Requirements
- PNG format
- Viewport screenshots (not full page for performance)
- Before and after for each action

### Action Detection
- Click events
- Input events (typing)
- Change events (select, checkbox, radio)
- Submit events (form submission)
- Keydown events (Enter, Tab, Escape)

### Data Storage
- JSON format for session metadata
- Separate PNG files for screenshots
- Organized directory structure per session

### Performance
- Minimal delay between action and capture (~100ms)
- Non-blocking recording (queue actions)
- Efficient snapshot generation (plain HTML, no complex compression)

## 4. User Flow

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

## 5. Success Criteria

- ✅ Captures complete before/after state for each user action
- ✅ Before snapshot includes `data-recorded-el="true"` on interacted element
- ✅ All timestamps are ISO 8601 UTC format
- ✅ Preserves form state (values, checked, selected)
- ✅ Captures Shadow DOM content
- ✅ Screenshots show visual state before/after
- ✅ Session data is valid JSON
- ✅ No recording failures cause browser crashes
- ✅ Works across Chrome, Firefox, Safari (Playwright browsers)

## 6. Non-Goals (Out of Scope for POC 1)

- ❌ Console log capture (POC 2)
- ❌ Network request/response capture (POC 2)
- ❌ Selector generation for elements
- ❌ Action replay functionality
- ❌ UI viewer for sessions
- ❌ Multi-tab recording
- ❌ Mobile gesture support
- ❌ Performance profiling
- ❌ Full-page screenshots

## 7. Data Format

### session.json Structure
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

## 8. Architecture

### Files to Extract from Playwright
- **snapshotterInjected.ts** (lines 40-52, 335-579): Core snapshot logic
- **snapshot.ts**: Type definitions (adapted for plain HTML format)

### Key Technical Decisions

**Decision 1: Snapshot Format**
- **Choice**: Plain HTML string with embedded special attributes
- **Rationale**: Simpler, can load in iframe, smaller file size, easier to debug

**Decision 2: Action Capture Timing**
- Add marker → Capture before → Let action execute → Wait 100ms → Capture after → Remove marker
- **Rationale**: Before shows what was clicked, delay allows DOM updates

**Decision 3: Screenshot Strategy**
- **Choice**: Viewport screenshots using `page.screenshot()`
- **Rationale**: Faster, matches user view, cross-browser compatible

**Decision 4: Error Handling**
- **Choice**: Continue recording on errors
- **Rationale**: One failed action shouldn't break entire session
