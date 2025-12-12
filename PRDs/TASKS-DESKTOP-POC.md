# TASKS-DESKTOP-POC: Desktop App POC Implementation

**PRD:** [PRD-DESKTOP-POC.md](PRD-DESKTOP-POC.md)
**Post-POC:** [PRD-DESKTOP.md](PRD-DESKTOP.md) | [TASKS-DESKTOP.md](TASKS-DESKTOP.md)
**Estimated Effort:** 12 hours
**Status:** Not Started

---

## Phase 1: Voice Recorder Bundle (4h)

### 1.1 PyInstaller Setup (1h)

- [ ] Create PyInstaller spec file for voice recorder
- [ ] Configure CPU-only PyTorch build (exclude CUDA)
- [ ] Add Whisper model files to bundle
- [ ] Test spec file builds successfully

### 1.2 Voice Recorder Script (1.5h)

- [ ] Create standalone `record_and_transcribe.py` entry point
- [ ] Add command-line argument parsing (output path, model, duration)
- [ ] Implement graceful shutdown on SIGTERM/SIGINT
- [ ] Add JSON output for transcript (stdout or file)
- [ ] Handle microphone permission errors gracefully
- [ ] Allow you to select the microphone you want to record on
- [ ] Allow transription on any wav or mp3 file (without recording)

### 1.3 Build & Test (1.5h)

- [ ] Build voice-recorder.exe with PyInstaller
- [ ] Test on clean Windows 10 VM (no Python installed)
- [ ] Test on clean Windows 11 VM (no Python installed)
- [ ] Verify microphone access and recording
- [ ] Verify Whisper transcription works
- [ ] Document exe size and startup time

---

## Phase 2: Electron Shell (4h)

### 2.1 Project Setup (1h)

- [ ] Initialize Electron project with TypeScript
- [ ] Configure electron-builder for Windows
- [ ] Set up development workflow (hot reload)
- [ ] Create project structure

```
desktop-app/
├── src/
│   ├── main/
│   │   ├── index.ts       # Main process
│   │   ├── tray.ts        # System tray management
│   │   ├── recorder.ts    # Recording orchestration
│   │   └── voice.ts       # Voice recorder subprocess
│   └── assets/
│       ├── icon.ico       # Tray icon (idle)
│       ├── icon-recording.ico
│       └── icon-processing.ico
├── package.json
├── tsconfig.json
└── electron-builder.yml
```

### 2.2 System Tray Implementation (1h)

- [ ] Create tray icon with context menu
- [ ] Implement "Start Recording" menu item
- [ ] Implement "Stop Recording" menu item
- [ ] Implement "Open Output Folder" menu item
- [ ] Implement "Quit" menu item
- [ ] Add tray icon state changes (idle → recording → processing)
- [ ] Add tooltip with current status

### 2.3 Recording Orchestration (1.5h)

- [ ] Integrate SessionRecorder class from session-recorder
- [ ] Implement Chrome launch via CDP
- [ ] Spawn voice-recorder.exe as subprocess
- [ ] Coordinate browser + voice recording start
- [ ] Handle Chrome window close detection
- [ ] Implement stop and zip creation
- [ ] Open Explorer to show zip on completion

### 2.4 Error Handling (0.5h)

- [ ] Handle Chrome not installed error
- [ ] Handle microphone not available error
- [ ] Handle recording failure gracefully
- [ ] Show native notification on error
- [ ] Log errors to file for debugging

---

## Phase 3: Packaging (2h)

### 3.1 Build Configuration (1h)

- [ ] Configure electron-builder for Windows
- [ ] Set up NSIS installer configuration
- [ ] Configure portable exe option
- [ ] Include voice-recorder.exe in resources
- [ ] Set application metadata (name, version, icon)

### 3.2 Build & Test (1h)

- [ ] Build installer (SessionRecorder-Setup.exe)
- [ ] Build portable (SessionRecorder-Portable.exe)
- [ ] Test installer on clean Windows 10 VM
- [ ] Test installer on clean Windows 11 VM
- [ ] Test portable exe on clean Windows VM
- [ ] Verify all files included correctly
- [ ] Document final bundle size

---

## Phase 4: Polish (2h)

### 4.1 UX Improvements (1h)

- [ ] Add tray icon states (idle, recording, processing)
- [ ] Add native notifications for status changes
- [ ] Show recording duration in tooltip
- [ ] Add keyboard shortcut for stop (if possible)

### 4.2 Error Handling & Edge Cases (0.5h)

- [ ] Handle user canceling recording immediately
- [ ] Handle disk full scenario
- [ ] Handle Chrome crash during recording
- [ ] Cleanup temp files on error

### 4.3 Documentation (0.5h)

- [ ] Create README for desktop-app
- [ ] Document build process
- [ ] Document testing procedure
- [ ] Update PROGRESS.md with completion status

---

## Success Criteria

- [ ] Single exe/installer download works
- [ ] Works on Windows 10/11 without any prerequisites
- [ ] Records browser + voice with single Start/Stop
- [ ] Creates valid zip that opens in React viewer
- [ ] Opens Explorer showing output on completion

---

## Dependencies

### Required Before Starting

- [ ] Verify current voice recording works (`npm run test:voice`)
- [ ] Verify CDP connection works (`npm run record:connect`)
- [ ] Confirm Python environment has all dependencies

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | ^28.0.0 | Desktop app shell |
| electron-builder | ^24.0.0 | Packaging |
| PyInstaller | ^6.0.0 | Python bundling |
| torch (CPU) | ^2.0.0 | Whisper inference |
| openai-whisper | ^20231117 | Transcription |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large exe size (~1GB) | Accept for POC, optimize post-POC with whisper.cpp |
| PyInstaller compatibility | Test early on clean VMs |
| Antivirus false positives | Sign exe (post-POC) |
| Chrome not installed | Show clear error message with download link |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial POC tasks |
