# PRD-MCP: Session Recorder MCP Server

**Version:** 2.0
**Last Updated:** December 2025
**Status:** ⚡ Planning
**Depends On:** [PRD-4.md](PRD-4.md) (Voice Recording), [PRD-session-editor.md](PRD-session-editor.md) (Description Button)

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **AI-Assisted Developers** | Control recording via Claude Code, generate app specs from recordings |
| **Developers** | Create bug reports and documentation via natural language commands |
| **QA Engineers** | Automate session recording, generate regression tests from recordings |
| **Technical Writers** | Extract documentation from recorded walkthroughs |
| **Business Analysts** | Generate requirements from domain expert recordings |

---

## MCP Server Phases

The MCP server has two complementary phases:

| Phase | Purpose | Tools | Transport |
|-------|---------|-------|-----------|
| **Phase 1: Recording Control** | Start/stop browser & voice recording | 5 tools | stdio |
| **Phase 2: Session Query** | Search & analyze session.zip files | 12 tools | HTTP |

**Phase 1** enables AI to control recording sessions.
**Phase 2** enables AI to query and understand recorded sessions for documentation, testing, and bug reports.

---

## Executive Summary

The Session Recorder MCP Server enables developers using AI coding assistants (Claude Code, Cline, Continue.dev, Cursor) to control browser session recording through natural language commands. This provides a seamless workflow for creating bug reports, tutorials, and QA sessions without leaving the AI assistant context.

---

## 1. Problem Statement

**Current State:**
- Developers must manually run TypeScript scripts to record sessions
- No integration with AI coding assistants
- Context switching between AI assistant and recording setup is disruptive
- No way for AI to automatically record sessions during debugging

**Solution:**
MCP Server with 5 tools that AI assistants can call to control session recording:
- Start/stop browser recording
- Start/stop voice recording
- Start/stop combined recording
- Get recording status
- List recent recordings

---

## 2. Goals & Objectives

### Primary Goals
1. **Zero-friction recording:** Developers say "record my browser session" and it happens
2. **Full feature parity:** All SessionRecorder features available via MCP tools
3. **Cross-platform:** Works with any MCP-compatible AI assistant
4. **Stateful management:** Handle multiple recording sessions intelligently

### Success Metrics
| Metric | Target |
|--------|--------|
| MCP tool response time | <500ms |
| Recording start time | <3 seconds |
| Claude Desktop compatibility | 100% |
| Tool invocation success rate | >99% |

---

## 3. User Flows

### Flow 1: Browser-Only Recording
```
Developer: "Record my browser session testing the login flow"
AI: *calls start_browser_recording*
→ Browser opens, developer interacts
Developer: "Stop recording"
AI: *calls stop_recording*
→ Returns zip path + viewer URL
```

### Flow 2: Combined Recording with Voice
```
Developer: "Record my browser and voice while I demo this feature"
AI: *calls start_combined_recording*
→ Browser opens, microphone active
Developer: narrates while clicking
Developer: "Done recording"
AI: *calls stop_recording*
→ Returns zip with voice transcript aligned to actions
```

### Flow 3: Status Check
```
Developer: "Am I still recording?"
AI: *calls get_recording_status*
→ Returns: Recording active for 5m 23s, 47 actions captured
```

### Flow 4: Voice-Only Recording
```
Developer: "Just record my voice notes for this bug"
AI: *calls start_voice_recording*
→ Microphone active, no browser
Developer: describes the issue
Developer: "Stop"
AI: *calls stop_recording*
→ Returns transcript file
```

---

## 4. Technical Architecture

### 4.1 MCP Server Structure

```
session-recorder-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # Server configuration
│   ├── tools/
│   │   ├── startBrowserRecording.ts
│   │   ├── startVoiceRecording.ts
│   │   ├── startCombinedRecording.ts
│   │   ├── stopRecording.ts
│   │   ├── getRecordingStatus.ts
│   │   └── listRecordings.ts
│   ├── recording/
│   │   ├── RecordingManager.ts    # State management
│   │   └── SessionWrapper.ts      # SessionRecorder wrapper
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── mcp-config.json
```

### 4.2 MCP Tools Specification

#### Tool 1: start_browser_recording
```typescript
{
  name: 'start_browser_recording',
  description: 'Start recording browser session with user actions, DOM snapshots, and screenshots',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Recording title (optional, defaults to timestamp)'
      },
      url: {
        type: 'string',
        description: 'Initial URL to navigate to (optional)'
      },
      browserType: {
        type: 'string',
        enum: ['chromium', 'firefox', 'webkit'],
        description: 'Browser to use (default: chromium)'
      },
      headless: {
        type: 'boolean',
        description: 'Run browser in headless mode (default: false)'
      }
    }
  }
}
```

#### Tool 2: start_voice_recording
```typescript
{
  name: 'start_voice_recording',
  description: 'Start recording voice narration with Whisper transcription',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Recording title (optional)'
      },
      whisperModel: {
        type: 'string',
        enum: ['tiny', 'base', 'small', 'medium', 'large'],
        description: 'Whisper model size (default: base)'
      }
    }
  }
}
```

#### Tool 3: start_combined_recording
```typescript
{
  name: 'start_combined_recording',
  description: 'Start recording both browser actions and voice narration simultaneously',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      url: { type: 'string' },
      browserType: {
        type: 'string',
        enum: ['chromium', 'firefox', 'webkit']
      },
      whisperModel: {
        type: 'string',
        enum: ['tiny', 'base', 'small', 'medium', 'large']
      }
    }
  }
}
```

#### Tool 4: stop_recording
```typescript
{
  name: 'stop_recording',
  description: 'Stop active recording and create session zip file',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID to stop (optional, stops active session if not specified)'
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-1733500000000",
  "zipPath": "/output/session-1733500000000.zip",
  "viewerUrl": "http://localhost:3001?zip=file:///output/session-1733500000000.zip",
  "summary": {
    "duration": "5m 23s",
    "actionCount": 47,
    "voiceSegments": 12,
    "transcriptPreview": "Testing the login flow..."
  }
}
```

#### Tool 5: get_recording_status
```typescript
{
  name: 'get_recording_status',
  description: 'Get current recording status (active/inactive, duration, action count)',
  inputSchema: {
    type: 'object',
    properties: {}
  }
}
```

**Response (active):**
```json
{
  "isRecording": true,
  "sessionId": "session-1733500000000",
  "mode": "combined",
  "duration": "5m 23s",
  "durationMs": 323000,
  "actionCount": 47,
  "voiceEnabled": true,
  "currentUrl": "https://example.com/dashboard"
}
```

**Response (inactive):**
```json
{
  "isRecording": false,
  "lastSession": {
    "sessionId": "session-1733400000000",
    "zipPath": "/output/session-1733400000000.zip",
    "completedAt": "2025-12-06T10:30:00.000Z"
  }
}
```

#### Tool 6: list_recordings (Optional Enhancement)
```typescript
{
  name: 'list_recordings',
  description: 'List recent recording sessions',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of recordings to return (default: 10)'
      }
    }
  }
}
```

### 4.3 Recording Manager

```typescript
// src/recording/RecordingManager.ts
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import { SessionRecorder } from '@session-recorder/core';

export interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  mode: 'browser' | 'voice' | 'combined' | null;
  startTime: Date | null;
  browser: Browser | null;
  page: Page | null;
  recorder: SessionRecorder | null;
}

export class RecordingManager {
  private state: RecordingState = {
    isRecording: false,
    sessionId: null,
    mode: null,
    startTime: null,
    browser: null,
    page: null,
    recorder: null
  };

  async startBrowserRecording(options: StartBrowserOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress',
        activeSessionId: this.state.sessionId
      };
    }

    try {
      const sessionId = `session-${Date.now()}`;
      const browser = await this.launchBrowser(options.browserType);
      const page = await browser.newPage();

      const recorder = new SessionRecorder(sessionId, {
        browser_record: true,
        voice_record: false
      });

      await recorder.start(page);

      if (options.url) {
        await page.goto(options.url);
      }

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'browser',
        startTime: new Date(),
        browser,
        page,
        recorder
      };

      return {
        success: true,
        sessionId,
        message: 'Browser recording started',
        browserUrl: options.url || 'about:blank'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start recording: ${error.message}`
      };
    }
  }

  async startCombinedRecording(options: StartCombinedOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress',
        activeSessionId: this.state.sessionId
      };
    }

    try {
      const sessionId = `session-${Date.now()}`;
      const browser = await this.launchBrowser(options.browserType);
      const page = await browser.newPage();

      const recorder = new SessionRecorder(sessionId, {
        browser_record: true,
        voice_record: true,
        whisper_model: options.whisperModel || 'base'
      });

      await recorder.start(page);

      if (options.url) {
        await page.goto(options.url);
      }

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'combined',
        startTime: new Date(),
        browser,
        page,
        recorder
      };

      return {
        success: true,
        sessionId,
        message: 'Combined browser + voice recording started',
        browserUrl: options.url || 'about:blank',
        voiceEnabled: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start recording: ${error.message}`
      };
    }
  }

  async stopRecording(): Promise<StopResult> {
    if (!this.state.isRecording || !this.state.recorder) {
      return {
        success: false,
        error: 'No active recording'
      };
    }

    try {
      await this.state.recorder.stop();
      const zipPath = await this.state.recorder.createZip();

      if (this.state.browser) {
        await this.state.browser.close();
      }

      const duration = Date.now() - this.state.startTime!.getTime();
      const sessionId = this.state.sessionId!;

      // Reset state
      this.state = {
        isRecording: false,
        sessionId: null,
        mode: null,
        startTime: null,
        browser: null,
        page: null,
        recorder: null
      };

      return {
        success: true,
        sessionId,
        zipPath,
        viewerUrl: `http://localhost:3001?zip=file://${encodeURIComponent(zipPath)}`,
        duration: this.formatDuration(duration)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stop recording: ${error.message}`
      };
    }
  }

  getStatus(): StatusResult {
    if (!this.state.isRecording) {
      return { isRecording: false };
    }

    const duration = Date.now() - this.state.startTime!.getTime();
    const sessionData = this.state.recorder?.getSessionData();

    return {
      isRecording: true,
      sessionId: this.state.sessionId!,
      mode: this.state.mode!,
      duration: this.formatDuration(duration),
      durationMs: duration,
      actionCount: sessionData?.actions?.length || 0,
      voiceEnabled: this.state.mode === 'combined' || this.state.mode === 'voice',
      currentUrl: this.state.page?.url() || 'unknown'
    };
  }

  private async launchBrowser(type: string = 'chromium'): Promise<Browser> {
    switch (type) {
      case 'firefox':
        return await firefox.launch({ headless: false });
      case 'webkit':
        return await webkit.launch({ headless: false });
      default:
        return await chromium.launch({ headless: false });
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}
```

### 4.4 MCP Server Configuration

**mcp-config.json:**
```json
{
  "name": "session-recorder",
  "version": "1.0.0",
  "description": "Record browser sessions with voice narration via MCP",
  "mcpServers": {
    "session-recorder": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "OUTPUT_DIR": "${HOME}/session-recordings",
        "VIEWER_PORT": "3001"
      }
    }
  }
}
```

**Claude Desktop Configuration (~/.config/claude/claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "session-recorder": {
      "command": "npx",
      "args": ["-y", "@anthropic/session-recorder-mcp"],
      "env": {
        "OUTPUT_DIR": "/Users/username/recordings"
      }
    }
  }
}
```

---

## 5. Implementation Phases

### Phase 1: Core MCP Server (4 hours)
1. Initialize npm project with TypeScript
2. Set up MCP SDK integration
3. Create server entry point
4. Register 5 core tools
5. Test with MCP inspector

### Phase 2: Tool Implementations (5 hours)
1. Implement RecordingManager class
2. start_browser_recording tool
3. start_voice_recording tool
4. start_combined_recording tool
5. stop_recording tool
6. get_recording_status tool

### Phase 3: Integration & Testing (3 hours)
1. Integration tests with mock browser
2. Claude Desktop compatibility testing
3. Error handling edge cases
4. Documentation and examples

**Total: 12 hours**

---

## 6. Dependencies

**Package Dependencies:**
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.10.0",
    "playwright": "^1.40.0"
  },
  "peerDependencies": {
    "@session-recorder/core": "^1.0.0"
  }
}
```

**System Requirements:**
- Node.js 18+
- Python 3.8+ (for voice recording)
- Microphone access (for voice recording)

---

## 7. Error Handling

### Error Categories

| Error | Tool Response | User Message |
|-------|---------------|--------------|
| Recording already active | `{ success: false, error: "..." }` | "A recording is already in progress. Stop it first or check status." |
| No active recording | `{ success: false, error: "..." }` | "No recording is active. Start one first." |
| Browser launch failed | `{ success: false, error: "..." }` | "Failed to launch browser. Check Playwright installation." |
| Microphone access denied | `{ success: false, error: "..." }` | "Microphone access denied. Check system permissions." |
| Python not found | `{ success: false, error: "..." }` | "Python 3.8+ required for voice recording." |
| Whisper not installed | `{ success: false, error: "..." }` | "Run: pip install openai-whisper" |

### Graceful Degradation
- If voice recording fails, continue with browser-only
- If browser fails, return clear error with diagnostics
- Always clean up resources on failure

---

## 8. Security Considerations

### Permissions
- MCP tools only control local browser instances
- No network access beyond local viewer server
- Output files saved to user-specified directory

### Resource Limits
- Maximum recording duration: 4 hours
- Maximum concurrent recordings: 1
- Automatic cleanup after 24 hours (configurable)

---

## 9. Out of Scope

- Cloud storage integration
- Multi-user support
- Remote browser control
- Real-time streaming
- Web-based dashboard

---

## 10. Future Enhancements

1. **list_recordings tool:** Browse and re-open past recordings
2. **add_marker tool:** Add timestamped notes during recording
3. **pause_recording tool:** Pause/resume capability
4. **export_to_playwright tool:** Generate Playwright test from recording

---

---

# Phase 2: Session Query MCP Server

## Executive Summary

Phase 2 adds 12 MCP tools that enable AI assistants to search and analyze recorded sessions. Instead of storing session data in databases, the MCP server queries session.zip files at runtime, returning text-based data optimized for AI context windows.

---

## Prerequisites

### PR-1: Screenshot Description Button (Session Editor)

**Must implement first** - Add ability to describe each screenshot in the Session Editor.

**Why this matters**: AI can understand what's in screenshots without seeing images. This enables text-only MCP without sending large binary data.

```typescript
interface RecordedAction {
  // ... existing fields
  description?: string;  // Human-written description of what's shown
}
```

### PR-2: Notes System (Session Editor PRD)

Notes between actions provide additional context for AI. Already planned in PRD-session-editor.md.

---

## Data Flow (Phase 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENRICHMENT PHASE                                 │
│                                                                          │
│   1. Record Session        2. Review & Describe        3. Export         │
│   ─────────────────       ───────────────────────     ─────────────      │
│                                                                          │
│   session.zip             Session Editor               enriched.zip      │
│   ├─ actions[]            ├─ [Describe] button        ├─ actions[]       │
│   ├─ voice transcript     │   for each screenshot     │   + descriptions │
│   └─ screenshots/         └─ Add notes between        ├─ notes[]         │
│                               actions                  └─ transcript      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SEARCH PHASE (MCP / TypeScript API)              │
│                                                                          │
│   MCP Tools (Claude Code):          TypeScript API (Code Mode):          │
│   • session_search("login")         const api = new SessionAPI(path);    │
│   • session_get_range(5, 12)        await api.search("login");           │
│   • session_get_urls()              await api.getRange(5, 12);           │
│   • session_get_errors()            await api.getUrls();                 │
│                                                                          │
│   AI generates from TEXT DATA:                                           │
│   • app_spec.txt                                                         │
│   • feature_list.json                                                    │
│   • Playwright tests                                                     │
│   • Bug reports                                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Cases (Phase 2)

### UC-Q1: Legacy Application Documentation

**Actor:** Developer with domain expert
**Duration:** 30-120 minutes recording, 5-10 minutes AI analysis
**Scenario:** Domain expert records a walkthrough of a legacy ERP system while narrating. Developer uses AI to generate app_spec.txt.

**MCP Workflow:**
1. `session_load` - Load the session, get overview
2. `session_get_summary` - Understand structure
3. `session_get_urls` - Map application pages
4. `session_search("important")` - Find key features mentioned
5. `session_get_range` - Extract each feature's actions
6. AI generates app_spec.txt from collected text

### UC-Q2: QA Bug Report

**Actor:** QA Engineer
**Duration:** 2-15 minutes recording, 2-5 minutes AI analysis
**Scenario:** QA records a bug reproduction, narrating expected vs actual behavior. AI generates structured bug report.

**MCP Workflow:**
1. `session_load` - Load the session
2. `session_get_errors` - Find console/network errors
3. `session_get_timeline` - Get action sequence
4. `session_search("error OR fail")` - Find QA's error mentions
5. AI generates bug report with steps, expected, actual, evidence

### UC-Q3: Regression Test Generation

**Actor:** QA Engineer
**Duration:** 5-30 minutes recording, 5-10 minutes AI analysis
**Scenario:** QA records a test flow with assertions narrated. AI generates Playwright tests.

**MCP Workflow:**
1. `session_load` - Load the session
2. `session_get_timeline` - Get action sequence with voice
3. `session_get_action` - Get element selectors for each action
4. `session_search("should OR verify OR expect")` - Find assertion hints
5. AI generates Playwright test code

---

## Phase 2 MCP Tools Specification

### Tool Q1: `session_load`

**Purpose:** Load a session.zip into memory for querying

**Context cost:** ~200 tokens

```typescript
session_load(path: string): {
  sessionId: string;
  duration: number;           // ms
  actionCount: number;
  hasVoice: boolean;
  hasDescriptions: boolean;
  hasNotes: boolean;
  urls: string[];             // Unique URLs (max 20)
  summary: {
    clicks: number;
    inputs: number;
    navigations: number;
    voiceSegments: number;
  };
}
```

### Tool Q2: `session_search`

**Purpose:** Full-text search across all text content

**Context cost:** ~50-500 tokens

```typescript
session_search(sessionId: string, query: string, options?: {
  searchIn?: ('transcript' | 'descriptions' | 'notes' | 'values' | 'urls')[];
  limit?: number;             // Default 10, max 50
  includeContext?: boolean;   // Default true
}): SearchResult[]
```

### Tool Q3: `session_get_summary`

**Purpose:** Get high-level overview with content previews

**Context cost:** ~300-500 tokens

```typescript
session_get_summary(sessionId: string): {
  sessionId: string;
  duration: number;
  totalActions: number;
  byType: Record<ActionType, number>;
  urls: { url: string; actionCount: number; }[];
  hasVoice: boolean;
  hasDescriptions: boolean;
  hasNotes: boolean;
  errorCount: number;
  transcriptPreview: string;  // First 500 chars
  featuresDetected: string[]; // Keyword-based
}
```

### Tool Q4: `session_get_actions`

**Purpose:** Get filtered list of actions with summaries

**Context cost:** ~20 tokens per action

```typescript
session_get_actions(sessionId: string, options?: {
  types?: ActionType[];
  url?: string;
  startIndex?: number;
  limit?: number;             // Default 20, max 100
}): { total: number; returned: number; actions: ActionSummary[]; }
```

### Tool Q5: `session_get_action`

**Purpose:** Get full details of single action

**Context cost:** ~100-300 tokens

```typescript
session_get_action(sessionId: string, actionId: string): ActionDetail
```

### Tool Q6: `session_get_range`

**Purpose:** Get sequence of actions with combined context

**Context cost:** ~50 tokens per action + voice/notes

```typescript
session_get_range(sessionId: string, startId: string, endId: string): {
  actions: ActionDetail[];
  combinedTranscript: string;
  combinedNotes: string[];
  descriptions: string[];
  urls: string[];
  duration: number;
}
```

### Tool Q7: `session_get_urls`

**Purpose:** Get URL navigation structure

**Context cost:** ~30 tokens per URL

```typescript
session_get_urls(sessionId: string): UrlFlow[]
```

### Tool Q8: `session_get_errors`

**Purpose:** Find all errors (console + network)

**Context cost:** ~50-200 tokens

```typescript
session_get_errors(sessionId: string): {
  console: ConsoleError[];
  network: NetworkError[];
  total: number;
}
```

### Tool Q9: `session_get_timeline`

**Purpose:** Get chronological interleaved timeline

**Context cost:** ~30 tokens per entry

```typescript
session_get_timeline(sessionId: string, options?: {
  startTime?: string;
  endTime?: string;
  limit?: number;             // Default 50, max 200
  offset?: number;
}): { total: number; entries: TimelineEntry[]; }
```

### Tool Q10: `session_get_context`

**Purpose:** Get context window around specific action

**Context cost:** ~200-400 tokens

```typescript
session_get_context(sessionId: string, actionId: string, options?: {
  before?: number;            // Default 3
  after?: number;             // Default 3
}): {
  target: ActionDetail;
  before: ActionSummary[];
  after: ActionSummary[];
  voiceContext: string;
  noteContext: string[];
}
```

### Tool Q11: `session_search_network`

**Purpose:** Search network requests

**Context cost:** ~30 tokens per request

```typescript
session_search_network(sessionId: string, options?: {
  urlPattern?: string;
  method?: string;
  status?: number;
  contentType?: string;
  limit?: number;             // Default 20
}): NetworkEntry[]
```

### Tool Q12: `session_search_console`

**Purpose:** Search console logs

**Context cost:** ~30 tokens per entry

```typescript
session_search_console(sessionId: string, options?: {
  level?: 'error' | 'warn' | 'log' | 'info';
  pattern?: string;
  limit?: number;             // Default 20
}): ConsoleEntry[]
```

---

## Context Budget Summary (Phase 2)

| Tool | Typical | Max | Use Case |
|------|---------|-----|----------|
| `session_load` | 150 | 300 | Start here |
| `session_search` | 200 | 1000 | Find relevant parts |
| `session_get_summary` | 400 | 600 | Understand structure |
| `session_get_actions` | 400 | 2000 | Browse action list |
| `session_get_action` | 200 | 400 | Deep dive one action |
| `session_get_range` | 500 | 2000 | Extract feature/flow |
| `session_get_urls` | 200 | 500 | Map navigation |
| `session_get_errors` | 150 | 500 | Bug investigation |
| `session_get_timeline` | 500 | 2000 | Understand full flow |
| `session_get_context` | 300 | 600 | Understand one moment |
| `session_search_network` | 300 | 800 | API debugging |
| `session_search_console` | 200 | 600 | Debug logging |

**Typical 5-feature app analysis:** ~3000-5000 tokens total

---

## Code Mode (TypeScript API)

In addition to MCP tools, provide a TypeScript API for programmatic access:

```typescript
import { SessionAPI } from '@session-recorder/api';

const session = await SessionAPI.load('/path/to/session.zip');
const summary = await session.getSummary();
const results = await session.search('login');
await session.unload();
```

**Use cases:** CI/CD integration, batch processing, unit testing, non-MCP clients

---

## Phase 2 Architecture

### Integration with Viewer

Phase 2 MCP server is integrated with the viewer's Express server (HTTP transport).

```
session-recorder/
├── viewer/
│   ├── src/
│   │   ├── server/                   # MCP server (Phase 2)
│   │   │   ├── mcp.ts                # MCP protocol handler
│   │   │   ├── sessionStore.ts       # Session cache
│   │   │   └── tools/
│   │   │       ├── session.ts        # load, unload
│   │   │       ├── search.ts         # search tools
│   │   │       ├── navigation.ts     # get_actions, get_urls
│   │   │       └── errors.ts         # error tools
│   │   └── api/                      # TypeScript API
│   │       ├── SessionAPI.ts
│   │       └── types.ts
│   └── package.json
```

### Claude Code Configuration (Phase 2)

```json
{
  "mcpServers": {
    "session-query": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

---

## Phase 2 Implementation

### P2-Phase 1: Prerequisites (Session Editor)

| Task | File | Description |
|------|------|-------------|
| Add description field | `types/session.ts` | Add `description?: string` to actions |
| Describe button UI | `viewer/src/components/ActionList.tsx` | Button to add description |
| Description modal | `viewer/src/components/DescriptionModal.tsx` | Edit description |
| Persist descriptions | `viewer/src/services/editOperations.ts` | Save as edit operation |
| Export with descriptions | `viewer/src/services/zipHandler.ts` | Include in export |

### P2-Phase 2: MCP Server Integration

| Task | File | Description |
|------|------|-------------|
| MCP endpoint | `viewer/src/server/mcp.ts` | Express route for MCP |
| Session store | `viewer/src/server/sessionStore.ts` | In-memory session cache |
| Tool: session_load | `viewer/src/server/tools/session.ts` | Load zip into memory |
| Tool: session_search | `viewer/src/server/tools/search.ts` | Full-text search |
| Tool: session_get_* | `viewer/src/server/tools/navigation.ts` | Navigation tools |
| Tool: session_get_errors | `viewer/src/server/tools/errors.ts` | Error extraction |

### P2-Phase 3: Testing & Docs

| Task | Description |
|------|-------------|
| Test with sample session | Record session, describe, export, query via MCP |
| MCP client config | Document how to add to Claude Code |
| Usage examples | Document common AI workflows |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial PRD for MCP Server (Recording Control) |
| 1.1 | 2025-12-10 | Updated to follow template, added Target Users table |
| 2.0 | 2025-12-10 | Added Phase 2: Session Query MCP Server (12 tools) |
