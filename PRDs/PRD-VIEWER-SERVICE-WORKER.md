# PRD: Refactor Session Viewer to Use Service Worker Architecture

**Version:** 1.1
**Last Updated:** December 2025
**Status:** ⚡ Planned
**Priority:** Medium
**Complexity:** High
**Effort:** 2-3 weeks

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Developers** | View snapshots with correct resource loading |
| **QA Engineers** | Review session recordings with full fidelity |
| **Viewer Users** | Access all recorded content including Chrome-specific pages |

---

## Problem Statement

The current session viewer uses iframes with blob URLs to display captured snapshots. This approach has significant limitations:

- **Chrome-specific URLs fail**: `chrome://` and `chrome-extension://` URLs don't work in iframes
- **Resource handling fragile**: Requires complex URL rewriting and blob URL management
- **Poor error handling**: Missing resources cause broken UI with no fallback
- **Not scalable**: Each workaround adds complexity without solving root issues

**Example**: Recording google.com (Chrome New Tab page) renders poorly because:
- Chrome favicon URLs (`chrome://favicon2/...`) are stripped out
- Custom Chrome components don't render correctly
- Resources fail to load, causing broken images

## Proposed Solution

Refactor the viewer to use **Playwright's proven service worker architecture**:

```
User → Viewer App
       ↓
    Service Worker (intercepts requests)
       ↓
    Session Storage (IndexedDB)
       ↓
    Serves: Snapshots + Resources
```

### Architecture

**Service Worker** (`viewer/public/sw.js`):
- Intercepts fetch requests from snapshot iframes
- Serves snapshot HTML from storage
- Serves resources (CSS, JS, images, fonts) from storage
- Handles special URLs (chrome://, data:, blob:)

**Session Storage** (IndexedDB):
- Stores session metadata
- Stores snapshot HTML
- Stores all captured resources (blob storage)

**Viewer Updates**:
- Navigate iframe to service worker URL instead of blob URL
- Remove URL rewriting logic (no longer needed)
- Remove blob URL management
- Simplify resource handling

## Benefits

### Technical Benefits
- ✅ **No URL rewriting needed**: Original HTML preserved exactly as captured
- ✅ **All resources load correctly**: Service worker serves everything
- ✅ **Chrome URLs work**: Can proxy/handle chrome:// protocol
- ✅ **Better error handling**: Service worker can provide fallbacks
- ✅ **Proven architecture**: Same approach as Playwright trace viewer

### User Benefits
- ✅ **See everything recorded**: No hidden/removed content
- ✅ **Better fidelity**: Snapshots render exactly as they were
- ✅ **More reliable**: Fewer edge cases and failures
- ✅ **Faster loading**: Service worker caching

## Implementation Plan

### Phase 1: Service Worker Foundation
**Files**:
- `viewer/public/sw.js` - NEW
- `viewer/src/utils/serviceWorker.ts` - NEW

**Tasks**:
1. Create service worker with fetch event handler
2. Implement service worker registration in viewer
3. Add service worker lifecycle management
4. Handle service worker updates

**Complexity**: Medium
**Time**: 3-5 days

### Phase 2: Session Storage
**Files**:
- `viewer/src/stores/sessionStorage.ts` - NEW
- `viewer/src/stores/sessionStore.ts` - UPDATE

**Tasks**:
1. Implement IndexedDB wrapper for sessions
2. Store session data when loading
3. Store snapshots in IndexedDB
4. Store resources in blob storage
5. Add session cleanup/management

**Complexity**: Medium
**Time**: 3-5 days

### Phase 3: Service Worker Request Handlers
**Files**:
- `viewer/public/sw.js` - UPDATE

**Tasks**:
1. Implement snapshot HTML serving
2. Implement resource serving (CSS, JS, images, fonts)
3. Handle chrome:// URL proxying/fallbacks
4. Add caching strategy
5. Error handling and fallbacks

**Complexity**: High
**Time**: 5-7 days

### Phase 4: Viewer Refactoring
**Files**:
- `viewer/src/components/SnapshotViewer/SnapshotViewer.tsx` - UPDATE

**Tasks**:
1. Replace blob URL approach with service worker URLs
2. Remove URL rewriting functions
3. Remove blob URL management
4. Simplify resource handling
5. Update iframe navigation to use service worker URLs

**Complexity**: Medium
**Time**: 2-3 days

### Phase 5: Testing & Polish
**Tasks**:
1. Test with various websites (google.com, complex SPAs, etc.)
2. Test service worker lifecycle (install, update, unregister)
3. Test offline behavior
4. Performance testing
5. Error handling validation

**Complexity**: Medium
**Time**: 3-5 days

## Technical Considerations

### Service Worker Requirements
- **HTTPS or localhost**: Service workers only work on secure origins
- **Scope**: Service worker scope must cover snapshot URLs
- **Update strategy**: Handle service worker updates gracefully

### Browser Support
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (iOS 11.3+)

### IndexedDB Storage
- **Quota**: Browser storage quota limits (typically 50% of available disk)
- **Cleanup**: Need to implement storage cleanup for old sessions
- **Performance**: IndexedDB is asynchronous, good for large blobs

## Migration Strategy

### Backward Compatibility
- Keep old blob URL approach as fallback
- Detect service worker support
- Gracefully degrade if service worker unavailable

### User Migration
- Automatic migration on first viewer load
- Background migration of existing sessions to IndexedDB
- Clear migration progress indication

## Success Metrics

### Functional Metrics
- ✅ All recorded websites render correctly
- ✅ Chrome-specific URLs handled properly
- ✅ No broken images or resources
- ✅ Service worker handles 100% of resource requests

### Performance Metrics
- Snapshot load time: < 1 second
- Resource serve time: < 100ms per resource
- Storage usage: < 2x recorded session size

### Quality Metrics
- Zero URL rewriting bugs
- Zero blob URL memory leaks
- Service worker crash rate: < 0.1%

## Risks & Mitigation

### Risk: Service Worker Complexity
- **Impact**: High
- **Likelihood**: Medium
- **Mitigation**: Use Playwright's service worker as reference, extensive testing

### Risk: IndexedDB Quota
- **Impact**: Medium
- **Likelihood**: Low
- **Mitigation**: Implement storage quota monitoring, cleanup old sessions

### Risk: Service Worker Cache Issues
- **Impact**: Medium
- **Likelihood**: Medium
- **Mitigation**: Implement cache versioning, clear cache on updates

## Alternative Approaches Considered

### Alternative 1: Keep Blob URL Approach
- **Pros**: No refactoring needed, simple
- **Cons**: Doesn't solve fundamental issues, continuing workarounds
- **Decision**: Rejected - doesn't address root problems

### Alternative 2: Use `srcdoc` Attribute
- **Pros**: Simpler than service worker, no blob URLs
- **Cons**: Still has iframe limitations, doesn't solve chrome:// URLs
- **Decision**: Rejected - partial solution only

### Alternative 3: Server-Side Rendering
- **Pros**: Could handle all URLs server-side
- **Cons**: Requires backend, defeats purpose of client-only viewer
- **Decision**: Rejected - adds unnecessary complexity

## Open Questions

1. **Q**: How to handle chrome:// URLs in service worker?
   **A**: Provide placeholder images/content, can't actually load chrome:// content

2. **Q**: Storage quota limits for large sessions?
   **A**: Implement quota monitoring, warn users, cleanup old sessions

3. **Q**: Service worker debugging strategy?
   **A**: Use Chrome DevTools service worker panel, extensive logging

## References

- [Playwright Trace Viewer Service Worker](https://github.com/microsoft/playwright/blob/main/packages/trace-viewer/src/sw/main.ts)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Playwright Snapshot Renderer](https://github.com/microsoft/playwright/blob/main/packages/trace-viewer/src/sw/snapshotRenderer.ts)

## Appendix: Current vs Proposed Flow

### Current Flow (Blob URLs)
```
1. Load session.json
2. Load resources as Blobs
3. Convert resource paths to blob URLs
4. Rewrite HTML to use blob URLs
5. Write HTML to iframe.contentDocument
6. Resources fail to load (chrome:// URLs)
```

### Proposed Flow (Service Worker)
```
1. Load session.json
2. Store session + resources in IndexedDB
3. Service worker intercepts requests
4. Navigate iframe to /snapshot/action-X.html
5. Service worker serves HTML from IndexedDB
6. HTML requests resources
7. Service worker serves resources from IndexedDB
8. Everything loads correctly
```

## Appendix: File Structure

```
viewer/
├── public/
│   ├── sw.js                    # NEW: Service worker
│   └── index.html               # UPDATE: Register service worker
├── src/
│   ├── components/
│   │   └── SnapshotViewer/
│   │       └── SnapshotViewer.tsx  # UPDATE: Use SW URLs
│   ├── stores/
│   │   ├── sessionStore.ts      # UPDATE: Use storage
│   │   └── sessionStorage.ts    # NEW: IndexedDB wrapper
│   └── utils/
│       └── serviceWorker.ts     # NEW: SW registration
└── vite.config.ts               # UPDATE: SW config
```

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-06 | Initial PRD for Service Worker refactoring |
| 1.1 | 2025-12-10 | Updated to follow template, added Target Users table |
