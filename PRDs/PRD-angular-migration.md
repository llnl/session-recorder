# Session Editor Angular Migration - Product Requirements Document

**Version:** 1.0
**Last Updated:** December 2025
**Status:** Draft
**Depends On:** [PRD-2.md](PRD-2.md) (React Viewer - Complete), [PRD-session-editor.md](PRD-session-editor.md) (Session Editor Features)

---

## Executive Summary

This PRD defines the migration of the Session Recorder Viewer from React to Angular v20, integrating it as the "Session Editor" page within an existing Angular Material application. The migration converts React components, hooks, and state management to Angular equivalents while leveraging the existing Angular Material theme and design system. The Session Editor functionality (annotations, editing, export) will be implemented during this migration.

---

## Problem Statement

The current Session Recorder Viewer is a standalone React application:

- Separate technology stack from the main Angular application
- Requires users to run a separate dev server or open a different URL
- No integration with existing Angular Material theme and design system
- Duplicated authentication and routing logic
- React-specific patterns (hooks, zustand) don't align with Angular architecture

Migrating to Angular enables:
- Unified user experience within the main application
- Shared authentication, routing, and services
- Consistent Angular Material theming
- Better maintainability with single tech stack
- Integration with existing Angular services and stores

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **QA Engineers** | Review recorded sessions with annotations and editing |
| **Developers** | Debug issues using session recordings with full Angular integration |
| **Technical Writers** | Annotate sessions for documentation purposes |
| **Business Analysts** | Review and curate sessions for stakeholder presentations |

---

## Use Cases

### UC-1: Session Editor Page Access

**Actor:** Any authenticated user
**Duration:** Immediate
**Scenario:** User navigates to Session Editor page within the Angular app and loads a recorded session zip file.

**Requirements:**
- Session Editor accessible via Angular router
- File upload integrated with Angular Material
- Session data loads into Angular services
- UI renders using Angular Material components

### UC-2: Session Viewing and Navigation

**Actor:** Developer or QA Engineer
**Duration:** 5-60 minutes
**Scenario:** User views a recorded session, navigates timeline, inspects actions, and reviews console/network tabs.

**Requirements:**
- Timeline component renders with Angular
- Action list with virtual scrolling (Angular CDK)
- Snapshot viewer displays HTML snapshots
- Tab panel shows Console, Network, Info tabs
- All interactions use Angular Material components

### UC-3: Session Editing and Export

**Actor:** Technical Writer or QA Engineer
**Duration:** 10-30 minutes
**Scenario:** User adds notes, edits action values, deletes unwanted actions, and exports modified session.

**Requirements:**
- Note insertion using Angular Material dialogs
- Inline editing with Angular forms
- Undo/redo via Angular service
- Export generates modified zip file

---

## Functional Requirements

### FR-1: Angular Component Migration

Convert React components to Angular equivalents.

#### FR-1.1: Core Layout Components

| React Component | Angular Component | Material Components Used |
|-----------------|-------------------|-------------------------|
| `App.tsx` | `SessionEditorComponent` | `mat-sidenav`, `mat-toolbar` |
| `Timeline/` | `TimelineComponent` | Canvas (custom), `mat-button` |
| `ActionList/` | `ActionListComponent` | `cdk-virtual-scroll-viewport` |
| `SnapshotViewer/` | `SnapshotViewerComponent` | `mat-card`, `mat-button-toggle` |
| `TabPanel/` | `TabPanelComponent` | `mat-tab-group` |
| `ResizablePanel/` | `ResizablePanelDirective` | Angular CDK drag-drop |

#### FR-1.2: Feature Components

| React Component | Angular Component | Material Components Used |
|-----------------|-------------------|-------------------------|
| `SessionLoader` | `SessionLoaderComponent` | `mat-dialog`, file input |
| `NoteEditor` | `NoteEditorDialogComponent` | `mat-dialog`, `mat-form-field` |
| `ActionEditor` | `ActionEditorComponent` | `mat-form-field`, `mat-input` |
| `EditorToolbar` | `EditorToolbarComponent` | `mat-toolbar`, `mat-button` |
| `ConfirmDialog` | `ConfirmDialogComponent` | `mat-dialog` |

### FR-2: State Management Migration

Convert React state management to Angular services.

#### FR-2.1: Zustand Store to Angular Services

| Zustand Store | Angular Service | Responsibilities |
|---------------|-----------------|------------------|
| `sessionStore` | `SessionStateService` | Session data, selected action, filtered data |
| (new) | `EditStateService` | Edit operations, undo/redo, persistence |
| (new) | `IndexedDBService` | IndexedDB operations for local persistence |

#### FR-2.2: React Hooks to Angular Services/Pipes

| React Hook | Angular Equivalent | Type |
|------------|-------------------|------|
| `useFilteredActions` | `FilteredActionsPipe` | Pipe |
| `useFilteredConsole` | `FilteredConsolePipe` | Pipe |
| `useFilteredNetwork` | `FilteredNetworkPipe` | Pipe |
| `useVirtualList` | Angular CDK Virtual Scroll | Component |

### FR-3: Angular Material Integration

Use existing Angular Material theme components.

#### FR-3.1: Theme Usage

- Use application's existing Angular Material palette
- Apply `mat-typography` classes for consistent fonts
- Use `mat-elevation` for depth/shadows
- Apply spacing using Angular Material's density system

#### FR-3.2: Component Mapping

| UI Element | Angular Material Component |
|------------|---------------------------|
| Buttons | `mat-button`, `mat-icon-button`, `mat-fab` |
| Inputs | `mat-form-field`, `mat-input` |
| Dialogs | `mat-dialog` |
| Tabs | `mat-tab-group`, `mat-tab` |
| Lists | `mat-list`, `cdk-virtual-scroll` |
| Cards | `mat-card` |
| Toggles | `mat-button-toggle-group` |
| Progress | `mat-progress-bar`, `mat-spinner` |
| Snackbars | `mat-snack-bar` |
| Tooltips | `matTooltip` |

### FR-4: Performance Features (Deferred from POC 2)

Implement performance features not completed in React viewer.

#### FR-4.1: Lazy Loading

- Implement thumbnail lazy loading with IntersectionObserver
- Implement snapshot lazy loading (load HTML on demand)
- Progressive loading (show UI skeleton before data)

#### FR-4.2: Performance Monitoring

- Use Angular DevTools for profiling
- Implement OnPush change detection strategy
- Add performance marks for load timing

#### FR-4.3: Memory Management

- Unload offscreen snapshots
- Implement component lifecycle cleanup
- Use `trackBy` for all `*ngFor` directives

---

## Technical Requirements

### TR-1: Angular Module Structure

#### TR-1.1: Feature Module

```typescript
// session-editor.module.ts
@NgModule({
  declarations: [
    SessionEditorComponent,
    TimelineComponent,
    ActionListComponent,
    SnapshotViewerComponent,
    TabPanelComponent,
    // ... other components
  ],
  imports: [
    CommonModule,
    SessionEditorRoutingModule,
    MaterialModule, // Shared Material imports
    ScrollingModule, // CDK Virtual Scroll
    DragDropModule, // CDK Drag & Drop
    ReactiveFormsModule,
  ],
  providers: [
    SessionStateService,
    EditStateService,
    IndexedDBService,
  ]
})
export class SessionEditorModule { }
```

### TR-2: Routing Configuration

```typescript
// session-editor-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: SessionEditorComponent,
  }
];
```

### TR-3: Canvas Timeline Implementation

The Timeline canvas rendering logic transfers directly to Angular with minimal changes:

```typescript
// timeline.component.ts
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent implements AfterViewInit, OnDestroy {
  @ViewChild('timelineCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId?: number;

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.render();
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
```

---

## Quality Attributes

### QA-1: Performance

- Timeline scrubbing maintains 60fps
- Virtual scroll handles 1000+ actions smoothly
- Initial load time <3 seconds for typical sessions
- Memory usage <500MB for typical sessions

### QA-2: Accessibility

- Full keyboard navigation support
- ARIA labels on all interactive elements
- Focus management for dialogs
- Screen reader compatibility
- WCAG 2.1 AA compliance

### QA-3: Maintainability

- Components use OnPush change detection
- Services are injectable and testable
- TypeScript strict mode enabled
- ESLint/Angular rules enforced

### QA-4: Browser Support

- Chrome 90+
- Firefox 90+
- Edge 90+
- Safari 14+

---

## Data Schema

### Session Types (Shared)

```typescript
// Types from session-recorder, used unchanged
import {
  SessionData,
  BrowserAction,
  NetworkEntry,
  ConsoleEntry
} from 'session-recorder/types';
```

### Edit State Types

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

type EditOperation =
  | AddNoteOperation
  | EditFieldOperation
  | DeleteActionOperation
  | EditNoteOperation;
```

---

## Future Considerations

### Not In Scope (v1)

| Feature | Rationale |
|---------|-----------|
| Real-time collaboration | Backend infrastructure needed |
| Cloud sync of edits | Local-first approach for v1 |
| Multiple session comparison | Complex UI, separate feature |
| Session recording from Angular app | Separate feature, requires Playwright integration |

### Potential v2 Features

- Session search and tagging
- Diff view (original vs edited)
- Export to Playwright test format
- Session sharing via URL
- Batch operations on multiple sessions

---

## Appendix A: Migration Checklist

### Components to Migrate

| Component | Priority | Complexity | Status |
|-----------|----------|------------|--------|
| SessionEditorComponent | P0 | Medium | Not Started |
| TimelineComponent | P0 | High | Not Started |
| ActionListComponent | P0 | Medium | Not Started |
| SnapshotViewerComponent | P0 | High | Not Started |
| TabPanelComponent | P0 | Medium | Not Started |
| ResizablePanelDirective | P1 | Medium | Not Started |
| NoteEditorDialogComponent | P1 | Low | Not Started |
| ActionEditorComponent | P1 | Low | Not Started |
| EditorToolbarComponent | P1 | Low | Not Started |
| ConfirmDialogComponent | P2 | Low | Not Started |
| LocalSessionsComponent | P2 | Low | Not Started |

### Services to Create

| Service | Priority | Status |
|---------|----------|--------|
| SessionStateService | P0 | Not Started |
| EditStateService | P1 | Not Started |
| IndexedDBService | P1 | Not Started |
| SessionLoaderService | P0 | Not Started |
| ZipExportService | P1 | Not Started |

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial PRD for Angular migration |
