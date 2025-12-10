# Recorded Actions Reference

This document lists all actions captured by the Session Recorder.

## User Interaction Actions

These are captured from browser-side event listeners in `src/browser/actionListener.ts`.

### Click (`click`)

Mouse click events on any element.

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Click X coordinate (clientX) |
| `y` | number | Click Y coordinate (clientY) |
| `button` | number | Mouse button: 0=left, 1=middle, 2=right |
| `modifiers.ctrl` | boolean | Ctrl key held during click |
| `modifiers.shift` | boolean | Shift key held during click |
| `modifiers.alt` | boolean | Alt key held during click |
| `modifiers.meta` | boolean | Cmd (Mac) / Win (Windows) key held |

### Input (`input`)

Text input in text fields and textareas.

| Field | Type | Description |
|-------|------|-------------|
| `value` | string | Current value of the input field |

### Change (`change`)

Value changes on select dropdowns, checkboxes, and radio buttons.

*No additional fields - captures the event occurrence.*

### Submit (`submit`)

Form submission events.

*No additional fields - captures the event occurrence.*

### Keydown (`keydown`)

Special keyboard key presses. Only captures specific keys to avoid recording sensitive input.

**Captured keys:** `Enter`, `Tab`, `Escape`, `Delete`, `Backspace`

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | The key that was pressed |

---

## Browser Events

These are captured from Playwright page events in `src/node/SessionRecorder.ts`.

### Navigation (`navigation`)

Page navigation events including initial load, link clicks, and browser back/forward.

| Field | Type | Description |
|-------|------|-------------|
| `navigation.fromUrl` | string | URL before navigation (empty for initial load) |
| `navigation.toUrl` | string | URL navigated to |
| `navigation.navigationType` | string | `initial`, `link`, `typed`, `reload`, `back_forward`, `other` |
| `snapshot` | object | Screenshot and HTML after navigation |

### Page Visibility (`page_visibility`)

Tab visibility changes (user switches tabs, minimizes window, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `visibility.state` | string | `visible` or `hidden` |
| `visibility.previousState` | string | Previous visibility state |
| `snapshot` | object | Screenshot at moment of change |

### Media (`media`)

Video and audio playback events.

| Field | Type | Description |
|-------|------|-------------|
| `media.event` | string | `play`, `pause`, `ended`, `seeked`, `volumechange` |
| `media.mediaType` | string | `video` or `audio` |
| `media.src` | string | Media source URL |
| `media.currentTime` | number | Playback position in seconds |
| `media.duration` | number | Total duration in seconds |
| `media.volume` | number | Volume level (0-1) |
| `media.muted` | boolean | Whether media is muted |
| `snapshot` | object | Screenshot at moment of event |

### Download (`download`)

File download events.

| Field | Type | Description |
|-------|------|-------------|
| `download.url` | string | Download URL |
| `download.suggestedFilename` | string | Suggested filename |
| `download.state` | string | `started`, `completed`, `canceled`, `failed` |
| `download.totalBytes` | number | Total file size |
| `download.receivedBytes` | number | Bytes downloaded so far |
| `download.error` | string | Error message if failed |
| `snapshot` | object | Screenshot at moment of event |

### Fullscreen (`fullscreen`)

Fullscreen mode changes.

| Field | Type | Description |
|-------|------|-------------|
| `fullscreen.state` | string | `entered` or `exited` |
| `fullscreen.element` | string | Tag name of fullscreen element (e.g., `VIDEO`) |
| `snapshot` | object | Screenshot at moment of change |

### Print (`print`)

Print dialog events.

| Field | Type | Description |
|-------|------|-------------|
| `print.event` | string | `beforeprint` or `afterprint` |
| `snapshot` | object | Screenshot at moment of event |

---

## Voice Recording

Captured via microphone recording with Whisper transcription.

### Voice Transcript (`voice_transcript`)

Speech segments transcribed from audio recording.

| Field | Type | Description |
|-------|------|-------------|
| `transcript.text` | string | Transcribed text |
| `transcript.startTime` | string | ISO 8601 timestamp when speech started |
| `transcript.endTime` | string | ISO 8601 timestamp when speech ended |
| `transcript.confidence` | number | Transcription confidence (0-1) |
| `transcript.words` | array | Word-level timing and probability |
| `transcript.isPartial` | boolean | True if split from larger segment |
| `audioFile` | string | Path to audio segment file |
| `associatedActionId` | string | ID of browser action that follows |

---

## Common Fields

All actions include these base fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique action identifier (e.g., `action-1`, `nav-2`) |
| `timestamp` | string | ISO 8601 UTC timestamp |
| `type` | string | Action type (see above) |
| `tabId` | number | Tab index (0-based, for multi-tab support) |

### Snapshots

User interaction actions (`click`, `input`, `change`, `submit`, `keydown`) include before/after snapshots:

```typescript
{
  before: {
    timestamp: string;    // When snapshot was taken
    html: string;         // Path to HTML file
    screenshot: string;   // Path to screenshot PNG
    url: string;          // Page URL
    viewport: { width: number; height: number };
  },
  after: {
    // Same structure as before
  }
}
```

Browser events may include a single `snapshot` field with similar structure.

---

## Session Metadata

In addition to actions, sessions capture:

- **Network requests** (`session.network`) - All HTTP requests with timing
- **Console logs** (`session.console`) - All console output
- **Resources** - Deduplicated page resources (CSS, JS, images, fonts)
- **Voice recording** - Audio file and transcription (if enabled)
