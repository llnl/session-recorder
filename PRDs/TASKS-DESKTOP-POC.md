# TASKS-DESKTOP-POC: Desktop App POC Implementation

**PRD:** [PRD-DESKTOP-POC.md](PRD-DESKTOP-POC.md)
**Post-POC:** [PRD-DESKTOP.md](PRD-DESKTOP.md) | [TASKS-DESKTOP.md](TASKS-DESKTOP.md)
**Estimated Effort:** 12 hours
**Status:** In Progress (~90% Complete)

---

## Phase 1: Voice Recorder Bundle (4h)

### 1.1 PyInstaller Setup (1h)

- [x] Create PyInstaller spec file for voice recorder
- [x] Configure CPU-only PyTorch build (exclude CUDA)
- [x] Add Whisper model files to bundle
- [x] Test spec file builds successfully

### 1.2 Voice Recorder Script (1.5h)

- [x] Create standalone `voice_recorder_main.py` entry point
- [x] Add command-line argument parsing (output path, model, duration)
- [x] Implement graceful shutdown on SIGTERM/SIGINT
- [x] Add JSON output for transcript (stdout or file)
- [x] Handle microphone permission errors gracefully
- [x] Allow you to select the microphone you want to record on
- [x] Allow transcription on any wav or mp3 file (without recording)

### 1.3 Build & Test (1.5h)

- [x] Build voice-recorder executable with PyInstaller
- [ ] Test on clean Windows 10 VM (no Python installed)
- [ ] Test on clean Windows 11 VM (no Python installed)
- [x] Verify microphone access and recording
- [x] Verify Whisper transcription works
- [x] Document exe size and startup time (37.2 MB exe, 964 MB bundle)

---

## Phase 2: Electron Shell (4h)

### 2.1 Project Setup (1h)

- [x] Initialize Electron project with TypeScript
- [x] Configure electron-builder for Windows/Mac/Linux
- [x] Set up development workflow
- [x] Create project structure

```
desktop-app/
├── src/
│   ├── main/
│   │   ├── index.ts       # Main process
│   │   ├── config.ts      # Configuration management
│   │   ├── tray.ts        # System tray management
│   │   ├── recorder.ts    # Recording orchestration
│   │   └── voice.ts       # Voice recorder subprocess
│   └── assets/
│       └── (icons embedded as base64)
├── resources/
│   ├── windows/           # Windows voice-recorder bundle
│   ├── macos/             # macOS voice-recorder bundle
│   └── linux/             # Linux voice-recorder bundle
├── package.json
├── tsconfig.json
├── entitlements.mac.plist # macOS entitlements
└── README.md
```

### 2.2 System Tray Implementation (1h)

- [x] Create tray icon with context menu
- [x] Implement "Start Recording" menu item (with browser selection submenu)
- [x] Implement "Stop Recording" menu item
- [x] Implement "Open Output Folder" menu item
- [x] Implement "Quit" menu item
- [x] Add tray icon state changes (idle → recording → processing)
- [x] Add tooltip with current status
- [x] Add voice recording toggle option

### 2.3 Recording Orchestration (1.5h)

- [x] Implement browser launch via Playwright (Chromium/Firefox/WebKit)
- [x] Spawn voice-recorder as subprocess
- [x] Coordinate browser + voice recording start
- [x] Handle browser window close detection
- [x] Implement stop and zip creation
- [x] Open Explorer/Finder to show zip on completion
- [x] Integrated real SessionRecorder from parent package (full session data capture)

### 2.4 Error Handling (0.5h)

- [x] Handle browser not available error
- [x] Handle microphone not available error
- [x] Handle recording failure gracefully
- [x] Show native notification on error
- [ ] Log errors to file for debugging

---

## Phase 3: Packaging (2h)

### 3.1 Build Configuration (1h)

- [x] Configure electron-builder for Windows (NSIS + portable)
- [x] Configure electron-builder for macOS (DMG)
- [x] Configure electron-builder for Linux (AppImage + DEB)
- [x] Include voice-recorder in resources
- [x] Set application metadata (name, version, icon)
- [x] Configure macOS entitlements for microphone access

### 3.2 Build & Test (1h)

- [ ] Build installer (SessionRecorder-Setup.exe)
- [ ] Build portable (SessionRecorder-Portable.exe)
- [ ] Build macOS DMG
- [ ] Build Linux AppImage
- [ ] Test on clean Windows VM
- [ ] Verify all files included correctly
- [ ] Document final bundle size

---

## Phase 4: Polish (2h)

### 4.1 UX Improvements (1h)

- [x] Add tray icon states (idle, recording, processing)
- [x] Add native notifications for status changes
- [x] Show recording duration in tooltip/menu
- [ ] Add keyboard shortcut for stop (if possible)

### 4.2 Error Handling & Edge Cases (0.5h)

- [x] Handle user canceling recording immediately
- [ ] Handle disk full scenario
- [x] Handle browser crash during recording
- [ ] Cleanup temp files on error

### 4.3 Documentation (0.5h)

- [x] Create README for desktop-app
- [x] Document build process
- [x] Document testing procedure
- [x] Update PROGRESS.md with completion status

---

## Success Criteria

- [ ] Single exe/installer download works
- [ ] Works on Windows 10/11 without any prerequisites
- [x] Records browser + voice with single Start/Stop (implemented)
- [x] Creates valid zip that opens in React viewer (with full session data + transcript)
- [x] Opens Explorer showing output on completion (implemented)

---

## Dependencies

### Required Before Starting

- [x] Verify current voice recording works (`npm run test:voice`)
- [x] Verify CDP connection works (`npm run record:connect`)
- [x] Confirm Python environment has all dependencies

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | ^33.0.0 | Desktop app shell |
| electron-builder | ^25.0.0 | Packaging |
| PyInstaller | ^6.0.0 | Python bundling |
| torch (CPU) | ^2.0.0 | Whisper inference |
| openai-whisper | ^20231117 | Transcription |
| playwright | ^1.40.0 | Browser automation |

---

## Implementation Notes

### Multi-Browser Support

Changed from Chrome-only CDP connection to full Playwright browser support:

- **Chromium** - Default, full feature support
- **Firefox** - Full feature support
- **WebKit** - Safari engine, full feature support

### Cross-Platform Support

Desktop app configured for all major platforms:

- **Windows** - NSIS installer + portable exe
- **macOS** - DMG with entitlements for microphone
- **Linux** - AppImage + DEB package

### Voice Recorder Architecture

- PyInstaller bundles Python + Whisper + Torch into single executable
- Same executable works across platforms (built per-platform)
- Falls back to Python script in development mode
- JSON-based IPC via stdin/stdout

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large exe size (~800MB-1GB) | Accept for POC, optimize post-POC with whisper.cpp |
| PyInstaller compatibility | Test early on clean VMs |
| Antivirus false positives | Sign exe (post-POC) |
| Browser not installed | Using Playwright-bundled browsers, no system browser needed |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial POC tasks |
| 2.0 | 2025-12-12 | Implementation progress - Phase 1 & 2 complete (code), Phase 3 & 4 partial |
| 2.1 | 2025-12-12 | **PyInstaller build successful!** torch 2.9.1+cpu, whisper 20250625 working. Custom hooks created to fix pyinstaller-hooks-contrib compatibility issues. Bundle size: 964 MB. |
| 2.2 | 2025-12-12 | **Voice recording verified!** Microphone recording + Whisper transcription tested working on built bundle. Added `--transcript-output` parameter to save transcript to file. |
| 2.3 | 2025-12-12 | **Integration complete!** (1) Fixed TypeScript errors in `config.ts` (null checking) and `index.ts` (event handler signature). (2) Fixed Windows tray icons (RGBA buffer instead of base64 PNG). (3) Integrated real SessionRecorder from parent package (full session data: snapshots, screenshots, resources, network, console). (4) Added transcript.json saving to session directory. Desktop app now produces identical output to CLI recorder. |
