# TASKS-MCP: MCP Server Implementation Tasks

**Related PRD:** [PRD-MCP.md](./PRD-MCP.md)
**Status:** Not Started
**Total Estimated Time:** 12 hours
**Dependencies:** Voice Recording (PRD-4 Phase 1-2) should be complete first

---

## Overview

This document breaks down the MCP Server implementation into actionable tasks. The MCP Server enables AI coding assistants to control session recording through natural language commands.

---

## Phase 1: MCP Server Setup (4 hours)

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
  headless?: boolean;
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
        },
        headless: {
          type: 'boolean',
          description: 'Run browser in headless mode (default: false)'
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

## Phase 2: Tool Implementations (5 hours)

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

      const browser = await this.launchBrowser(options.browserType, options.headless);
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

      const browser = await this.launchBrowser(options.browserType, options.headless);
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

  private async launchBrowser(
    type: string = 'chromium',
    headless: boolean = false
  ): Promise<Browser> {
    const options = { headless };

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

## Phase 3: Integration & Testing (3 hours)

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

## Summary

### Total Estimated Effort: 12 hours

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
