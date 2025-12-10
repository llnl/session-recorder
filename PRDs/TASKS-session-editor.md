# Session Editor - Implementation Tasks

**Project:** Session Editor
**PRD:** [PRD-session-editor.md](./PRD-session-editor.md)
**Status:** Not Started
**Last Updated:** 2025-12-10

---

## Task Overview

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Foundation | 5 tasks | Not Started |
| Phase 2: Store & Persistence | 4 tasks | Not Started |
| Phase 3: UI Components | 8 tasks | Not Started |
| Phase 4: Integration & Polish | 5 tasks | Not Started |
| **Total** | **22 tasks** | |

---

## Phase 1: Foundation

### Task 1.1: Create Edit Operation Types

**Priority:** P0 - Critical
**Estimated Effort:** Small
**Dependencies:** None

**File:** `session-recorder/viewer/src/types/editOperations.ts` (NEW)

**Description:**
Create TypeScript interfaces for all edit operations that will be stored in IndexedDB.

**Subtasks:**

- [ ] Create `BaseEditOperation` interface with id, timestamp, sessionId
- [ ] Create `AddNoteOperation` interface
- [ ] Create `EditFieldOperation` interface with fieldPath, previousValue, newValue
- [ ] Create `DeleteActionOperation` interface with deletedAction, originalIndex, associatedFiles
- [ ] Create `EditNoteOperation` interface
- [ ] Create `EditOperation` union type
- [ ] Create `SessionEditState` interface with operations, undoStack, redoStack
- [ ] Create `LocalSessionMetadata` interface for sessions list

**Acceptance Criteria:**

- [ ] All interfaces exported and importable
- [ ] Types are strict and well-documented
- [ ] No `any` types used

---

### Task 1.2: Add NoteAction Type

**Priority:** P0 - Critical
**Estimated Effort:** Small
**Dependencies:** None

**File:** `session-recorder/viewer/src/types/session.ts` (MODIFY)

**Description:**
Add the NoteAction interface and update the AnyAction union type.

**Subtasks:**

- [ ] Create `NoteAction` interface with id, type, timestamp, note object
- [ ] Note object contains: content, createdAt, updatedAt, insertAfterActionId
- [ ] Add `NoteAction` to `AnyAction` union type
- [ ] Add type guard function `isNoteAction(action: AnyAction)`

**Acceptance Criteria:**

- [ ] NoteAction is part of AnyAction union
- [ ] Existing code compiles without errors
- [ ] Type guard works correctly

---

### Task 1.3: Create IndexedDB Service

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 1.1

**File:** `session-recorder/viewer/src/services/indexedDBService.ts` (NEW)

**Description:**
Create a service for managing IndexedDB operations for session edits.

**Subtasks:**

- [ ] Define database schema (name: `session-editor-db`, version: 1)
- [ ] Create `sessionEdits` object store (keyPath: sessionId)
- [ ] Create `sessionMetadata` object store (keyPath: sessionId)
- [ ] Implement `init()` - Initialize database, handle upgrades
- [ ] Implement `getSessionEditState(sessionId)` - Get edit state
- [ ] Implement `saveSessionEditState(state)` - Save edit state
- [ ] Implement `deleteSessionEditState(sessionId)` - Delete edit state
- [ ] Implement `getAllSessionMetadata()` - Get all session metadata
- [ ] Implement `updateSessionMetadata(metadata)` - Update metadata
- [ ] Implement `deleteSessionMetadata(sessionId)` - Delete metadata
- [ ] Add error handling with fallback logging
- [ ] Export singleton instance

**Acceptance Criteria:**

- [ ] Database initializes on first use
- [ ] CRUD operations work correctly
- [ ] Handles IndexedDB unavailable gracefully
- [ ] No data loss on browser refresh

---

### Task 1.4: Create Edit Operations Processor

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 1.1, Task 1.2

**File:** `session-recorder/viewer/src/utils/editOperationsProcessor.ts` (NEW)

**Description:**
Create pure functions to apply edit operations to session data.

**Subtasks:**

- [ ] Implement `applyOperations(actions, operations)` - Apply all ops to get current state
- [ ] Implement `applyOperation(actions, op)` - Apply single operation
- [ ] Implement `insertNote(actions, noteAction)` - Insert note at correct position
- [ ] Implement `editField(actions, actionId, fieldPath, value)` - Edit nested field
- [ ] Implement `getActionAssociatedFiles(action)` - Get screenshot/HTML paths
- [ ] Implement `getExcludedFilesFromOperations(operations)` - Get all files to exclude
- [ ] Add helper: `setNestedValue(obj, path, value)` - Set value at dot-notation path
- [ ] Add helper: `getNestedValue(obj, path)` - Get value at dot-notation path

**Acceptance Criteria:**

- [ ] All functions are pure (no side effects)
- [ ] Operations apply correctly in order
- [ ] Notes inserted at correct chronological position
- [ ] Field edits work for nested paths like `action.value`

---

### Task 1.5: Create Markdown Renderer Utility

**Priority:** P1 - High
**Estimated Effort:** Small
**Dependencies:** None

**File:** `session-recorder/viewer/src/utils/markdownRenderer.ts` (NEW)

**Description:**
Create utility for converting markdown to safe HTML.

**Subtasks:**

- [ ] Install `marked` library (or similar lightweight markdown parser)
- [ ] Install `dompurify` for XSS sanitization
- [ ] Implement `renderMarkdown(content: string): string` - Convert to HTML
- [ ] Configure marked for safe defaults (no raw HTML)
- [ ] Sanitize output with DOMPurify
- [ ] Support common markdown: headers, bold, italic, lists, code blocks, links

**Acceptance Criteria:**

- [ ] Markdown renders correctly
- [ ] XSS attacks prevented
- [ ] Links open in new tab with noopener

---

## Phase 2: Store & Persistence

### Task 2.1: Extend Session Store - Edit State

**Priority:** P0 - Critical
**Estimated Effort:** Large
**Dependencies:** Phase 1 complete

**File:** `session-recorder/viewer/src/stores/sessionStore.ts` (MODIFY)

**Description:**
Add edit state management to the Zustand store.

**Subtasks:**

- [ ] Add state: `editState: SessionEditState | null`
- [ ] Add computed: `getEditedActions()` - Returns actions with ops applied
- [ ] Add computed: `getExcludedFiles()` - Returns Set of files to exclude
- [ ] Modify `loadSession()` to check IndexedDB for existing edits
- [ ] Implement `loadEditState(sessionId)` - Load from IndexedDB
- [ ] Implement `persistEditState()` - Save to IndexedDB
- [ ] Implement auto-persist on edit operations

**Acceptance Criteria:**

- [ ] Edit state loads when session opens
- [ ] `getEditedActions()` returns correct modified array
- [ ] Edits persist across page reloads

---

### Task 2.2: Extend Session Store - Edit Actions

**Priority:** P0 - Critical
**Estimated Effort:** Large
**Dependencies:** Task 2.1

**File:** `session-recorder/viewer/src/stores/sessionStore.ts` (MODIFY)

**Description:**
Add edit action methods to the store.

**Subtasks:**

- [ ] Implement `addNote(insertAfterActionId, content)` - Add new note
- [ ] Implement `editNote(noteId, newContent)` - Edit existing note
- [ ] Implement `editActionField(actionId, fieldPath, newValue)` - Edit action field
- [ ] Implement `deleteAction(actionId)` - Delete single action
- [ ] Implement `deleteBulkActions(startTime, endTime)` - Delete range
- [ ] Each action creates operation, pushes to operations array, clears redoStack
- [ ] Each action calls `persistEditState()` after modification
- [ ] Generate unique IDs for new notes (e.g., `note-${Date.now()}`)

**Acceptance Criteria:**

- [ ] All edit actions create correct operation types
- [ ] Operations stored in correct order
- [ ] Changes visible immediately via `getEditedActions()`

---

### Task 2.3: Extend Session Store - Undo/Redo

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 2.2

**File:** `session-recorder/viewer/src/stores/sessionStore.ts` (MODIFY)

**Description:**
Implement undo/redo functionality.

**Subtasks:**

- [ ] Implement `undo()` - Pop from operations, push to redoStack
- [ ] Implement `redo()` - Pop from redoStack, push to operations
- [ ] Implement `canUndo()` - Check if operations array has items
- [ ] Implement `canRedo()` - Check if redoStack has items
- [ ] Cap operations array at 100 items (remove oldest on overflow)
- [ ] Persist undo/redo stacks to IndexedDB

**Acceptance Criteria:**

- [ ] Undo reverses last operation
- [ ] Redo re-applies undone operation
- [ ] New edit clears redo stack
- [ ] History limit enforced

---

### Task 2.4: Extend Session Store - Export Support

**Priority:** P1 - High
**Estimated Effort:** Small
**Dependencies:** Task 2.1

**File:** `session-recorder/viewer/src/stores/sessionStore.ts` (MODIFY)

**Description:**
Add export support methods.

**Subtasks:**

- [ ] Implement `markAsExported()` - Increment exportCount, update lastModified
- [ ] Ensure `getEditedActions()` and `getExcludedFiles()` are efficient
- [ ] Add `displayName` getter/setter for session naming

**Acceptance Criteria:**

- [ ] Export count tracked correctly
- [ ] Display name persists

---

## Phase 3: UI Components

### Task 3.1: Create NoteEditor Component

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 1.5

**Files:**

- `session-recorder/viewer/src/components/NoteEditor/NoteEditor.tsx` (NEW)
- `session-recorder/viewer/src/components/NoteEditor/NoteEditor.css` (NEW)

**Description:**
Create modal component for creating and editing notes.

**Subtasks:**

- [ ] Create component with props: isOpen, initialContent, onSave, onClose
- [ ] Implement Edit/Preview tabs
- [ ] Implement markdown textarea in Edit mode
- [ ] Implement rendered preview in Preview mode using markdownRenderer
- [ ] Add Cancel and Save buttons
- [ ] Style modal with overlay, centered container
- [ ] Add keyboard shortcut: Escape to close, Ctrl+Enter to save
- [ ] Focus textarea on open

**Acceptance Criteria:**

- [ ] Modal opens/closes correctly
- [ ] Preview renders markdown
- [ ] Save returns content, Cancel returns nothing
- [ ] Keyboard shortcuts work

---

### Task 3.2: Create ActionEditor Component

**Priority:** P1 - High
**Estimated Effort:** Medium
**Dependencies:** Task 1.5

**Files:**

- `session-recorder/viewer/src/components/ActionEditor/ActionEditor.tsx` (NEW)
- `session-recorder/viewer/src/components/ActionEditor/ActionEditor.css` (NEW)

**Description:**
Create component for editing action fields and transcripts.

**Subtasks:**

- [ ] Create component with props: actionId, fieldPath, currentValue, fieldType, onSave, onCancel
- [ ] Support fieldType: 'text' (simple input) and 'markdown' (textarea with preview)
- [ ] Show field name being edited
- [ ] Implement inline editing mode (replaces display with input)
- [ ] Implement modal editing mode for markdown (voice transcripts)
- [ ] Add Save and Cancel buttons
- [ ] Handle Escape to cancel, Enter to save (text mode)

**Acceptance Criteria:**

- [ ] Text fields edit inline
- [ ] Markdown fields open modal with preview
- [ ] Original value shown before edit
- [ ] Changes passed to onSave

---

### Task 3.3: Create EditorToolbar Component

**Priority:** P1 - High
**Estimated Effort:** Small
**Dependencies:** Task 2.3

**Files:**

- `session-recorder/viewer/src/components/EditorToolbar/EditorToolbar.tsx` (NEW)
- `session-recorder/viewer/src/components/EditorToolbar/EditorToolbar.css` (NEW)

**Description:**
Create toolbar with undo/redo, edit count, and export button.

**Subtasks:**

- [ ] Add Undo button with icon, disabled when !canUndo()
- [ ] Add Redo button with icon, disabled when !canRedo()
- [ ] Show edit count badge: "N changes"
- [ ] Add Export button
- [ ] Style toolbar to fit in header area
- [ ] Add keyboard event listeners for Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z

**Acceptance Criteria:**

- [ ] Buttons enable/disable correctly
- [ ] Edit count updates in real-time
- [ ] Keyboard shortcuts work globally

---

### Task 3.4: Create LocalSessionsView Component

**Priority:** P2 - Medium
**Estimated Effort:** Medium
**Dependencies:** Task 1.3

**Files:**

- `session-recorder/viewer/src/components/LocalSessionsView/LocalSessionsView.tsx` (NEW)
- `session-recorder/viewer/src/components/LocalSessionsView/LocalSessionsView.css` (NEW)

**Description:**
Create panel showing all sessions with local edits.

**Subtasks:**

- [ ] Create component that fetches from indexedDBService.getAllSessionMetadata()
- [ ] Display list of session cards
- [ ] Each card shows: displayName, editCount, lastModified
- [ ] Add Load button - prompts for zip file, then loads session
- [ ] Add Rename button - inline edit of displayName
- [ ] Add Delete Edits button - confirms, then deletes edit state
- [ ] Handle empty state: "No local sessions"
- [ ] Style as modal or sidebar panel

**Acceptance Criteria:**

- [ ] Shows all sessions with edits
- [ ] Load prompts for file correctly
- [ ] Rename persists to IndexedDB
- [ ] Delete removes from IndexedDB

---

### Task 3.5: Modify ActionList - Insert Points

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 3.1, Task 2.2

**File:** `session-recorder/viewer/src/components/ActionList/ActionList.tsx` (MODIFY)

**Description:**
Add ability to insert notes between actions.

**Subtasks:**

- [ ] Add insert point div between each action item
- [ ] Show "+" button on insert point hover
- [ ] Track hoveredInsertIndex state
- [ ] onClick opens NoteEditor modal
- [ ] onSave calls store.addNote(actionId, content)
- [ ] Style insert point: thin line that expands on hover
- [ ] Update virtual list to account for insert points (or use CSS-only approach)

**Acceptance Criteria:**

- [ ] Insert point visible on hover
- [ ] Click opens note editor
- [ ] Note created at correct position
- [ ] Virtual scrolling still works

---

### Task 3.6: Modify ActionList - Note Rendering & Actions

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Task 3.2, Task 3.5

**Files:**

- `session-recorder/viewer/src/components/ActionList/ActionList.tsx` (MODIFY)
- `session-recorder/viewer/src/components/ActionList/ActionList.css` (MODIFY)

**Description:**
Add note rendering, edit buttons, and delete buttons.

**Subtasks:**

- [ ] Add note item renderer for `type === 'note'`
- [ ] Note shows: 📝 icon, rendered markdown content, edit/delete buttons
- [ ] Style notes with amber/yellow left border
- [ ] Add Edit button to input actions (visible on hover)
- [ ] Add Edit button to voice transcripts (visible on hover)
- [ ] Add Delete button to all actions (visible on hover)
- [ ] Edit buttons open ActionEditor component
- [ ] Delete buttons show confirmation, then call store.deleteAction()
- [ ] Add `NOTE_ITEM_HEIGHT = 80` constant
- [ ] Update `getItemHeight()` to handle note type
- [ ] Use `getEditedActions()` instead of raw `sessionData.actions`

**Acceptance Criteria:**

- [ ] Notes render with markdown
- [ ] Edit buttons appear on hover
- [ ] Delete confirmation works
- [ ] Virtual scrolling handles notes correctly

---

### Task 3.7: Modify Timeline - Note Indicators

**Priority:** P1 - High
**Estimated Effort:** Medium
**Dependencies:** Task 2.1

**File:** `session-recorder/viewer/src/components/Timeline/Timeline.tsx` (MODIFY)

**Description:**
Add visual indicators for notes on the timeline canvas.

**Subtasks:**

- [ ] Filter notes from getEditedActions()
- [ ] Draw note indicators at correct X positions
- [ ] Use distinct visual: amber diamond or pin icon
- [ ] Handle note hover: show tooltip with content preview
- [ ] Update thumbnail generation to skip notes (no screenshots)
- [ ] Clicking note indicator selects the note in ActionList

**Acceptance Criteria:**

- [ ] Notes visible on timeline
- [ ] Distinct from action indicators
- [ ] Hover shows preview
- [ ] Click selects note

---

### Task 3.8: Modify Timeline - Bulk Delete

**Priority:** P1 - High
**Estimated Effort:** Medium
**Dependencies:** Task 2.2

**Files:**

- `session-recorder/viewer/src/components/Timeline/Timeline.tsx` (MODIFY)
- `session-recorder/viewer/src/components/Timeline/Timeline.css` (MODIFY)

**Description:**
Add bulk delete button when timeline selection exists.

**Subtasks:**

- [ ] When timelineSelection is set, show "Delete Selected" button
- [ ] Calculate action count in selection range
- [ ] Button text: "Delete Selected (N actions)"
- [ ] Click shows confirmation dialog with count
- [ ] Confirm calls store.deleteBulkActions(startTime, endTime)
- [ ] Position button near selection or in toolbar area
- [ ] Style as destructive action (red)

**Acceptance Criteria:**

- [ ] Button appears only when selection exists
- [ ] Count is accurate
- [ ] Confirmation required
- [ ] All actions in range deleted

---

## Phase 4: Integration & Polish

### Task 4.1: Modify Export Utility

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** Phase 2 complete

**File:** `session-recorder/viewer/src/utils/zipHandler.ts` (MODIFY)

**Description:**
Modify export to apply edits and exclude deleted files.

**Subtasks:**

- [ ] Create `exportEditedSessionToZip()` function
- [ ] Accept: sessionData, networkEntries, consoleEntries, resources, editState
- [ ] Apply operations to get final actions array
- [ ] Get excluded files from delete operations
- [ ] Create modified session.json with edited actions
- [ ] Add editorMetadata: editedAt, editCount, originalSessionId
- [ ] Filter resources to exclude deleted files
- [ ] Generate zip with JSZip
- [ ] Return blob for download
- [ ] Add progress callback for large exports

**Acceptance Criteria:**

- [ ] Exported zip has modified session.json
- [ ] Deleted files not in zip
- [ ] Notes included in actions array
- [ ] Existing export still works for non-edited sessions

---

### Task 4.2: Modify App.tsx - Integration

**Priority:** P0 - Critical
**Estimated Effort:** Medium
**Dependencies:** All Phase 3 tasks

**File:** `session-recorder/viewer/src/App.tsx` (MODIFY)

**Description:**
Integrate all components and update app structure.

**Subtasks:**

- [ ] Rename title from "Session Recorder Viewer" to "Session Editor"
- [ ] Add EditorToolbar to header section
- [ ] Add "Local Sessions" button that opens LocalSessionsView
- [ ] Modify export button to use `exportEditedSessionToZip()`
- [ ] Call `store.loadEditState()` after session loads
- [ ] Call `store.markAsExported()` after successful export
- [ ] Update download filename: `{sessionId}-edited.zip`
- [ ] Add global keyboard listeners for undo/redo

**Acceptance Criteria:**

- [ ] App titled "Session Editor"
- [ ] Toolbar visible and functional
- [ ] Local sessions accessible
- [ ] Export uses edited data

---

### Task 4.3: Add Delete Confirmation Dialog

**Priority:** P1 - High
**Estimated Effort:** Small
**Dependencies:** None

**Files:**

- `session-recorder/viewer/src/components/ConfirmDialog/ConfirmDialog.tsx` (NEW)
- `session-recorder/viewer/src/components/ConfirmDialog/ConfirmDialog.css` (NEW)

**Description:**
Create reusable confirmation dialog for destructive actions.

**Subtasks:**

- [ ] Create component with props: isOpen, title, message, onConfirm, onCancel
- [ ] Add optional destructive prop for red confirm button
- [ ] Style as modal with overlay
- [ ] Focus confirm button on open
- [ ] Add keyboard: Escape to cancel, Enter to confirm

**Acceptance Criteria:**

- [ ] Dialog displays correctly
- [ ] Keyboard navigation works
- [ ] Returns user choice

---

### Task 4.4: Error Handling & Edge Cases

**Priority:** P1 - High
**Estimated Effort:** Medium
**Dependencies:** All previous tasks

**Files:** Multiple

**Description:**
Add error handling throughout the application.

**Subtasks:**

- [ ] Handle IndexedDB unavailable - show warning, continue without persistence
- [ ] Handle corrupted edit state - log error, start fresh
- [ ] Handle missing action on edit - skip operation, log warning
- [ ] Handle export failure - show error message, don't lose data
- [ ] Handle very large operations array (>100) - trim oldest
- [ ] Add loading states during async operations
- [ ] Test edge case: delete action before note → note repositions

**Acceptance Criteria:**

- [ ] No uncaught exceptions
- [ ] User informed of errors
- [ ] Graceful degradation

---

### Task 4.5: Testing & Documentation

**Priority:** P2 - Medium
**Estimated Effort:** Medium
**Dependencies:** All previous tasks

**Description:**
Add tests and update documentation.

**Subtasks:**

- [ ] Unit tests for editOperationsProcessor functions
- [ ] Unit tests for indexedDBService (mock IndexedDB)
- [ ] Integration tests for store edit actions
- [ ] Manual test: full workflow from load → edit → export
- [ ] Update README with editor features
- [ ] Document keyboard shortcuts
- [ ] Add JSDoc comments to new functions

**Acceptance Criteria:**

- [ ] Core logic has test coverage
- [ ] Manual test passes
- [ ] Documentation accurate

---

## Implementation Schedule

```text
Week 1: Foundation (Tasks 1.1-1.5)
├── Day 1-2: Types (1.1, 1.2)
├── Day 3-4: IndexedDB Service (1.3)
└── Day 5: Processor & Markdown (1.4, 1.5)

Week 2: Store & Core Components (Tasks 2.1-2.4, 3.1-3.3)
├── Day 1-2: Store Edit State (2.1)
├── Day 2-3: Store Edit Actions (2.2)
├── Day 3-4: Store Undo/Redo (2.3)
├── Day 4: Store Export Support (2.4)
└── Day 5: NoteEditor, ActionEditor, Toolbar (3.1-3.3)

Week 3: ActionList & Timeline (Tasks 3.4-3.8)
├── Day 1: LocalSessionsView (3.4)
├── Day 2-3: ActionList Insert Points (3.5)
├── Day 3-4: ActionList Notes & Actions (3.6)
└── Day 5: Timeline Note Indicators & Bulk Delete (3.7-3.8)

Week 4: Integration & Polish (Tasks 4.1-4.5)
├── Day 1-2: Export Utility (4.1)
├── Day 2-3: App Integration (4.2)
├── Day 3: Confirm Dialog (4.3)
├── Day 4: Error Handling (4.4)
└── Day 5: Testing & Docs (4.5)
```

---

## File Changes Summary

### New Files (12)

| File | Description |
|------|-------------|
| `types/editOperations.ts` | Edit operation type definitions |
| `services/indexedDBService.ts` | IndexedDB persistence service |
| `utils/editOperationsProcessor.ts` | Pure functions for applying edits |
| `utils/markdownRenderer.ts` | Markdown to HTML conversion |
| `components/NoteEditor/NoteEditor.tsx` | Note creation/editing modal |
| `components/NoteEditor/NoteEditor.css` | Note editor styles |
| `components/ActionEditor/ActionEditor.tsx` | Action field editor |
| `components/ActionEditor/ActionEditor.css` | Action editor styles |
| `components/EditorToolbar/EditorToolbar.tsx` | Undo/redo/export toolbar |
| `components/EditorToolbar/EditorToolbar.css` | Toolbar styles |
| `components/LocalSessionsView/LocalSessionsView.tsx` | Local sessions panel |
| `components/LocalSessionsView/LocalSessionsView.css` | Local sessions styles |
| `components/ConfirmDialog/ConfirmDialog.tsx` | Confirmation dialog |
| `components/ConfirmDialog/ConfirmDialog.css` | Dialog styles |

### Modified Files (7)

| File | Changes |
|------|---------|
| `types/session.ts` | Add NoteAction type |
| `stores/sessionStore.ts` | Add edit state, actions, undo/redo |
| `components/ActionList/ActionList.tsx` | Insert points, notes, edit/delete |
| `components/ActionList/ActionList.css` | Note and button styles |
| `components/Timeline/Timeline.tsx` | Note indicators, bulk delete |
| `components/Timeline/Timeline.css` | Note indicator styles |
| `utils/zipHandler.ts` | Export with edits |
| `App.tsx` | Integration, toolbar, rename |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB browser support | Medium | Detect and warn, degrade gracefully |
| Virtual scroll performance with notes | Medium | Careful height calculation, memoization |
| Large session export timeout | Low | Progress indicator, web worker |
| Undo history memory usage | Low | Cap at 100 operations |
| Note positioning after bulk delete | Medium | Careful repositioning logic |

---

## Definition of Done

A task is complete when:

- [ ] Code implemented and compiles
- [ ] Self-reviewed for quality
- [ ] No TypeScript errors or warnings
- [ ] Feature works as described in acceptance criteria
- [ ] Edge cases handled
- [ ] No console errors in browser
