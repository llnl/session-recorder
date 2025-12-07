# PRD-MCP: Session Recorder MCP Server

**Version:** 1.0
**Date:** 2025-12-06
**Status:** Planning
**Depends On:** PRD-4.md (Voice Recording - Complete)

---

## Executive Summary

The Session Recorder MCP Server enables developers using AI coding assistants (Claude Code, Cline, Continue.dev, Cursor) to control browser session recording through natural language commands. This provides a seamless workflow for creating bug reports, tutorials, and QA sessions without leaving the AI assistant context.

**Target Users:** Developers using AI coding assistants

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

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial PRD for MCP Server |
