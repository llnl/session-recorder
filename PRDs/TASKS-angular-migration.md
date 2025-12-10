# Session Editor Angular Migration - Implementation Tasks

**PRD:** [PRD-angular-migration.md](PRD-angular-migration.md)
**Last Updated:** 2025-12-10
**Overall Status:** 0% Complete (Not Started)

---

## Table of Contents

- [Phase 1: Project Setup](#phase-1-project-setup-4-hours)
- [Phase 2: Core Services](#phase-2-core-services-8-hours)
- [Phase 3: Core Components](#phase-3-core-components-16-hours)
- [Phase 4: Feature Components](#phase-4-feature-components-12-hours)
- [Phase 5: Performance Optimization](#phase-5-performance-optimization-8-hours)
- [Phase 6: Testing & Documentation](#phase-6-testing--documentation-6-hours)
- [Estimated Effort](#estimated-effort)
- [File Reference](#file-reference)
- [Backlog: Future Enhancements](#backlog-future-enhancements)
- [Document Change Log](#document-change-log)

---

## Phase 1: Project Setup (4 hours)

> **PRD Reference:** [FR-1: Angular Component Migration](PRD-angular-migration.md#fr-1-angular-component-migration)

### Task 1.1: Create Session Editor Module

**Priority:** P0 - Critical
**Estimated Effort:** 2 hours

- [ ] Create `session-editor/` directory in Angular app
- [ ] Create `session-editor.module.ts` with Material imports
- [ ] Create `session-editor-routing.module.ts`
- [ ] Add route to main Angular router (lazy loaded)
- [ ] Create `session-editor.component.ts` (shell component)
- [ ] Configure module providers

### Task 1.2: Configure Dependencies

**Priority:** P0 - Critical
**Estimated Effort:** 1 hour

- [ ] Add `@angular/cdk` ScrollingModule for virtual scroll
- [ ] Add `@angular/cdk` DragDropModule for resizable panels
- [ ] Install `jszip` for zip handling
- [ ] Install `marked` for markdown rendering
- [ ] Install `dompurify` for XSS sanitization
- [ ] Configure TypeScript paths for session-recorder types

### Task 1.3: Copy Type Definitions

**Priority:** P0 - Critical
**Estimated Effort:** 1 hour

- [ ] Copy/import session types from React viewer
- [ ] Create `models/session.model.ts`
- [ ] Create `models/edit-operation.model.ts`
- [ ] Create `models/note-action.model.ts`
- [ ] Ensure TypeScript strict compatibility

---

## Phase 2: Core Services (8 hours)

> **PRD Reference:** [FR-2: State Management Migration](PRD-angular-migration.md#fr-2-state-management-migration)

### Task 2.1: SessionStateService

**Priority:** P0 - Critical
**Estimated Effort:** 3 hours

**File:** `services/session-state.service.ts`

- [ ] Create service with injectable root
- [ ] Implement BehaviorSubject for `sessionData$`
- [ ] Implement BehaviorSubject for `selectedActionIndex$`
- [ ] Implement BehaviorSubject for `timelineSelection$`
- [ ] Implement BehaviorSubject for `activeTab$`
- [ ] Implement `loadSession(data: SessionData)` method
- [ ] Implement `selectAction(index: number)` method
- [ ] Implement `setTimelineSelection(start, end)` method
- [ ] Implement computed observables for filtered data
- [ ] Add error handling and loading states

### Task 2.2: SessionLoaderService

**Priority:** P0 - Critical
**Estimated Effort:** 2 hours

**File:** `services/session-loader.service.ts`

- [ ] Port `sessionLoader.ts` logic to Angular service
- [ ] Port `zipHandler.ts` logic to Angular service
- [ ] Implement `loadFromZip(file: File): Observable<SessionData>`
- [ ] Implement resource blob URL management
- [ ] Handle JSON Lines parsing for network/console
- [ ] Add progress reporting via Observable
- [ ] Implement error handling

### Task 2.3: EditStateService

**Priority:** P1 - High
**Estimated Effort:** 2 hours

**File:** `services/edit-state.service.ts`

- [ ] Create service for edit operations
- [ ] Implement BehaviorSubject for `editState$`
- [ ] Implement `addNote(insertAfterActionId, content)`
- [ ] Implement `editNote(noteId, newContent)`
- [ ] Implement `editActionField(actionId, fieldPath, newValue)`
- [ ] Implement `deleteAction(actionId)`
- [ ] Implement `deleteBulkActions(startTime, endTime)`
- [ ] Implement `undo()` and `redo()` methods
- [ ] Implement `canUndo$` and `canRedo$` observables
- [ ] Implement `getEditedActions()` computed

### Task 2.4: IndexedDBService

**Priority:** P1 - High
**Estimated Effort:** 1 hour

**File:** `services/indexed-db.service.ts`

- [ ] Port `indexedDBService.ts` to Angular
- [ ] Initialize database on service creation
- [ ] Implement `getSessionEditState(sessionId)`
- [ ] Implement `saveSessionEditState(state)`
- [ ] Implement `deleteSessionEditState(sessionId)`
- [ ] Implement `getAllSessionMetadata()`
- [ ] Handle IndexedDB unavailable gracefully

---

## Phase 3: Core Components (16 hours)

> **PRD Reference:** [FR-1.1: Core Layout Components](PRD-angular-migration.md#fr-11-core-layout-components)

### Task 3.1: SessionEditorComponent (Layout)

**Priority:** P0 - Critical
**Estimated Effort:** 3 hours

**File:** `session-editor.component.ts`

- [ ] Create resizable layout with Angular CDK
- [ ] Implement top area: Timeline (resizable height)
- [ ] Implement left area: ActionList (resizable width)
- [ ] Implement main area: SnapshotViewer
- [ ] Implement bottom area: TabPanel (resizable height)
- [ ] Port localStorage persistence for panel sizes
- [ ] Add file drop zone for session loading
- [ ] Integrate header with toolbar

### Task 3.2: TimelineComponent

**Priority:** P0 - Critical
**Estimated Effort:** 4 hours

**File:** `components/timeline/timeline.component.ts`

- [ ] Create canvas-based timeline renderer
- [ ] Port time scale calculation logic
- [ ] Port action indicator rendering
- [ ] Port thumbnail rendering at positions
- [ ] Implement hover state with tooltip preview
- [ ] Implement click to select action
- [ ] Implement drag selection for time range
- [ ] Port selection rectangle rendering
- [ ] Add note indicators (amber diamonds)
- [ ] Implement "Delete Selected" button for bulk delete
- [ ] Use OnPush change detection
- [ ] Handle resize events

### Task 3.3: ActionListComponent

**Priority:** P0 - Critical
**Estimated Effort:** 3 hours

**File:** `components/action-list/action-list.component.ts`

- [ ] Use `cdk-virtual-scroll-viewport` for virtual scroll
- [ ] Create action item template
- [ ] Implement variable height items (notes vs actions)
- [ ] Port action type icons and styling
- [ ] Implement click to select action
- [ ] Implement auto-scroll to selected
- [ ] Add note rendering with markdown
- [ ] Add insert point for notes (hover "+" button)
- [ ] Add edit/delete buttons (visible on hover)
- [ ] Style with Angular Material typography

### Task 3.4: SnapshotViewerComponent

**Priority:** P0 - Critical
**Estimated Effort:** 3 hours

**File:** `components/snapshot-viewer/snapshot-viewer.component.ts`

- [ ] Create iframe-based snapshot display
- [ ] Implement before/after toggle (`mat-button-toggle-group`)
- [ ] Port blob URL conversion for resources
- [ ] Port element highlighting logic
- [ ] Implement auto-scroll to highlighted element
- [ ] Add zoom controls (50%-200%)
- [ ] Display snapshot metadata (URL, timestamp, viewport)
- [ ] Handle loading states with `mat-spinner`
- [ ] Handle missing snapshot errors

### Task 3.5: TabPanelComponent

**Priority:** P0 - Critical
**Estimated Effort:** 3 hours

**File:** `components/tab-panel/tab-panel.component.ts`

- [ ] Use `mat-tab-group` for tab navigation
- [ ] Create Information tab with action details
- [ ] Create Console tab with log entries
- [ ] Create Network tab with waterfall visualization
- [ ] Port console log level filtering
- [ ] Port network resource type filtering
- [ ] Port expand/collapse for details
- [ ] Style with Angular Material

---

## Phase 4: Feature Components (12 hours)

> **PRD Reference:** [FR-1.2: Feature Components](PRD-angular-migration.md#fr-12-feature-components)

### Task 4.1: NoteEditorDialogComponent

**Priority:** P1 - High
**Estimated Effort:** 2 hours

**File:** `components/note-editor-dialog/note-editor-dialog.component.ts`

- [ ] Create Material Dialog component
- [ ] Implement Edit/Preview tabs
- [ ] Add markdown textarea
- [ ] Add rendered preview using `marked` + `dompurify`
- [ ] Implement keyboard shortcuts (Escape, Ctrl+Enter)
- [ ] Connect to EditStateService

### Task 4.2: ActionEditorComponent

**Priority:** P1 - High
**Estimated Effort:** 2 hours

**File:** `components/action-editor/action-editor.component.ts`

- [ ] Create inline editor for action fields
- [ ] Support text and markdown field types
- [ ] Implement modal mode for long content
- [ ] Connect to EditStateService
- [ ] Preserve original value for undo

### Task 4.3: EditorToolbarComponent

**Priority:** P1 - High
**Estimated Effort:** 2 hours

**File:** `components/editor-toolbar/editor-toolbar.component.ts`

- [ ] Create Material toolbar
- [ ] Add Undo/Redo buttons with icons
- [ ] Show edit count badge
- [ ] Add Export button
- [ ] Implement keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- [ ] Connect to EditStateService

### Task 4.4: ConfirmDialogComponent

**Priority:** P2 - Medium
**Estimated Effort:** 1 hour

**File:** `components/confirm-dialog/confirm-dialog.component.ts`

- [ ] Create reusable Material Dialog
- [ ] Support destructive (red) confirm button
- [ ] Implement keyboard handling
- [ ] Add injectable dialog data

### Task 4.5: LocalSessionsComponent

**Priority:** P2 - Medium
**Estimated Effort:** 2 hours

**File:** `components/local-sessions/local-sessions.component.ts`

- [ ] Create panel showing sessions with local edits
- [ ] Display session cards with metadata
- [ ] Add Load, Rename, Delete actions
- [ ] Connect to IndexedDBService
- [ ] Handle empty state

### Task 4.6: ZipExportService

**Priority:** P1 - High
**Estimated Effort:** 3 hours

**File:** `services/zip-export.service.ts`

- [ ] Port export logic from React
- [ ] Apply edit operations to create final actions
- [ ] Exclude deleted files from export
- [ ] Create modified session.json
- [ ] Add editor metadata
- [ ] Generate zip with JSZip
- [ ] Implement progress Observable
- [ ] Trigger browser download

---

## Phase 5: Performance Optimization (8 hours)

> **PRD Reference:** [FR-4: Performance Features](PRD-angular-migration.md#fr-4-performance-features-deferred-from-poc-2)

### Task 5.1: Lazy Loading Implementation

**Priority:** P1 - High
**Estimated Effort:** 3 hours

- [ ] Implement thumbnail lazy loading with IntersectionObserver
- [ ] Implement snapshot lazy loading (load HTML on demand)
- [ ] Add loading skeletons for progressive UI
- [ ] Lazy load TabPanel content

### Task 5.2: Change Detection Optimization

**Priority:** P1 - High
**Estimated Effort:** 2 hours

- [ ] Use OnPush strategy for all components
- [ ] Add `trackBy` functions for all `*ngFor`
- [ ] Use `async` pipe for Observable subscriptions
- [ ] Avoid function calls in templates
- [ ] Profile with Angular DevTools

### Task 5.3: Memory Management

**Priority:** P1 - High
**Estimated Effort:** 2 hours

- [ ] Implement cleanup in `ngOnDestroy` for all components
- [ ] Revoke blob URLs on component destroy
- [ ] Unload offscreen snapshot iframes
- [ ] Implement thumbnail cache with size limit
- [ ] Test memory usage with large sessions

### Task 5.4: Bundle Optimization

**Priority:** P2 - Medium
**Estimated Effort:** 1 hour

- [ ] Ensure module is lazy loaded
- [ ] Check bundle size with source-map-explorer
- [ ] Tree-shake unused Material modules
- [ ] Optimize JSZip import

---

## Phase 6: Testing & Documentation (6 hours)

### Task 6.1: Unit Tests

**Priority:** P1 - High
**Estimated Effort:** 3 hours

- [ ] Test SessionStateService
- [ ] Test EditStateService (operations, undo/redo)
- [ ] Test SessionLoaderService (zip handling)
- [ ] Test IndexedDBService (mock IndexedDB)
- [ ] Test pipes (filtered actions, console, network)
- [ ] Test utility functions

### Task 6.2: Component Tests

**Priority:** P1 - High
**Estimated Effort:** 2 hours

- [ ] Test SessionEditorComponent layout
- [ ] Test ActionListComponent virtual scroll
- [ ] Test TabPanelComponent tabs
- [ ] Test dialog components

### Task 6.3: Documentation

**Priority:** P2 - Medium
**Estimated Effort:** 1 hour

- [ ] Update Session Editor page documentation
- [ ] Document keyboard shortcuts
- [ ] Add JSDoc comments to services
- [ ] Create component architecture diagram

---

## Estimated Effort

### Phase Breakdown

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Project Setup | 4 | P0 |
| Phase 2: Core Services | 8 | P0 |
| Phase 3: Core Components | 16 | P0 |
| Phase 4: Feature Components | 12 | P1 |
| Phase 5: Performance Optimization | 8 | P1 |
| Phase 6: Testing & Documentation | 6 | P1 |
| **Total** | **54 hours** | |

### Summary

| Category | Hours |
|----------|-------|
| Core Migration (Phases 1-3) | 28h |
| Features & Polish (Phases 4-6) | 26h |
| **Grand Total** | **~54 hours** |

---

## Implementation Priority

### Immediate (Week 1)

1. **Phase 1: Project Setup** (4h) - Create module structure
2. **Task 2.1-2.2: Core Services** (5h) - SessionState, SessionLoader

### Short-Term (Week 2)

3. **Phase 3: Core Components** (16h) - All core UI components
4. **Task 2.3-2.4: Edit Services** (3h) - EditState, IndexedDB

### Medium-Term (Week 3)

5. **Phase 4: Feature Components** (12h) - Editing features
6. **Phase 5: Performance** (8h) - Optimization

### Final (Week 4)

7. **Phase 6: Testing & Documentation** (6h) - Tests and docs

---

## File Reference

### Services

| File | Description |
|------|-------------|
| `services/session-state.service.ts` | Session data and selection state |
| `services/session-loader.service.ts` | Zip loading and parsing |
| `services/edit-state.service.ts` | Edit operations and undo/redo |
| `services/indexed-db.service.ts` | Local persistence |
| `services/zip-export.service.ts` | Export modified sessions |

### Components

| File | Description |
|------|-------------|
| `session-editor.component.ts` | Main layout container |
| `components/timeline/` | Canvas timeline with thumbnails |
| `components/action-list/` | Virtual scrolling action list |
| `components/snapshot-viewer/` | HTML snapshot iframe display |
| `components/tab-panel/` | Console, Network, Info tabs |
| `components/note-editor-dialog/` | Markdown note editor |
| `components/action-editor/` | Action field editor |
| `components/editor-toolbar/` | Undo/redo/export toolbar |
| `components/confirm-dialog/` | Confirmation dialogs |
| `components/local-sessions/` | Local sessions panel |

### Models

| File | Description |
|------|-------------|
| `models/session.model.ts` | Session data types |
| `models/edit-operation.model.ts` | Edit operation types |
| `models/note-action.model.ts` | Note action type |

### React Source Reference

| React File | Purpose |
|------------|---------|
| `viewer/src/stores/sessionStore.ts` | State management reference |
| `viewer/src/components/Timeline/Timeline.tsx` | Canvas rendering reference |
| `viewer/src/components/ActionList/ActionList.tsx` | Virtual scroll reference |
| `viewer/src/utils/sessionLoader.ts` | Zip loading reference |
| `viewer/src/utils/zipHandler.ts` | Export reference |

---

## Backlog: Future Enhancements

### Multi-Tab Timeline Support (4-6 hours)

> **Note:** This feature enables viewing actions from multiple browser tabs on separate timeline rows. Implement after core Angular migration is complete.

**Priority:** P3 - Nice to Have
**Depends On:** Phase 3 (TimelineComponent)

- [ ] Track browser tab/context ID for each action in SessionStateService
- [ ] Render multiple timeline rows (one per tab/context) in TimelineComponent
- [ ] Group actions by tab/context in Timeline canvas rendering
- [ ] Add tab labels and visual differentiation
- [ ] Add tab filtering/switching UI controls
- [ ] Update ActionList to show tab context indicator

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial task breakdown for Angular migration |
| 1.1 | 2025-12-10 | Added Backlog section with Multi-Tab Timeline Support (moved from TASKS-2.md) |
