# Implementation Strategy

## 🆕 Latest Updates (2025-12-05)

**New Architecture Documentation:**

- 📘 [PRD-3.md](PRD-3.md) - Playwright-Inspired Snapshot Architecture Analysis
  - Complete breakdown of Playwright's proven 3-phase snapshot system
  - Current implementation gaps and missing components
  - Detailed technical specifications and code examples
- 📋 [TASKS-3.md](TASKS-3.md) - Actionable Implementation Tasks
  - Phase 1: Critical snapshot fixes with restoration script (9 hours)
  - Phase 2: Resource management with SHA1 deduplication (12 hours)
  - Phase 3: Advanced optimization with NodeSnapshot structure (14 hours)

**Key Discovery:** Current snapshot capture is ~70% correct, but **viewer never restores state**. A 4-hour restoration script fix will solve 80% of snapshot issues!

---

## ✅ Already Complete

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

### Sprint 5a: Critical Snapshot Fixes - Playwright Architecture (9 hours) - 🚨 CRITICAL PRIORITY

**Based on:** [PRD-3.md](PRD-3.md) | [TASKS-3.md Phase 1](TASKS-3.md#phase-1-critical-snapshot-fixes-9-hours--high-priority)

**Problem:** Snapshots capture state but never restore it. Form fields appear empty even though values are in attributes.

**Solution:** Implement Playwright's 3-phase architecture (Capture → Storage → Render with restoration script)

1. **Task 1.1: Snapshot Restoration Script** (4h) - CRITICAL → [TASKS-3.md Task 1.1](TASKS-3.md#task-11-create-snapshot-restoration-script-4-hours)
   - Create `snapshotRestoration.ts` with self-executing restoration script
   - Inject script into snapshot HTML in viewer
   - Restore input values: `__playwright_value_` → `input.value`
   - Restore checkbox/radio: `__playwright_checked_` → `input.checked`
   - Restore select options: `__playwright_selected_` → `option.selected`
   - Restore scroll positions: `__playwright_scroll_top_` → `element.scrollTop`
   - Unit tests with JSDOM
   - **Impact:** Fixes 80% of snapshot issues with viewer-only changes

2. **Task 1.2: Capture Additional Interactive State** (3h) - HIGH → [TASKS-3.md Task 1.2](TASKS-3.md#task-12-capture-additional-interactive-state-3-hours)
   - Canvas bounding rects (`__playwright_bounding_rect__`)
   - Iframe positions and dimensions
   - Popover state (`:popover-open` detection)
   - Dialog state (modal vs non-modal)
   - Custom elements tracking
   - **Impact:** Complete interactive state capture

3. **Task 1.3: Fix Shadow DOM Rendering** (2h) - HIGH → [TASKS-3.md Task 1.3](TASKS-3.md#task-13-fix-shadow-dom-template-rendering-2-hours)
   - Declarative Shadow DOM with `<template shadowrootmode="open">`
   - Adopted stylesheets restoration
   - Recursive Shadow DOM traversal
   - Integration tests
   - **Impact:** Shadow DOM components render correctly

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

### Sprint 5c: Resource Management - Playwright Architecture (12 hours) - 📦 MEDIUM PRIORITY

**Based on:** [PRD-3.md](PRD-3.md) | [TASKS-3.md Phase 2](TASKS-3.md#phase-2-resource-management-12-hours--medium-priority)

**Problem:** External CSS, images, and fonts don't load correctly. No resource deduplication leads to massive file sizes.

**Solution:** Implement HAR-like resource storage with SHA1 deduplication (Playwright's proven approach)

1. **Task 2.1: Resource Extraction During Capture** (5h) → [TASKS-3.md Task 2.1](TASKS-3.md#task-21-resource-extraction-during-capture-5-hours)
   - Extract external stylesheets content
   - Convert small images (<100KB) to data URLs
   - Handle CORS gracefully with fallbacks
   - Add `resourceOverrides` array to snapshot data
   - **Impact:** Resources captured for offline viewing

2. **Task 2.2: SHA1-Based Resource Storage** (4h) → [TASKS-3.md Task 2.2](TASKS-3.md#task-22-sha1-based-resource-storage-4-hours)
   - Create `ResourceStorage` class with SHA1 hashing
   - Automatic deduplication (same content = same SHA1)
   - Import/export to JSON format
   - Size tracking and statistics
   - **Impact:** 40%+ file size reduction through deduplication

3. **Task 2.3: Resource Serving in Viewer** (3h) → [TASKS-3.md Task 2.3](TASKS-3.md#task-23-resource-serving-in-viewer-3-hours)
   - Load resources from storage map
   - Intercept fetch requests in iframe
   - Serve resources from blob storage
   - Fallback to network if resource missing
   - **Impact:** External CSS and images render correctly

### Sprint 5d: Performance & Polish (7 hours)

**Note:** Zip export/import removed - session recorder already creates recordings

1. Phase 10: Performance optimization (4h) → [TASKS-2.md Phase 10](TASKS-2.md#phase-10-performance-optimization-4-hours) | [PRD-2.md](PRD-2.md#performance-requirements)
2. Phase 8.3: Metadata view (2h) → [TASKS-2.md Phase 8.3](TASKS-2.md#task-83-create-metadata-view) | [PRD-2.md](PRD-2.md#custom-trace-viewer-requirements)
3. Test: Large session handling (1h)

### Sprint 6: Polish & Ship (6 hours)

1. Phase 11: Remaining styling, keyboard shortcuts, accessibility (3h) → [TASKS-2.md Phase 11](TASKS-2.md#phase-11-styling--polish-3-hours) | [PRD-2.md](PRD-2.md#5-success-criteria)
2. Phase 12: Testing + documentation (3h) → [TASKS-2.md Phase 12](TASKS-2.md#phase-12-testing--documentation-3-hours) | [PRD-2.md](PRD-2.md#5-success-criteria)

### Sprint 7: Advanced Optimization (14 hours) - ⚡ LOW PRIORITY (Future Enhancement)

**Based on:** [PRD-3.md](PRD-3.md) | [TASKS-3.md Phase 3](TASKS-3.md#phase-3-nodesnapshot-optimization-14-hours--low-priority)

**Goal:** Reduce file sizes through structured snapshots and reference caching (40-60% reduction)

**Note:** Only implement this AFTER Sprints 5a-6 are stable. This is a complex refactoring.

1. **Task 3.1: NodeSnapshot Structure** (8h) → [TASKS-3.md Task 3.1](TASKS-3.md#task-31-implement-nodesnapshot-structure-8-hours)
   - Refactor from string-based HTML to structured NodeSnapshot tree
   - Implement reference-based caching for unchanged nodes
   - Post-order indexing for efficient lookups
   - **Impact:** Foundation for file size optimization

2. **Task 3.2: Incremental Snapshots** (6h)
   - Track unchanged DOM subtrees
   - Reference previous snapshots for unchanged nodes
   - Measure and validate file size reduction
   - **Impact:** 40-60% file size reduction for subsequent snapshots

## 📊 Total Effort

### Completed Work ✅

- POC 1: 20 hours ✅
- Console Logging: 3 hours ✅
- Sprint 1 Foundation: 12 hours ✅ (Phase 2: 3h, Phase 3: 2h, Phase 8.4: 2h, Testing: 3h, Auto-Zip: 2h)
- Sprint 2 Core Viewing: 15 hours ✅ (Phase 4: 6h, Phase 5: 4h, Phase 8.1: 2h, Testing: 3h)
- Sprint 3 Snapshot Display: 10 hours ✅ (Phase 6: 5h, Phase 7.2: 2h, Phase 8.2: 2h, Testing: 1h)
- Sprint 4 Debugging Tools: 8 hours ✅ (Phase 7.1: 1h, Phase 7.3: 2h, Phase 7.4: 4h, Testing: 1h)
- **Subtotal Completed: 68 hours** ✅

### Remaining Work (Based on PRD-3.md Playwright Architecture)

- Sprint 5a Snapshot Fixes (Playwright Phase 1): 9 hours 🚨 **CRITICAL** (Restoration: 4h, Additional state: 3h, Shadow DOM: 2h)
- Sprint 5b UI Enhancements: 5 hours 🎯 **HIGH** (Resizable panels: 3h, Hover zoom: 2h)
- Sprint 5c Resource Management (Playwright Phase 2): 12 hours 📦 **MEDIUM** (Extraction: 5h, SHA1 storage: 4h, Serving: 3h)
- Sprint 5d Performance & Polish: 7 hours (Performance: 4h, Metadata: 2h, Testing: 1h) - **Zip export removed**
- Sprint 6 Polish & Ship: 6 hours (Phase 11: 3h, Phase 12: 3h)
- Sprint 7 Advanced Optimization (Playwright Phase 3): 14 hours ⚡ **OPTIONAL** (NodeSnapshot: 8h, Incremental: 6h)
- **Subtotal Remaining: 53 hours** (39 hours core + 14 hours optional)

### Grand Total

- **Core Features: 107 hours** (68 completed ✅ + 39 remaining)
- **With Advanced Optimization: 121 hours** (68 completed ✅ + 53 remaining)

## 🚀 Recommended Path

### Path 1: Critical Snapshot Fix (Sprint 5a only = 9 hours) - 🚨 IMMEDIATE ACTION

**Goal:** Fix broken snapshot rendering (80% of issues)

**What to do:**

- ✅ Sprints 1-4 Complete (68 hours) - Already done
- 🚨 **Sprint 5a Task 1.1 ONLY** (4 hours) - **DO THIS FIRST**
  - Implement restoration script
  - Inject into viewer
  - Test with real forms

**Impact:**

- ✅ Input fields show values
- ✅ Checkboxes show correct state
- ✅ Scroll positions restored
- ✅ NO capture changes needed (viewer-only fix)

**Result:** Snapshots immediately become useful for debugging

---

### Path 2: Complete Playwright Architecture (Sprints 5a + 5b + 5c = 26 hours) - 🎯 RECOMMENDED

**Goal:** Production-grade snapshot system with Playwright's proven architecture

**What to do:**

- 🚨 Sprint 5a (Snapshot Fixes) - 9 hours
  - Restoration script (4h) - fixes 80% of issues
  - Additional state capture (3h) - canvas, popovers, dialogs
  - Shadow DOM fixes (2h) - proper reconstruction
- 🎯 Sprint 5b (UI Enhancements) - 5 hours
  - Resizable panels (3h)
  - Screenshot hover zoom (2h)
- 📦 Sprint 5c (Resource Management) - 12 hours
  - Resource extraction (5h)
  - SHA1 storage with deduplication (4h)
  - Resource serving in viewer (3h)

**Impact:**

- ✅ All snapshots render accurately (95%+ accuracy)
- ✅ Professional UI with resizable panels
- ✅ External CSS/images/fonts work
- ✅ 40%+ file size reduction through deduplication
- ✅ Follows Playwright's battle-tested architecture

**Result:** Production-ready snapshot system matching Playwright trace viewer quality

---

### Path 3: Full Production (Core Features = 107 hours) - 🏆 COMPLETE IMPLEMENTATION

**Goal:** Fully polished, production-ready viewer

**What to do:**

- Path 2 (Sprints 5a + 5b + 5c) - 26 hours
- Sprint 5d (Performance & Polish) - 7 hours
- Sprint 6 (Polish & Ship) - 6 hours

**Impact:**

- ✅ Everything from Path 2
- ✅ Performance optimizations
- ✅ Metadata view
- ✅ Keyboard shortcuts & accessibility
- ✅ Comprehensive documentation

**Result:** Enterprise-grade session recorder ready for production use

---

### Path 4: With Advanced Optimization (121 hours total) - ⚡ FUTURE ENHANCEMENT

**Goal:** Maximum file size reduction (for large sessions)

**What to do:**

- Path 3 (Sprints 1-6) - 107 hours
- Sprint 7 (Advanced Optimization) - 14 hours
  - NodeSnapshot structure refactoring (8h)
  - Incremental snapshots with references (6h)

**Impact:**

- ✅ Everything from Path 3
- ✅ 40-60% file size reduction for subsequent snapshots
- ✅ Faster capture times (~40ms vs ~60ms)

**Note:** Only implement Sprint 7 if file sizes become a real problem. This is complex refactoring.

---

## 💡 Recommendation

**Start with Path 1 (Sprint 5a Task 1.1 only - 4 hours)** to immediately fix snapshot rendering, then evaluate:

- If snapshots work well → Move to Sprint 5b (UI polish)
- If you need better resource handling → Do Sprint 5c next
- Otherwise → Continue with full Path 2 implementation

The Playwright architecture in PRD-3.md is battle-tested and worth following completely.

