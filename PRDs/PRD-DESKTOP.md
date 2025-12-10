# PRD-DESKTOP: Session Recorder Desktop Application

**Version:** 1.1
**Last Updated:** December 2025
**Status:** ⚡ Planning
**Depends On:** [PRD-4.md](PRD-4.md) (Voice Recording - Complete)

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **QA Testers** | Record test sessions with one-click workflow |
| **Product Managers** | Create feature walkthroughs with voice narration |
| **Support Staff** | Document customer issues for escalation |
| **Designers** | Capture UI/UX feedback sessions |
| **Non-Technical Users** | Create session recordings without command-line knowledge |

---

## Executive Summary

The Session Recorder Desktop Application provides a user-friendly interface for non-technical users (QA testers, product managers, support staff, designers) to record browser sessions with voice narration. Built with Electron for cross-platform support (Windows, macOS, Linux), it offers one-click recording with automatic zip creation and viewer integration.

---

## 1. Problem Statement

**Current State:**
- Session recording requires running TypeScript scripts
- Need command-line knowledge and Node.js installed
- No graphical interface for non-developers
- Complex setup process with multiple dependencies

**Solution:**
Desktop application with:
- One-click recording start/stop
- Visual recording mode selection
- Automatic zip creation and viewer launch
- Cross-platform installers (Windows, macOS, Linux)
- System tray integration for quick access

---

## 2. Goals & Objectives

### Primary Goals
1. **Zero technical knowledge required:** Anyone can record sessions
2. **One-click workflow:** Start → Interact → Stop → View
3. **Cross-platform:** Windows, macOS, and Linux support
4. **Professional appearance:** Polished UI suitable for enterprise use

### Success Metrics
| Metric | Target |
|--------|--------|
| Installation success rate | >95% |
| Time to first recording | <2 minutes |
| Recording start time | <3 seconds |
| User satisfaction | >4.5/5 |

---

## 3. User Flows

### Flow 1: First-Time Setup
```
1. Download installer for platform
2. Run installer (no admin rights needed)
3. Launch application
4. Grant microphone permission (if voice enabled)
5. Ready to record
```

### Flow 2: Browser Recording
```
1. Launch app or click system tray icon
2. Enter recording title (optional)
3. Select "Browser Only" mode
4. Click "Start Recording"
   → Browser window opens
5. Interact with browser
6. Click "Stop Recording" in app
   → Zip created automatically
7. Click "Open in Viewer" button
   → Viewer opens with recording
```

### Flow 3: Browser + Voice Recording
```
1. Launch app
2. Select "Browser + Voice" mode
3. Click "Start Recording"
   → Browser window opens
   → Microphone indicator shows active
4. Interact and narrate
5. Click "Stop Recording"
   → Transcription processed (progress shown)
   → Zip created with transcript
6. Success notification with viewer link
```

### Flow 4: Quick Recording from System Tray
```
1. Right-click system tray icon
2. Select "Quick Record (Browser + Voice)"
   → Browser opens immediately
3. Interact and speak
4. Click tray icon → "Stop Recording"
   → Zip created, notification shown
```

### Flow 5: View Recent Recordings
```
1. Click "Recent Recordings" tab
2. See list of past recordings with:
   - Title, date, duration
   - Mode (browser/voice/combined)
   - Action count
3. Click "Open in Viewer" for any recording
4. Click "Show in Folder" to locate zip
5. Click "Delete" to remove recording
```

---

## 4. User Interface Design

### 4.1 Main Window Layout

```
┌─────────────────────────────────────────────────────────┐
│  ⚫ Session Recorder                           [─][□][×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              🎬 Session Recorder                 │   │
│  │                                                  │   │
│  │  Recording Title (optional):                    │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ QA Testing - Login Flow                  │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                  │   │
│  │  Recording Mode:                                │   │
│  │  ┌───────────────┐ ┌───────────────┐           │   │
│  │  │ 🌐 Browser    │ │ 🎤 Voice Only │           │   │
│  │  │    Only       │ │               │           │   │
│  │  └───────────────┘ └───────────────┘           │   │
│  │  ┌─────────────────────────────────┐           │   │
│  │  │ 🎬 Browser + Voice              │ ← Selected│   │
│  │  │    (Recommended)                │           │   │
│  │  └─────────────────────────────────┘           │   │
│  │                                                  │   │
│  │  Browser:  [Chromium ▼]                         │   │
│  │                                                  │   │
│  │  Start URL (optional):                          │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ https://example.com                      │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                  │   │
│  │        ┌─────────────────────────┐             │   │
│  │        │   🔴 Start Recording    │             │   │
│  │        └─────────────────────────┘             │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Recent Recordings ─────────────────────────────┐   │
│  │ 📁 Login Flow Test        12/6  5:23   47 acts  │   │
│  │ 📁 Checkout Bug           12/5  2:15   23 acts  │   │
│  │ 📁 New Feature Demo       12/5 15:02  156 acts  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Ready to record                              [⚙️]      │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Recording In Progress State

```
┌─────────────────────────────────────────────────────────┐
│  ⚫ Session Recorder - Recording                [─][□][×]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              🔴 Recording Active                 │   │
│  │                                                  │   │
│  │         ┌─────────────────────┐                 │   │
│  │         │   ⏱️ 00:05:23      │                 │   │
│  │         │   47 actions        │                 │   │
│  │         └─────────────────────┘                 │   │
│  │                                                  │   │
│  │  🎤 Voice: ████████████░░░░░░░░ Active          │   │
│  │  🌐 Browser: https://example.com/dashboard      │   │
│  │                                                  │   │
│  │        ┌─────────────────────────┐             │   │
│  │        │   ⬛ Stop Recording     │             │   │
│  │        └─────────────────────────┘             │   │
│  │                                                  │   │
│  │  💡 Tip: Speak clearly to describe what        │   │
│  │     you're doing. Click here when done.        │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🔴 Recording - 5m 23s                        [⚙️]      │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Recording Complete State

```
┌─────────────────────────────────────────────────────────┐
│  ⚫ Session Recorder                           [─][□][×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ✅ Recording Complete               │   │
│  │                                                  │   │
│  │  📁 QA Testing - Login Flow                     │   │
│  │                                                  │   │
│  │  Duration:    5 minutes, 23 seconds             │   │
│  │  Actions:     47 browser actions                │   │
│  │  Voice:       12 segments (98% confidence)      │   │
│  │                                                  │   │
│  │  Saved to:                                      │   │
│  │  ~/recordings/session-1733500000000.zip         │   │
│  │                                                  │   │
│  │  ┌─────────────────┐ ┌─────────────────┐       │   │
│  │  │ 👁️ Open Viewer  │ │ 📂 Show in      │       │   │
│  │  │                 │ │    Folder       │       │   │
│  │  └─────────────────┘ └─────────────────┘       │   │
│  │                                                  │   │
│  │  ┌─────────────────────────────────────┐       │   │
│  │  │       🎬 New Recording              │       │   │
│  │  └─────────────────────────────────────┘       │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Recording saved successfully                 [⚙️]      │
└─────────────────────────────────────────────────────────┘
```

### 4.4 System Tray Menu

```
┌────────────────────────────┐
│ 📷 Quick Record (Browser)  │
│ 🎬 Quick Record (Combined) │
├────────────────────────────┤
│ 📂 Open Recordings Folder  │
│ 👁️ Open Viewer             │
├────────────────────────────┤
│ ⚙️ Settings                 │
│ ❓ Help                     │
├────────────────────────────┤
│ 🚪 Quit                     │
└────────────────────────────┘
```

### 4.5 Settings Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                       [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📂 Output Directory                                    │
│  ┌──────────────────────────────────────┐ [Browse]     │
│  │ C:\Users\user\Documents\Recordings   │              │
│  └──────────────────────────────────────┘              │
│                                                         │
│  🌐 Default Browser                                     │
│  [Chromium ▼]                                           │
│                                                         │
│  🎤 Voice Settings                                      │
│  Whisper Model: [Base (Recommended) ▼]                  │
│    • Tiny - Fastest, lower accuracy                     │
│    • Base - Good balance (recommended)                  │
│    • Small - Better accuracy, slower                    │
│    • Medium - High accuracy, slow                       │
│                                                         │
│  ☐ Start minimized to system tray                      │
│  ☑ Show notification on recording complete             │
│  ☑ Auto-open viewer after recording                    │
│                                                         │
│  ┌────────────────┐ ┌────────────────┐                 │
│  │     Cancel     │ │      Save      │                 │
│  └────────────────┘ └────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Technical Architecture

### 5.1 Electron Project Structure

```
session-recorder-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process
│   │   ├── preload.ts           # Context bridge
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
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 5.2 Main Process Architecture

```typescript
// src/main/main.ts
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import { RecordingManager } from './recording/RecordingManager';
import { TrayManager } from './tray/TrayManager';
import { setupIpcHandlers } from './ipc/handlers';

class SessionRecorderApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private recordingManager: RecordingManager;
  private trayManager: TrayManager;

  constructor() {
    this.recordingManager = new RecordingManager();
  }

  async init() {
    await app.whenReady();

    this.createWindow();
    this.trayManager = new TrayManager(this.recordingManager, this.mainWindow!);
    this.tray = this.trayManager.createTray();

    setupIpcHandlers(this.recordingManager);

    // Handle window close (minimize to tray on Windows/Linux)
    this.mainWindow!.on('close', (e) => {
      if (process.platform !== 'darwin') {
        e.preventDefault();
        this.mainWindow!.hide();
      }
    });

    // macOS specific
    app.on('activate', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
      }
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 500,
      height: 700,
      minWidth: 400,
      minHeight: 600,
      resizable: true,
      icon: path.join(__dirname, '../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }
}

const app = new SessionRecorderApp();
app.init();
```

### 5.3 IPC Communication

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface RecordingAPI {
  // Recording controls
  startRecording: (config: RecordingConfig) => Promise<StartResult>;
  stopRecording: () => Promise<StopResult>;
  getStatus: () => Promise<RecordingStatus>;

  // Recording events
  onRecordingUpdate: (callback: (update: RecordingUpdate) => void) => void;
  onRecordingComplete: (callback: (result: StopResult) => void) => void;

  // File operations
  openInViewer: (zipPath: string) => Promise<void>;
  showInFolder: (zipPath: string) => Promise<void>;
  getRecentRecordings: () => Promise<Recording[]>;
  deleteRecording: (zipPath: string) => Promise<boolean>;

  // Settings
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  selectOutputDirectory: () => Promise<string | null>;
}

contextBridge.exposeInMainWorld('recording', {
  startRecording: (config) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getStatus: () => ipcRenderer.invoke('get-status'),

  onRecordingUpdate: (callback) => {
    ipcRenderer.on('recording-update', (_, update) => callback(update));
  },
  onRecordingComplete: (callback) => {
    ipcRenderer.on('recording-complete', (_, result) => callback(result));
  },

  openInViewer: (zipPath) => ipcRenderer.invoke('open-in-viewer', zipPath),
  showInFolder: (zipPath) => ipcRenderer.invoke('show-in-folder', zipPath),
  getRecentRecordings: () => ipcRenderer.invoke('get-recent-recordings'),
  deleteRecording: (zipPath) => ipcRenderer.invoke('delete-recording', zipPath),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory')
} as RecordingAPI);
```

### 5.4 Renderer Components

```typescript
// src/renderer/App.tsx
import React, { useState, useEffect } from 'react';
import RecordingControls from './components/RecordingControls';
import RecordingStatus from './components/RecordingStatus';
import RecordingComplete from './components/RecordingComplete';
import RecentRecordings from './components/RecentRecordings';
import SettingsDialog from './components/SettingsDialog';
import './styles/app.css';

type AppState = 'idle' | 'recording' | 'processing' | 'complete';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [recordingResult, setRecordingResult] = useState<StopResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Listen for recording updates
    window.recording.onRecordingUpdate((update) => {
      if (update.isRecording) {
        setState('recording');
      }
    });

    window.recording.onRecordingComplete((result) => {
      setRecordingResult(result);
      setState('complete');
    });
  }, []);

  const handleStartRecording = async (config: RecordingConfig) => {
    const result = await window.recording.startRecording(config);
    if (result.success) {
      setState('recording');
    }
  };

  const handleStopRecording = async () => {
    setState('processing');
    await window.recording.stopRecording();
    // Result comes via onRecordingComplete callback
  };

  const handleNewRecording = () => {
    setRecordingResult(null);
    setState('idle');
  };

  return (
    <div className="app">
      <header>
        <h1>🎬 Session Recorder</h1>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          ⚙️
        </button>
      </header>

      <main>
        {state === 'idle' && (
          <RecordingControls onStart={handleStartRecording} />
        )}

        {(state === 'recording' || state === 'processing') && (
          <RecordingStatus
            isProcessing={state === 'processing'}
            onStop={handleStopRecording}
          />
        )}

        {state === 'complete' && recordingResult && (
          <RecordingComplete
            result={recordingResult}
            onNewRecording={handleNewRecording}
          />
        )}

        <RecentRecordings />
      </main>

      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
```

### 5.5 Build Configuration

```yaml
# electron-builder.yml
appId: com.anthropic.session-recorder
productName: Session Recorder
copyright: Copyright © 2025 Anthropic

directories:
  output: dist
  buildResources: build

files:
  - "out/**/*"
  - "assets/**/*"
  - "!**/*.ts"
  - "!**/*.map"

asar: true
asarUnpack:
  - "assets/**/*"

win:
  target:
    - target: nsis
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: assets/icon.ico
  artifactName: "${productName}-${version}-win-${arch}.${ext}"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico
  license: LICENSE.txt

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
  icon: assets/icon.icns

linux:
  target:
    - target: AppImage
      arch: [x64, arm64]
    - target: deb
      arch: [x64, arm64]
    - target: rpm
      arch: [x64]
  icon: assets/icon.png
  category: Development
  artifactName: "${productName}-${version}-linux-${arch}.${ext}"

publish:
  provider: github
  releaseType: draft
```

---

## 6. Implementation Phases

### Phase 1: Core Electron App (4 hours)
1. Initialize Electron + Vite + React project
2. Create main process with window management
3. Implement preload script with IPC bridge
4. Basic UI layout with recording controls
5. Build configuration for all platforms

### Phase 2: Recording Integration (5 hours)
1. Implement RecordingManager (wraps SessionRecorder)
2. Wire up start/stop recording via IPC
3. Voice capture integration
4. Real-time recording status updates
5. Recording progress indicators

### Phase 3: UI Polish (4 hours)
1. Complete recording controls component
2. Recording status with live updates
3. Recording complete with results display
4. Recent recordings list
5. Settings dialog

### Phase 4: System Integration (4 hours)
1. System tray with context menu
2. Native notifications
3. Auto-open viewer on completion
4. File explorer integration
5. Settings persistence

### Phase 5: Testing & Distribution (3 hours)
1. Cross-platform testing
2. Build installers for all platforms
3. Sign and notarize macOS build
4. Documentation and help content

**Total: 20 hours**

---

## 7. Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "playwright": "^1.40.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "archiver": "^6.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron-builder": "^24.9.0",
    "electron-vite": "^2.0.0"
  }
}
```

### System Requirements
- Windows 10+ (64-bit)
- macOS 10.15+ (Catalina or later)
- Linux (Ubuntu 20.04+, Fedora 33+, or equivalent)
- Microphone for voice recording
- 500MB disk space

---

## 8. Security Considerations

### Sandboxing
- Renderer process runs in sandbox mode
- All file operations go through main process IPC
- No direct Node.js access from renderer

### Code Signing
- Windows: Sign with Authenticode certificate
- macOS: Sign and notarize with Apple Developer ID
- Linux: AppImage signature

### Permissions
- Microphone access requested only when needed
- Recording files stored in user documents by default
- No network access required (local-only operation)

---

## 9. Accessibility

- Full keyboard navigation
- Screen reader support (aria labels)
- High contrast mode support
- Configurable font sizes
- Status announcements for screen readers

---

## 10. Out of Scope

- Cloud sync/storage
- Multi-user support
- Remote control capabilities
- Video recording (screen capture)
- Mobile versions
- Auto-update from web

---

## 11. Future Enhancements

1. **Auto-updates:** In-app update mechanism
2. **Themes:** Light/dark mode support
3. **Keyboard shortcuts:** Global hotkeys for start/stop
4. **Batch export:** Export multiple recordings at once
5. **Recording tags:** Categorize recordings with tags
6. **Search:** Search through recording titles and transcripts

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial PRD for Desktop Application |
| 1.1 | 2025-12-10 | Updated to follow template, added Target Users table |
