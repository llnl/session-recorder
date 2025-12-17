# Epic: Voice Recording

<epic>
  <id>recorder-voice</id>
  <initiative>session-recorder</initiative>
  <status>tested</status>
  <name>Voice Recording with Whisper Transcription</name>
  <goal>Capture voice narration during browser recording with automatic transcription</goal>
  <original_prd>PRDs/PRD-4.md</original_prd>
  <original_tasks>PRDs/TASKS-4.md</original_tasks>

  <requirements>
    <requirement id="FR-1" status="done">Audio capture from microphone</requirement>
    <requirement id="FR-2" status="done">Whisper speech-to-text integration</requirement>
    <requirement id="FR-3" status="done">Timestamp synchronization with actions</requirement>
    <requirement id="FR-4" status="done">Visual recording indicator</requirement>
    <requirement id="FR-5" status="done">GPU acceleration support</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
    <dependency type="external">Python 3.8+</dependency>
    <dependency type="external">OpenAI Whisper</dependency>
  </dependencies>
</epic>

---

## Overview

This epic adds voice narration recording to sessions with automatic transcription via OpenAI Whisper. The voice layer runs as a Python subprocess managed by the VoiceRecorder TypeScript class.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Node Wrapper | src/voice/VoiceRecorder.ts | Manages Python subprocess |
| Python Recorder | src/voice/record_and_transcribe.py | Audio capture + transcription |
| Tray Manager | src/node/TrayManager.ts | Visual recording indicator |
| Documentation | docs/VOICE_RECORDING.md | Setup and usage guide |

## Features

- **Multiple Whisper Models**: tiny, base, small, medium, large
- **GPU Acceleration**: CUDA, MPS (Apple Silicon), CPU fallback
- **Audio Formats**: WAV (default), MP3 (optional with ffmpeg)
- **Visual Indicators**: System tray icon + desktop notifications
- **Timestamp Sync**: Voice segments aligned with action timeline

## Current Status (100% Complete)

All features implemented:
- Audio capture working on all platforms
- Whisper transcription with model selection
- UTC timestamp synchronization
- TrayManager with recording indicator

---

## Change Log (from TASKS-4.md)

| Date | Changes |
|------|---------|
| 2025-12-05 | Initial task breakdown for PRD-4 |
| 2025-12-06 | Separated MCP and Desktop to dedicated files |
| 2025-12-10 | Updated to follow template, added Table of Contents and File Reference |
| 2025-12-10 | Consolidated Phase 3 & 6 tests to TASKS-TESTING.md |
