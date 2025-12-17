# Initiative: Session Viewer

<initiative>
  <name>session-viewer</name>
  <status>tested</status>
  <goal>React-based viewer for exploring and analyzing recorded browser sessions</goal>
  <description>
    A React + Vite application that provides an interactive interface for viewing recorded sessions.
    Features include timeline visualization, action list with virtual scrolling, snapshot viewer with
    state restoration, and voice playback with word-level highlighting.
  </description>

  <epics>
    <epic id="react" status="tested" blocks="">React Viewer Core (PRD-2.md)</epic>
    <epic id="voice-ui" status="tested" blocks="react">Voice Integration UI (PRD-4.md Phase 2)</epic>
  </epics>

  <success_criteria>
    <criterion status="done">Timeline with action markers and voice segments</criterion>
    <criterion status="done">Action list with virtual scrolling (1000+ actions)</criterion>
    <criterion status="done">Snapshot viewer with form state restoration</criterion>
    <criterion status="done">Voice playback with word highlighting</criterion>
    <criterion status="done">Resource loading from session zip</criterion>
    <criterion status="done">Lazy loading with LRU cache</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [react](../epics/epic-viewer-react.md) | tested | [tasks](../tasks/tasks-viewer-react.json) | Timeline, action list, snapshot viewer |
| [voice-ui](../epics/epic-viewer-voice.md) | tested | [tasks](../tasks/tasks-viewer-voice.json) | Voice timeline, transcript viewer |

---

## Technical Architecture

```
viewer/
├── src/
│   ├── components/
│   │   ├── Timeline/           # Timeline visualization
│   │   │   └── Timeline.tsx
│   │   ├── ActionList/         # Virtual scrolling action list
│   │   │   └── ActionList.tsx
│   │   ├── SnapshotViewer/     # HTML snapshot display
│   │   │   └── SnapshotViewer.tsx
│   │   ├── VoiceTranscript/    # Voice playback UI
│   │   │   └── VoiceTranscriptViewer.tsx
│   │   └── SessionLoader/      # Zip file loading
│   │       └── SessionLoader.tsx
│   │
│   ├── stores/
│   │   └── sessionStore.ts     # Zustand state management
│   │
│   ├── hooks/
│   │   └── useLazyResource.ts  # Lazy loading hook
│   │
│   └── types/
│       └── session.ts          # TypeScript interfaces
│
├── package.json
└── vite.config.ts
```

---

## Key Features

### Timeline Component
- Visual timeline with action markers
- Voice segment bars (green)
- Note indicators (amber)
- Zoom and pan controls
- Click to select action

### Action List Component
- Virtual scrolling (react-virtual)
- Action type icons
- Voice transcript entries
- Edit/delete buttons (editor mode)
- Insert points for notes

### Snapshot Viewer Component
- Before/after snapshot tabs
- Form state restoration script
- Resource URL rewriting
- Element highlighting
- Scroll position restoration

### Voice Playback
- Audio player controls
- Word-level highlighting
- Click-to-seek
- Speed control (0.25x - 2x)
- Progress indicator

### Performance Features
- Lazy loading with IntersectionObserver
- LRU cache for resources
- Gzip decompression (pako)
- Virtual scrolling

---

## Original PRD References

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD-2.md | Complete | React viewer core |
| PRDs/PRD-4.md (Phase 2) | Complete | Voice UI integration |

---

## Change Log (from original PRDs)

| Date | Source | Changes |
|------|--------|---------|
| Dec 2024 | PRD-2.md | Initial POC 2 PRD |
| Dec 2025 | PRD-2.md | Updated to follow template, moved resolved issues to PRD-3 |
| Dec 2024 | TASKS-2.md | Initial POC 2 tasks |
| 2025-12-10 | TASKS-2.md | Marked React viewer complete; moved Zip Export to Session Editor |
| 2025-12-12 | Viewer UX | Viewer bug fixes: Jittering spinner, duplicate keys, gzip decompression |
| 2025-12-12 | Viewer UX | Auto-scroll fix, action highlighting, iframe caching, smart default view |
