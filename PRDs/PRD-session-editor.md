# Session Editor - Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2025-12-10

---

## Executive Summary

Transform the existing Session Recorder Viewer into a full-featured **Session Editor** that allows users to annotate, edit, and curate recorded browser sessions. Users can add notes between actions, edit transcripts and action values, delete unwanted actions, and export modified sessions as new zip files.

---

## Problem Statement

Currently, the Session Recorder Viewer is read-only. Users cannot:

- Add contextual notes or annotations to explain actions
- Correct transcription errors from voice recordings
- Remove irrelevant or sensitive actions from recordings
- Edit incorrect input values captured during recording
- Curate sessions for sharing or documentation purposes

---

## Goals & Objectives

### Primary Goals

1. Enable users to **annotate sessions** with notes between actions
2. Allow **editing** of action values and transcript text
3. Support **deletion** of individual and bulk actions
4. **Persist edits locally** so users can close and resume editing
5. **Export modified sessions** as new zip files

### Success Metrics

- Users can add/edit/delete notes without page reload
- Edits persist across browser sessions via IndexedDB
- Export creates valid session zip with all modifications applied
- Undo/redo works for all edit operations
- No performance degradation with virtual scrolling

---

## User Stories

### US-1: Add Notes Between Actions

> As a QA tester, I want to add notes between recorded actions so that I can document what I was testing and why certain actions were performed.

**Acceptance Criteria:**

- [ ] Hovering between two actions in ActionList shows a "+" button
- [ ] Clicking "+" opens a note editor modal with markdown support
- [ ] Notes appear in the ActionList with distinct styling
- [ ] Notes appear on the Timeline as visual indicators (amber/yellow)
- [ ] Notes are saved immediately to IndexedDB
- [ ] Notes can be edited after creation
- [ ] Notes can be deleted

### US-2: Edit Voice Transcripts

> As a session recorder, I want to edit voice transcript text so that I can correct transcription errors from the Whisper model.

**Acceptance Criteria:**

- [ ] Voice transcript actions have an "Edit" button
- [ ] Clicking edit opens a markdown-enabled text editor
- [ ] Original text is preserved for undo
- [ ] Edited text appears immediately in ActionList
- [ ] Changes persist to IndexedDB

### US-3: Edit Action Values

> As a developer reviewing a session, I want to edit input values so that I can correct typos or redact sensitive information before sharing.

**Acceptance Criteria:**

- [ ] Input actions (type: input, change) have an "Edit" button for the value field
- [ ] Editor shows current value with ability to modify
- [ ] Changes are reflected in action details
- [ ] Original value preserved for undo

### US-4: Delete Single Action

> As a user, I want to delete individual actions so that I can remove irrelevant or sensitive content from my recording.

**Acceptance Criteria:**

- [ ] Each action has a delete button (visible on hover)
- [ ] Confirmation dialog before deletion
- [ ] Deleted action removed from ActionList and Timeline
- [ ] Associated files (screenshots, HTML) excluded from export
- [ ] Deletion can be undone

### US-5: Bulk Delete via Timeline Selection

> As a user, I want to select a time range on the timeline and delete all actions within it so that I can quickly remove entire sections of a recording.

**Acceptance Criteria:**

- [ ] Timeline selection shows "Delete Selected (N actions)" button
- [ ] Confirmation dialog shows count of actions to be deleted
- [ ] All actions in range are removed
- [ ] Single undo restores all deleted actions
- [ ] Associated files for all deleted actions excluded from export

### US-6: Undo/Redo Edits

> As a user, I want to undo and redo my edits so that I can recover from mistakes.

**Acceptance Criteria:**

- [ ] Undo button in toolbar (disabled when no history)
- [ ] Redo button in toolbar (disabled when no redo available)
- [ ] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y or Ctrl+Shift+Z (redo)
- [ ] Undo/redo works for all edit types (add, edit, delete)
- [ ] History persists across page reloads

### US-7: Local Persistence

> As a user, I want my edits to be saved automatically so that I can close the browser and continue editing later.

**Acceptance Criteria:**

- [ ] Edits saved to IndexedDB immediately on change
- [ ] Loading a session checks for existing edits by sessionId
- [ ] Edits applied automatically when session loaded
- [ ] No "unsaved changes" warnings needed

### US-8: View Local Sessions

> As a user, I want to see a list of sessions I have edited locally so that I can find and continue my work.

**Acceptance Criteria:**

- [ ] "Local Sessions" button in header
- [ ] Panel/page shows all sessions with local edits
- [ ] Shows: display name, edit count, last modified date
- [ ] Can rename session display name
- [ ] Can delete local edits for a session
- [ ] Can click to load (prompts for zip file)

### US-9: Export Modified Session

> As a user, I want to export my edited session as a new zip file so that I can share or archive the curated version.

**Acceptance Criteria:**

- [ ] "Export" button in toolbar
- [ ] Creates new zip with all edits applied to session.json
- [ ] Deleted actions' files (screenshots, HTML) excluded from zip
- [ ] Notes included as NoteAction in actions array
- [ ] Edited values reflected in exported session.json
- [ ] Edit history preserved in IndexedDB after export
- [ ] Downloaded zip has descriptive filename

### US-10: Session Rename

> As a user, I want to give my session a custom display name so that I can identify it in my local sessions list.

**Acceptance Criteria:**

- [ ] Display name editable in session metadata
- [ ] Display name shown in header when session loaded
- [ ] Display name used in Local Sessions view
- [ ] Display name persisted in IndexedDB

---

## Functional Requirements

### FR-1: Note System

| ID | Requirement |
|----|-------------|
| FR-1.1 | Notes are a new action type (`NoteAction`) in the actions array |
| FR-1.2 | Notes have: id, timestamp, content (markdown), createdAt, updatedAt |
| FR-1.3 | Notes positioned via `insertAfterActionId` field |
| FR-1.4 | Note timestamps calculated as: preceding action timestamp + 1ms |
| FR-1.5 | Notes rendered with markdown formatting in ActionList |
| FR-1.6 | Notes displayed as amber/yellow indicators on Timeline |

### FR-2: Edit System

| ID | Requirement |
|----|-------------|
| FR-2.1 | Edits stored as operations, not modified data |
| FR-2.2 | Operation types: add_note, edit_field, delete_action, edit_note |
| FR-2.3 | Each operation stores previous value for undo |
| FR-2.4 | Operations applied in order to derive current state |
| FR-2.5 | Editable fields: action.value, transcript.text |

### FR-3: Delete System

| ID | Requirement |
|----|-------------|
| FR-3.1 | Deleted actions tracked via DeleteActionOperation |
| FR-3.2 | DeleteActionOperation stores: actionId, full action data, original index, associated files |
| FR-3.3 | Associated files identified: before/after screenshots and HTML snapshots |
| FR-3.4 | Bulk delete creates single operation with multiple actions |
| FR-3.5 | Confirmation required for deletions |

### FR-4: Persistence System

| ID | Requirement |
|----|-------------|
| FR-4.1 | IndexedDB database: `session-editor-db` |
| FR-4.2 | Object stores: `sessionEdits`, `sessionMetadata` |
| FR-4.3 | Edits keyed by sessionId from session.json |
| FR-4.4 | Auto-save on every edit operation |
| FR-4.5 | Load edit state when session opened |

### FR-5: Undo/Redo System

| ID | Requirement |
|----|-------------|
| FR-5.1 | Operations array is the "done" stack |
| FR-5.2 | Separate undoStack and redoStack in edit state |
| FR-5.3 | Undo: pop from operations, push to redoStack |
| FR-5.4 | Redo: pop from redoStack, push to operations |
| FR-5.5 | New edit clears redoStack |
| FR-5.6 | History capped at 100 operations |

### FR-6: Export System

| ID | Requirement |
|----|-------------|
| FR-6.1 | Export applies all operations to create final actions array |
| FR-6.2 | Export excludes files from deleted actions |
| FR-6.3 | Export creates new session.json with modified data |
| FR-6.4 | Export adds metadata: editedAt, editCount, originalSessionId |
| FR-6.5 | Export preserves network/console logs unchanged |
| FR-6.6 | Export filename: `{sessionId}-edited.zip` |

---

## Non-Functional Requirements

### NFR-1: Performance

- Virtual scrolling must handle 1000+ actions without lag
- Edit operations must complete in <100ms
- IndexedDB saves must not block UI
- Export of 100MB session must show progress

### NFR-2: Reliability

- Edits must persist even if browser crashes
- Corrupted edit state must not prevent session loading
- Missing files handled gracefully during export

### NFR-3: Usability

- All edit actions accessible via hover/click
- Keyboard shortcuts for undo/redo
- Clear visual feedback for edit mode
- Confirmation dialogs for destructive actions

### NFR-4: Compatibility

- Works in Chrome, Firefox, Edge (modern versions)
- Graceful degradation if IndexedDB unavailable
- Existing session zips load without modification

---

## UI/UX Specifications

### ActionList Changes

```
┌─────────────────────────────────────┐
│ [Action 1 - Click]          [Edit]  │
│ URL: example.com            [Delete]│
├─────────────────────────────────────┤
│        ───── + Add Note ─────       │  ← Insert point (hover)
├─────────────────────────────────────┤
│ [Note] 📝                   [Edit]  │  ← Note item (amber left border)
│ "Testing login flow..."    [Delete] │
├─────────────────────────────────────┤
│        ───── + Add Note ─────       │
├─────────────────────────────────────┤
│ [Action 2 - Input]          [Edit]  │
│ Value: "user@email.com"    [Delete] │
└─────────────────────────────────────┘
```

### Timeline Changes

```
┌──────────────────────────────────────────────────────────┐
│  0s      5s      10s     15s     20s     25s     30s     │
│  │       │       │       │       │       │       │       │
│  ●───────●───◆───●───────●───────●───────●───────●       │
│          ↑   ↑                                           │
│     Action  Note (amber diamond)                         │
│                                                          │
│  [Thumbnail] [Thumb] [Thumb] [Thumb] [Thumb]            │
│                                                          │
│  ════════════════════  ← Selection range                │
│  [Delete Selected (5 actions)]                          │
└──────────────────────────────────────────────────────────┘
```

### Editor Toolbar

```
┌─────────────────────────────────────────────────────────┐
│ Session Editor    │ ↩ Undo │ ↪ Redo │ 5 changes │ Export│
└─────────────────────────────────────────────────────────┘
```

### Note Editor Modal

```
┌─────────────────────────────────────┐
│ Add Note                    [X]     │
├─────────────────────────────────────┤
│ [Edit] [Preview]                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ # Test Case                     │ │
│ │                                 │ │
│ │ Testing the login flow with:   │ │
│ │ - Valid credentials            │ │
│ │ - Remember me checked          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│              [Cancel] [Save]        │
└─────────────────────────────────────┘
```

### Local Sessions View

```
┌─────────────────────────────────────────────────────────┐
│ Local Sessions                                    [X]   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Login Flow Test                                  │ │
│ │    12 edits · Last modified: Dec 10, 2025 2:30 PM   │ │
│ │    [Load] [Rename] [Delete Edits]                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Checkout Process                                 │ │
│ │    5 edits · Last modified: Dec 9, 2025 4:15 PM     │ │
│ │    [Load] [Rename] [Delete Edits]                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models

### NoteAction

```typescript
interface NoteAction {
  id: string;                    // "note-1", "note-2"
  type: 'note';
  timestamp: string;             // ISO 8601
  note: {
    content: string;             // Markdown content
    createdAt: string;           // ISO 8601
    updatedAt?: string;          // ISO 8601
  };
  insertAfterActionId: string | null;
}
```

### SessionEditState

```typescript
interface SessionEditState {
  sessionId: string;
  displayName?: string;
  operations: EditOperation[];
  undoStack: EditOperation[];
  redoStack: EditOperation[];
  lastModified: string;
  exportCount: number;
}
```

### EditOperation (Union)

```typescript
type EditOperation =
  | AddNoteOperation
  | EditFieldOperation
  | DeleteActionOperation
  | EditNoteOperation;
```

---

## Out of Scope (V1)

- Real-time collaboration / multi-user editing
- Cloud sync of edits
- Merging edits from multiple sources
- Editing network or console logs
- Video/audio editing
- Custom action types beyond notes
- Drag-and-drop action reordering

---

## Future Considerations (V2+)

- **Tagging system** for actions and notes
- **Search** within session content
- **Diff view** comparing original vs edited
- **Templates** for common note patterns
- **Batch edit** find/replace across transcripts
- **Export formats** beyond zip (HTML report, PDF)

---

## Appendix

### A. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo (alternative) |
| Delete | Delete selected action |
| Ctrl+S | Export session |

### B. Error Messages

| Scenario | Message |
|----------|---------|
| IndexedDB unavailable | "Local storage unavailable. Changes will not persist." |
| Export failed | "Export failed: {error}. Please try again." |
| Invalid edit state | "Edit history corrupted. Starting fresh." |
| Large bulk delete | "Delete {N} actions? This cannot be easily undone." |
