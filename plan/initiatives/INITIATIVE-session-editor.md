# Initiative: Session Editor

<initiative>
  <name>session-editor</name>
  <status>tested</status>
  <goal>Transform the viewer into a full-featured editing tool for annotating and curating sessions</goal>
  <description>
    Extends the Session Viewer with editing capabilities including notes, transcript editing, action
    deletion, undo/redo, and export of modified sessions. Uses IndexedDB for persistence with a
    non-destructive operation-based editing model.
  </description>

  <epics>
    <epic id="core" status="tested" blocks="">Session Editor Core (PRD-session-editor.md)</epic>
    <epic id="ai-image-analysis" status="todo" blocks="core">AI Image Analysis (PRD-ai-image-analysis.md)</epic>
  </epics>

  <success_criteria>
    <criterion status="done">Add/edit/delete notes between actions</criterion>
    <criterion status="done">Edit voice transcripts and action values</criterion>
    <criterion status="done">Delete individual and bulk actions</criterion>
    <criterion status="done">Undo/redo with keyboard shortcuts</criterion>
    <criterion status="done">IndexedDB persistence across sessions</criterion>
    <criterion status="done">Export modified sessions as zip</criterion>
    <criterion status="done">URL deep linking with session/action params</criterion>
    <criterion status="done">Inline session name editing</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [core](../epics/epic-editor-core.md) | tested | [tasks](../tasks/tasks-editor-core.json) | Notes, editing, persistence, export |
| [ai-image-analysis](../epics/epic-ai-image-analysis.md) | todo | [tasks](../tasks/tasks-ai-image-analysis.json) | AI screenshot analysis |

---

## Technical Architecture

```
viewer/src/
├── services/
│   ├── editOperations.ts       # Edit operation types
│   ├── operationsProcessor.ts  # Apply operations to actions
│   ├── indexedDbService.ts     # IndexedDB persistence
│   └── zipExporter.ts          # Export with edits applied
│
├── components/
│   ├── InlineNoteEditor.tsx    # Add/edit notes
│   ├── InlineFieldEditor.tsx   # Edit transcripts/values
│   ├── InlineSessionName.tsx   # Edit session name in header
│   ├── LocalSessionsView.tsx   # View local sessions
│   └── EditorToolbar.tsx       # Undo/redo/export buttons
│
└── stores/
    └── sessionStore.ts         # Extended with edit state
```

---

## Key Features

### Note System
- NoteAction type in actions array
- Markdown content support
- Insert after any action
- Edit and delete notes
- Rendered with distinct styling

### Edit System
- Non-destructive operation model
- Operation types: add_note, edit_field, delete_action, edit_note
- Previous values stored for undo
- Operations applied in order

### Persistence System
- IndexedDB database: session-editor-db
- Object stores: sessionEdits, sessionMetadata, sessionBlobs
- Auto-save on every operation
- Session reload from stored blobs

### Undo/Redo System
- Operations array as "done" stack
- Separate undo and redo stacks
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- History capped at 100 operations

### URL State (v1.2)
- Deep linking: ?session=id&action=id
- Browser back/forward navigation
- Session history with quick reload

### Inline Editing (v1.3)
- Click session name to edit
- Single-line inputs with save/cancel
- Edit icon on hover

---

## Original PRD References

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD-session-editor.md | Complete | All editing features |

---

## Change Log (from original PRDs)

| Date | Source | Changes |
|------|--------|---------|
| 2025-12-10 | TASKS-session-editor.md | Initial task breakdown document |
| 2025-12-11 | TASKS-session-editor.md | Phases 1 & 2 complete: editOperations.ts, indexedDBService.ts, editOperationsProcessor.ts |
| 2025-12-11 | TASKS-session-editor.md | All Phases Complete: NoteEditor, ActionEditor, EditorToolbar, export integration |
| 2025-12-12 | TASKS-session-editor.md | Bug fixes: Jittering spinner, duplicate keys, gzip decompression |
| 2025-12-12 | TASKS-session-editor.md | URL State & Session History: Deep linking via URL params |
| 2025-12-12 | TASKS-session-editor.md | Inline Session Name Editing |
| 2025-12-12 | TASKS-session-editor.md | Inline Note Editing (v2): Immediate creation flow, InlineNoteEditor, InlineFieldEditor |
