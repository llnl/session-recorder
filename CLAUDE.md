# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser Session Recorder - A Playwright-based tool that captures **user** actions (manual clicks, typing, form interactions) with before/after HTML snapshots and screenshots. Unlike Playwright's built-in tracing which captures programmatic API calls, this records actual user interactions in the browser.

## AI Development Workflow

> Template source: [.claude/docs/templates/README.md](.claude/docs/templates/README.md)

This project uses a structured, human-controlled development loop with XML/JSON documents for planning and tracking.

### Document Hierarchy

```text
plan/
├── PROGRESS.md                      # Dashboard of all initiatives
├── initiatives/INITIATIVE-[name].md # XML-structured initiative with epic dependencies
├── epics/epic-[init]-[epic].md      # XML-structured epic with requirements
└── tasks/tasks-[init]-[epic].json   # JSON feature list with TDD test steps
```

### Status Lifecycle

```text
todo → planning → implementing → implemented → tested
                                      ↓           ↓
                                    debug    regression
                                      ↑           ↓
                                   (fix it)   tested | debug
```

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `todo` | Not started | Begin implementation |
| `planning` | Being planned | Complete planning |
| `implementing` | In progress | Continue work |
| `implemented` | Code complete | Run e2e verification |
| `tested` | Verified working | Periodic regression |
| `regression` | Being retested | Wait for results |
| `debug` | Test failed | Fix the issue |

### Human-Controlled Commands

1. **`/plan [name]`** - Creates initiative + epic docs, **STOPS** for review
2. **`/generate-tasks [epic-path]`** - Creates tasks.json, **STOPS** for review
3. **`/implement [tasks-path]`** - Implements ONE feature, **STOPS** after each
4. **`/status`** - Shows progress dashboard with recommended next action
5. **`/regression [tasks-path]`** - Re-tests completed features
6. **`/fix-debug-tasks [tasks-path]`** - Fixes failing tests, **STOPS** after each

### Document Formats

**Initiative/Epic (XML)**:

```xml
<initiative>
  <name>MVP</name>
  <goal>Ship a functional product</goal>
  <epics>
    <epic id="foundation" status="in_progress" blocks="">Core setup</epic>
    <epic id="auth" status="blocked" blocks="foundation">Authentication</epic>
  </epics>
</initiative>
```

**Tasks (JSON with TDD steps)**:

```json
{
  "epic": "epic-mvp-foundation",
  "features": [{
    "id": "FEAT-01",
    "status": "todo",
    "steps": [
      "Navigate to /login → Page shows h1 'Sign In'",
      "Submit empty form → Error 'Email required' appears"
    ]
  }]
}
```

### Writing Test Steps

**Format**: `[ACTION] → [OBSERVABLE RESULT]` with exact values

**Banned words**: works, correct, properly, valid, appropriate, as expected, successfully

**Good**: `Click 'Submit' → Loading spinner appears for ≤2s` ✅
**Bad**: `Form validation works correctly` ❌

### Session Boundaries

**Starting**: Read PROGRESS.md → Check debug count → Fix debug OR implement next
**Ending**: Commit all → Update task JSON → App working → Update PROGRESS.md

## Build & Development Commands

```bash
# Build TypeScript
npm run build

# Install (Windows)
npm run session-recorder:install:windows

# Install (Mac/Linux)
npm run session-recorder:install:mac-linux

# Install Playwright browsers
npm run playwright:install
```

## Recording Sessions

```bash
# Record with browser + voice (full mode)
npm run record:full

# Record browser only
npm run record:browser

# Record voice only
npm run record:voice

# Connect to existing Chrome (debug port 9222)
npm run record:connect
```

## Testing

```bash
# Basic test
npm run test

# SPA navigation test
npm run test:spa

# Console capture test
npm run test:console

# Voice recording test
npm run test:voice
```

## Related Projects

### MCP Server ([mcp-server/README.md](mcp-server/README.md))

MCP server enabling AI assistants to search and analyze recorded sessions.

```bash
# Install & Build
cd mcp-server && npm install && npm run build

# Run server
npm start

# Add to Claude Code (~/.claude/claude_desktop_config.json)
{
  "mcpServers": {
    "session-search": {
      "command": "node",
      "args": ["/path/to/session-recorder/mcp-server/dist/index.js"]
    }
  }
}
```

**Tools**: `session_load`, `session_search`, `session_get_actions`, `session_get_timeline`, `session_search_network`, `session_search_console`

### Session Viewer ([viewer/README.md](viewer/README.md))

React + Vite app for viewing and editing recorded sessions.

```bash
# Install
cd viewer && npm install

# Dev server (from root)
npm run viewer

# Production build
cd viewer && npm run build
```

### Desktop App ([desktop-app/README.md](desktop-app/README.md))

Electron app with system tray for recording sessions with voice narration.

```bash
# Install
cd desktop-app && npm install

# Development
npm run dev

# Build distributable
npm run electron:build           # Current platform
npm run electron:build:win       # Windows (NSIS + portable)
npm run electron:build:mac       # macOS (DMG)
npm run electron:build:linux     # Linux (AppImage + DEB)
```

**Requires voice bundle** (from root): `npm run voice:build`

### Voice Recorder Bundle

Python-based audio recording with Whisper transcription, bundled for distribution.

```bash
# Build voice recorder executable (from root)
npm run voice:build

# Clean build
npm run voice:build:clean

# Output: desktop-app/resources/{platform}/voice-recorder/
```

## Architecture Overview

### Three-Layer Design

1. **Browser Layer** (`src/browser/`) - Injected JavaScript that runs in the browser
   - `actionListener.ts` - Capture phase event listeners for user actions
   - `snapshotCapture.ts` - HTML snapshot with form state preservation
   - `consoleCapture.ts` - Console log interception
   - `injected.ts` - Coordination of browser modules

2. **Node Layer** (`src/node/`) - Playwright orchestration
   - `SessionRecorder.ts` - Main API class, manages recording lifecycle
   - `TrayManager.ts` - System tray notification indicator
   - `types.ts` - TypeScript interfaces for session data

3. **Voice Layer** (`src/voice/`) - Python-based audio recording
   - `VoiceRecorder.ts` - Node wrapper for Python process
   - `record_and_transcribe.py` - Records audio, transcribes with Whisper
   - Requires Python 3.8+ with venv at `src/voice/.venv`

### Data Flow

```
Browser Actions → exposeFunction() callbacks → Node SessionRecorder
                                                    ↓
                              Save to output/session-{id}/
                              - session.json (metadata)
                              - snapshots/*.html.gz
                              - screenshots/*.jpg
                              - resources/ (SHA1 deduped)
                              - session.network (JSON Lines)
                              - session.console (JSON Lines)
```

### Key Patterns

- **Browser Injection**: Code in `src/browser/` is bundled and injected via `page.addInitScript()`
- **Exposed Functions**: Browser communicates with Node via `page.exposeFunction()` callbacks like `__recordActionBefore` and `__recordActionAfter`
- **Resource Deduplication**: Uses SHA1 hashing for CSS/images in `ResourceStorage`
- **Non-blocking Queue**: `ResourceCaptureQueue` handles async resource writes (TR-4)
- **Gzip Compression**: HTML snapshots compressed by default (TR-1)
- **JPEG Screenshots**: Uses JPEG at 75% quality instead of PNG (TR-1)

### Action Types

All action types are defined in `src/node/types.ts`:
- `RecordedAction` - click, input, change, submit, keydown
- `NavigationAction` - URL changes with snapshot
- `VoiceTranscriptAction` - Whisper transcription segments
- `MediaAction`, `DownloadAction`, `FullscreenAction`, `PrintAction`

### Export System (`src/export/`)

Auto-generates markdown files on session stop:
- `transcript.md` - Voice transcription timeline
- `actions.md` - Chronological action list with element context
- `console-summary.md` - Grouped/deduplicated console logs
- `network-summary.md` - Request statistics

### MCP Server (`/mcp-server`)

Separate package providing Claude MCP integration for:
- Starting/stopping recordings
- Loading and searching session data
- Querying actions, network requests, console logs

## Session Output Structure

```
output/session-{id}/
├── session.json           # Metadata with action references
├── transcript.json        # Full Whisper output (if voice enabled)
├── session.network        # JSON Lines network log
├── session.console        # JSON Lines console log
├── snapshots/             # HTML snapshots (gzipped)
│   ├── action-1-before.html.gz
│   └── action-1-after.html.gz
├── screenshots/           # JPEG screenshots
│   ├── action-1-before.jpg
│   └── action-1-after.jpg
├── resources/             # SHA1-named CSS, images, fonts
├── audio/                 # Voice recordings (if enabled)
├── transcript.md          # Generated markdown
├── actions.md
├── console-summary.md
└── network-summary.md
```

## TypeScript Configuration

- Target: ES2020, CommonJS modules
- Strict mode enabled
- Output: `dist/` directory
- Browser code compiled to JS then injected (not run as TypeScript)
