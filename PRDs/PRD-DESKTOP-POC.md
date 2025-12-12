# PRD: Desktop App POC - Standalone Recording Executable

**Status:** Draft
**Created:** 2025-12-10
**Post-POC Features:** [PRD-DESKTOP.md](PRD-DESKTOP.md)

---

## Overview

Create a standalone Windows executable that allows anyone to record browser sessions without installing Python, Node.js, or any dependencies.

**Goal:** Zero-install recording for non-developers

---

## POC Scope

### What It Does

1. **Launch** - User double-clicks `SessionRecorder.exe`
2. **Record** - Chrome opens with recording enabled (browser + voice)
3. **Stop** - User closes Chrome (or clicks Stop in system tray)
4. **Output** - Windows Explorer opens showing the `.zip` file
5. **Microphone Selection** - User can select which microphone to record from
6. **Transcribe Files** - User can transcribe existing WAV/MP3 files without recording

### What It Doesn't Do (Post-POC)

- Settings UI → [PRD-DESKTOP.md](PRD-DESKTOP.md)
- Recent recordings list → [PRD-DESKTOP.md](PRD-DESKTOP.md)
- Mode selection (browser/voice/both) → [PRD-DESKTOP.md](PRD-DESKTOP.md)
- Auto-update → [PRD-DESKTOP.md](PRD-DESKTOP.md)
- Built-in viewer → [PRD-DESKTOP.md](PRD-DESKTOP.md)

---

## Technical Architecture

### Bundling Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  SessionRecorder.exe                     │
│                    (Electron app)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────┐    │
│  │  Node.js        │    │  voice-recorder.exe     │    │
│  │  (bundled)      │    │  (PyInstaller bundle)   │    │
│  │                 │    │                         │    │
│  │  - Playwright   │    │  - Python 3.11          │    │
│  │  - SessionRec   │    │  - sounddevice          │    │
│  │  - archiver     │    │  - openai-whisper       │    │
│  │                 │    │  - torch (CPU)          │    │
│  └────────┬────────┘    └────────────┬────────────┘    │
│           │                          │                  │
│           └──────────┬───────────────┘                  │
│                      │                                  │
│                      ▼                                  │
│           ┌──────────────────────┐                      │
│           │  Chrome (CDP)        │                      │
│           │  - Launched or       │                      │
│           │  - Connected (9222)  │                      │
│           └──────────────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Electron Shell (~2h)

Minimal Electron app with:
- Main process that orchestrates recording
- System tray icon with Start/Stop
- No renderer window (tray-only POC)

```typescript
// main.ts (Electron main process)
import { app, Tray, Menu, shell } from 'electron';
import { SessionRecorder } from './recorder';
import { spawn } from 'child_process';
import * as path from 'path';

let tray: Tray;
let recorder: SessionRecorder | null = null;

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Start Recording', click: startRecording },
    { label: 'Stop Recording', click: stopRecording, enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Session Recorder');
});

async function startRecording() {
  // Launch voice recorder exe
  const voiceExe = path.join(process.resourcesPath, 'voice-recorder.exe');

  // Start session recorder (connects to Chrome)
  recorder = new SessionRecorder(`session-${Date.now()}`);
  // ... recording logic
}

async function stopRecording() {
  if (!recorder) return;

  await recorder.stop();
  const zipPath = await recorder.createZip();

  // Open Explorer to show zip
  shell.showItemInFolder(zipPath);
}
```

#### 2. Voice Recorder Bundle (~4h)

PyInstaller bundle of Python voice recording:

```bash
# Build voice-recorder.exe
pyinstaller --onefile \
  --name voice-recorder \
  --add-data "whisper:whisper" \
  src/voice/record_and_transcribe.py
```

**Resulting exe includes:**
- Python 3.11 runtime
- sounddevice + portaudio
- openai-whisper
- torch (CPU-only to reduce size)
- numpy, etc.

**Size estimate:** ~500MB - 1GB (torch is large)

#### 3. Playwright + Chrome (~2h)

Options for Chrome:
1. **Use system Chrome** - Smallest bundle, requires Chrome installed
2. **Bundle Chromium** - Larger (~150MB) but guaranteed to work

POC will use **system Chrome** via CDP (same as `record:connect`).

---

## Build Process

### Prerequisites (Dev Machine Only)

```bash
# Node.js dependencies
npm install electron electron-builder

# Python dependencies (for building exe)
pip install pyinstaller
pip install sounddevice openai-whisper torch numpy
```

### Build Steps

```bash
# 1. Build voice recorder exe
cd src/voice
pyinstaller --onefile --name voice-recorder record_and_transcribe.py

# 2. Build Electron app
npm run build:electron

# 3. Package with electron-builder
npm run package:win
```

### Output

```
dist/
├── SessionRecorder-Setup.exe    # Installer
├── SessionRecorder-Portable.exe # Portable (no install)
└── win-unpacked/                # Unpacked app
    ├── SessionRecorder.exe
    ├── resources/
    │   └── voice-recorder.exe   # Bundled Python
    └── ...
```

---

## User Flow

### First Launch

```
1. User downloads SessionRecorder.exe (or installer)
2. User runs exe
3. System tray icon appears
4. Tooltip: "Session Recorder - Right-click to start"
```

### Recording

```
1. User right-clicks tray icon → "Start Recording"
2. Chrome launches (or connects to existing)
3. Tray icon changes to red (recording)
4. User interacts with browser + speaks
5. User right-clicks tray icon → "Stop Recording"
   OR User closes Chrome window
6. Processing indicator shows
7. Explorer opens showing session-XXXXX.zip
```

### Output Location

```
%USERPROFILE%\Documents\Session Recordings\
├── session-1702234567890.zip
├── session-1702234600000.zip
└── ...
```

---

## POC Tasks

### Phase 1: Voice Recorder Bundle (4h)

- [ ] Create PyInstaller spec file for voice recorder
- [ ] Test standalone exe on clean Windows machine
- [ ] Optimize bundle size (CPU-only torch)
- [ ] Handle microphone permissions gracefully
- [ ] Allow microphone selection (list available devices)
- [ ] Allow transcription of existing WAV/MP3 files (without recording)

### Phase 2: Electron Shell (4h)

- [ ] Create minimal Electron app (tray-only)
- [ ] Integrate SessionRecorder class
- [ ] Spawn voice-recorder.exe as subprocess
- [ ] Handle Chrome launch/connect via CDP
- [ ] Implement stop and zip creation

### Phase 3: Packaging (2h)

- [ ] Configure electron-builder for Windows
- [ ] Include voice-recorder.exe in resources
- [ ] Create installer and portable versions
- [ ] Test on clean Windows machine

### Phase 4: Polish (2h)

- [ ] Add tray icon states (idle, recording, processing)
- [ ] Add basic error handling (no Chrome, no mic)
- [ ] Open Explorer to output folder on completion
- [ ] Add "Open Output Folder" menu item

**Total POC Effort:** ~12 hours

---

## Size Considerations

| Component | Size |
|-----------|------|
| Electron + Node.js | ~150MB |
| voice-recorder.exe (PyInstaller) | ~800MB |
| Chromium (if bundled) | ~150MB |
| **Total (system Chrome)** | **~950MB** |
| **Total (bundled Chrome)** | **~1.1GB** |

### Size Reduction Options (Post-POC)

1. **Use whisper.cpp** instead of Python Whisper (~50MB vs ~800MB)
2. **ONNX runtime** instead of PyTorch (~100MB vs ~700MB)
3. **Lazy download** - Download voice module on first use

---

## Alternatives Considered

### 1. Single Python Exe (No Node.js)

**Pros:** Simpler, single exe
**Cons:** Playwright doesn't have good Python bindings for our use case

### 2. Pure Node.js (No Python)

**Pros:** Much smaller (~200MB total)
**Cons:** No good Whisper binding for Node.js, would need API call

### 3. Whisper.cpp + Node.js

**Pros:** Small exe (~200MB), fast
**Cons:** More complex build, native compilation required

**Decision:** Use Electron + PyInstaller for POC. Optimize size in post-POC.

---

## Success Criteria

- [ ] Single exe/installer download
- [ ] Works on Windows 10/11 without any prerequisites
- [ ] Records browser + voice with single Start/Stop
- [ ] Creates valid zip that opens in React viewer
- [ ] Opens Explorer showing output on completion

---

## Post-POC Enhancements

See [PRD-DESKTOP.md](PRD-DESKTOP.md) for:

- Full UI with recording mode selection
- Settings persistence
- Recent recordings list
- Built-in viewer
- macOS and Linux support
- Auto-update
- Size optimization (whisper.cpp)

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial POC scope |
| 1.1 | 2025-12-12 | Added microphone selection and file transcription features |
