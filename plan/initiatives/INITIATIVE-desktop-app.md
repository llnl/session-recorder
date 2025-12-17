# Initiative: Desktop App

<initiative>
  <name>desktop-app</name>
  <status>implementing</status>
  <goal>Standalone cross-platform desktop application for session recording</goal>
  <description>
    An Electron-based desktop application that bundles the session recorder with a PyInstaller voice
    recorder, allowing non-developers to record browser sessions with voice narration without installing
    any dependencies. Features system tray UI and multi-browser support.
  </description>

  <epics>
    <epic id="poc" status="implementing" blocks="">Desktop POC (PRD-DESKTOP-POC.md)</epic>
    <epic id="full" status="todo" blocks="poc">Full Desktop App (PRD-DESKTOP.md)</epic>
  </epics>

  <success_criteria>
    <criterion status="done">PyInstaller voice bundle working (964 MB)</criterion>
    <criterion status="done">Electron shell with system tray</criterion>
    <criterion status="done">Multi-browser support (Chromium/Firefox/WebKit)</criterion>
    <criterion status="done">Real SessionRecorder integration</criterion>
    <criterion status="done">Windows tray icons working</criterion>
    <criterion status="pending">Clean VM testing</criterion>
    <criterion status="pending">Final packaging</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [poc](../epics/epic-desktop-poc.md) | implementing | [tasks](../tasks/tasks-desktop-poc.json) | Minimal viable desktop app |
| [full](../epics/epic-desktop-full.md) | todo | [tasks](../tasks/tasks-desktop-full.json) | Full-featured desktop app |

---

## Technical Architecture

```
desktop-app/
├── src/
│   ├── main/
│   │   ├── index.ts            # Electron main process
│   │   ├── tray.ts             # System tray management
│   │   ├── recording.ts        # Recording orchestration
│   │   └── config.ts           # Configuration
│   │
│   └── preload/
│       └── preload.ts          # IPC preload script
│
├── resources/
│   └── {platform}/
│       └── voice-recorder/     # PyInstaller bundle
│
├── package.json
└── electron-builder.yml
```

---

## Key Components

### Electron Shell
- Main process orchestrates recording
- System tray UI (idle/recording/processing states)
- No renderer window (tray-only for POC)
- IPC for voice recorder subprocess

### Voice Recorder Bundle (PyInstaller)
- Python 3.11 + sounddevice + openai-whisper + torch
- ~964 MB bundle size
- CPU-only torch for portability
- Cross-platform builds

### SessionRecorder Integration
- Uses parent package SessionRecorder
- Full session data capture
- Transcript saving
- Zip creation

### Multi-Browser Support
- Chromium (default)
- Firefox
- WebKit
- Via Playwright

---

## User Flow (POC)

```
1. User double-clicks SessionRecorder.exe
2. System tray icon appears
3. Right-click -> "Start Recording" -> Select browser
4. Browser opens, user interacts + speaks
5. Right-click -> "Stop Recording"
6. Processing indicator shows
7. File explorer opens showing session.zip
```

---

## Build Process

### Voice Recorder Bundle
```bash
# From session-recorder root
npm run voice:build

# Output: desktop-app/resources/{platform}/voice-recorder/
```

### Electron App
```bash
cd desktop-app
npm install
npm run dev           # Development
npm run electron:build # Production
```

### Platform Builds
```bash
npm run electron:build:win    # Windows (NSIS + portable)
npm run electron:build:mac    # macOS (DMG)
npm run electron:build:linux  # Linux (AppImage + DEB)
```

---

## Size Estimates

| Component | Size |
|-----------|------|
| Electron + Node.js | ~150 MB |
| voice-recorder (PyInstaller) | ~800 MB |
| Chromium (if bundled) | ~150 MB |
| **Total (system Chrome)** | **~950 MB** |
| **Total (bundled Chrome)** | **~1.1 GB** |

### Post-POC Optimizations
- whisper.cpp instead of Python (~50MB vs ~800MB)
- ONNX runtime instead of PyTorch
- Lazy download of voice module

---

## Remaining Work (POC)

- [ ] Test on clean Windows VM
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Build final distributable packages
- [ ] Update documentation

---

## Original PRD References

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD-DESKTOP-POC.md | ~90% Complete | Minimal desktop app |
| PRDs/PRD-DESKTOP.md | Planned | Full desktop features |

---

## Change Log (from original PRDs)

| Date | Source | Changes |
|------|--------|---------|
| 2025-12-06 | PRD-DESKTOP.md | Initial PRD for Desktop Application |
| 2025-12-06 | TASKS-DESKTOP.md | Initial task breakdown for Desktop Application |
| 2025-12-10 | PRD-DESKTOP-POC.md | Initial POC scope |
| 2025-12-12 | PRD-DESKTOP-POC.md | Added microphone selection and file transcription features |
| 2025-12-12 | TASKS-DESKTOP-POC.md | Implementation progress - Phase 1 & 2 complete (code) |
| 2025-12-12 | TASKS-DESKTOP-POC.md | PyInstaller build successful! torch 2.9.1+cpu, whisper 20250625. Bundle: 964 MB |
| 2025-12-12 | TASKS-DESKTOP-POC.md | Voice recording verified! Microphone + Whisper transcription working |
| 2025-12-12 | TASKS-DESKTOP-POC.md | Integration complete! Real SessionRecorder, Windows tray icons fixed |
