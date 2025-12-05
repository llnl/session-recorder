# Implementation Strategy

✅ Already Complete

1. POC 1: Session Recorder (Phases 1-10) - 20 hours → [TASKS.md Phases 1-10](TASKS.md) | [PRD.md](PRD.md)
2. POC 2 Phase 1: Console Logging (3 hours) → [TASKS-2.md Phase 1](TASKS-2.md#phase-1-console-log-capture-3-hours--complete) | [PRD-2.md](PRD-2.md#console-logging-requirements)
3. POC 2 Phase 2: React + Vite viewer project (3 hours) → [TASKS-2.md Phase 2](TASKS-2.md#phase-2-custom-trace-viewer---project-setup-3-hours--complete) | [PRD-2.md](PRD-2.md#3-technical-requirements)
4. POC 2 Phase 3: Zustand state management + custom hooks (2 hours) → [TASKS-2.md Phase 3](TASKS-2.md#phase-3-state-management--data-structures-2-hours--complete) | [PRD-2.md](PRD-2.md#3-technical-requirements)
5. POC 2 Phase 8.4: Wire up basic data flow (2 hours) → [TASKS-2.md Phase 8.4](TASKS-2.md#task-84-wire-up-state-and-data-flow) | [PRD-2.md](PRD-2.md#3-technical-requirements)

## 🎯 Recommended Implementation Order

### Sprint 1: Foundation (10 hours) - ✅ 100% COMPLETE

1. ✅ Phase 2: Initialize React + Vite viewer project (3h) → [TASKS-2.md Phase 2](TASKS-2.md#phase-2-custom-trace-viewer---project-setup-3-hours--complete) | [PRD-2.md](PRD-2.md#3-technical-requirements)
2. ✅ Phase 3: Setup Zustand state management + custom hooks (2h) → [TASKS-2.md Phase 3](TASKS-2.md#phase-3-state-management--data-structures-2-hours--complete) | [PRD-2.md](PRD-2.md#3-technical-requirements)
3. ✅ Phase 8.4: Wire up basic data flow (2h) → [TASKS-2.md Phase 8.4](TASKS-2.md#task-84-wire-up-state-and-data-flow) | [PRD-2.md](PRD-2.md#3-technical-requirements)
4. ✅ Test: Load and display session data (3h)
5. ✅ Auto-Zip Feature: Automatic zip creation after recording (2h)
   - Added archiver package dependency
   - Implemented SessionRecorder.createZip() method with maximum compression
   - Updated spa-test.ts and console-test.ts to auto-zip after recording
   - Fixed zip structure to place files at root level for viewer compatibility
   - Tested and verified with both SPA and console test sessions

### Sprint 2: Core Viewing (15 hours) - ✅ 100% COMPLETE

1. ✅ Phase 4: Timeline with canvas + thumbnails + selection (6h) → [TASKS-2.md Phase 4](TASKS-2.md#phase-4-timeline-component-6-hours--complete) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
2. ✅ Phase 5: Action list with virtual scrolling (4h) → [TASKS-2.md Phase 5](TASKS-2.md#phase-5-action-list-component-4-hours--complete) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
3. ✅ Phase 8.1: Create main grid layout (2h) → [TASKS-2.md Phase 8.1](TASKS-2.md#task-81-create-main-application-layout) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
4. ✅ Test: Navigation and filtering (3h)
   - Implemented Timeline component with canvas rendering
   - Time markers and action indicators on timeline
   - Screenshot thumbnails with hover states
   - Drag selection for time-range filtering
   - Virtual scrolling for action list
   - Auto-scroll to selected action
   - Main grid layout with flexbox
   - Build compilation successful

### Sprint 3: Snapshot Display (10 hours) - ✅ 100% COMPLETE

1. ✅ Phase 6: Snapshot viewer with iframe + element highlighting (5h) → [TASKS-2.md Phase 6](TASKS-2.md#phase-6-snapshot-viewer-component-5-hours--complete) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
2. ✅ Phase 7.2: Information tab (2h) → [TASKS-2.md Phase 7.2](TASKS-2.md#task-72-information-tab) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
3. ✅ Phase 8.2: Top navigation (2h) → [TASKS-2.md Phase 8.2](TASKS-2.md#task-82-implement-top-navigation) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
4. ✅ Test: Snapshot viewing workflow (1h)
   - Implemented iframe-based snapshot viewer with before/after toggle
   - Element highlighting with data-recorded-el attribute parsing
   - Visual dot indicator and automatic scroll-to-view
   - Zoom controls (50%-200%) with smooth transitions
   - Snapshot metadata display (URL, viewport, timestamp)
   - Information tab showing complete action details
   - Session statistics in header (actions, duration, requests, logs)
   - Error and loading states with user feedback
   - Build compilation successful

### Sprint 4: Debugging Tools (8 hours) - ✅ 100% COMPLETE

1. ✅ Phase 7.3: Console tab with filtering (2h) → [TASKS-2.md Phase 7.3](TASKS-2.md#task-73-console-tab) | [PRD-2.md](PRD-2.md#console-logging-requirements)
2. ✅ Phase 7.4: Network tab with waterfall (4h) → [TASKS-2.md Phase 7.4](TASKS-2.md#task-74-network-tab) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
3. ✅ Phase 7.1: Tab panel structure (1h) → [TASKS-2.md Phase 7.1](TASKS-2.md#task-71-create-tab-panel-structure) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
4. ✅ Test: Console and network inspection (1h)
   - Implemented Console tab with level filtering (all, error, warn, info, log, debug)
   - Added clear filter button with counts for each level
   - Implemented stack trace expansion for error logs
   - Better formatting for complex objects and arguments
   - Implemented Network tab with waterfall visualization
   - Color-coded timing phases (DNS, connect, TTFB, download)
   - Added resource type filtering (all, document, stylesheet, script, image, xhr, fetch, font, other)
   - Added sorting options (time, duration, size)
   - Click to expand/collapse request details
   - Detailed timing breakdown in expanded view
   - Build compilation successful

### Sprint 5a: Critical Bug Fixes (9 hours) - 🚨 HIGH PRIORITY

1. **Fix Input Value Capture** (2h) - CRITICAL → [TASKS-2.md Issue 1](TASKS-2.md#known-issues--bug-fixes) | [PRD-2.md](PRD-2.md#critical-issues)
   - Serialize input values to DOM attributes before snapshot
   - Handle textarea, select, checkbox, radio states
   - Test with various input types and form interactions
2. **Fix Incomplete HTML Snapshots** (4h) - HIGH → [TASKS-2.md Issue 2](TASKS-2.md#known-issues--bug-fixes) | [PRD-2.md](PRD-2.md#high-priority-issues)
   - Add configurable delay after actions (wait for renders/animations)
   - Wait for resources to load (images, fonts, stylesheets)
   - Handle Shadow DOM serialization
   - Capture scroll position and restore in viewer
   - Capture computed styles for dynamic elements
3. **Fix Resource Loading** (3h) - MEDIUM → [TASKS-2.md Issue 3](TASKS-2.md#known-issues--bug-fixes) | [PRD-2.md](PRD-2.md#high-priority-issues)
   - Ensure images captured as data URLs or SHA1 refs
   - Handle CSS background images
   - Capture and embed web fonts
   - Test with various resource types

### Sprint 5b: UI Enhancements (5 hours) - 🎯 HIGH PRIORITY

1. **Resizable Panels** (3h) - HIGH → [TASKS-2.md Task 11.2](TASKS-2.md#phase-11-styling--polish-3-hours) | [PRD-2.md](PRD-2.md#enhancement-requests)
   - Add drag handles between sections (Timeline/Content, ActionList/Snapshot, Snapshot/TabPanel)
   - Save panel sizes to localStorage
   - Implement min/max size constraints
   - Smooth resize animations
2. **Screenshot Hover Zoom** (2h) - HIGH → [TASKS-2.md Task 11.2](TASKS-2.md#phase-11-styling--polish-3-hours) | [PRD-2.md](PRD-2.md#enhancement-requests)
   - Show enlarged preview on timeline thumbnail hover
   - Tooltip with action details (type, timestamp, target)
   - Position tooltip to avoid edge clipping
   - Smooth fade-in/out transitions

### Sprint 5c: Export & Optimization (10 hours)

1. Phase 9: Zip export/import (3h) → [TASKS-2.md Phase 9](TASKS-2.md#phase-9-zip-exportimport-3-hours) | [PRD-2.md](PRD-2.md#data-format-requirements)
2. Phase 10: Performance optimization (4h) → [TASKS-2.md Phase 10](TASKS-2.md#phase-10-performance-optimization-4-hours) | [PRD-2.md](PRD-2.md#performance-requirements)
3. Phase 8.3: Metadata view (2h) → [TASKS-2.md Phase 8.3](TASKS-2.md#task-83-create-metadata-view) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
4. Test: Large session handling (1h)

### Sprint 6: Polish & Ship (6 hours)

1. Phase 11: Remaining styling, keyboard shortcuts, accessibility (3h) → [TASKS-2.md Phase 11](TASKS-2.md#phase-11-styling--polish-3-hours) | [PRD-2.md](PRD-2.md#5-success-criteria)
2. Phase 12: Testing + documentation (3h) → [TASKS-2.md Phase 12](TASKS-2.md#phase-12-testing--documentation-3-hours) | [PRD-2.md](PRD-2.md#5-success-criteria)

## 📊 Total Effort

- POC 1: 20 hours ✅
- Console Logging: 3 hours ✅
- Sprint 1 Foundation: 12 hours ✅ (Phase 2: 3h, Phase 3: 2h, Phase 8.4: 2h, Testing: 3h, Auto-Zip: 2h)
- Sprint 2 Core Viewing: 15 hours ✅ (Phase 4: 6h, Phase 5: 4h, Phase 8.1: 2h, Testing: 3h)
- Sprint 3 Snapshot Display: 10 hours ✅ (Phase 6: 5h, Phase 7.2: 2h, Phase 8.2: 2h, Testing: 1h)
- Sprint 4 Debugging Tools: 8 hours ✅ (Phase 7.1: 1h, Phase 7.3: 2h, Phase 7.4: 4h, Testing: 1h)
- Sprint 5a Bug Fixes: 9 hours 🚨 (Input values: 2h, Incomplete snapshots: 4h, Resources: 3h)
- Sprint 5b UI Enhancements: 5 hours 🎯 (Resizable panels: 3h, Hover zoom: 2h)
- Sprint 5c Export & Optimization: 10 hours (Phase 9: 3h, Phase 10: 4h, Phase 8.3: 2h, Testing: 1h)
- Sprint 6 Polish & Ship: 6 hours (Phase 11 remaining: 3h, Phase 12: 3h)
- **Grand Total: 101 hours** (64 hours completed ✅, **37 hours remaining**)

## 🚀 Recommended Path

### Critical Path (Sprints 1-4 + 5a + 5b = 59 hours)
Delivers a fully functional viewer with accurate snapshots and professional UX:

- ✅ Sprint 1 (Foundation) - 12 hours - **COMPLETE**
- ✅ Sprint 2 (Core Viewing) - 15 hours - **COMPLETE**
- ✅ Sprint 3 (Snapshot Display) - 10 hours - **COMPLETE**
- ✅ Sprint 4 (Debugging Tools) - 8 hours - **COMPLETE**
- 🚨 Sprint 5a (Bug Fixes) - 9 hours - **CRITICAL PRIORITY** (fixes input values, incomplete snapshots, resource loading)
- 🎯 Sprint 5b (UI Enhancements) - 5 hours - **HIGH PRIORITY** (resizable panels, hover zoom)

**Delivers**: Fully functional viewer with accurate snapshots, resizable UI, all debugging tools, professional UX

### Full Production Path (All Sprints = 101 hours)
Adds performance optimizations, export features, and polish:

- Add Sprint 5c (Export & Optimization) - 10 hours
- Add Sprint 6 (Polish & Ship) - 6 hours

**Delivers**: Production-ready viewer with all features, optimizations, keyboard shortcuts, accessibility, and comprehensive documentation

