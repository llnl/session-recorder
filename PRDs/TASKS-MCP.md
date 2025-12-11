# TASKS-MCP: MCP Server Implementation Tasks

**PRD:** [PRD-MCP.md](./PRD-MCP.md)
**Last Updated:** 2025-12-11
**Overall Status:** ✅ Phase 1 & 2 Complete - 18 tools implemented

**Implementation:** [mcp-server/](../mcp-server/) - Session Recorder MCP Server (standalone)

---

## Table of Contents

- [Overview](#overview)
- [Recording Control (Phase 1)](#recording-control-phase-1) ✅
  - [P1-Phase 1: MCP Server Setup](#p1-phase-1-mcp-server-setup-4-hours) ✅
  - [P1-Phase 2: Tool Implementations](#p1-phase-2-tool-implementations-5-hours) ✅
  - [P1-Phase 3: Integration & Testing](#p1-phase-3-integration--testing-3-hours) ✅
- [Session Query (Phase 2)](#session-query-phase-2) ✅
  - [P2-Phase 0: Prerequisites](#p2-phase-0-prerequisites-session-editor)
  - [P2-Phase 1: MCP Server Integration](#p2-phase-1-mcp-server-integration-6-hours--complete) ✅
  - [P2-Phase 2: Query Tools](#p2-phase-2-query-tools-implementation-8-hours--complete) ✅
  - [P2-Phase 3: Testing & Docs](#p2-phase-3-testing--docs-2-hours--complete) ✅
- [Summary](#summary)
- [Document Change Log](#document-change-log)

---

## Overview

This document breaks down the MCP Server implementation into actionable tasks. The MCP Server has two phases:

| Phase | Purpose | Tools | Transport | Status |
|-------|---------|-------|-----------|--------|
| **Recording Control** | Start/stop browser & voice recording | 5 tools | stdio | ✅ Complete |
| **Session Query** | Search & analyze session.zip files | 13 tools | stdio | ✅ Complete |

**Total Tools:** 18 (5 recording control + 13 session query)

---

# Recording Control (Phase 1) ✅ Complete

The Recording Control phase enables AI coding assistants to control session recording through natural language commands.

> **Implementation Note:** Phase 1 implemented in `mcp-server/src/`:
> - `RecordingManager.ts` - Manages browser/voice recording sessions
> - `tools/recording.ts` - Tool handler functions
> - `index.ts` - Tool definitions and registration
>
> **5 tools:** `start_browser_recording`, `start_voice_recording`, `start_combined_recording`, `stop_recording`, `get_recording_status`

---

## P1-Phase 1: MCP Server Setup (4 hours)

**Goal:** Initialize MCP server project with proper configuration
**Deliverable:** Working MCP server that registers with Claude Desktop

### Task 1.1: Initialize Project Structure (1 hour)

**Priority:** HIGH

#### Implementation Steps

1. **Create project directory and initialize npm**

```bash
mkdir session-recorder-mcp
cd session-recorder-mcp
npm init -y
```

2. **Install dependencies**

```bash
npm install @anthropic-ai/sdk playwright
npm install --save-dev typescript @types/node ts-node rimraf
```

3. **Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. **Create directory structure**

```
session-recorder-mcp/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── tools/
│   │   └── index.ts
│   ├── recording/
│   │   └── RecordingManager.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── mcp-config.json
```

5. **Update package.json scripts**

```json
{
  "name": "@anthropic/session-recorder-mcp",
  "version": "1.0.0",
  "description": "MCP Server for browser session recording",
  "main": "dist/index.js",
  "scripts": {
    "build": "rimraf dist && tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "keywords": ["mcp", "session-recorder", "playwright"],
  "license": "MIT"
}
```

#### Acceptance Criteria

- [ ] Project directory created with proper structure
- [ ] TypeScript compiles without errors
- [ ] Package.json has correct scripts and dependencies

---

### Task 1.2: MCP Server Entry Point (1.5 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create types/index.ts**

```typescript
// src/types/index.ts
export interface StartBrowserOptions {
  title?: string;
  url?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

export interface StartVoiceOptions {
  title?: string;
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
}

export interface StartCombinedOptions extends StartBrowserOptions, StartVoiceOptions {}

export interface StartResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  message?: string;
  browserUrl?: string;
  voiceEnabled?: boolean;
  activeSessionId?: string;
}

export interface StopResult {
  success: boolean;
  sessionId?: string;
  zipPath?: string;
  viewerUrl?: string;
  duration?: string;
  error?: string;
  summary?: {
    actionCount: number;
    voiceSegments?: number;
    transcriptPreview?: string;
  };
}

export interface StatusResult {
  isRecording: boolean;
  sessionId?: string;
  mode?: 'browser' | 'voice' | 'combined';
  duration?: string;
  durationMs?: number;
  actionCount?: number;
  voiceEnabled?: boolean;
  currentUrl?: string;
  lastSession?: {
    sessionId: string;
    zipPath: string;
    completedAt: string;
  };
}
```

2. **Create server.ts**

```typescript
// src/server.ts
import { McpServer } from '@anthropic-ai/sdk/mcp';
import { RecordingManager } from './recording/RecordingManager';
import {
  startBrowserRecording,
  startVoiceRecording,
  startCombinedRecording,
  stopRecording,
  getRecordingStatus
} from './tools';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'session-recorder',
    version: '1.0.0',
    description: 'Record browser sessions with voice narration via MCP'
  });

  const manager = new RecordingManager();

  // Register tools
  server.addTool({
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
        }
      }
    },
    handler: (input) => startBrowserRecording(manager, input)
  });

  server.addTool({
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
    },
    handler: (input) => startVoiceRecording(manager, input)
  });

  server.addTool({
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
    },
    handler: (input) => startCombinedRecording(manager, input)
  });

  server.addTool({
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
    },
    handler: () => stopRecording(manager)
  });

  server.addTool({
    name: 'get_recording_status',
    description: 'Get current recording status (active/inactive, duration, action count)',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: () => getRecordingStatus(manager)
  });

  return server;
}
```

3. **Create index.ts**

```typescript
// src/index.ts
import { createServer } from './server';

async function main() {
  const server = createServer();

  // Start server
  await server.listen();

  console.log('Session Recorder MCP Server started');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

#### Acceptance Criteria

- [ ] Server starts without errors
- [ ] All 5 tools registered
- [ ] Proper shutdown handling

---

### Task 1.3: MCP Configuration Files (0.5 hours)

**Priority:** MEDIUM

#### Implementation Steps

1. **Create mcp-config.json**

```json
{
  "name": "session-recorder",
  "version": "1.0.0",
  "description": "Record browser sessions with voice narration",
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

2. **Create example Claude Desktop config**

```json
// example-claude-config.json
{
  "mcpServers": {
    "session-recorder": {
      "command": "node",
      "args": ["/path/to/session-recorder-mcp/dist/index.js"],
      "env": {
        "OUTPUT_DIR": "/Users/username/recordings"
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] mcp-config.json created
- [ ] Example config documented

---

### Task 1.4: Test MCP Server Registration (1 hour)

**Priority:** HIGH

#### Implementation Steps

1. **Build the project**

```bash
npm run build
```

2. **Test with MCP inspector**

```bash
npx @anthropic/mcp-inspector dist/index.js
```

3. **Test with Claude Desktop**
   - Add to Claude Desktop config
   - Restart Claude Desktop
   - Verify tools appear in tool list

4. **Create test script**

```typescript
// test/integration.test.ts
import { createServer } from '../src/server';

describe('MCP Server', () => {
  let server: McpServer;

  beforeAll(() => {
    server = createServer();
  });

  it('registers all 5 tools', () => {
    const tools = server.getTools();
    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toContain('start_browser_recording');
    expect(tools.map(t => t.name)).toContain('start_voice_recording');
    expect(tools.map(t => t.name)).toContain('start_combined_recording');
    expect(tools.map(t => t.name)).toContain('stop_recording');
    expect(tools.map(t => t.name)).toContain('get_recording_status');
  });
});
```

#### Acceptance Criteria

- [ ] Server compiles and starts
- [ ] MCP inspector shows all tools
- [ ] Claude Desktop discovers tools

---

## P1-Phase 2: Tool Implementations (5 hours)

**Goal:** Implement all 5 MCP tools with proper error handling
**Deliverable:** Fully functional recording tools

### Task 2.1: RecordingManager Implementation (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create RecordingManager.ts**

```typescript
// src/recording/RecordingManager.ts
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import path from 'path';

// Import SessionRecorder from core package
// Note: In production, this would be: import { SessionRecorder } from '@session-recorder/core';
// For development, use relative path to session-recorder/src/node/SessionRecorder
import { SessionRecorder } from '../../../session-recorder/src/node/SessionRecorder';

import {
  StartBrowserOptions,
  StartVoiceOptions,
  StartCombinedOptions,
  StartResult,
  StopResult,
  StatusResult
} from '../types';

interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  mode: 'browser' | 'voice' | 'combined' | null;
  startTime: Date | null;
  browser: Browser | null;
  page: Page | null;
  recorder: SessionRecorder | null;
}

interface LastSession {
  sessionId: string;
  zipPath: string;
  completedAt: string;
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

  private lastSession: LastSession | null = null;
  private outputDir: string;

  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || path.join(process.cwd(), 'output');
  }

  async startBrowserRecording(options: StartBrowserOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined
      };
    }

    try {
      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `session-${Date.now()}`;

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
        message: 'Browser recording started. Interact with the browser, then call stop_recording when done.',
        browserUrl: options.url || page.url()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start browser recording: ${(error as Error).message}`
      };
    }
  }

  async startVoiceRecording(options: StartVoiceOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined
      };
    }

    try {
      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `voice-${Date.now()}`;

      const recorder = new SessionRecorder(sessionId, {
        browser_record: false,
        voice_record: true,
        whisper_model: options.whisperModel || 'base'
      });

      await recorder.startVoiceOnly();

      this.state = {
        isRecording: true,
        sessionId,
        mode: 'voice',
        startTime: new Date(),
        browser: null,
        page: null,
        recorder
      };

      return {
        success: true,
        sessionId,
        message: 'Voice recording started. Speak clearly, then call stop_recording when done.',
        voiceEnabled: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start voice recording: ${(error as Error).message}`
      };
    }
  }

  async startCombinedRecording(options: StartCombinedOptions): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress. Stop current recording first.',
        activeSessionId: this.state.sessionId || undefined
      };
    }

    try {
      const sessionId = options.title
        ? `${options.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
        : `session-${Date.now()}`;

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
        message: 'Combined recording started. Interact with browser and speak, then call stop_recording when done.',
        browserUrl: options.url || page.url(),
        voiceEnabled: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start combined recording: ${(error as Error).message}`
      };
    }
  }

  async stopRecording(): Promise<StopResult> {
    if (!this.state.isRecording || !this.state.recorder) {
      return {
        success: false,
        error: 'No active recording to stop.'
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
      const sessionData = this.state.recorder.getSessionData();

      // Store last session info
      this.lastSession = {
        sessionId,
        zipPath,
        completedAt: new Date().toISOString()
      };

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
        duration: this.formatDuration(duration),
        summary: {
          actionCount: sessionData.actions?.length || 0,
          voiceSegments: sessionData.voiceRecording?.segmentCount,
          transcriptPreview: sessionData.transcript?.text?.slice(0, 100)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stop recording: ${(error as Error).message}`
      };
    }
  }

  getStatus(): StatusResult {
    if (!this.state.isRecording) {
      return {
        isRecording: false,
        lastSession: this.lastSession || undefined
      };
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
      currentUrl: this.state.page?.url() || undefined
    };
  }

  private async launchBrowser(type: string = 'chromium'): Promise<Browser> {
    // Always launch visible browser - headless makes no sense for recording
    const options = { headless: false };

    switch (type) {
      case 'firefox':
        return await firefox.launch(options);
      case 'webkit':
        return await webkit.launch(options);
      default:
        return await chromium.launch(options);
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }
    return `${remainingMinutes}m ${remainingSeconds}s`;
  }
}
```

#### Acceptance Criteria

- [ ] RecordingManager handles all recording modes
- [ ] Proper state management between start/stop
- [ ] Error handling for all failure scenarios
- [ ] Last session tracking for status reporting

---

### Task 2.2: Tool Handlers (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create tools/index.ts**

```typescript
// src/tools/index.ts
import { RecordingManager } from '../recording/RecordingManager';
import {
  StartBrowserOptions,
  StartVoiceOptions,
  StartCombinedOptions
} from '../types';

export async function startBrowserRecording(
  manager: RecordingManager,
  input: StartBrowserOptions
) {
  const result = await manager.startBrowserRecording(input);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function startVoiceRecording(
  manager: RecordingManager,
  input: StartVoiceOptions
) {
  const result = await manager.startVoiceRecording(input);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function startCombinedRecording(
  manager: RecordingManager,
  input: StartCombinedOptions
) {
  const result = await manager.startCombinedRecording(input);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function stopRecording(manager: RecordingManager) {
  const result = await manager.stopRecording();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function getRecordingStatus(manager: RecordingManager) {
  const result = manager.getStatus();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}
```

#### Acceptance Criteria

- [ ] All 5 tool handlers implemented
- [ ] Proper JSON response formatting
- [ ] Error responses included in output

---

### Task 2.3: Error Handling Enhancement (1 hour)

**Priority:** MEDIUM

#### Implementation Steps

1. **Add dependency checking**

```typescript
// src/utils/checkDependencies.ts
import { execSync } from 'child_process';

export function checkPythonInstalled(): boolean {
  try {
    execSync('python3 --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function checkWhisperInstalled(): boolean {
  try {
    execSync('python3 -c "import whisper"', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function checkPlaywrightBrowsers(): { chromium: boolean; firefox: boolean; webkit: boolean } {
  // Check if browsers are installed
  // This is a simplified check
  return {
    chromium: true,
    firefox: true,
    webkit: process.platform === 'darwin' // WebKit only works well on macOS
  };
}
```

2. **Add to RecordingManager**

```typescript
// In startVoiceRecording and startCombinedRecording:
if (!checkPythonInstalled()) {
  return {
    success: false,
    error: 'Python 3.8+ is required for voice recording. Please install Python first.'
  };
}

if (!checkWhisperInstalled()) {
  return {
    success: false,
    error: 'OpenAI Whisper is required. Run: pip install openai-whisper'
  };
}
```

#### Acceptance Criteria

- [ ] Dependency checks before voice recording
- [ ] Clear error messages for missing dependencies
- [ ] Browser availability checks

---

## P1-Phase 3: Integration & Testing (3 hours)

**Goal:** Comprehensive testing and Claude Desktop integration
**Deliverable:** Production-ready MCP server

### Task 3.1: Integration Tests (1.5 hours)

**Priority:** HIGH

#### Test Scenarios

1. **Tool Registration Tests**

```typescript
describe('Tool Registration', () => {
  it('registers all 5 required tools', () => {
    const server = createServer();
    const tools = server.getTools();

    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toEqual([
      'start_browser_recording',
      'start_voice_recording',
      'start_combined_recording',
      'stop_recording',
      'get_recording_status'
    ]);
  });
});
```

2. **Recording Flow Tests**

```typescript
describe('Recording Flow', () => {
  let manager: RecordingManager;

  beforeEach(() => {
    manager = new RecordingManager();
  });

  afterEach(async () => {
    // Cleanup any active recordings
    if (manager.getStatus().isRecording) {
      await manager.stopRecording();
    }
  });

  it('starts browser recording', async () => {
    const result = await manager.startBrowserRecording({
      url: 'https://example.com'
    });

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
  });

  it('prevents multiple concurrent recordings', async () => {
    await manager.startBrowserRecording({ url: 'https://example.com' });

    const result = await manager.startBrowserRecording({
      url: 'https://google.com'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already in progress');
  });

  it('stops recording and creates zip', async () => {
    await manager.startBrowserRecording({ url: 'https://example.com' });

    const result = await manager.stopRecording();

    expect(result.success).toBe(true);
    expect(result.zipPath).toBeDefined();
    expect(result.viewerUrl).toBeDefined();
  });

  it('reports status correctly', async () => {
    // Before recording
    let status = manager.getStatus();
    expect(status.isRecording).toBe(false);

    // During recording
    await manager.startBrowserRecording({ url: 'https://example.com' });
    status = manager.getStatus();
    expect(status.isRecording).toBe(true);
    expect(status.mode).toBe('browser');

    // After recording
    await manager.stopRecording();
    status = manager.getStatus();
    expect(status.isRecording).toBe(false);
    expect(status.lastSession).toBeDefined();
  });
});
```

3. **Error Handling Tests**

```typescript
describe('Error Handling', () => {
  it('handles stop without active recording', async () => {
    const manager = new RecordingManager();
    const result = await manager.stopRecording();

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active recording');
  });

  it('handles invalid browser type gracefully', async () => {
    const manager = new RecordingManager();
    const result = await manager.startBrowserRecording({
      browserType: 'invalid' as any
    });

    // Should fall back to chromium
    expect(result.success).toBe(true);
  });
});
```

#### Acceptance Criteria

- [ ] All test scenarios pass
- [ ] Edge cases covered
- [ ] Error handling verified

---

### Task 3.2: Claude Desktop Testing (1 hour)

**Priority:** HIGH

#### Manual Test Checklist

1. **Configuration**
   - [ ] Add MCP server to Claude Desktop config
   - [ ] Restart Claude Desktop
   - [ ] Verify tools appear in tools list

2. **Tool Invocations**
   - [ ] "Start recording my browser session" → Browser opens
   - [ ] "Record my browser and voice" → Browser + mic active
   - [ ] "Am I still recording?" → Status returned
   - [ ] "Stop recording" → Zip created, URL returned
   - [ ] "Just record my voice" → Voice only recording

3. **Error Scenarios**
   - [ ] Start recording twice → Error message
   - [ ] Stop without active recording → Error message
   - [ ] Voice recording without Python → Clear error

4. **Output Verification**
   - [ ] Zip file created in output directory
   - [ ] Viewer URL opens correctly
   - [ ] Session data includes all actions

---

### Task 3.3: Documentation (0.5 hours)

**Priority:** MEDIUM

#### Documents to Create

1. **README.md**

```markdown
# Session Recorder MCP Server

Record browser sessions with voice narration via Claude Code and other MCP-compatible AI assistants.

## Installation

```bash
npm install -g @anthropic/session-recorder-mcp
```

## Configuration

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "session-recorder": {
      "command": "npx",
      "args": ["-y", "@anthropic/session-recorder-mcp"],
      "env": {
        "OUTPUT_DIR": "/path/to/recordings"
      }
    }
  }
}
```

## Usage

Simply ask Claude to record your browser:

- "Record my browser session testing the login flow"
- "Record my screen and voice while I demo this feature"
- "Am I still recording?"
- "Stop recording"

## Tools

| Tool | Description |
|------|-------------|
| start_browser_recording | Record browser actions only |
| start_voice_recording | Record voice narration only |
| start_combined_recording | Record both browser and voice |
| stop_recording | Stop and save the recording |
| get_recording_status | Check if recording is active |

## Requirements

- Node.js 18+
- Python 3.8+ (for voice recording)
- `pip install openai-whisper` (for voice transcription)
```

#### Acceptance Criteria

- [ ] README.md created
- [ ] Installation instructions clear
- [ ] Usage examples provided

---

# Session Query (Phase 2)

Phase 2 adds 12 MCP tools that enable AI assistants to search and analyze recorded sessions for documentation, testing, and bug report generation.

**Prerequisites:** Screenshot Description button must be implemented in Session Editor first.

---

## P2-Phase 0: Prerequisites (Session Editor)

**Goal:** Enable screenshot descriptions for text-only AI search
**Deliverable:** Session Editor can add descriptions to actions

### Task P2-0.1: Add Description Field to Types (0.5 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Update types/session.ts**

```typescript
interface RecordedAction {
  // ... existing fields
  description?: string;  // Human-written description of screenshot
}
```

#### Acceptance Criteria

- [ ] `description` field added to RecordedAction interface
- [ ] TypeScript compiles without errors

---

### Task P2-0.2: Describe Button UI (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Add button to ActionList.tsx**

```typescript
// In action item render
<button
  onClick={() => openDescriptionModal(action)}
  className="describe-btn"
  title="Add description"
>
  📝
</button>
```

2. **Create DescriptionModal.tsx**

```typescript
interface DescriptionModalProps {
  action: RecordedAction;
  onSave: (description: string) => void;
  onClose: () => void;
}

export function DescriptionModal({ action, onSave, onClose }: DescriptionModalProps) {
  const [text, setText] = useState(action.description || '');

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Describe Screenshot</h3>
        <img src={action.before?.screenshot} alt="Screenshot" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what's shown in this screenshot..."
        />
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onSave(text)}>Save</button>
        </div>
      </div>
    </div>
  );
}
```

#### Acceptance Criteria

- [ ] Describe button appears on each action
- [ ] Modal shows screenshot and text input
- [ ] Description can be saved

---

### Task P2-0.3: Persist Descriptions (1.5 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Add EditDescriptionOperation to editOperations.ts**

```typescript
interface EditDescriptionOperation {
  type: 'edit_description';
  actionId: string;
  description: string;
  previousDescription?: string;
  timestamp: string;
}
```

2. **Save to IndexedDB via existing edit system**

3. **Apply descriptions when loading session**

#### Acceptance Criteria

- [ ] Descriptions persist across page reloads
- [ ] Undo/redo works for description edits
- [ ] Descriptions included in export

---

## P2-Phase 1: MCP Server Integration (6 hours) ✅ Complete

**Goal:** Add HTTP MCP endpoint to viewer Express server
**Deliverable:** MCP server responding to tool calls

> **Implementation Note:** Created standalone MCP server in `mcp-server/` using `@modelcontextprotocol/sdk` with stdio transport instead of HTTP integration with viewer. This approach is simpler and works directly with Claude Code.

### Task P2-1.1: MCP Protocol Handler (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create viewer/src/server/mcp.ts**

```typescript
import { Router } from 'express';
import { SessionStore } from './sessionStore';
import * as tools from './tools';

export function createMcpRouter(store: SessionStore): Router {
  const router = Router();

  router.post('/mcp', async (req, res) => {
    const { method, params } = req.body;

    try {
      const handler = tools[method];
      if (!handler) {
        return res.status(404).json({ error: `Unknown tool: ${method}` });
      }

      const result = await handler(store, params);
      res.json({ result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tool discovery endpoint
  router.get('/mcp/tools', (req, res) => {
    res.json({ tools: tools.getToolSchemas() });
  });

  return router;
}
```

2. **Add to viewer server.ts**

```typescript
import { createMcpRouter } from './server/mcp';

const mcpRouter = createMcpRouter(sessionStore);
app.use(mcpRouter);
```

#### Acceptance Criteria

- [ ] POST /mcp endpoint accepts tool calls
- [ ] GET /mcp/tools returns tool schemas
- [ ] Error responses are properly formatted

---

### Task P2-1.2: Session Store (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create viewer/src/server/sessionStore.ts**

```typescript
import JSZip from 'jszip';
import { Session, RecordedAction } from '../types';

interface LoadedSession {
  sessionId: string;
  session: Session;
  zip: JSZip;
  loadedAt: Date;
}

export class SessionStore {
  private sessions: Map<string, LoadedSession> = new Map();
  private maxSessions = 5;

  async load(path: string): Promise<LoadedSession> {
    // Check cache
    const existing = this.sessions.get(path);
    if (existing) {
      existing.loadedAt = new Date();
      return existing;
    }

    // Load zip
    const fs = await import('fs/promises');
    const data = await fs.readFile(path);
    const zip = await JSZip.loadAsync(data);

    // Parse session.json
    const sessionJson = await zip.file('session.json')?.async('string');
    if (!sessionJson) throw new Error('Invalid session.zip: missing session.json');

    const session: Session = JSON.parse(sessionJson);

    // Evict oldest if at capacity
    if (this.sessions.size >= this.maxSessions) {
      this.evictOldest();
    }

    const loaded: LoadedSession = {
      sessionId: session.id,
      session,
      zip,
      loadedAt: new Date()
    };

    this.sessions.set(path, loaded);
    return loaded;
  }

  get(sessionId: string): LoadedSession | undefined {
    for (const [, session] of this.sessions) {
      if (session.sessionId === sessionId) return session;
    }
    return undefined;
  }

  unload(sessionId: string): boolean {
    for (const [path, session] of this.sessions) {
      if (session.sessionId === sessionId) {
        this.sessions.delete(path);
        return true;
      }
    }
    return false;
  }

  private evictOldest(): void {
    let oldest: [string, LoadedSession] | null = null;
    for (const entry of this.sessions) {
      if (!oldest || entry[1].loadedAt < oldest[1].loadedAt) {
        oldest = entry;
      }
    }
    if (oldest) {
      this.sessions.delete(oldest[0]);
    }
  }
}
```

#### Acceptance Criteria

- [ ] Sessions load from zip files
- [ ] LRU eviction when at capacity
- [ ] Sessions accessible by sessionId

---

### Task P2-1.3: Tool Schema Registration (2 hours)

**Priority:** MEDIUM

#### Implementation Steps

1. **Create viewer/src/server/tools/index.ts**

```typescript
export const toolSchemas = [
  {
    name: 'session_load',
    description: 'Load a session.zip into memory for querying',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to session.zip file' }
      },
      required: ['path']
    }
  },
  {
    name: 'session_search',
    description: 'Full-text search across all text content in session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        query: { type: 'string' },
        searchIn: {
          type: 'array',
          items: { type: 'string', enum: ['transcript', 'descriptions', 'notes', 'values', 'urls'] }
        },
        limit: { type: 'number', default: 10 }
      },
      required: ['sessionId', 'query']
    }
  },
  // ... all 12 tools
];

export function getToolSchemas() {
  return toolSchemas;
}
```

#### Acceptance Criteria

- [ ] All 12 tool schemas defined
- [ ] Schemas include descriptions and input validation
- [ ] GET /mcp/tools returns all schemas

---

## P2-Phase 2: Query Tools Implementation (8 hours) ✅ Complete

**Goal:** Implement all 12 session query tools
**Deliverable:** Fully functional query API

> **Implementation Note:** Implemented 13 tools total in `mcp-server/src/tools/`: session.ts (session_load, session_unload, session_get_summary), search.ts (session_search, session_search_network, session_search_console), navigation.ts (session_get_actions, session_get_action, session_get_range, session_get_urls, session_get_context), context.ts (session_get_timeline, session_get_errors)

### Task P2-2.1: Core Tools - load, search, summary (3 hours)

**Priority:** HIGH

#### session_load

```typescript
export async function session_load(store: SessionStore, params: { path: string }) {
  const loaded = await store.load(params.path);
  const { session } = loaded;

  // Calculate summary stats
  const actionCounts = { clicks: 0, inputs: 0, navigations: 0 };
  for (const action of session.actions) {
    if (action.type === 'click') actionCounts.clicks++;
    if (action.type === 'input') actionCounts.inputs++;
    if (action.type === 'navigation') actionCounts.navigations++;
  }

  // Get unique URLs (max 20)
  const urls = [...new Set(session.actions.map(a => a.url || '').filter(Boolean))].slice(0, 20);

  return {
    sessionId: session.id,
    duration: calculateDuration(session),
    actionCount: session.actions.length,
    hasVoice: !!session.transcript,
    hasDescriptions: session.actions.some(a => a.description),
    hasNotes: session.actions.some(a => a.type === 'note'),
    urls,
    summary: {
      ...actionCounts,
      voiceSegments: session.transcript?.segments?.length || 0
    }
  };
}
```

#### session_search

```typescript
export async function session_search(
  store: SessionStore,
  params: { sessionId: string; query: string; searchIn?: string[]; limit?: number }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const { session } = loaded;
  const results: SearchResult[] = [];
  const searchIn = params.searchIn || ['transcript', 'descriptions', 'notes', 'values', 'urls'];
  const limit = Math.min(params.limit || 10, 50);
  const queryLower = params.query.toLowerCase();

  for (let i = 0; i < session.actions.length && results.length < limit; i++) {
    const action = session.actions[i];

    // Search descriptions
    if (searchIn.includes('descriptions') && action.description?.toLowerCase().includes(queryLower)) {
      results.push(createSearchResult(action, i, 'description', action.description, queryLower));
    }

    // Search values
    if (searchIn.includes('values') && action.value?.toLowerCase().includes(queryLower)) {
      results.push(createSearchResult(action, i, 'value', action.value, queryLower));
    }

    // Search URLs
    if (searchIn.includes('urls') && action.url?.toLowerCase().includes(queryLower)) {
      results.push(createSearchResult(action, i, 'url', action.url, queryLower));
    }
  }

  // Search transcript
  if (searchIn.includes('transcript') && session.transcript) {
    for (const segment of session.transcript.segments) {
      if (results.length >= limit) break;
      if (segment.text.toLowerCase().includes(queryLower)) {
        results.push(createTranscriptResult(segment, queryLower, session.actions));
      }
    }
  }

  return results;
}
```

#### Acceptance Criteria

- [ ] session_load returns session overview
- [ ] session_search finds matches in all text fields
- [ ] Results include highlighted matches

---

### Task P2-2.2: Navigation Tools - actions, action, range, urls (2.5 hours)

**Priority:** HIGH

#### Implementation

```typescript
// session_get_actions
export async function session_get_actions(
  store: SessionStore,
  params: { sessionId: string; types?: string[]; url?: string; startIndex?: number; limit?: number }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  let actions = loaded.session.actions;

  // Filter by types
  if (params.types?.length) {
    actions = actions.filter(a => params.types!.includes(a.type));
  }

  // Filter by URL
  if (params.url) {
    actions = actions.filter(a => a.url?.includes(params.url!));
  }

  // Pagination
  const startIndex = params.startIndex || 0;
  const limit = Math.min(params.limit || 20, 100);
  const paginated = actions.slice(startIndex, startIndex + limit);

  return {
    total: actions.length,
    returned: paginated.length,
    actions: paginated.map((a, i) => createActionSummary(a, startIndex + i))
  };
}

// session_get_action
export async function session_get_action(
  store: SessionStore,
  params: { sessionId: string; actionId: string }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const action = loaded.session.actions.find(a => a.id === params.actionId);
  if (!action) throw new Error(`Action not found: ${params.actionId}`);

  return createActionDetail(action, loaded.session);
}

// session_get_range
export async function session_get_range(
  store: SessionStore,
  params: { sessionId: string; startId: string; endId: string }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const { actions } = loaded.session;
  const startIdx = actions.findIndex(a => a.id === params.startId);
  const endIdx = actions.findIndex(a => a.id === params.endId);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Invalid action ID range');
  }

  const rangeActions = actions.slice(startIdx, endIdx + 1);

  return {
    actions: rangeActions.map(a => createActionDetail(a, loaded.session)),
    combinedTranscript: getCombinedTranscript(loaded.session, rangeActions),
    combinedNotes: rangeActions.filter(a => a.type === 'note').map(a => a.note?.content || ''),
    descriptions: rangeActions.map(a => a.description).filter(Boolean),
    urls: [...new Set(rangeActions.map(a => a.url).filter(Boolean))],
    duration: calculateRangeDuration(rangeActions)
  };
}

// session_get_urls
export async function session_get_urls(store: SessionStore, params: { sessionId: string }) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const urlMap = new Map<string, UrlFlow>();

  loaded.session.actions.forEach((action, index) => {
    if (!action.url) return;

    const existing = urlMap.get(action.url);
    if (existing) {
      existing.lastVisitIndex = index;
      existing.visitCount++;
      existing.actionCount++;
    } else {
      urlMap.set(action.url, {
        url: action.url,
        firstVisitIndex: index,
        lastVisitIndex: index,
        visitCount: 1,
        actionCount: 1,
        description: action.description
      });
    }
  });

  return Array.from(urlMap.values());
}
```

#### Acceptance Criteria

- [ ] session_get_actions supports filtering and pagination
- [ ] session_get_action returns full action details
- [ ] session_get_range returns combined context
- [ ] session_get_urls maps navigation structure

---

### Task P2-2.3: Context Tools - timeline, context, errors (1.5 hours)

**Priority:** MEDIUM

#### Implementation

```typescript
// session_get_timeline
export async function session_get_timeline(
  store: SessionStore,
  params: { sessionId: string; startTime?: string; endTime?: string; limit?: number; offset?: number }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const entries: TimelineEntry[] = [];

  // Add actions
  for (const action of loaded.session.actions) {
    entries.push({
      type: 'action',
      id: action.id,
      timestamp: action.timestamp,
      summary: createActionSummaryText(action)
    });
  }

  // Add voice segments
  if (loaded.session.transcript?.segments) {
    for (const segment of loaded.session.transcript.segments) {
      entries.push({
        type: 'voice',
        id: segment.id || `voice-${segment.start}`,
        timestamp: segment.timestamp,
        summary: `Said: "${segment.text.slice(0, 50)}..."`
      });
    }
  }

  // Sort by timestamp
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Apply pagination
  const offset = params.offset || 0;
  const limit = Math.min(params.limit || 50, 200);

  return {
    total: entries.length,
    entries: entries.slice(offset, offset + limit)
  };
}

// session_get_errors
export async function session_get_errors(store: SessionStore, params: { sessionId: string }) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  const consoleErrors = (loaded.session.console || [])
    .filter(c => c.level === 'error' || c.level === 'warn')
    .map(c => ({
      level: c.level,
      message: c.message.slice(0, 200),
      timestamp: c.timestamp,
      nearestActionId: findNearestAction(loaded.session.actions, c.timestamp)
    }));

  const networkErrors = (loaded.session.network || [])
    .filter(n => n.status >= 400)
    .map(n => ({
      url: n.url,
      method: n.method,
      status: n.status,
      statusText: n.statusText,
      timestamp: n.timestamp,
      nearestActionId: findNearestAction(loaded.session.actions, n.timestamp)
    }));

  return {
    console: consoleErrors,
    network: networkErrors,
    total: consoleErrors.length + networkErrors.length
  };
}
```

#### Acceptance Criteria

- [ ] session_get_timeline interleaves actions and voice
- [ ] session_get_context returns surrounding actions
- [ ] session_get_errors finds console and network errors

---

### Task P2-2.4: Search Tools - network, console (1 hour)

**Priority:** LOW

#### Implementation

```typescript
// session_search_network
export async function session_search_network(
  store: SessionStore,
  params: { sessionId: string; urlPattern?: string; method?: string; status?: number; limit?: number }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  let requests = loaded.session.network || [];

  if (params.urlPattern) {
    const pattern = new RegExp(params.urlPattern, 'i');
    requests = requests.filter(r => pattern.test(r.url));
  }

  if (params.method) {
    requests = requests.filter(r => r.method === params.method.toUpperCase());
  }

  if (params.status) {
    requests = requests.filter(r => r.status === params.status);
  }

  const limit = Math.min(params.limit || 20, 50);

  return requests.slice(0, limit).map(r => ({
    url: r.url,
    method: r.method,
    status: r.status,
    contentType: r.contentType,
    size: r.size,
    timing: { total: r.timing?.total || 0 },
    nearestActionId: findNearestAction(loaded.session.actions, r.timestamp)
  }));
}

// session_search_console
export async function session_search_console(
  store: SessionStore,
  params: { sessionId: string; level?: string; pattern?: string; limit?: number }
) {
  const loaded = store.get(params.sessionId);
  if (!loaded) throw new Error(`Session not loaded: ${params.sessionId}`);

  let logs = loaded.session.console || [];

  if (params.level) {
    logs = logs.filter(l => l.level === params.level);
  }

  if (params.pattern) {
    const pattern = new RegExp(params.pattern, 'i');
    logs = logs.filter(l => pattern.test(l.message));
  }

  const limit = Math.min(params.limit || 20, 50);

  return logs.slice(0, limit).map(l => ({
    level: l.level,
    message: l.message.slice(0, 300),
    timestamp: l.timestamp,
    nearestActionId: findNearestAction(loaded.session.actions, l.timestamp)
  }));
}
```

#### Acceptance Criteria

- [ ] session_search_network filters by URL, method, status
- [ ] session_search_console filters by level and pattern
- [ ] Both return nearest action for context

---

## P2-Phase 3: Testing & Docs (2 hours) ✅ Complete

**Goal:** Test MCP tools and document usage
**Deliverable:** Tested and documented MCP server

> **Implementation Note:** Created `mcp-server/src/test.ts` which successfully tested all 13 tools against session-1765433976846. Results: 737 actions, 411 voice segments, 5 search results for "calendar", 4525 timeline entries, 3788 console errors, 10 network errors.

### Task P2-3.1: Integration Tests (1 hour)

**Priority:** HIGH

#### Test Scenarios

```typescript
describe('Session Query MCP', () => {
  let store: SessionStore;

  beforeAll(async () => {
    store = new SessionStore();
    await store.load('./test/fixtures/sample-session.zip');
  });

  describe('session_load', () => {
    it('returns session overview', async () => {
      const result = await session_load(store, { path: './test/fixtures/sample-session.zip' });

      expect(result.sessionId).toBeDefined();
      expect(result.actionCount).toBeGreaterThan(0);
      expect(result.urls).toBeInstanceOf(Array);
    });
  });

  describe('session_search', () => {
    it('finds matches in descriptions', async () => {
      const result = await session_search(store, {
        sessionId: 'test-session',
        query: 'login',
        searchIn: ['descriptions']
      });

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ... more tests
});
```

#### Acceptance Criteria

- [ ] All 12 tools have tests
- [ ] Edge cases covered (empty results, invalid IDs)
- [ ] Performance tests for large sessions

---

### Task P2-3.2: Documentation (1 hour)

**Priority:** MEDIUM

#### Documents to Update

1. **Update README with MCP usage**

```markdown
## Session Query MCP Server

Query recorded sessions via AI assistants.

### Claude Code Configuration

Add to your MCP settings:

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

### Example Prompts

- "Load the session at /recordings/login-flow.zip and show me a summary"
- "Search for 'checkout' in the session transcript and descriptions"
- "Get all errors from this session"
- "Show me actions 10-20 from the session"
```

2. **Create AI workflow examples**

#### Acceptance Criteria

- [ ] MCP configuration documented
- [ ] Example prompts provided
- [ ] AI workflow examples complete

---

## Summary

### Total Estimated Effort: 28 hours

| Phase | Hours | Priority |
|-------|-------|----------|
| Recording Control P1-Phase 1 | 4 | HIGH |
| Recording Control P1-Phase 2 | 5 | HIGH |
| Recording Control P1-Phase 3 | 3 | HIGH |
| Session Query P2-Phase 0 (Prerequisites) | 4 | HIGH |
| Session Query P2-Phase 1 | 6 | HIGH |
| Session Query P2-Phase 2 | 8 | HIGH |
| Session Query P2-Phase 3 | 2 | MEDIUM |

### Tools Summary

| Phase | Tool Count | Description |
|-------|------------|-------------|
| Recording Control | 5 | Start/stop recording via AI |
| Session Query | 12 | Search and analyze sessions |
| **Total** | **17** | |

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: MCP Server Setup | 4 | HIGH |
| Phase 2: Tool Implementations | 5 | HIGH |
| Phase 3: Integration & Testing | 3 | HIGH |

### Files Created

```
session-recorder-mcp/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── tools/
│   │   └── index.ts
│   ├── recording/
│   │   └── RecordingManager.ts
│   ├── utils/
│   │   └── checkDependencies.ts
│   └── types/
│       └── index.ts
├── test/
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── mcp-config.json
└── README.md
```

### Success Metrics

| Metric | Target |
|--------|--------|
| MCP tool response time | <500ms |
| Recording start time | <3 seconds |
| Claude Desktop compatibility | 100% |
| Tool invocation success rate | >99% |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial task breakdown for MCP Server |
| 1.1 | 2025-12-10 | Updated to follow template, added Table of Contents |
| 2.0 | 2025-12-11 | Phase 2 (Session Query) complete - 13 tools implemented in mcp-server/ |
| 3.0 | 2025-12-11 | Phase 1 (Recording Control) complete - 5 tools added: RecordingManager.ts, tools/recording.ts |
| 3.1 | 2025-12-11 | Removed headless option from recording tools - browser always visible during recording |
