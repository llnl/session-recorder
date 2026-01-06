# Initiative: Angular Migration

<initiative>
  <name>angular-migration</name>
  <status>draft</status>
  <goal>Add Session Editor page to existing Angular application by porting React viewer/editor components</goal>
  <description>
    Port the Session Recorder Viewer/Editor from React to Angular, adding it as a new page within an existing
    Angular application that already has Material theming, authentication, and shared services configured.
    This is a component port, not a full app migration - the infrastructure is already in place.
  </description>

  <epics>
    <epic id="core" status="draft" blocks="">Angular Migration Core (PRD-angular-migration.md)</epic>
  </epics>

  <success_criteria>
    <criterion status="pending">Angular module structure with SessionEditorModule</criterion>
    <criterion status="pending">All React components converted to Angular equivalents</criterion>
    <criterion status="pending">Zustand stores converted to Angular services</criterion>
    <criterion status="pending">Angular Material integration with existing theme</criterion>
    <criterion status="pending">Virtual scrolling via Angular CDK</criterion>
    <criterion status="pending">Canvas timeline with OnPush change detection</criterion>
    <criterion status="pending">IndexedDB persistence via Angular service</criterion>
    <criterion status="pending">Edit operations with undo/redo</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [core](../epics/epic-angular-migration.md) | draft | [tasks](../tasks/tasks-angular-migration.json) | Full React to Angular migration |

---

## Rationale

### Why Add to Existing App?

**Current State (React Viewer):**
- Standalone React application runs separately
- Requires separate dev server or URL
- Not integrated with existing Angular tooling

**Target State (Angular Page):**
- New page in existing Angular app (already has theme, auth, routing)
- Unified user experience - Session Editor is just another page
- Leverages existing infrastructure (no new setup needed)
- Single tech stack for the whole application

---

## Technical Architecture

### Module Structure

```
session-editor/
├── session-editor.module.ts
├── session-editor-routing.module.ts
├── components/
│   ├── session-editor/
│   ├── timeline/
│   ├── action-list/
│   ├── snapshot-viewer/
│   ├── tab-panel/
│   ├── note-editor-dialog/
│   ├── action-editor/
│   └── editor-toolbar/
├── services/
│   ├── session-state.service.ts
│   ├── edit-state.service.ts
│   ├── indexed-db.service.ts
│   ├── session-loader.service.ts
│   └── zip-export.service.ts
├── pipes/
│   ├── filtered-actions.pipe.ts
│   ├── filtered-console.pipe.ts
│   └── filtered-network.pipe.ts
└── directives/
    └── resizable-panel.directive.ts
```

### Component Migration Map

| React Component | Angular Component | Material Components |
|-----------------|-------------------|---------------------|
| `App.tsx` | `SessionEditorComponent` | `mat-sidenav`, `mat-toolbar` |
| `Timeline/` | `TimelineComponent` | Canvas (custom), `mat-button` |
| `ActionList/` | `ActionListComponent` | `cdk-virtual-scroll-viewport` |
| `SnapshotViewer/` | `SnapshotViewerComponent` | `mat-card`, `mat-button-toggle` |
| `TabPanel/` | `TabPanelComponent` | `mat-tab-group` |
| `NoteEditor` | `NoteEditorDialogComponent` | `mat-dialog`, `mat-form-field` |

### State Management Migration

| Zustand Store | Angular Service | Responsibilities |
|---------------|-----------------|------------------|
| `sessionStore` | `SessionStateService` | Session data, selected action, filtered data |
| (new) | `EditStateService` | Edit operations, undo/redo, persistence |
| (new) | `IndexedDBService` | IndexedDB operations for local persistence |

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| QA Engineers | Review recorded sessions with annotations and editing |
| Developers | Debug issues using session recordings with full Angular integration |
| Technical Writers | Annotate sessions for documentation purposes |
| Business Analysts | Review and curate sessions for stakeholder presentations |

---

## Quality Attributes

- **Performance**: Timeline 60fps, virtual scroll for 1000+ actions, <3s load time
- **Accessibility**: Full keyboard navigation, ARIA labels, WCAG 2.1 AA
- **Maintainability**: OnPush change detection, injectable services, strict TypeScript
- **Browser Support**: Chrome 90+, Firefox 90+, Edge 90+, Safari 14+

---

## Dependencies

- React Viewer complete (INITIATIVE-session-viewer) - reference implementation
- Session Editor features complete (INITIATIVE-session-editor) - feature spec
- **Existing Angular application** with:
  - Material theme already configured
  - Authentication and routing in place
  - Established patterns to follow
  - Angular v20 with CDK available

---

## Original PRD Reference

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD-angular-migration.md | Draft | Full migration specification |

---

## Change Log

| Date | Changes |
|------|---------|
| 2025-12-17 | Created initiative from PRD-angular-migration.md |
| 2025-12-10 | Original PRD created |
