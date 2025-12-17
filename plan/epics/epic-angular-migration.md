# Epic: Angular Migration Core

<epic>
  <id>angular-migration</id>
  <name>Angular Migration Core</name>
  <status>draft</status>
  <initiative>angular-migration</initiative>
  <depends_on>viewer-react, editor-core</depends_on>
  <estimated_effort>40 hours</estimated_effort>
</epic>

## Overview

Add Session Editor as a new page/module to an **existing Angular application** that already has Angular Material theming, authentication, and shared services. This is a port of the React viewer/editor components to Angular equivalents, leveraging the existing app infrastructure.

**Context:** Target app already has Material theme, routing, auth - just adding a new feature module.

**Source PRD:** [PRD-angular-migration.md](../../PRDs/PRD-angular-migration.md)

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| QA Engineers | Review recorded sessions with annotations and editing |
| Developers | Debug issues using session recordings with full Angular integration |
| Technical Writers | Annotate sessions for documentation purposes |
| Business Analysts | Review and curate sessions for stakeholder presentations |

## Goals

1. **New Feature Page** - Session Editor as a lazy-loaded route in existing app
2. **Leverage Existing Infrastructure** - Use app's auth, routing, and services
3. **Match Existing Theme** - Use app's Angular Material palette (already configured)
4. **Component Port** - Convert React components to Angular equivalents

## Features

### F1: Angular Module Structure
- Create `SessionEditorModule` with lazy loading
- Configure routing via `SessionEditorRoutingModule`
- Import required Angular Material modules
- Import Angular CDK (Virtual Scroll, Drag & Drop)

### F2: Core Layout Components
- `SessionEditorComponent` - Main layout with sidenav/toolbar
- `TimelineComponent` - Canvas-based timeline with OnPush
- `ActionListComponent` - Virtual scrolling action list
- `SnapshotViewerComponent` - HTML snapshot display
- `TabPanelComponent` - Console/Network/Info tabs

### F3: Feature Components
- `SessionLoaderComponent` - File upload dialog
- `NoteEditorDialogComponent` - Note creation/editing
- `ActionEditorComponent` - Inline action editing
- `EditorToolbarComponent` - Undo/redo/export buttons
- `ConfirmDialogComponent` - Confirmation dialogs

### F4: State Management Services
- `SessionStateService` - Session data, selected action, filters
- `EditStateService` - Edit operations, undo/redo stacks
- `IndexedDBService` - Local persistence
- `SessionLoaderService` - Zip file parsing
- `ZipExportService` - Modified session export

### F5: Pipes and Utilities
- `FilteredActionsPipe` - Action type filtering
- `FilteredConsolePipe` - Console log filtering
- `FilteredNetworkPipe` - Network request filtering
- `ResizablePanelDirective` - Panel resize handling

### F6: Theme Integration
- Use existing app's Material palette (no new theme setup)
- Follow existing app's component patterns
- Match existing typography and spacing conventions
- Consistent with other pages in the app

### F7: Performance Optimization
- OnPush change detection on all components
- `trackBy` functions for all `*ngFor`
- Lazy loading of snapshots
- IntersectionObserver for thumbnails
- Memory cleanup on component destroy

### F8: Accessibility
- Full keyboard navigation
- ARIA labels on interactive elements
- Focus management for dialogs
- Screen reader compatibility
- WCAG 2.1 AA compliance

## Technical Requirements

### TR-1: Module Definition

```typescript
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
    MaterialModule,
    ScrollingModule,
    DragDropModule,
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

### TR-2: Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private sessionSubject = new BehaviorSubject<SessionData | null>(null);
  session$ = this.sessionSubject.asObservable();

  private selectedActionSubject = new BehaviorSubject<string | null>(null);
  selectedAction$ = this.selectedActionSubject.asObservable();
}
```

### TR-3: Canvas Timeline

```typescript
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent implements AfterViewInit, OnDestroy {
  @ViewChild('timelineCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId?: number;
}
```

## Quality Attributes

### QA-1: Performance
- Timeline scrubbing maintains 60fps
- Virtual scroll handles 1000+ actions smoothly
- Initial load time <3 seconds
- Memory usage <500MB

### QA-2: Accessibility
- Full keyboard navigation
- ARIA labels on all interactive elements
- Focus management for dialogs
- WCAG 2.1 AA compliance

### QA-3: Browser Support
- Chrome 90+, Firefox 90+, Edge 90+, Safari 14+

## Dependencies

- React Viewer complete (epic-viewer-react) - provides reference implementation
- Session Editor complete (epic-editor-core) - defines editing features
- **Existing Angular application** with:
  - Angular v20 with Material theme already configured
  - Shared services (auth, routing) already in place
  - Established component patterns to follow

## Out of Scope

- Real-time collaboration
- Cloud sync of edits
- Multiple session comparison
- Session recording from Angular app

## Implementation Phases

| Phase | Focus | Estimate |
|-------|-------|----------|
| Phase 1 | Module setup, routing, Material imports | 4 hours |
| Phase 2 | Core layout components (editor, timeline, action list) | 12 hours |
| Phase 3 | Feature components (snapshot viewer, tab panel) | 8 hours |
| Phase 4 | State services and persistence | 8 hours |
| Phase 5 | Editing features (notes, inline edit, export) | 6 hours |
| Phase 6 | Performance optimization and accessibility | 2 hours |
| **Total** | | **40 hours** |
