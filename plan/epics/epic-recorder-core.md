# Epic: Browser Recording Core

<epic>
  <id>recorder-core</id>
  <initiative>session-recorder</initiative>
  <status>tested</status>
  <name>Browser Recording Core</name>
  <goal>Capture user browser interactions with before/after DOM snapshots and screenshots</goal>
  <original_prd>PRDs/PRD.md</original_prd>
  <original_tasks>PRDs/TASKS.md</original_tasks>

  <requirements>
    <requirement id="FR-1" status="done">Action Capture - Click, input, change, submit, keydown events</requirement>
    <requirement id="FR-2" status="done">Snapshot Capture - DOM serialization with form state</requirement>
    <requirement id="FR-3" status="done">Screenshot Capture - Before/after PNG screenshots</requirement>
    <requirement id="FR-4" status="done">Data Storage - Session directory with JSON metadata</requirement>
  </requirements>

  <dependencies>
    <dependency type="none" />
  </dependencies>
</epic>

---

## Overview

This epic implements the core browser recording functionality for the session recorder. It captures user actions (clicks, inputs, etc.) along with before/after DOM snapshots and screenshots.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Action Listener | src/browser/actionListener.ts | Capture phase event listeners |
| Snapshot Capture | src/browser/snapshotCapture.ts | DOM serialization |
| Browser Coordinator | src/browser/injected.ts | Coordinates browser modules |
| Session Recorder | src/node/SessionRecorder.ts | Main API class |
| Types | src/node/types.ts | TypeScript interfaces |

## Completed Features

- Click events with x/y coordinates
- Input events with value
- Change events (select, checkbox, radio)
- Submit events (form)
- Keydown events (Enter, Tab, Escape)
- Before/after DOM snapshots
- Form state preservation (inputs, checkboxes, selects)
- Scroll position capture
- Shadow DOM support
- PNG screenshots
- Session JSON with metadata

---

## Change Log (from TASKS.md)

| Date | Changes |
|------|---------|
| Dec 2024 | Initial POC 1 tasks |
| Dec 2025 | Updated to follow template, added FR sections, implementation links |
