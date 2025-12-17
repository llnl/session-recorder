# Epic: Snapshot Capture

<epic>
  <id>recorder-snapshot</id>
  <initiative>session-recorder</initiative>
  <status>tested</status>
  <name>DOM Snapshot and Screenshot Capture</name>
  <goal>Capture complete DOM state and screenshots for each user action</goal>
  <original_prd>PRDs/PRD-3.md</original_prd>
  <original_tasks>PRDs/TASKS-3.md</original_tasks>

  <requirements>
    <requirement id="FR-1" status="done">DOM serialization with form state</requirement>
    <requirement id="FR-2" status="done">Before/after screenshot pairs</requirement>
    <requirement id="FR-3" status="done">Resource capture and deduplication</requirement>
    <requirement id="FR-4" status="done">Font and styling preservation</requirement>
    <requirement id="FR-5" status="done">Shadow DOM support</requirement>
    <requirement id="FR-6" status="done">Gzip compression for snapshots</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
  </dependencies>
</epic>

---

## Overview

This epic handles capturing the complete visual and DOM state of the browser before and after each user action.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Snapshot Capture | src/browser/snapshotCapture.ts | DOM serialization |
| Resource Storage | src/storage/resourceStorage.ts | SHA1 deduplication |
| Resource Queue | src/storage/ResourceCaptureQueue.ts | Non-blocking capture |
| URL Rewriting | src/node/SessionRecorder.ts | _rewriteHTML, _rewriteCSSUrls |

## Features

### DOM Preservation
- `__playwright_value_` - Input/textarea values
- `__playwright_checked_` - Checkbox/radio states
- `__playwright_selected_` - Select option states
- `__playwright_scroll_top/left_` - Scroll positions
- `data-recorded-el="true"` - Acted-upon element marker
- Shadow DOM via `<template shadowrootmode="open">`

### Screenshot Capture
- JPEG format (configurable, default 75% quality)
- Before/after pairs for each action
- Viewport screenshots (configurable full-page)

### Resource Management
- SHA1 content-addressable storage
- Deduplication across snapshots
- Non-blocking ResourceCaptureQueue
- Font capture via network handler
- CSS url() rewriting for offline viewing

## Current Status (100% Complete)

All features implemented and optimized for performance.

---

## Change Log (from TASKS-3.md)

| Date | Changes |
|------|---------|
| 2025-12-05 | Initial task breakdown |
| 2025-12-10 | Updated to follow template, added Table of Contents and File Reference |
