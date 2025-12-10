# TASKS-DESKTOP: Desktop Application Implementation Tasks

**PRD:** [PRD-DESKTOP.md](./PRD-DESKTOP.md)
**Last Updated:** 2025-12-10
**Overall Status:** ❌ Not Started (0/20h Complete)

---

## Table of Contents

- [Overview](#overview)
- [Phase 1: Core Electron App](#phase-1-core-electron-app-4-hours)
- [Phase 2: Recording Integration](#phase-2-recording-integration-5-hours)
- [Phase 3: UI Polish](#phase-3-ui-polish-4-hours)
- [Phase 4: System Integration](#phase-4-system-integration-4-hours)
- [Phase 5: Testing & Distribution](#phase-5-testing--distribution-3-hours)
- [Summary](#summary)
- [Document Change Log](#document-change-log)

---

## Overview

This document breaks down the Desktop Application implementation into actionable tasks. The Desktop App enables non-technical users to record browser sessions with voice narration through a user-friendly interface.

---

## Phase 1: Core Electron App (4 hours)

**Goal:** Initialize Electron project with proper configuration
**Deliverable:** Basic Electron app that launches and displays UI

### Task 1.1: Initialize Project Structure (1.5 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create project directory and initialize**

```bash
mkdir session-recorder-desktop
cd session-recorder-desktop
npm init -y
```

2. **Install dependencies**

```bash
# Core dependencies
npm install electron playwright archiver
npm install react react-dom zustand

# Dev dependencies
npm install --save-dev typescript @types/react @types/node
npm install --save-dev vite @vitejs/plugin-react
npm install --save-dev electron-builder electron-vite
npm install --save-dev rimraf concurrently
```

3. **Create directory structure**

```
session-recorder-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── recording/
│   │   ├── tray/
│   │   └── ipc/
│   ├── renderer/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── stores/
│   │   └── styles/
│   └── shared/
│       └── types.ts
├── assets/
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
├── build/
│   └── entitlements.mac.plist
├── electron-builder.yml
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

4. **Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./out",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out", "dist"]
}
```

5. **Create electron.vite.config.ts**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
});
```

6. **Update package.json**

```json
{
  "name": "session-recorder-desktop",
  "version": "1.0.0",
  "description": "Record browser sessions with voice narration",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "dist": "npm run build && electron-builder",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux"
  },
  "keywords": ["electron", "session-recorder", "playwright"],
  "license": "MIT"
}
```

#### Acceptance Criteria

- [ ] Project structure created
- [ ] All dependencies installed
- [ ] TypeScript configuration working
- [ ] Vite configuration working

---

### Task 1.2: Main Process Setup (1 hour)

**Priority:** HIGH

#### Implementation Steps

1. **Create shared/types.ts**

```typescript
// src/shared/types.ts
export type RecordingMode = 'browser' | 'voice' | 'combined';
export type BrowserType = 'chromium' | 'firefox' | 'webkit';
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface RecordingConfig {
  title: string;
  mode: RecordingMode;
  browserType: BrowserType;
  startUrl?: string;
  whisperModel?: WhisperModel;
}

export interface StartResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  message?: string;
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

export interface RecordingStatus {
  isRecording: boolean;
  sessionId?: string;
  mode?: RecordingMode;
  duration?: string;
  durationMs?: number;
  actionCount?: number;
  voiceEnabled?: boolean;
  currentUrl?: string;
}

export interface RecordingUpdate {
  isRecording: boolean;
  duration?: string;
  actionCount?: number;
  voiceLevel?: number;
  currentUrl?: string;
}

export interface Recording {
  id: string;
  title: string;
  zipPath: string;
  createdAt: string;
  duration: string;
  actionCount: number;
  mode: RecordingMode;
  hasVoice: boolean;
}

export interface Settings {
  outputDir: string;
  defaultBrowser: BrowserType;
  whisperModel: WhisperModel;
  startMinimized: boolean;
  showNotifications: boolean;
  autoOpenViewer: boolean;
}
```

2. **Create main/main.ts**

```typescript
// src/main/main.ts
import { app, BrowserWindow, ipcMain, shell, dialog, Notification } from 'electron';
import path from 'path';
import { RecordingManager } from './recording/RecordingManager';
import { TrayManager } from './tray/TrayManager';
import { setupIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let recordingManager: RecordingManager;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    minWidth: 400,
    minHeight: 600,
    resizable: true,
    show: false, // Show when ready
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  });

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close - minimize to tray
  mainWindow.on('close', (e) => {
    if (process.platform !== 'darwin' && trayManager) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

async function init() {
  // Initialize recording manager
  recordingManager = new RecordingManager();

  await app.whenReady();

  await createWindow();

  // Create system tray
  trayManager = new TrayManager(recordingManager, mainWindow!);
  trayManager.createTray();

  // Setup IPC handlers
  setupIpcHandlers(recordingManager, mainWindow!);

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
}

// Quit when all windows closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', async () => {
  // Stop any active recording
  if (recordingManager.isRecording()) {
    await recordingManager.stopRecording();
  }
});

init();
```

3. **Create main/preload.ts**

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type {
  RecordingConfig,
  StartResult,
  StopResult,
  RecordingStatus,
  RecordingUpdate,
  Recording,
  Settings
} from '../shared/types';

// Type for the API we expose to renderer
declare global {
  interface Window {
    recording: RecordingAPI;
  }
}

export interface RecordingAPI {
  // Recording controls
  startRecording: (config: RecordingConfig) => Promise<StartResult>;
  stopRecording: () => Promise<StopResult>;
  getStatus: () => Promise<RecordingStatus>;

  // Recording events
  onRecordingUpdate: (callback: (update: RecordingUpdate) => void) => () => void;
  onRecordingComplete: (callback: (result: StopResult) => void) => () => void;

  // File operations
  openInViewer: (zipPath: string) => Promise<void>;
  showInFolder: (zipPath: string) => Promise<void>;
  getRecentRecordings: () => Promise<Recording[]>;
  deleteRecording: (id: string) => Promise<boolean>;

  // Settings
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  selectOutputDirectory: () => Promise<string | null>;

  // Platform info
  platform: NodeJS.Platform;
}

const api: RecordingAPI = {
  // Recording controls
  startRecording: (config) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getStatus: () => ipcRenderer.invoke('get-status'),

  // Recording events
  onRecordingUpdate: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, update: RecordingUpdate) => callback(update);
    ipcRenderer.on('recording-update', handler);
    return () => ipcRenderer.removeListener('recording-update', handler);
  },
  onRecordingComplete: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, result: StopResult) => callback(result);
    ipcRenderer.on('recording-complete', handler);
    return () => ipcRenderer.removeListener('recording-complete', handler);
  },

  // File operations
  openInViewer: (zipPath) => ipcRenderer.invoke('open-in-viewer', zipPath),
  showInFolder: (zipPath) => ipcRenderer.invoke('show-in-folder', zipPath),
  getRecentRecordings: () => ipcRenderer.invoke('get-recent-recordings'),
  deleteRecording: (id) => ipcRenderer.invoke('delete-recording', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),

  // Platform info
  platform: process.platform
};

contextBridge.exposeInMainWorld('recording', api);
```

#### Acceptance Criteria

- [ ] Main process starts correctly
- [ ] Window created with proper configuration
- [ ] Preload script exposes API
- [ ] Type definitions working

---

### Task 1.3: Renderer Setup (1 hour)

**Priority:** HIGH

#### Implementation Steps

1. **Create renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
  <title>Session Recorder</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

2. **Create renderer/index.tsx**

```typescript
// src/renderer/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

3. **Create renderer/App.tsx (basic)**

```typescript
// src/renderer/App.tsx
import React, { useState, useEffect } from 'react';
import type { RecordingConfig, StopResult, RecordingUpdate } from '../shared/types';

type AppState = 'idle' | 'recording' | 'processing' | 'complete';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [recordingResult, setRecordingResult] = useState<StopResult | null>(null);

  useEffect(() => {
    const unsubUpdate = window.recording.onRecordingUpdate((update) => {
      if (update.isRecording && state !== 'recording') {
        setState('recording');
      }
    });

    const unsubComplete = window.recording.onRecordingComplete((result) => {
      setRecordingResult(result);
      setState('complete');
    });

    return () => {
      unsubUpdate();
      unsubComplete();
    };
  }, [state]);

  return (
    <div className="app">
      <header>
        <h1>🎬 Session Recorder</h1>
      </header>

      <main>
        {state === 'idle' && <p>Ready to record</p>}
        {state === 'recording' && <p>Recording...</p>}
        {state === 'processing' && <p>Processing...</p>}
        {state === 'complete' && <p>Complete!</p>}
      </main>
    </div>
  );
}
```

4. **Create renderer/styles/app.css**

```css
/* src/renderer/styles/app.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #2c3e50;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}
```

5. **Test development build**

```bash
npm run dev
```

#### Acceptance Criteria

- [ ] Renderer loads correctly
- [ ] React renders without errors
- [ ] CSS styling applies
- [ ] Dev server hot reloads

---

### Task 1.4: Build Configuration (0.5 hours)

**Priority:** MEDIUM

#### Implementation Steps

1. **Create electron-builder.yml**

```yaml
# electron-builder.yml
appId: com.anthropic.session-recorder
productName: Session Recorder
copyright: Copyright © 2025 Anthropic

directories:
  output: dist
  buildResources: build

files:
  - out/**/*
  - assets/**/*

asar: true
asarUnpack:
  - assets/**/*

# Windows
win:
  target:
    - target: nsis
      arch: [x64]
    - target: zip
      arch: [x64]
  icon: assets/icon.ico
  artifactName: "${productName}-${version}-win-${arch}.${ext}"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico

# macOS
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: assets/icon.icns
  category: public.app-category.developer-tools
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  artifactName: "${productName}-${version}-mac-${arch}.${ext}"

dmg:
  title: "${productName}"

# Linux
linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
  icon: assets/icon.png
  category: Development
  artifactName: "${productName}-${version}-linux-${arch}.${ext}"
```

2. **Create build/entitlements.mac.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.device.audio-input</key>
  <true/>
</dict>
</plist>
```

3. **Create placeholder icons in assets/**
   - icon.png (256x256)
   - icon.ico (Windows)
   - icon.icns (macOS)

#### Acceptance Criteria

- [ ] Build configuration complete
- [ ] Icons in place
- [ ] Test build: `npm run dist`

---

## Phase 2: Recording Integration (5 hours)

**Goal:** Integrate SessionRecorder with Electron
**Deliverable:** Full recording functionality

### Task 2.1: RecordingManager Implementation (2 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create main/recording/RecordingManager.ts**

```typescript
// src/main/recording/RecordingManager.ts
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Import SessionRecorder from core package
import { SessionRecorder } from '@session-recorder/core';

import type {
  RecordingConfig,
  StartResult,
  StopResult,
  RecordingStatus,
  RecordingUpdate,
  Recording,
  Settings
} from '../../shared/types';

interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  mode: RecordingConfig['mode'] | null;
  startTime: Date | null;
  browser: Browser | null;
  page: Page | null;
  recorder: SessionRecorder | null;
  updateInterval: NodeJS.Timeout | null;
}

export class RecordingManager {
  private state: RecordingState = {
    isRecording: false,
    sessionId: null,
    mode: null,
    startTime: null,
    browser: null,
    page: null,
    recorder: null,
    updateInterval: null
  };

  private settings: Settings;
  private onUpdate: ((update: RecordingUpdate) => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  setUpdateCallback(callback: (update: RecordingUpdate) => void) {
    this.onUpdate = callback;
  }

  async startRecording(config: RecordingConfig): Promise<StartResult> {
    if (this.state.isRecording) {
      return {
        success: false,
        error: 'Recording already in progress'
      };
    }

    try {
      const sessionId = this.generateSessionId(config.title);
      const outputDir = path.join(this.settings.outputDir, sessionId);

      // Create output directory
      fs.mkdirSync(outputDir, { recursive: true });

      // Start browser if needed
      let browser: Browser | null = null;
      let page: Page | null = null;

      if (config.mode !== 'voice') {
        browser = await this.launchBrowser(config.browserType);
        page = await browser.newPage();

        if (config.startUrl) {
          await page.goto(config.startUrl);
        }
      }

      // Create recorder
      const recorder = new SessionRecorder(sessionId, {
        browser_record: config.mode !== 'voice',
        voice_record: config.mode !== 'browser',
        whisper_model: config.whisperModel || this.settings.whisperModel,
        outputDir
      });

      // Start recording
      if (page) {
        await recorder.start(page);
      } else {
        await recorder.startVoiceOnly();
      }

      // Store state
      this.state = {
        isRecording: true,
        sessionId,
        mode: config.mode,
        startTime: new Date(),
        browser,
        page,
        recorder,
        updateInterval: setInterval(() => this.sendUpdate(), 1000)
      };

      return {
        success: true,
        sessionId,
        message: `Recording started: ${config.mode}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to start recording: ${(error as Error).message}`
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
      // Clear update interval
      if (this.state.updateInterval) {
        clearInterval(this.state.updateInterval);
      }

      // Stop recorder
      await this.state.recorder.stop();

      // Create zip
      const zipPath = await this.state.recorder.createZip();

      // Close browser
      if (this.state.browser) {
        await this.state.browser.close();
      }

      // Calculate duration
      const duration = this.formatDuration(
        Date.now() - this.state.startTime!.getTime()
      );

      // Get session data for summary
      const sessionData = this.state.recorder.getSessionData();
      const sessionId = this.state.sessionId!;

      // Save to recent recordings
      await this.saveRecentRecording({
        id: sessionId,
        title: sessionId,
        zipPath,
        createdAt: new Date().toISOString(),
        duration,
        actionCount: sessionData.actions?.length || 0,
        mode: this.state.mode!,
        hasVoice: this.state.mode !== 'browser'
      });

      // Reset state
      this.state = {
        isRecording: false,
        sessionId: null,
        mode: null,
        startTime: null,
        browser: null,
        page: null,
        recorder: null,
        updateInterval: null
      };

      return {
        success: true,
        sessionId,
        zipPath,
        viewerUrl: `http://localhost:3001?zip=file://${encodeURIComponent(zipPath)}`,
        duration,
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

  getStatus(): RecordingStatus {
    if (!this.state.isRecording) {
      return { isRecording: false };
    }

    const duration = this.formatDuration(
      Date.now() - this.state.startTime!.getTime()
    );
    const sessionData = this.state.recorder?.getSessionData();

    return {
      isRecording: true,
      sessionId: this.state.sessionId!,
      mode: this.state.mode!,
      duration,
      durationMs: Date.now() - this.state.startTime!.getTime(),
      actionCount: sessionData?.actions?.length || 0,
      voiceEnabled: this.state.mode !== 'browser',
      currentUrl: this.state.page?.url()
    };
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  private sendUpdate() {
    if (!this.onUpdate || !this.state.isRecording) return;

    const status = this.getStatus();
    this.onUpdate({
      isRecording: true,
      duration: status.duration,
      actionCount: status.actionCount,
      currentUrl: status.currentUrl
    });
  }

  private async launchBrowser(type: string): Promise<Browser> {
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

  private generateSessionId(title?: string): string {
    const timestamp = Date.now();
    if (title) {
      const slug = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      return `${slug}-${timestamp}`;
    }
    return `session-${timestamp}`;
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

  // Settings management
  private getSettingsPath(): string {
    return path.join(app.getPath('userData'), 'settings.json');
  }

  private loadSettings(): Settings {
    const settingsPath = this.getSettingsPath();
    try {
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    // Default settings
    return {
      outputDir: path.join(app.getPath('documents'), 'Session Recordings'),
      defaultBrowser: 'chromium',
      whisperModel: 'base',
      startMinimized: false,
      showNotifications: true,
      autoOpenViewer: true
    };
  }

  getSettings(): Settings {
    return this.settings;
  }

  saveSettings(settings: Settings): void {
    this.settings = settings;
    fs.writeFileSync(this.getSettingsPath(), JSON.stringify(settings, null, 2));
  }

  // Recent recordings management
  private getRecordingsDbPath(): string {
    return path.join(app.getPath('userData'), 'recordings.json');
  }

  async getRecentRecordings(): Promise<Recording[]> {
    try {
      const dbPath = this.getRecordingsDbPath();
      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        return data.recordings || [];
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
    return [];
  }

  private async saveRecentRecording(recording: Recording): Promise<void> {
    const recordings = await this.getRecentRecordings();
    recordings.unshift(recording);

    // Keep only last 50 recordings
    const trimmed = recordings.slice(0, 50);

    fs.writeFileSync(
      this.getRecordingsDbPath(),
      JSON.stringify({ recordings: trimmed }, null, 2)
    );
  }

  async deleteRecording(id: string): Promise<boolean> {
    const recordings = await this.getRecentRecordings();
    const recording = recordings.find(r => r.id === id);

    if (!recording) return false;

    // Delete zip file
    try {
      if (fs.existsSync(recording.zipPath)) {
        fs.unlinkSync(recording.zipPath);
      }
    } catch (error) {
      console.error('Failed to delete zip file:', error);
    }

    // Remove from database
    const updated = recordings.filter(r => r.id !== id);
    fs.writeFileSync(
      this.getRecordingsDbPath(),
      JSON.stringify({ recordings: updated }, null, 2)
    );

    return true;
  }
}
```

#### Acceptance Criteria

- [ ] RecordingManager starts recordings
- [ ] RecordingManager stops and creates zip
- [ ] Settings persistence working
- [ ] Recent recordings tracking

---

### Task 2.2: IPC Handlers (1.5 hours)

**Priority:** HIGH

#### Implementation Steps

1. **Create main/ipc/handlers.ts**

```typescript
// src/main/ipc/handlers.ts
import { ipcMain, shell, dialog, Notification, BrowserWindow } from 'electron';
import { RecordingManager } from '../recording/RecordingManager';
import type { RecordingConfig, Settings } from '../../shared/types';

export function setupIpcHandlers(
  recordingManager: RecordingManager,
  mainWindow: BrowserWindow
) {
  // Recording controls
  ipcMain.handle('start-recording', async (_, config: RecordingConfig) => {
    return await recordingManager.startRecording(config);
  });

  ipcMain.handle('stop-recording', async () => {
    const result = await recordingManager.stopRecording();

    // Send complete event to renderer
    mainWindow.webContents.send('recording-complete', result);

    // Show notification
    if (recordingManager.getSettings().showNotifications && result.success) {
      new Notification({
        title: 'Recording Complete',
        body: `Saved to ${result.zipPath}`,
        silent: false
      }).show();
    }

    // Auto-open viewer
    if (recordingManager.getSettings().autoOpenViewer && result.viewerUrl) {
      shell.openExternal(result.viewerUrl);
    }

    return result;
  });

  ipcMain.handle('get-status', () => {
    return recordingManager.getStatus();
  });

  // File operations
  ipcMain.handle('open-in-viewer', async (_, zipPath: string) => {
    const viewerUrl = `http://localhost:3001?zip=file://${encodeURIComponent(zipPath)}`;
    await shell.openExternal(viewerUrl);
  });

  ipcMain.handle('show-in-folder', async (_, zipPath: string) => {
    shell.showItemInFolder(zipPath);
  });

  ipcMain.handle('get-recent-recordings', async () => {
    return await recordingManager.getRecentRecordings();
  });

  ipcMain.handle('delete-recording', async (_, id: string) => {
    return await recordingManager.deleteRecording(id);
  });

  // Settings
  ipcMain.handle('get-settings', () => {
    return recordingManager.getSettings();
  });

  ipcMain.handle('save-settings', (_, settings: Settings) => {
    recordingManager.saveSettings(settings);
  });

  ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Directory'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Setup update callback
  recordingManager.setUpdateCallback((update) => {
    mainWindow.webContents.send('recording-update', update);
  });
}
```

#### Acceptance Criteria

- [ ] All IPC handlers implemented
- [ ] Recording start/stop working via IPC
- [ ] File operations working
- [ ] Settings operations working

---

### Task 2.3: System Tray (1.5 hours)

**Priority:** MEDIUM

#### Implementation Steps

1. **Create main/tray/TrayManager.ts**

```typescript
// src/main/tray/TrayManager.ts
import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import { RecordingManager } from '../recording/RecordingManager';

export class TrayManager {
  private tray: Tray | null = null;
  private recordingManager: RecordingManager;
  private mainWindow: BrowserWindow;

  constructor(recordingManager: RecordingManager, mainWindow: BrowserWindow) {
    this.recordingManager = recordingManager;
    this.mainWindow = mainWindow;
  }

  createTray(): Tray {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

    this.tray = new Tray(icon);
    this.tray.setToolTip('Session Recorder');

    this.updateContextMenu();

    // Double-click to show window
    this.tray.on('double-click', () => {
      this.mainWindow.show();
    });

    return this.tray;
  }

  updateContextMenu() {
    if (!this.tray) return;

    const isRecording = this.recordingManager.isRecording();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => this.mainWindow.show()
      },
      { type: 'separator' },
      {
        label: 'Quick Record (Browser)',
        enabled: !isRecording,
        click: () => this.startQuickRecording('browser')
      },
      {
        label: 'Quick Record (Browser + Voice)',
        enabled: !isRecording,
        click: () => this.startQuickRecording('combined')
      },
      {
        label: 'Stop Recording',
        enabled: isRecording,
        click: () => this.stopRecording()
      },
      { type: 'separator' },
      {
        label: 'Open Recordings Folder',
        click: () => this.openRecordingsFolder()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private async startQuickRecording(mode: 'browser' | 'combined') {
    const settings = this.recordingManager.getSettings();

    await this.recordingManager.startRecording({
      title: `Quick-${new Date().toISOString().slice(0, 10)}`,
      mode,
      browserType: settings.defaultBrowser,
      whisperModel: settings.whisperModel
    });

    this.updateContextMenu();
    this.mainWindow.webContents.send('recording-update', { isRecording: true });
  }

  private async stopRecording() {
    const result = await this.recordingManager.stopRecording();
    this.updateContextMenu();
    this.mainWindow.webContents.send('recording-complete', result);
  }

  private openRecordingsFolder() {
    const settings = this.recordingManager.getSettings();
    require('electron').shell.openPath(settings.outputDir);
  }
}
```

#### Acceptance Criteria

- [ ] System tray icon appears
- [ ] Context menu shows correct options
- [ ] Quick record from tray works
- [ ] Menu updates based on recording state

---

## Phase 3: UI Polish (4 hours)

**Goal:** Complete all UI components with polished styling
**Deliverable:** Professional-looking application

### Task 3.1: Recording Controls Component (1.5 hours)

**Priority:** HIGH

See PRD-DESKTOP.md Section 4.1 for UI design.

### Task 3.2: Recording Status Component (1 hour)

**Priority:** HIGH

See PRD-DESKTOP.md Section 4.2 for UI design.

### Task 3.3: Recording Complete Component (0.5 hours)

**Priority:** HIGH

See PRD-DESKTOP.md Section 4.3 for UI design.

### Task 3.4: Recent Recordings & Settings (1 hour)

**Priority:** MEDIUM

See PRD-DESKTOP.md Sections 4.4-4.5 for UI design.

---

## Phase 4: System Integration (4 hours)

**Goal:** Native system integration for professional experience
**Deliverable:** Notifications, auto-open, file management

### Task 4.1: Native Notifications (1 hour)

**Priority:** MEDIUM

### Task 4.2: Auto-Open Viewer (1 hour)

**Priority:** MEDIUM

### Task 4.3: Settings Persistence (1 hour)

**Priority:** MEDIUM

### Task 4.4: File Explorer Integration (1 hour)

**Priority:** LOW

---

## Phase 5: Testing & Distribution (3 hours)

**Goal:** Build and test installers for all platforms
**Deliverable:** Distributable installers

### Task 5.1: Cross-Platform Testing (1.5 hours)

**Priority:** HIGH

#### Test Checklist

**Windows:**
- [ ] Installation succeeds
- [ ] Recording starts/stops
- [ ] Voice recording works
- [ ] System tray works
- [ ] Uninstall cleans up

**macOS:**
- [ ] Installation succeeds (DMG)
- [ ] Microphone permissions granted
- [ ] Recording works
- [ ] Dock icon appears

**Linux:**
- [ ] AppImage runs
- [ ] DEB installs
- [ ] Recording works

### Task 5.2: Build Installers (1 hour)

**Priority:** HIGH

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

### Task 5.3: Documentation (0.5 hours)

**Priority:** MEDIUM

#### Create README.md

- Installation instructions per platform
- First-time setup (microphone permissions)
- Usage guide
- Troubleshooting

---

## Summary

### Total Estimated Effort: 20 hours

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Core Electron App | 4 | HIGH |
| Phase 2: Recording Integration | 5 | HIGH |
| Phase 3: UI Polish | 4 | HIGH |
| Phase 4: System Integration | 4 | MEDIUM |
| Phase 5: Testing & Distribution | 3 | HIGH |

### Files Created

```
session-recorder-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── recording/
│   │   │   └── RecordingManager.ts
│   │   ├── tray/
│   │   │   └── TrayManager.ts
│   │   └── ipc/
│   │       └── handlers.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── RecordingControls.tsx
│   │   │   ├── RecordingStatus.tsx
│   │   │   ├── RecordingComplete.tsx
│   │   │   ├── RecentRecordings.tsx
│   │   │   └── SettingsDialog.tsx
│   │   ├── stores/
│   │   │   └── recordingStore.ts
│   │   └── styles/
│   │       └── app.css
│   └── shared/
│       └── types.ts
├── assets/
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
├── build/
│   └── entitlements.mac.plist
├── electron-builder.yml
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Success Metrics

| Metric | Target |
|--------|--------|
| Installation success rate | >95% |
| Time to first recording | <2 minutes |
| Recording start time | <3 seconds |
| User satisfaction | >4.5/5 |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial task breakdown for Desktop Application |
| 1.1 | 2025-12-10 | Updated to follow template, added Table of Contents |
