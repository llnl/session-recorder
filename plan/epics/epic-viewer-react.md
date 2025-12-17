# Epic: React Viewer Core

<epic>
  <id>viewer-react</id>
  <initiative>session-viewer</initiative>
  <status>tested</status>
  <name>React Trace Viewer</name>
  <goal>Interactive React application for viewing recorded browser sessions</goal>
  <original_prd>PRDs/PRD-2.md</original_prd>
  <original_tasks>PRDs/TASKS-2.md</original_tasks>

  <requirements>
    <requirement id="FR-1" status="done">Console Log Capture</requirement>
    <requirement id="FR-2" status="done">Custom Trace Viewer with timeline, action list, snapshot viewer</requirement>
    <requirement id="FR-3" status="done">Auto-Zip Feature</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
  </dependencies>
</epic>

---

## Overview

This epic implements the React-based session viewer with timeline visualization, action list with virtual scrolling, and snapshot viewer with state restoration.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Timeline | viewer/src/components/Timeline/ | Timeline visualization |
| Action List | viewer/src/components/ActionList/ | Virtual scrolling action list |
| Snapshot Viewer | viewer/src/components/SnapshotViewer/ | HTML snapshot display |
| Tab Panel | viewer/src/components/TabPanel/ | Console, Network, Info tabs |
| Session Store | viewer/src/stores/sessionStore.ts | Zustand state management |

## Completed Features

- Timeline with action markers and thumbnails
- Virtual scrolling action list (1000+ actions)
- Snapshot viewer with form state restoration
- Console log capture and display
- Network request waterfall
- Session zip import/export
- Resizable panels
- Hover zoom on thumbnails

---

## Change Log (from TASKS-2.md)

| Date | Changes |
|------|---------|
| Dec 2024 | Initial POC 2 tasks |
| Dec 2025 | Updated to follow template, added FR sections |
| 2025-12-10 | Marked React viewer complete; moved Zip Export to Session Editor |
