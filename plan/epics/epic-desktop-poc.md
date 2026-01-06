# Epic: Desktop App POC

<epic>
  <id>desktop-poc</id>
  <initiative>desktop-app</initiative>
  <status>implementing</status>
  <name>Desktop App POC</name>
  <goal>Standalone Electron app for session recording without dependencies</goal>
  <original_prd>PRDs/PRD-DESKTOP-POC.md</original_prd>
  <original_tasks>PRDs/TASKS-DESKTOP-POC.md</original_tasks>

  <requirements>
    <requirement id="Phase1" status="done">Voice Recorder Bundle - PyInstaller bundled Python/Whisper</requirement>
    <requirement id="Phase2" status="done">Electron Shell - System tray UI with recording controls</requirement>
    <requirement id="Phase3" status="done">Packaging - electron-builder configuration</requirement>
    <requirement id="Phase4" status="implementing">Polish - Testing and final packaging</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
    <dependency type="epic">recorder-voice</dependency>
  </dependencies>
</epic>

---

## Overview

This epic creates a minimal viable desktop application that allows anyone to record browser sessions with voice narration without installing any dependencies.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Main Process | desktop-app/src/main/index.ts | Electron entry point |
| Tray Manager | desktop-app/src/main/tray.ts | System tray UI |
| Recording | desktop-app/src/main/recording.ts | Recording orchestration |
| PyInstaller Spec | src/voice/voice-recorder.spec | Voice bundle build |

## User Flow

1. User double-clicks SessionRecorder.exe
2. System tray icon appears
3. Right-click -> "Start Recording" -> Select browser
4. Browser opens, user interacts + speaks
5. Right-click -> "Stop Recording"
6. File explorer opens showing session.zip

## Current Status (~90% Complete)

### Completed
- PyInstaller voice bundle working (964 MB)
- Electron shell with system tray
- Multi-browser support (Chromium/Firefox/WebKit)
- Real SessionRecorder integration
- Windows tray icons fixed
- Transcript saving

### Remaining
- Clean VM testing
- Final packaging
- Documentation

---

## Change Log (from TASKS-DESKTOP-POC.md)

| Date | Changes |
|------|---------|
| 2025-12-10 | Initial POC tasks |
| 2025-12-12 | Implementation progress - Phase 1 & 2 complete (code), Phase 3 & 4 partial |
| 2025-12-12 | PyInstaller build successful! torch 2.9.1+cpu, whisper 20250625. Bundle: 964 MB |
| 2025-12-12 | Voice recording verified! Microphone recording + Whisper transcription working |
| 2025-12-12 | Integration complete! Real SessionRecorder, Windows tray icons, transcript.json saving |
