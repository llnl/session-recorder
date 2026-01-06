# Browser Session Recorder

A Playwright-based session recorder that captures **USER** actions (manual clicks, typing, form interactions) with before/after HTML snapshots and screenshots.

## Implementing next step

Implement the following items below. Once complete, Update the TASKS and PRD accordingly to state what is completed, as well as the @session-recorder/PRDs/PROGRESS.md

## Overview

Unlike Playwright's built-in tracing which captures programmatic API calls, this recorder captures actual user interactions in the browser. Perfect for:
- User behavior analysis
- Voice recording alignment (UTC timestamps)
- Manual testing documentation
- Bug reproduction

## Features (POC 1)

- ✅ Captures before/after HTML snapshots with full interactive state
- ✅ Captures before/after screenshots
- ✅ Detects user actions (click, input, change, submit, keydown)
- ✅ Marks interacted elements with `data-recorded-el` attribute
- ✅ UTC timestamps for all events
- ✅ Preserves form state (values, checked, selected)
- ✅ Supports Shadow DOM

## Installation

```bash
npm run session-recorder:install:windows
# OR for mac/linux
npm run session-recorder:install:linux
```

### Voice Recording Setup (Optional)

If you want to enable voice recording and transcription:

### Quick Install

```bash
npm run session-recorder:install:windows
# OR for mac/linux
npm run session-recorder:install:linux
```

**Note**: Voice recording requires Python 3.8+ and the packages listed above. The recorder uses:
- `sounddevice` and `soundfile` for audio recording
- OpenAI Whisper for speech-to-text transcription
- `torch` for running the Whisper model (supports CUDA/MPS/CPU)

To enable voice recording, set `voice_record: true` in SessionRecorder options.

## Desktop App

The desktop app provides a system tray application for recording sessions with voice narration.

### Build from Source

After cloning the repository:

```bash
npm install
npm run desktop:build:linux   # Linux (AppImage + DEB)
npm run desktop:build:win     # Windows (NSIS + portable)
npm run desktop:build:mac     # macOS (DMG)
npm run desktop:build:all     # All platforms
```

Output is saved to `desktop-app/release/`.

### Build Without Voice Recording

For environments without audio hardware (cloud, containers, CI):

```bash
npm install
npm run desktop:build:linux:no-voice   # Linux without voice
npm run desktop:build:win:no-voice     # Windows without voice
npm run desktop:build:mac:no-voice     # macOS without voice
```

### With Voice Recording

To include voice recording support, build the voice recorder bundle first:

```bash
npm install
npm run voice:build           # Build voice recorder executable
npm run desktop:build:linux   # Then build desktop app
```

See [desktop-app/README.md](desktop-app/README.md) for more details.

## Quick Start

```typescript
import { chromium } from '@playwright/test';
import { SessionRecorder } from './src/index';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Start recording
const recorder = new SessionRecorder('my-session');
await recorder.start(page);

// Navigate and let user interact
await page.goto('https://example.com');

// ... user performs actions ...

// Stop recording
await recorder.stop();

// Get results
const sessionData = recorder.getSessionData();
console.log(`Recorded ${sessionData.actions.length} actions`);

await browser.close();
```

## Running the Test

```bash
npm run record:connect
```

Then interact with the test page and press Enter to stop recording.

## Output Structure

Just like Playwright trace assets, HTML snapshots are saved as separate files:

```
output/
└── session-{id}/
    ├── session.json          # Session metadata with file references
    ├── snapshots/            # HTML snapshot files
    │   ├── action-1-before.html
    │   ├── action-1-after.html
    │   ├── action-2-before.html
    │   └── action-2-after.html
    └── screenshots/          # PNG screenshots
        ├── action-1-before.png
        ├── action-1-after.png
        ├── action-2-before.png
        └── action-2-after.png
```

## Session Data Format

session.json contains metadata with references to snapshot and screenshot files:

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
        "html": "snapshots/action-1-before.html",
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
        "html": "snapshots/action-1-after.html",
        "screenshot": "screenshots/action-1-after.png",
        "url": "file:///test-page.html",
        "viewport": {"width": 1280, "height": 720}
      }
    }
  ]
}
```

Each HTML snapshot file contains the complete interactive HTML with preserved state:
- Form values (`__playwright_value_`)
- Checkbox/radio states (`__playwright_checked_`)
- Select options (`__playwright_selected_`)
- Scroll positions (`__playwright_scroll_top_`, `__playwright_scroll_left_`)
- Shadow DOM content
- `data-recorded-el="true"` on the interacted element (before snapshots only)

## How It Works

1. **Injection**: Recording script is injected via `page.addInitScript()`
2. **Detection**: Event listeners in capture phase detect user actions
3. **Before Capture**:
   - Add `data-recorded-el="true"` to target element
   - Capture HTML snapshot (with marker)
   - Take screenshot
4. **Action Execution**: Let the action execute normally
5. **After Capture**:
   - Wait 100ms for DOM updates
   - Capture HTML snapshot and save to `snapshots/action-N-after.html`
   - Take screenshot and save to `screenshots/action-N-after.png`
   - Remove marker attribute
6. **Storage**: Save metadata with file references to `session.json`

## Special Attributes

The recorder preserves interactive state using special attributes:

- `__playwright_value_`: Input/textarea values
- `__playwright_checked_`: Checkbox/radio states
- `__playwright_selected_`: Select option states
- `__playwright_scroll_top_`, `__playwright_scroll_left_`: Scroll positions
- `__playwright_current_src_`: Image current src
- `data-recorded-el`: Marks the element that was interacted with (before snapshot only)

## Future Enhancements (POC 2)

- Console log capture
- Network request/response capture
- Performance metrics
- Replay UI
- Multi-tab support

## License

MIT
