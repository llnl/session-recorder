# Session Recorder - POC 2 Tasks

Table of Contents:

- [Session Recorder - POC 2 Tasks](#session-recorder---poc-2-tasks)
  - [Phase 1: Console Log Capture (3 hours) ✅ COMPLETE](#phase-1-console-log-capture-3-hours--complete)
  - [Phase 2: Custom Trace Viewer - Project Setup (3 hours) ✅ COMPLETE](#phase-2-custom-trace-viewer---project-setup-3-hours--complete)
  - [Phase 3: State Management \& Data Structures (2 hours) ✅ COMPLETE](#phase-3-state-management--data-structures-2-hours--complete)
  - [Phase 4: Timeline Component (6 hours)](#phase-4-timeline-component-6-hours)
  - [Phase 5: Action List Component (4 hours)](#phase-5-action-list-component-4-hours)
  - [Phase 6: Snapshot Viewer Component (5 hours)](#phase-6-snapshot-viewer-component-5-hours)
  - [Phase 7: Tab Panel Components (6 hours)](#phase-7-tab-panel-components-6-hours)
  - [Phase 8: Layout \& Integration (4 hours)](#phase-8-layout--integration-4-hours)
  - [Phase 9: Zip Export/Import (3 hours)](#phase-9-zip-exportimport-3-hours)
  - [Phase 10: Performance Optimization (4 hours)](#phase-10-performance-optimization-4-hours)
  - [Phase 11: Styling \& Polish (3 hours)](#phase-11-styling--polish-3-hours)
  - [Phase 12: Testing \& Documentation (3 hours)](#phase-12-testing--documentation-3-hours)
  - [Estimated Effort](#estimated-effort)
    - [POC 2 Implementation](#poc-2-implementation)
    - [Summary](#summary)
  - [Implementation Priority](#implementation-priority)

## Phase 1: Console Log Capture (3 hours) ✅ COMPLETE

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

## Phase 2: Custom Trace Viewer - Project Setup (3 hours) ✅ COMPLETE

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

## Phase 4: Timeline Component (6 hours)

**Task 4.1**: Build timeline canvas renderer

- [ ] Create `src/components/Timeline/TimelineCanvas.tsx`
- [ ] Calculate time scale (pixels per second)
- [ ] Render time markers (0s, 5s, 10s, etc.)
- [ ] Render action indicators at correct positions
- [ ] Add horizontal scroll handling
- [ ] Optimize canvas updates (only redraw on change)

**Task 4.2**: Add screenshot thumbnails

- [ ] Create `src/components/Timeline/Thumbnail.tsx`
- [ ] Load thumbnail images from session
- [ ] Position thumbnails on timeline
- [ ] Implement hover state with enlarged preview
- [ ] Add click handler to jump to action
- [ ] Lazy load thumbnails as they enter viewport

**Task 4.3**: Implement timeline selection

- [ ] Add mouse down/move/up handlers
- [ ] Draw selection rectangle on canvas
- [ ] Calculate start/end timestamps from selection
- [ ] Emit selection change event to store
- [ ] Add "Clear Selection" button
- [ ] Show selection duration indicator

**Task 4.4**: Timeline component integration

- [ ] Create `src/components/Timeline/Timeline.tsx` (wrapper)
- [ ] Integrate canvas and thumbnails
- [ ] Add responsive sizing
- [ ] Add loading skeleton
- [ ] Test with small and large sessions

## Phase 5: Action List Component (4 hours)

**Task 5.1**: Create action list structure

- [ ] Create `src/components/ActionList/ActionList.tsx`
- [ ] Integrate React Virtual for virtual scrolling
- [ ] Render action items (type, time, target description)
- [ ] Add placeholder for voice transcripts (greyed out)
- [ ] Style list items with hover states

**Task 5.2**: Implement filtering and selection

- [ ] Connect to filtered actions from store
- [ ] Highlight currently selected action
- [ ] Implement click handler to select action
- [ ] Auto-scroll to selected action
- [ ] Add empty state ("No actions in selected time range")

**Task 5.3**: Add search/filter controls

- [ ] Add search input for action type filtering
- [ ] Add filter dropdown (show all, clicks only, inputs only, etc.)
- [ ] Update filtered list based on search/filter
- [ ] Show result count

## Phase 6: Snapshot Viewer Component (5 hours)

**Task 6.1**: Create iframe-based snapshot viewer

- [ ] Create `src/components/SnapshotViewer/SnapshotViewer.tsx`
- [ ] Render before/after iframes
- [ ] Load HTML snapshot content
- [ ] Handle base URL for relative resources
- [ ] Add loading spinner
- [ ] Handle errors (missing snapshots)

**Task 6.2**: Implement element highlighting

- [ ] Parse `data-recorded-el` attribute from before snapshot HTML
- [ ] Query element in iframe after load
- [ ] Inject CSS to highlight element (border + background)
- [ ] Add visual dot indicator at element position
- [ ] Calculate element viewport position
- [ ] Auto-scroll iframe to show element

**Task 6.3**: Add snapshot controls

- [ ] Create toggle switch: "Before" / "After"
- [ ] Or implement side-by-side split view
- [ ] Add zoom in/out buttons
- [ ] Add reset view button
- [ ] Display snapshot metadata (timestamp, URL)
- [ ] Handle keyboard shortcuts (B/A for before/after)

## Phase 7: Tab Panel Components (6 hours)

**Task 7.1**: Create tab panel structure

- [ ] Create `src/components/TabPanel/TabPanel.tsx`
- [ ] Implement tab switching UI
- [ ] Add tabs: Information, Console, Network
- [ ] Connect to active tab state

**Task 7.2**: Information tab

- [ ] Create `src/components/TabPanel/InformationTab.tsx`
- [ ] Display selected action details:
  - Action type, timestamp (formatted)
  - Coordinates (x, y)
  - Target element selector/path
  - Before/after URLs
  - Viewport size
- [ ] Add section for voice transcript (placeholder)
- [ ] Style as key-value pairs

**Task 7.3**: Console tab

- [ ] Create `src/components/TabPanel/ConsoleTab.tsx`
- [ ] Display filtered console logs from store
- [ ] Color-code by log level (red=error, yellow=warn, blue=info, grey=log)
- [ ] Show timestamp for each entry
- [ ] Show log message and serialized arguments
- [ ] Expand/collapse stack traces for errors
- [ ] Add "Clear" button
- [ ] Add filter dropdown (all, errors only, warnings only)

**Task 7.4**: Network tab

- [ ] Create `src/components/TabPanel/NetworkTab.tsx`
- [ ] Display filtered network requests from store
- [ ] Show: method, URL, status, size, timing
- [ ] Implement network waterfall visualization:
  - Horizontal bars showing request lifecycle
  - Color-coded by phase (DNS, connect, TTFB, download)
  - Aligned to timeline scale
- [ ] Add click to expand request/response details
- [ ] Add filter by resource type (XHR, script, stylesheet, image, etc.)
- [ ] Add sort options (time, duration, size)

## Phase 8: Layout & Integration (4 hours)

**Task 8.1**: Create main application layout

- [ ] Create `src/App.tsx` with grid layout:
  - Top: Timeline (fixed height, e.g. 150px)
  - Left: Action List (20-30% width, scrollable)
  - Main: Snapshot Viewer (fill remaining space)
  - Bottom: Tab Panel (30-40% height, resizable)
- [ ] Implement CSS Grid or Flexbox layout
- [ ] Make layout responsive (handle window resize)
- [ ] Add resize handles between sections

**Task 8.2**: Implement top navigation

- [ ] Create `src/components/TopNav/TopNav.tsx`
- [ ] Add tab switcher: "Metadata" and "Timeline" views
- [ ] Add session title/ID display
- [ ] Add "Export Session" button (triggers zip export)
- [ ] Add "Import Session" button (file picker + zip import)
- [ ] Add session statistics (action count, duration, etc.)

**Task 8.3**: Create metadata view

- [ ] Create `src/components/MetadataView/MetadataView.tsx`
- [ ] Display session metadata:
  - Session ID, start time, end time, duration
  - Total actions, screenshots, resources
  - Recording browser, viewport size
- [ ] Display session statistics:
  - Action type breakdown (pie chart or list)
  - Most common actions
  - Total network requests, console logs
- [ ] Make it a separate view (alternative to Timeline view)

**Task 8.4**: Wire up state and data flow ✅ COMPLETE

- [x] Connect all components to session store
- [x] Implement action selection flow:
  - Click action → update selectedActionIndex
  - Update snapshot viewer with before/after (stub component)
  - Update Information tab with details
- [ ] Implement timeline selection flow:
  - Drag timeline → update timelineSelection
  - Filter actions, console, network in all tabs
- [ ] Test full integration with sample session

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

## Phase 9: Zip Export/Import (3 hours)

**Task 9.1**: Implement zip export

- [ ] Create `src/utils/exportSession.ts`
- [ ] Use JSZip to bundle:
  - session.json
  - session.network
  - session.console
  - All files in snapshots/
  - All files in screenshots/
  - All files in resources/
- [ ] Generate zip file
- [ ] Trigger browser download with filename
- [ ] Add progress indicator for large sessions
- [ ] Handle export errors gracefully

**Task 9.2**: Implement zip import

- [ ] Create `src/utils/importSession.ts`
- [ ] Add file input in TopNav
- [ ] Read zip file using JSZip
- [ ] Extract all files
- [ ] Validate session structure (check required files exist)
- [ ] Parse session.json
- [ ] Load data into session store
- [ ] Handle import errors (show error modal)
- [ ] Add progress indicator for large zip files

**Task 9.3**: Test export/import workflow

- [ ] Test export with small session
- [ ] Test export with large session (1000+ actions)
- [ ] Test import of exported zip
- [ ] Verify all data loads correctly
- [ ] Test error handling (corrupt zip, missing files)
- [ ] Verify cross-platform compatibility (Windows, Mac, Linux)

## Phase 10: Performance Optimization (4 hours)

**Task 10.1**: Optimize rendering performance

- [ ] Implement React.memo for expensive components
- [ ] Use useMemo for filtered data calculations
- [ ] Use useCallback for event handlers
- [ ] Profile component render times (React DevTools)
- [ ] Identify and fix unnecessary re-renders
- [ ] Optimize canvas rendering (RAF, dirty regions)

**Task 10.2**: Optimize large session handling

- [ ] Implement thumbnail lazy loading (intersection observer)
- [ ] Implement snapshot lazy loading (load on demand)
- [ ] Add pagination or windowing for 1000+ actions
- [ ] Optimize network data parsing (stream parsing for JSON Lines)
- [ ] Add progressive loading (show UI before all data loaded)
- [ ] Cache parsed data (avoid re-parsing on navigation)

**Task 10.3**: Add performance monitoring

- [ ] Track load times (performance.now())
- [ ] Track memory usage (performance.memory)
- [ ] Add performance budgets in development
- [ ] Test with 100, 500, 1000, 2000 action sessions
- [ ] Optimize bundle size (code splitting, tree shaking)
- [ ] Run Lighthouse audit

**Task 10.4**: Memory management

- [ ] Unload offscreen snapshots (clear iframe content)
- [ ] Limit thumbnail cache size
- [ ] Use WeakMap for cached data where possible
- [ ] Test memory usage over extended viewing session
- [ ] Add memory warnings if threshold exceeded

## Phase 11: Styling & Polish (3 hours)

**Task 11.1**: Implement design system

- [ ] Define color palette (primary, secondary, error, warning, etc.)
- [ ] Define typography scale
- [ ] Create CSS variables or theme object
- [ ] Style all components consistently
- [ ] Add hover/active/focus states
- [ ] Ensure WCAG AA contrast compliance

**Task 11.2**: Add UI polish

- [ ] Loading states with spinners/skeletons
- [ ] Empty states with helpful messages
- [ ] Error states with actionable guidance
- [ ] Success notifications (e.g., "Session exported successfully")
- [ ] Smooth transitions and animations (subtle)
- [ ] Keyboard shortcuts:
  - Arrow keys: Navigate actions
  - B/A: Switch before/after snapshots
  - ESC: Clear timeline selection
  - Ctrl+E: Export session
- [ ] Add tooltips for icon buttons

**Task 11.3**: Accessibility improvements

- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works throughout
- [ ] Add skip links for navigation
- [ ] Test with screen reader
- [ ] Ensure focus indicators are visible
- [ ] Add alt text for images

## Phase 12: Testing & Documentation (3 hours)

**Task 12.1**: Test viewer functionality

- [ ] Test with small session (10-20 actions)
- [ ] Test with medium session (100-200 actions)
- [ ] Test with large session (1000+ actions)
- [ ] Test timeline interaction (drag, click, hover)
- [ ] Test all tab functionality
- [ ] Test console log filtering
- [ ] Test network waterfall rendering
- [ ] Test snapshot element highlighting
- [ ] Test zip export/import
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Test on different screen sizes

**Task 12.2**: Create viewer documentation

- [ ] Create `viewer/README.md`
- [ ] Document build commands:
  - `npm run dev` - Development server
  - `npm run build` - Production build
  - `npm run preview` - Preview production build
- [ ] Document usage:
  - How to load a session
  - How to use timeline
  - How to export/import sessions
- [ ] Document keyboard shortcuts
- [ ] Add troubleshooting section
- [ ] Add architecture overview

**Task 12.3**: Create user guide

- [ ] Create `viewer/USER_GUIDE.md`
- [ ] Add screenshots of main features
- [ ] Walkthrough of typical debugging workflow
- [ ] Tips for working with large sessions
- [ ] FAQ section

---

## Estimated Effort

### POC 2 Implementation

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Console Log Capture | 3 ✅ |
| 2 | Viewer Project Setup | 3 ✅ |
| 3 | State Management | 2 ✅ |
| 4 | Timeline Component | 6 |
| 5 | Action List Component | 4 |
| 6 | Snapshot Viewer Component | 5 |
| 7 | Tab Panel Components | 6 |
| 8 | Layout & Integration | 4 ✅ |
| 8.5 | Auto-Zip Feature | 2 ✅ |
| 9 | Zip Export/Import | 3 |
| 10 | Performance Optimization | 4 |
| 11 | Styling & Polish | 3 |
| 12 | Testing & Documentation | 3 |
| **Total** | | **48 hours** |

### Summary

| Component | Hours |
|-----------|-------|
| Console Log Capture | 3 ✅ |
| Custom Trace Viewer | 45 |
| **Grand Total** | **48 hours** |
| **Completed** | **12 hours** ✅ |
| **Remaining** | **36 hours** |

---

## Implementation Priority

**Must Have (MVP)**:

1. Console log capture (3 hours) ✅
2. Viewer project setup & state (5 hours)
3. Timeline with thumbnails (6 hours)
4. Action list (4 hours)
5. Snapshot viewer with highlighting (5 hours)
6. Information & Console tabs (4 hours)
7. Basic layout integration (2 hours)

**Should Have** (After MVP):
8. Network tab with waterfall (2 hours)
9. Zip export/import (3 hours)
10. Performance optimization (4 hours)

**Nice to Have** (Polish):
11. Styling & polish (3 hours)
12. Comprehensive testing & docs (3 hours)

**Minimum Viable Viewer**: ~29 hours (Phases 1-6 + basic layout)
**Full-Featured Viewer**: 46 hours (All phases)
