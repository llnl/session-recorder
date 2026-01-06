# Epic: Desktop App Full UI

<epic>
  <id>desktop-full</id>
  <name>Desktop App Full UI</name>
  <status>todo</status>
  <initiative>desktop-app</initiative>
  <depends_on>desktop-poc</depends_on>
  <estimated_effort>20 hours</estimated_effort>
</epic>

## Overview

Full-featured desktop application with polished UI for non-technical users. Built on top of the Desktop POC, this adds the complete user interface, settings management, recent recordings, and system tray integration.

**Source PRD:** [PRD-DESKTOP.md](../../PRDs/PRD-DESKTOP.md)

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| QA Testers | Record test sessions with one-click workflow |
| Product Managers | Create feature walkthroughs with voice narration |
| Support Staff | Document customer issues for escalation |
| Designers | Capture UI/UX feedback sessions |
| Non-Technical Users | Create session recordings without command-line knowledge |

## Goals

1. **Zero technical knowledge required** - Anyone can record sessions
2. **One-click workflow** - Start → Interact → Stop → View
3. **Cross-platform** - Windows, macOS, and Linux support
4. **Professional appearance** - Polished UI suitable for enterprise use

## Success Metrics

| Metric | Target |
|--------|--------|
| Installation success rate | >95% |
| Time to first recording | <2 minutes |
| Recording start time | <3 seconds |
| User satisfaction | >4.5/5 |

## Features

### F1: Main Window UI
- Recording title input (optional)
- Recording mode selection (Browser Only / Voice Only / Browser + Voice)
- Browser selection with button toggles (Chromium / Firefox / WebKit)
- Start/Stop/Pause recording buttons
- Status bar with state indicator

### F2: Recording Status View
- Live timer display
- Action count
- Voice level indicator
- Current URL display
- Pause/Resume button
- Stop button
- Tips/guidance text

### F3: Recording Complete View
- Summary statistics (duration, actions, voice segments)
- File path display
- Open in Viewer button
- Show in Folder button
- New Recording button

### F4: Recent Recordings Panel
- List of past recordings with metadata
- Title, date, duration, action count
- Open/Delete/Show in Folder actions
- Scroll through recording history

### F5: Settings Dialog
- Output directory selection
- Default browser selection
- Whisper model selection
- Startup preferences
- Notification preferences

### F6: System Tray Integration
- Quick Record (Browser) option
- Quick Record (Combined) option
- Open Recordings Folder
- Open Viewer
- Settings access
- Quit option

## Technical Requirements

### TR-1: Electron Architecture
- Main process handles recording and file operations
- Renderer process for React UI
- IPC bridge with preload script
- Context isolation enabled

### TR-2: React Components
- RecordingControls - mode selection and start
- RecordingStatus - live recording view
- RecordingComplete - results display
- RecentRecordings - history list
- SettingsDialog - configuration

### TR-3: State Management
- Zustand for app state
- Recording state (idle/recording/processing/complete)
- Settings persistence in electron-store

### TR-4: Build Configuration
- electron-builder for packaging
- Windows: NSIS installer + portable
- macOS: DMG + code signing
- Linux: AppImage + DEB

## Dependencies

- Desktop POC complete (epic-desktop-poc)
- Voice recorder bundle working
- SessionRecorder library stable

## Out of Scope

- Cloud sync/storage
- Multi-user support
- Remote control capabilities
- Video recording (screen capture)
- Mobile versions
- Auto-update from web

## Implementation Phases

| Phase | Focus | Estimate |
|-------|-------|----------|
| Phase 1 | Main window UI with recording controls | 4 hours |
| Phase 2 | Recording status and complete views | 4 hours |
| Phase 3 | Recent recordings and settings | 4 hours |
| Phase 4 | System tray and quick actions | 4 hours |
| Phase 5 | Testing and cross-platform builds | 4 hours |
| **Total** | | **20 hours** |
