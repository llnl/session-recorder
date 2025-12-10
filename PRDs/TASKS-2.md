# Custom Trace Viewer & Enhanced Debugging (POC 2) - Implementation Tasks

**PRD:** [PRD-2.md](PRD-2.md)
**Last Updated:** 2025-12-10
**Overall Status:** ✅ Complete (React viewer done, Angular migration next)

---

## Table of Contents

- [FR-1: Console Log Capture](#fr-1-console-log-capture--complete)
- [FR-2: Custom Trace Viewer](#fr-2-custom-trace-viewer--complete)
- [FR-3: Auto-Zip Feature](#fr-3-auto-zip-feature--complete)
- [Phase 9: Zip Export/Import](#phase-9-zip-exportimport--moved)
- [Phase 10: Performance Optimization](#phase-10-performance-optimization-4-hours-complete)
- [Phase 11: Styling & Polish](#phase-11-styling--polish--complete--moved)
- [Phase 12: Testing & Documentation](#phase-12-testing--documentation--moved)
- [Backlog](#backlog)
- [Estimated Effort](#estimated-effort)
- [Implementation Priority](#implementation-priority)
- [File Reference](#file-reference)
- [Document Change Log](#document-change-log)

---

## FR-1: Console Log Capture ✅ COMPLETE

> **PRD Reference:** [FR-1: Console Log Capture](PRD-2.md#fr-1-console-log-capture)

### Phase 1: Console Log Capture (3 hours) ✅ COMPLETE

**Implementation:** [consoleCapture.ts](../src/browser/consoleCapture.ts)

**Task 1.1**: Implement browser-side console capture ✅

- [x] Create `src/browser/consoleCapture.ts`
- [x] Override console methods (log, error, warn, info, debug)
- [x] Serialize arguments (handle objects, arrays, functions)
- [x] Capture stack traces for errors
- [x] Call Node.js via exposed function
- [x] Restore original console methods on cleanup

**Task 1.2**: Implement node-side console logging ✅

- [x] Add `ConsoleEntry` interface to `types.ts`
- [x] Create `session.console` file in session directory
- [x] Implement `_handleConsoleLog()` in SessionRecorder
- [x] Write console entries in JSON Lines format
- [x] Add console log count to session metadata
- [x] Update SessionData interface with console field

**Task 1.3**: Test console logging ✅

- [x] Add console logging to test-page.html
- [x] Create `test/console-test.ts`
- [x] Test all log levels
- [x] Test object/array serialization
- [x] Test error stack traces
- [x] Verify JSON Lines format
- [x] Verify performance impact is minimal

---

## FR-2: Custom Trace Viewer ✅ COMPLETE

> **PRD Reference:** [FR-2: Custom Trace Viewer](PRD-2.md#fr-2-custom-trace-viewer)

**Implementation:** [viewer/](../viewer/)

### Phase 2: Custom Trace Viewer - Project Setup (3 hours) ✅ COMPLETE

> [PRD: FR-2.1](PRD-2.md#fr-21-timeline-component)

**Task 2.1**: Initialize React project ✅

- [x] Create `viewer/` directory (separate from Express viewer)
- [x] Run `npm create vite@latest` with React + TypeScript template
- [x] Install dependencies:

  ```json
  {
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "jszip": "^3.10.1",
      "react-virtual": "^2.10.4",
      "zustand": "^4.4.7"
    },
    "devDependencies": {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.2.0",
      "typescript": "^5.3.0",
      "vite": "^5.0.0"
    }
  }
  ```

- [x] Configure `vite.config.ts` for development
- [x] Setup `tsconfig.json` with strict mode

**Task 2.2**: Create project structure ✅

- [x] Create directory structure:
  - `src/components/Timeline/`
  - `src/components/ActionList/`
  - `src/components/SnapshotViewer/`
  - `src/components/TabPanel/`
  - `src/hooks/`
  - `src/utils/`
  - `src/types/`
  - `src/stores/`
- [x] Create base component files (empty templates)
- [x] Setup CSS modules or styling solution

**Task 2.3**: Create data loading utilities ✅

- [x] Create `src/types/session.ts` (import from recorder types)
- [x] Create `src/utils/sessionLoader.ts`:
  - Load session.json
  - Parse JSON Lines files (network, console)
  - Load resources from directory or zip
- [x] Create `src/utils/zipHandler.ts`:
  - Import session from zip (JSZip)
  - Export session to zip (JSZip)
  - Validate session structure
- [x] Add error handling for corrupt files

## Phase 3: State Management & Data Structures (2 hours) ✅ COMPLETE

**Task 3.1**: Create global state store ✅

- [x] Create `src/stores/sessionStore.ts` (Zustand)
- [x] Define state shape:
  - sessionData, actions, networkEntries, consoleLogs
  - selectedActionIndex, timelineSelection
  - activeTab, loading, error
- [x] Implement actions: loadSession, selectAction, setTimeRange, etc.
- [x] Add derived selectors for filtered data

**Task 3.2**: Create custom hooks ✅

- [x] Create `src/hooks/useFilteredActions.ts` (filter by time range)
- [x] Create `src/hooks/useFilteredConsole.ts` (filter console logs)
- [x] Create `src/hooks/useFilteredNetwork.ts` (filter network requests)
- [x] Create `src/hooks/useVirtualList.ts` (wrapper for TanStack Virtual)

## Phase 4: Timeline Component (6 hours) ✅ COMPLETE

**Task 4.1**: Build timeline canvas renderer ✅

- [x] Create `src/components/Timeline/TimelineCanvas.tsx` (integrated in Timeline.tsx)
- [x] Calculate time scale (pixels per second)
- [x] Render time markers (0s, 5s, 10s, etc.)
- [x] Render action indicators at correct positions
- [x] Add horizontal scroll handling
- [x] Optimize canvas updates (only redraw on change)

**Task 4.2**: Add screenshot thumbnails ✅

- [x] Create thumbnail rendering (integrated in Timeline.tsx)
- [x] Load thumbnail images from session resources
- [x] Position thumbnails on timeline
- [x] Implement hover state with visual feedback (scale + border)
- [x] Add hover tooltip with larger image preview ✅ **COMPLETED Sprint 5b**
- [x] Add click handler to jump to action
- [x] Display thumbnails from resource blobs

**Task 4.3**: Implement timeline selection ✅

- [x] Add mouse down/move/up handlers
- [x] Draw selection rectangle on canvas
- [x] Calculate start/end timestamps from selection
- [x] Emit selection change event to store
- [x] Add "Clear Selection" button
- [x] Show selection duration indicator in header

**Task 4.4**: Timeline component integration ✅

- [x] Create `src/components/Timeline/Timeline.tsx` (wrapper)
- [x] Integrate canvas and thumbnails
- [x] Add responsive sizing
- [x] Add loading states
- [x] Test with build compilation

## Phase 5: Action List Component (4 hours) ✅ COMPLETE

**Task 5.1**: Create action list structure ✅

- [x] Create `src/components/ActionList/ActionList.tsx`
- [x] Integrate TanStack Virtual for virtual scrolling
- [x] Render action items (type, time, target description)
- [x] Display action value and key details
- [x] Style list items with hover states

**Task 5.2**: Implement filtering and selection ✅

- [x] Connect to filtered actions from store
- [x] Highlight currently selected action
- [x] Implement click handler to select action
- [x] Auto-scroll to selected action
- [x] Add empty state ("No actions in selected time range")

**Task 5.3**: Search/filter controls ✅ DEFERRED

> **Note:** Search/filter controls deferred to Angular migration. See [PRD-angular-migration.md](PRD-angular-migration.md).

- [x] Show result count (implemented)

**Note:** Voice transcript integration moved to [PRD-4.md](PRD-4.md) and [TASKS-4.md](TASKS-4.md)

## Phase 6: Snapshot Viewer Component (5 hours) ✅ COMPLETE

**Task 6.1**: Create iframe-based snapshot viewer ✅

- [x] Create `src/components/SnapshotViewer/SnapshotViewer.tsx`
- [x] Render before/after iframes
- [x] Load HTML snapshot content from resources
- [x] Handle base URL for relative resources
- [x] Add loading spinner
- [x] Handle errors (missing snapshots)

**Task 6.2**: Implement element highlighting ✅

- [x] Parse `data-recorded-el` attribute from before snapshot HTML
- [x] Query element in iframe after load
- [x] Inject CSS to highlight element (border + background)
- [x] Add visual dot indicator at element position
- [x] Calculate element viewport position
- [x] Auto-scroll iframe to show element

**Task 6.3**: Add snapshot controls ✅

- [x] Create toggle switch: "Before" / "After"
- [x] Add zoom in/out buttons (50% - 200%)
- [x] Add reset view button
- [x] Display snapshot metadata (timestamp, URL, viewport)
- [x] Smooth transitions and animations

## Phase 7: Tab Panel Components (6 hours) ✅ COMPLETE

**Task 7.1**: Create tab panel structure ✅ COMPLETE

- [x] Create `src/components/TabPanel/TabPanel.tsx`
- [x] Implement tab switching UI
- [x] Add tabs: Information, Console, Network, Metadata
- [x] Connect to active tab state

**Task 7.2**: Information tab ✅ COMPLETE

- [x] Information tab integrated in TabPanel.tsx
- [x] Display selected action details:
  - Action type, timestamp (formatted)
  - Coordinates (x, y)
  - Value and key for input actions
  - URL
  - Viewport size
- [x] Style as key-value pairs with clean layout
- [x] Empty state handling

**Task 7.3**: Console tab ✅ COMPLETE

- [x] Console tab integrated in TabPanel.tsx
- [x] Display filtered console logs from store
- [x] Color-code by log level (red=error, yellow=warn, blue=info, grey=log, purple=debug)
- [x] Show timestamp for each entry
- [x] Show log message and serialized arguments with proper formatting
- [x] Expand/collapse stack traces for errors
- [x] Add "Clear Filter" button
- [x] Add filter dropdown (all, errors only, warnings only, info, logs, debug) with counts

**Task 7.4**: Network tab ✅ COMPLETE

- [x] Network tab integrated in TabPanel.tsx
- [x] Display filtered network requests from store
- [x] Show: method, URL, status, cached indicator, duration
- [x] Implement network waterfall visualization:
  - Horizontal bars showing request lifecycle phases
  - Color-coded by phase (DNS=purple, connect=orange, TTFB=green, download=blue)
  - Proportional to timing breakdown
- [x] Add click to expand request/response details
- [x] Expandable detailed view showing: type, size, status, content-type, timing breakdown, errors
- [x] Add filter by resource type (all, document, stylesheet, script, image, xhr, fetch, font, other)
- [x] Add sort options (time, duration, size)

## Phase 8: Layout & Integration (4 hours) ✅ COMPLETE

**Task 8.1**: Create main application layout ✅

- [x] Create `src/App.tsx` with grid layout:
  - Top: Timeline (fixed height, 150px)
  - Left: Action List (300px width, scrollable)
  - Main: Snapshot Viewer (fill remaining space)
  - Bottom: Tab Panel (300px height, fixed)
- [x] Implement Flexbox layout
- [x] Make layout responsive (handle window resize)
- [x] Add resize handles between sections ✅ **COMPLETED Sprint 5b**

**Task 8.2**: Implement top navigation ✅ COMPLETE

- [x] Top navigation integrated in App.tsx header
- [x] Add session title/ID display
- [x] Add "Export Session" button (triggers zip export)
- [x] Import handled by SessionLoader component
- [x] Add session statistics (action count, duration, requests, logs)
- [x] Responsive header layout with visual styling

**Task 8.3**: Wire up state and data flow ✅ COMPLETE

- [x] Connect all components to session store
- [x] Implement action selection flow:
  - Click action → update selectedActionIndex
  - Update snapshot viewer with before/after (stub component)
  - Update Information tab with details
- [x] Implement timeline selection flow:
  - Drag timeline → update timelineSelection
  - Filter actions, console, network in all tabs
- [x] Test full integration with build compilation

---

## FR-3: Auto-Zip Feature ✅ COMPLETE

> **PRD Reference:** [FR-3: Auto-Zip Feature](PRD-2.md#fr-3-auto-zip-feature)

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)

**Task 8.5**: Auto-Zip Feature (2 hours) ✅ COMPLETE

- [x] Install archiver package and TypeScript types
- [x] Implement `SessionRecorder.createZip()` method:
  - Create zip with maximum compression (level 9)
  - Place files at root level (not in subfolder)
  - Return path to created zip file
  - Log file size and path
- [x] Update test scripts to auto-zip after recording:
  - Update `test/spa-test.ts`
  - Update `test/console-test.ts`
- [x] Test zip creation and verify structure:
  - Test with console-test (small session)
  - Test with spa-test (larger session)
  - Verify zip loads correctly in viewer
  - Confirm files are at root level
- [x] Documentation: Update PRD and implementation plan

## Phase 9: Zip Export/Import ✅ MOVED

> **Note:** Zip export/import functionality moved to Session Editor. See [TASKS-session-editor.md](TASKS-session-editor.md#task-41-modify-export-utility).

---

## Phase 10: Performance Optimization (4 hours) COMPLETE

> **Note:** Core optimizations done. Additional performance work moved to Angular migration. See [PRD-angular-migration.md](PRD-angular-migration.md).

**Task 10.1**: Optimize rendering performance ✅ COMPLETE

- [x] Implement React.memo for expensive components ✅ (Timeline, ActionList, SnapshotViewer, TabPanel)
- [x] Use useMemo for filtered data calculations ✅ (useFilteredActions, useFilteredConsole, useFilteredNetwork)
- [x] Use useCallback for event handlers ✅ (implemented across components)
- [x] Profile component render times → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Identify and fix unnecessary re-renders → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Optimize canvas rendering (RAF, dirty regions) ✅ (Timeline canvas optimized)

**Task 10.2**: Optimize large session handling ✅ COMPLETE

- [x] Implement thumbnail lazy loading → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Implement snapshot lazy loading → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Add pagination or windowing for 1000+ actions ✅ (TanStack Virtual implemented)
- [x] Optimize network data parsing → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Add progressive loading → [TASKS-angular-migration.md](TASKS-angular-migration.md)
- [x] Cache parsed data (avoid re-parsing on navigation) ✅ (session store caching)

**Task 10.3**: Add performance monitoring ✅ MOVED

> Moved to [TASKS-angular-migration.md](TASKS-angular-migration.md) - Will use Angular DevTools.

**Task 10.4**: Memory management ✅ MOVED

> Moved to [TASKS-angular-migration.md](TASKS-angular-migration.md) - Will use Angular component lifecycle.

## Phase 11: Styling & Polish ✅ COMPLETE / MOVED

**Completed Items:**

- [x] **Resizable Panels**: Drag handles between sections ✅ **Sprint 5b**
- [x] **Timeline Screenshot Hover Zoom**: Enlarged preview on hover ✅ **Sprint 5b**

> **Note:** Remaining styling, accessibility, and polish work moved to Angular migration. The Angular app already has an established Angular Material theme. See [PRD-angular-migration.md](PRD-angular-migration.md).

---

## Phase 12: Testing & Documentation ✅ MOVED

> **Note:** Testing and documentation will be done after Angular migration is complete. The Session Editor page in the Angular app will include all testing and documentation as part of the migration effort.
>
> See [PRD-angular-migration.md](PRD-angular-migration.md) and [TASKS-angular-migration.md](TASKS-angular-migration.md) for testing requirements.

---

## Backlog

> **Moved:** Multi-Tab Timeline Support moved to [TASKS-angular-migration.md](TASKS-angular-migration.md#backlog-future-enhancements) - will be implemented in Angular.

---

## Estimated Effort

### POC 2 Implementation

| Phase | Task | Hours | Status |
|-------|------|-------|--------|
| 1 | Console Log Capture | 3 | ✅ Complete |
| 2 | Viewer Project Setup | 3 | ✅ Complete |
| 3 | State Management | 2 | ✅ Complete |
| 4 | Timeline Component | 6 | ✅ Complete |
| 5 | Action List Component | 4 | ✅ Complete |
| 6 | Snapshot Viewer Component | 5 | ✅ Complete |
| 7 | Tab Panel Components | 6 | ✅ Complete |
| 8 | Layout & Integration | 4 | ✅ Complete |
| 8.5 | Auto-Zip Feature | 2 | ✅ Complete |
| 9 | Zip Export/Import | - | ➡️ Moved to Session Editor |
| 10 | Performance Optimization | 2 | ⚠️ Partial (rest deferred to Angular) |
| 11 | Styling & Polish | - | ➡️ Moved to Angular Migration |
| 12 | Testing & Documentation | - | ➡️ Moved to Angular Migration |
| **Total Completed** | | **37 hours** | |

### Summary

| Component | Hours | Status |
|-----------|-------|--------|
| Console Log Capture | 3 | ✅ Complete |
| Custom Trace Viewer (React) | 34 | ✅ Complete |
| Performance Optimization | 2 | ⚠️ Partial |
| **POC 2 Completed** | **39 hours** | ✅ |
| **Backlog** | ~5 hours | ➡️ Moved to Angular |

---

## Implementation Priority

**✅ COMPLETE (MVP + Should Have)**:

1. ✅ Console log capture (3 hours)
2. ✅ Viewer project setup & state (5 hours)
3. ✅ Timeline with thumbnails (6 hours)
4. ✅ Action list (4 hours)
5. ✅ Snapshot viewer with highlighting (5 hours)
6. ✅ Information & Console tabs (4 hours)
7. ✅ Basic layout integration (2 hours)
8. ✅ Network tab with waterfall (2 hours)
9. ✅ Resizable panels & hover zoom (Sprint 5b)
10. ⚠️ Performance optimization (partial)

**➡️ MOVED TO OTHER PRDs**:

- Zip export/import → [TASKS-session-editor.md](TASKS-session-editor.md)
- Styling & polish → [PRD-angular-migration.md](PRD-angular-migration.md)
- Testing & docs → [TASKS-angular-migration.md](TASKS-angular-migration.md)

**📋 BACKLOG** → [TASKS-angular-migration.md](TASKS-angular-migration.md#backlog-future-enhancements):

- Multi-Tab Timeline Support (moved to Angular)

---

## File Reference

### Browser Components

- [consoleCapture.ts](../src/browser/consoleCapture.ts) - Console log interception

### Viewer Components

- [viewer/](../viewer/) - React trace viewer application
- [Timeline/](../viewer/src/components/Timeline/) - Timeline with thumbnails
- [ActionList/](../viewer/src/components/ActionList/) - Virtual scrolling action list
- [SnapshotViewer/](../viewer/src/components/SnapshotViewer/) - HTML snapshot display
- [TabPanel/](../viewer/src/components/TabPanel/) - Console, Network, Info tabs
- [ResizablePanel/](../viewer/src/components/ResizablePanel/) - Resizable layout panels

### Stores & Hooks

- [sessionStore.ts](../viewer/src/stores/sessionStore.ts) - Zustand state management
- [useFilteredActions.ts](../viewer/src/hooks/useFilteredActions.ts) - Action filtering hook
- [useFilteredConsole.ts](../viewer/src/hooks/useFilteredConsole.ts) - Console filtering hook
- [useFilteredNetwork.ts](../viewer/src/hooks/useFilteredNetwork.ts) - Network filtering hook

### Utilities

- [sessionLoader.ts](../viewer/src/utils/sessionLoader.ts) - Session data loading
- [zipHandler.ts](../viewer/src/utils/zipHandler.ts) - Zip import/export

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial POC 2 tasks |
| 1.1 | December 2025 | Updated to follow template, added FR sections, moved resolved issues to TASKS-3 |
| 1.2 | 2025-12-10 | Marked React viewer complete; moved Zip Export to Session Editor; moved Styling, Testing, Performance monitoring to Angular migration; added Multi-Tab Backlog |
| 1.3 | 2025-12-10 | Moved Multi-Tab Backlog to TASKS-angular-migration.md |
