# Custom Trace Viewer & Enhanced Debugging (POC 2) - Product Requirements Document

**Version:** 1.1
**Last Updated:** December 2025
**Status:** ✅ Complete
**Depends On:** [PRD.md](PRD.md) (POC 1 - Complete)

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Target Users](#target-users)
- [Problem Statement](#problem-statement)
- [Use Cases](#use-cases)
- [Functional Requirements](#functional-requirements)
- [Technical Requirements](#technical-requirements)
- [Quality Attributes](#quality-attributes)
- [Future Considerations](#future-considerations)
- [Dependencies](#dependencies)
- [Document Change Log](#document-change-log)

---

## Executive Summary

The Custom Trace Viewer & Enhanced Debugging system extends the Browser Session Recorder (POC 1) with a sophisticated React-based viewer for debugging long recording sessions. The system adds console log capture, network request monitoring, and a timeline-based interface with virtual scrolling to handle 1000+ action sessions efficiently. Key features include screenshot thumbnails, time-range filtering, and interactive HTML snapshot viewing with element highlighting.

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Developers** | Debug complex user interaction flows, investigate console errors |
| **QA Engineers** | Review test session recordings, analyze network behavior |
| **Support Staff** | View customer bug reproduction sessions |

---

## Problem Statement

**Current State**: Session recorder (POC 1) successfully captures user actions, snapshots, screenshots, and network requests. An Express viewer provides basic session browsing.

**Remaining Gaps**:

- Express viewer is insufficient for debugging large sessions (1-2 hours, 1000+ actions)
- No timeline visualization with screenshot thumbnails
- No console log capture for debugging errors
- No advanced filtering or time-range selection
- No interactive HTML snapshot viewer with element highlighting
- Sessions are not portable (no zip export/import)

---

## Use Cases

### UC-1: Debugging with Timeline

**Actor:** Developer
**Duration:** 5-30 minutes
**Scenario:** User opens trace viewer, imports a session, and uses the timeline with screenshots to navigate to a specific time range of interest. They click actions to view before/after snapshots and correlate console logs and network requests.

**Requirements:**

- Timeline with screenshot thumbnails
- Time-range drag selection
- Filtered action list
- Console and network tabs filtered by time range

### UC-2: Console Error Investigation

**Actor:** Developer
**Duration:** 5-15 minutes
**Scenario:** User records a session with console errors, opens viewer, switches to Console tab to see all errors with timestamps, clicks error to jump to that point in timeline, and views page state when error occurred.

**Requirements:**

- Console log capture with timestamps
- Color-coded severity levels
- Click-to-navigate from log entry
- Stack trace display

### UC-3: Session Export/Share

**Actor:** QA Engineer
**Duration:** 2-5 minutes
**Scenario:** User completes recording, exports session as zip file, shares with team member who imports zip into their viewer.

**Requirements:**

- One-click zip export
- Portable file format
- Zip import functionality

---

## Functional Requirements

### FR-1: Console Log Capture ✅ COMPLETE

**Implementation:** [consoleCapture.ts](../src/browser/consoleCapture.ts)

> Capture all console methods and associate with actions/timestamps

#### FR-1.1: Console Methods ✅

| Method | Captured | Status |
|--------|----------|--------|
| console.log | Message, timestamp, arguments | ✅ Complete |
| console.error | Message, timestamp, stack trace | ✅ Complete |
| console.warn | Message, timestamp, arguments | ✅ Complete |
| console.info | Message, timestamp, arguments | ✅ Complete |
| console.debug | Message, timestamp, arguments | ✅ Complete |

#### FR-1.2: Storage Format ✅

- JSON Lines format (`session.console`)
- Minimal performance impact (<5% overhead)
- Object/array serialization

### FR-2: Custom Trace Viewer ✅ COMPLETE

**Implementation:** [viewer/](../viewer/)

#### FR-2.1: Timeline Component ✅

- Horizontal scrollable timeline with time markers
- Screenshot thumbnails at action timestamps
- Hover to preview enlarged thumbnail
- Click to jump to action
- Drag to select time range

#### FR-2.2: Action List Component ✅

- Virtual scrolling for 1000+ items
- Chronological list of actions
- Filter based on timeline selection
- Click to view snapshot

#### FR-2.3: Snapshot Viewer Component ✅

- Iframe-based HTML rendering
- Before/after snapshot toggle
- Element highlighting via `data-recorded-el`
- Zoom controls (50%-200%)

#### FR-2.4: Tab Panel Component ✅

| Tab | Content | Status |
|-----|---------|--------|
| Information | Action details (type, timestamp, coordinates) | ✅ Complete |
| Console | Filtered console logs with color-coding | ✅ Complete |
| Network | Network waterfall visualization | ✅ Complete |
| Metadata | Session info and statistics | ✅ Complete |

### FR-3: Auto-Zip Feature ✅ COMPLETE

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)

- Automatic zip creation when recording stops
- Maximum compression (level 9)
- Root-level file placement for viewer compatibility
- All session components included

### FR-4: Voice Recording Integration

> See [PRD-4.md](PRD-4.md) for voice recording with transcription, desktop application, and MCP server

---

## Technical Requirements

### TR-1: Viewer Architecture ✅ COMPLETE

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React + TypeScript + Vite | ✅ Complete |
| Virtual Scrolling | TanStack Virtual | ✅ Complete |
| Timeline Rendering | Canvas | ✅ Complete |
| State Management | Zustand | ✅ Complete |
| Zip Handling | JSZip | ✅ Complete |

### TR-2: Performance ✅ COMPLETE

| Metric | Target | Status |
|--------|--------|--------|
| Initial load (100-200 actions) | <3 seconds | ✅ Achieved |
| Large session (1000+ actions) | <5 seconds | ✅ Achieved |
| Timeline scrolling | 60 FPS | ✅ Achieved |
| Memory usage (1000+ actions) | <500MB | ✅ Achieved |

### TR-3: Data Format Support ✅ COMPLETE

- session.json (session metadata)
- session.network (JSON Lines)
- session.console (JSON Lines)
- Zip import/export with all components

---

## Quality Attributes

### QA-1: Console Logging ✅ COMPLETE

- All console methods captured (log, error, warn, info, debug)
- Logs stored with accurate timestamps
- Stack traces captured for errors
- Objects/arrays serialized properly
- Minimal recording performance impact (<5% overhead)

### QA-2: Auto-Zip ✅ COMPLETE

- Zip automatically created when recording stops
- Maximum compression applied
- Files placed at root level for viewer compatibility
- All session components included in zip

### QA-3: Viewer Functionality ✅ COMPLETE

- Timeline displays all screenshot thumbnails chronologically
- Hover thumbnail shows enlarged preview
- Click thumbnail navigates to action
- Drag on timeline creates time-range filter
- Action list shows all actions with virtual scrolling
- HTML snapshots load in interactive iframe
- Visual dot/highlight shows interacted element location
- Before/After snapshot toggle with smooth transitions
- Zoom controls (50%-200%) for snapshot inspection
- All tabs filter based on timeline selection

### QA-4: Viewer Performance ✅ COMPLETE

- Handles 1000+ actions without lag
- Virtual scrolling prevents performance degradation
- Timeline scrolls smoothly at 60 FPS
- Initial load <3s for typical sessions
- Memory usage stays under 500MB for 1000+ actions

### QA-5: Viewer Usability ✅ COMPLETE

- Intuitive UI matching reference design
- Keyboard shortcuts work (arrow keys, ESC)
- Loading states provide feedback
- Cross-browser support (Chrome, Firefox, Safari)

---

## Known Issues (Resolved)

> **Note:** Critical snapshot issues were resolved in [PRD-3.md](PRD-3.md) Sprint 5a.

### Resolved Issues ✅

| Issue | Resolution | PRD Reference |
|-------|------------|---------------|
| Input values not captured | Snapshot restoration script | [PRD-3.md](PRD-3.md) |
| Incomplete HTML snapshots | Playwright architecture implementation | [PRD-3.md](PRD-3.md) |
| Resource loading in snapshots | SHA1-based resource storage | [PRD-3.md](PRD-3.md) |
| Resizable panels | Implemented in Sprint 5b | ✅ Complete |
| Screenshot hover zoom | Implemented in Sprint 5b | ✅ Complete |

---

## Future Considerations

### Not In Scope (POC 2)

| Feature | Rationale |
|---------|-----------|
| Action replay or code generation | Future enhancement |
| Selector generation/DOM tree viewer | Future enhancement |
| Source code viewer or debugging | Out of scope |
| Voice recording capture | Moved to [PRD-4.md](PRD-4.md) |
| Desktop application | Moved to [PRD-DESKTOP.md](PRD-DESKTOP.md) |
| MCP server integration | Moved to [PRD-MCP.md](PRD-MCP.md) |
| Multi-user collaboration | Future enhancement |
| Cloud storage or session hosting | Future enhancement |
| Real-time session streaming | Future enhancement |
| Video recording | Future enhancement |
| Mobile app version of viewer | Future enhancement |

### Implemented in Later PRDs

- Snapshot architecture improvements → [PRD-3.md](PRD-3.md)
- Voice recording → [PRD-4.md](PRD-4.md)
- Desktop application → [PRD-DESKTOP.md](PRD-DESKTOP.md)
- MCP server → [PRD-MCP.md](PRD-MCP.md)

---

## Dependencies

### Console Logging

- Playwright's page evaluation API
- Browser console API interception

### Custom Trace Viewer

| Dependency | Version | Purpose |
|------------|---------|---------|
| React | 18+ | Frontend framework |
| TypeScript | 5+ | Type safety |
| Vite | 5+ | Build tool |
| JSZip | Latest | Zip compression |
| TanStack Virtual | Latest | Virtual scrolling |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial POC 2 PRD |
| 1.1 | December 2025 | Updated to follow template, added FR/TR/QA numbering, resolved issues moved to PRD-3 |
