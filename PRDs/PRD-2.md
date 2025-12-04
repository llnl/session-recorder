# Product Requirements Document: Custom Trace Viewer & Enhanced Debugging

- [Product Requirements Document: Custom Trace Viewer \& Enhanced Debugging](#product-requirements-document-custom-trace-viewer--enhanced-debugging)
  - [1. Problem Statement](#1-problem-statement)
  - [2. Goals](#2-goals)
  - [3. Technical Requirements](#3-technical-requirements)
    - [Console Logging Requirements](#console-logging-requirements)
    - [Custom Trace Viewer Requirements](#custom-trace-viewer-requirements)
    - [Performance Requirements](#performance-requirements)
    - [Data Format Requirements](#data-format-requirements)
  - [4. User Flows](#4-user-flows)
  - [5. Success Criteria](#5-success-criteria)
    - [Console Logging](#console-logging)
    - [Custom Trace Viewer - Functional](#custom-trace-viewer---functional)
    - [Custom Trace Viewer - Performance](#custom-trace-viewer---performance)
    - [Custom Trace Viewer - Usability](#custom-trace-viewer---usability)
  - [6. Non-Goals (Out of Scope for POC 2)](#6-non-goals-out-of-scope-for-poc-2)
  - [7. Dependencies](#7-dependencies)

## 1. Problem Statement

**Current State**: Session recorder (POC 1) successfully captures user actions, snapshots, screenshots, and network requests. An Express viewer provides basic session browsing.

**Remaining Gaps**:

- Express viewer is insufficient for debugging large sessions (1-2 hours, 1000+ actions)
- No timeline visualization with screenshot thumbnails
- No console log capture for debugging errors
- No advanced filtering or time-range selection
- No interactive HTML snapshot viewer with element highlighting
- Sessions are not portable (no zip export/import)

## 2. Goals

**Primary Goal**: Build a sophisticated, performant custom trace viewer for efficient debugging of long recording sessions.

**POC 2 Objectives**:

1. **Custom Trace Viewer**:
   - Handle 1-2 hours of recording data (1000+ actions) efficiently
   - Timeline with screenshot thumbnails for quick navigation
   - Interactive HTML snapshot viewing with element highlighting
   - Time-range filtering with drag selection
   - Organized tab interface (Information, Console, Network, Metadata)
   - Zippable session format for portability

2. **Console Log Capture**:
   - Capture console.log, console.error, console.warn, console.info
   - Associate logs with actions/timestamps
   - Filter logs by time range and severity
   - Display in viewer Console tab

3. **Voice Transcript Integration** (Future):
   - Placeholder support in action list
   - Data structure for transcript entries
   - Timeline integration points

## 3. Technical Requirements

### Console Logging Requirements

- Capture all console methods: log, error, warn, info, debug
- Store log level, message, timestamp, stack trace (for errors)
- Associate with nearest action or standalone timestamp
- Support object/array serialization
- Store in separate `session.console` file (JSON Lines format)
- Minimal performance impact on recording

### Custom Trace Viewer Requirements

**Architecture**:

- Frontend: React + TypeScript + Vite
- Virtual scrolling: React Virtual for action list
- Timeline rendering: Canvas or SVG for performance
- State management: React Context or Zustand
- Zip handling: JSZip for export/import

**UI Components**:

1. **Timeline Component** (Top):
   - Horizontal scrollable timeline with time markers
   - Screenshot thumbnails at action timestamps
   - Hover to preview enlarged thumbnail
   - Click to jump to action
   - Drag to select time range
   - Visual indicator for selected range

2. **Action List Component** (Left Sidebar):
   - Virtual scrolling for 1000+ items
   - Chronological list of actions
   - Show: type, time, target element description
   - Placeholder for voice transcripts (greyed out)
   - Filter based on timeline selection
   - Highlight currently selected action
   - Click to view snapshot in main area

3. **Snapshot Viewer Component** (Main Area):
   - Iframe-based HTML rendering
   - Load before/after snapshots
   - Toggle or side-by-side view
   - Parse `data-recorded-el` attribute
   - Inject CSS to highlight element (visual dot or border)
   - Calculate element position for scrolling
   - Zoom controls
   - Interactive (can click links, scroll within iframe)

4. **Tab Panel Component** (Bottom):
   - **Information Tab**: Action details (type, timestamp, coordinates, element path)
   - **Console Tab**: Filtered console logs with color-coding by severity
   - **Network Tab**: Network waterfall visualization with timing breakdown
   - **Metadata Tab**: Session info, statistics, recording duration

5. **Top Navigation**:
   - Tab switcher: "Metadata" and "Timeline"
   - Session title/ID display
   - Export session as zip button
   - Import session from zip button

### Performance Requirements

- Initial load: <3 seconds for typical session (100-200 actions)
- Large session (1000+ actions): <5 seconds initial load
- Timeline rendering: 60 FPS scrolling
- Virtual scrolling: Only render visible items + buffer
- Lazy loading: Load snapshots on demand, not upfront
- Thumbnail caching: Prevent re-loading images
- Memory management: Unload offscreen snapshots after threshold

### Data Format Requirements

- Support current session.json structure
- Read session.network (JSON Lines)
- Read session.console (JSON Lines, new)
- Support zip import containing:
  - session.json
  - session.network
  - session.console
  - snapshots/ directory
  - screenshots/ directory
  - resources/ directory
- Maintain relative path structure in zip

## 4. User Flows

**User Flow 1: Debugging with Timeline**:

1. User opens trace viewer
2. User imports session (zip or directory)
3. Viewer loads and displays timeline with screenshots
4. User drags on timeline to select time range of interest
5. Action list filters to show only actions in range
6. User clicks action to view before/after snapshot
7. Snapshot viewer highlights the interacted element
8. User views console logs and network requests for that time range

**User Flow 2: Console Error Investigation**:

1. User records session with console errors
2. User opens viewer and switches to Console tab
3. Console tab shows all errors with timestamps
4. User clicks error to jump to that point in timeline
5. Action list scrolls to nearest action
6. Snapshot viewer shows page state when error occurred

**User Flow 3: Session Export/Share**:

1. User completes recording
2. User opens viewer and loads session
3. User clicks "Export Session" button
4. Viewer bundles all files into zip
5. Browser downloads session.zip
6. User shares zip with team member
7. Team member imports zip into their viewer

## 5. Success Criteria

### Console Logging

- ✅ All console methods captured (log, error, warn, info, debug)
- ✅ Logs stored with accurate timestamps
- ✅ Stack traces captured for errors
- ✅ Objects/arrays serialized properly
- ✅ Minimal recording performance impact (<5% overhead)

### Custom Trace Viewer - Functional

- ✅ Timeline displays all screenshot thumbnails chronologically
- ✅ Hover thumbnail shows enlarged preview
- ✅ Click thumbnail navigates to action
- ✅ Drag on timeline creates time-range filter
- ✅ Action list shows all actions with virtual scrolling
- ✅ Click action displays before/after snapshots
- ✅ HTML snapshots load in interactive iframe
- ✅ Visual dot/highlight shows interacted element location
- ✅ Information tab shows action details
- ✅ Console tab shows filtered logs with color-coding
- ✅ Network tab shows filtered requests with timing
- ✅ All tabs filter based on timeline selection
- ✅ Session can be exported as zip
- ✅ Session can be imported from zip

### Custom Trace Viewer - Performance

- ✅ Handles 1000+ actions without lag
- ✅ Virtual scrolling prevents performance degradation
- ✅ Timeline scrolls smoothly at 60 FPS
- ✅ Snapshot lazy loading works correctly
- ✅ Initial load <3s for typical sessions
- ✅ Large session load <5s
- ✅ Memory usage stays under 500MB for 1000+ actions

### Custom Trace Viewer - Usability

- ✅ Intuitive UI matching reference design
- ✅ Keyboard shortcuts work (arrow keys, ESC)
- ✅ Loading states provide feedback
- ✅ Empty states are helpful
- ✅ Error messages are actionable
- ✅ Cross-browser support (Chrome, Firefox, Safari)

## 6. Non-Goals (Out of Scope for POC 2)

- ❌ Action replay or code generation
- ❌ Selector generation/DOM tree viewer
- ❌ Source code viewer or debugging
- ❌ Voice recording capture (transcript integration only)
- ❌ Multi-user collaboration features
- ❌ Cloud storage or session hosting
- ❌ Real-time session streaming
- ❌ Video recording
- ❌ Mobile app version of viewer

## 7. Dependencies

**Console Logging**:

- Playwright's page evaluation API
- Browser console API interception

**Custom Trace Viewer**:

- React 18+
- TypeScript 5+
- Vite 5+
- JSZip for compression
- React Virtual for virtual scrolling
- Modern browser with ES2020+ support
