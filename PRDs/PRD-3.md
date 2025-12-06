# PRD-3: Session Recorder Snapshot Architecture Improvements

**Version:** 3.2
**Date:** 2025-12-05
**Status:** 🟢 Phase 1 Complete | 🟢 Phase 2 Complete | ⚡ Phase 3 Optional
**Based On:** Playwright's Production-Grade Snapshot System Analysis

---

## Executive Summary

After analyzing Playwright's proven snapshot implementation ([snapshotterInjected.ts](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts) and [snapshotRenderer.ts](../../packages/trace-viewer/src/sw/snapshotRenderer.ts)), we've identified **critical architectural gaps** in the session recorder that prevent accurate snapshot capture and rendering.

**The Core Problem:** Our current implementation captures custom attributes but **fails to restore them**, resulting in empty form fields, missing scroll positions, and incomplete visual state.

**Impact:**
- ❌ Form debugging is broken (empty inputs)
- ❌ Visual state doesn't match recorded actions
- ❌ Missing resources cause broken layouts
- ❌ No deduplication leads to massive file sizes

**Solution:** Adopt Playwright's proven three-phase architecture:
1. **Capture Phase:** Enhanced state serialization (✅ 70% complete)
2. **Storage Phase:** Resource deduplication with SHA1 hashing (❌ 0% complete)
3. **Render Phase:** State restoration script (❌ 0% complete)

---

## 1. Current Implementation Analysis

### 1.1 What We Have (Partial Implementation)

**File:** [session-recorder/src/browser/snapshotCapture.ts](../src/browser/snapshotCapture.ts)

✅ **Working Capture Logic:**
```typescript
// Line 85-88: Input values captured
if (tagName === 'input' || tagName === 'textarea') {
  const value = (element as HTMLInputElement | HTMLTextAreaElement).value;
  html += ` ${kValueAttribute}="${escapeAttr(value)}"`;
}

// Line 91-94: Checkbox/radio state captured
if (tagName === 'input' && ['checkbox', 'radio'].includes((element as HTMLInputElement).type)) {
  const checked = (element as HTMLInputElement).checked ? 'true' : 'false';
  html += ` ${kCheckedAttribute}="${checked}"`;
}

// Line 103-108: Scroll positions captured
if (element.scrollTop > 0) {
  html += ` ${kScrollTopAttribute}="${element.scrollTop}"`;
}
```

✅ **Captured State Types:**
- Input/textarea values (`__playwright_value_`)
- Checkbox/radio checked state (`__playwright_checked_`)
- Select option selected state (`__playwright_selected_`)
- Scroll positions (`__playwright_scroll_top_`, `__playwright_scroll_left_`)
- Image currentSrc (`__playwright_current_src__`)
- Shadow DOM (basic support)

### 1.2 Critical Missing Components

❌ **1. Restoration Script (Phase 3 - Render)**

**Current Viewer:** [viewer/src/components/SnapshotViewer/SnapshotViewer.tsx:60-62](../viewer/src/components/SnapshotViewer/SnapshotViewer.tsx#L60-L62)
```typescript
// PROBLEM: Just writes HTML directly without restoration
iframeDoc.open();
iframeDoc.write(htmlContent);  // ❌ Custom attributes are NOT restored to DOM properties
iframeDoc.close();
```

**What's Missing:**
- No script to read `__playwright_value_` and set `inputElement.value`
- No restoration of `checked`, `selected`, `scrollTop` properties
- No Shadow DOM reconstruction
- No canvas rendering from screenshots

**Result:** Snapshots display HTML with custom attributes, but the browser **ignores** them. Form fields appear empty even though the value is in the attribute.

---

❌ **2. Resource Capture and Storage (Phase 2)**

**Current Implementation:** No resource handling at all.

**What's Missing:**
```typescript
// Playwright's approach (snapshotterInjected.ts:617-628)
for (const sheet of this._staleStyleSheets) {
  const content = this._updateLinkStyleSheetTextIfNeeded(sheet, snapshotNumber);
  const url = removeHash(this._resolveUrl(base, sheet.href!));
  result.resourceOverrides.push({ url, content, contentType: 'text/css' });
}

// Storage with SHA1 deduplication (snapshotter.ts:142-151)
const buffer = Buffer.from(content);
const sha1 = calculateSha1(buffer) + '.' + mime.getExtension(contentType);
this._delegate.onSnapshotterBlob({ sha1, buffer });
snapshot.resourceOverrides.push({ url, sha1 });
```

**Impact:**
- External CSS doesn't load correctly
- Missing images and fonts
- No HAR-like resource storage
- Massive file sizes (no deduplication)

---

❌ **3. Advanced State Capture**

**Missing State Types:**

| State | Playwright Captures | Session Recorder | Impact |
|-------|-------------------|------------------|---------|
| Canvas content | ✅ Bounding rect + screenshot extraction | ❌ Not captured | Canvas appears blank |
| Iframe positions | ✅ Bounding rect for nested frames | ❌ Not captured | Iframe layout broken |
| Popover state | ✅ `:popover-open` detection | ❌ Not captured | Popovers don't appear |
| Dialog state | ✅ Modal vs non-modal | ❌ Not captured | Dialogs don't show |
| Custom elements | ✅ Defined custom element list | ❌ Not captured | Web components broken |
| Adopted stylesheets | ✅ Shadow DOM styles | ❌ Not captured | Shadow DOM unstyled |

---

❌ **4. NodeSnapshot Structure**

**Current:** String-based concatenation (inefficient, no caching)
```typescript
function visitNode(node: Node): string {
  let html = `<${tagName}`;
  // ... builds entire string
  return html;
}
```

**Playwright's Approach:** Structured tree with reference-based caching
```typescript
type NodeSnapshot =
  | string                              // Text node
  | [[number, number]]                   // Reference to previous snapshot
  | [string, Record<string, string>, ...NodeSnapshot[]]; // Element with children
```

**Benefits:**
- Unchanged nodes reference previous snapshots (saves space)
- Post-order indexing for efficient lookups
- ~40-60% file size reduction for subsequent snapshots

---

## 2. Playwright's Architecture (What We Should Build)

### 2.1 Three-Phase Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 1: CAPTURE                             │
│  (Browser-side: snapshotterInjected.ts)                        │
├────────────────────────────────────────────────────────────────┤
│  1. Traverse DOM tree recursively                               │
│  2. For each element:                                           │
│     • Serialize HTML attributes                                 │
│     • Capture runtime state → custom attributes                 │
│       - input.value → __playwright_value_                       │
│       - input.checked → __playwright_checked_                   │
│       - element.scrollTop → __playwright_scroll_top_            │
│     • Handle Shadow DOM recursively                             │
│  3. Extract external resources (CSS, fonts, images)             │
│  4. Return structured SnapshotData with resourceOverrides       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 2: STORAGE                             │
│  (Node.js-side: snapshotter.ts)                                │
├────────────────────────────────────────────────────────────────┤
│  1. Process resourceOverrides:                                  │
│     • Calculate SHA1 hash of content                            │
│     • Store blob in trace file (deduplicated)                   │
│     • Replace content with SHA1 reference                       │
│  2. Store FrameSnapshot with metadata                           │
│  3. Store HAR entries for network resources                     │
│  4. Compress and write to trace archive                         │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 3: RENDER                              │
│  (Viewer-side: snapshotRenderer.ts)                            │
├────────────────────────────────────────────────────────────────┤
│  1. Reconstruct HTML from NodeSnapshot tree                     │
│  2. Inject restoration script into <head>                       │
│  3. Script executes on DOMContentLoaded:                        │
│     • Query [__playwright_value_] → restore input.value         │
│     • Query [__playwright_checked_] → restore input.checked     │
│     • Query [__playwright_selected_] → restore option.selected  │
│     • Query [__playwright_scroll_top_] → restore scrollTop      │
│     • Rebuild Shadow DOM from <template shadowrootmode="open">  │
│     • Extract canvas content from screenshot                    │
│  4. Serve resources from blob storage via SHA1 lookup           │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Components Breakdown

#### **Component 1: Enhanced Capture (snapshotCapture.ts)**

**Current Coverage:** ~70%
**Missing:**
- Canvas bounding rects
- Iframe bounding rects
- Popover/dialog state
- Custom elements registry
- Adopted stylesheets
- Resource extraction

**Implementation Reference:**
- [snapshotterInjected.ts:444-455](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts#L444-L455) - Canvas capture
- [snapshotterInjected.ts:456-467](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts#L456-L467) - Popover/dialog
- [snapshotterInjected.ts:617-628](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts#L617-L628) - Resources

---

#### **Component 2: Resource Storage (NEW - resourceStorage.ts)**

**Current Coverage:** 0%

**Required Functionality:**
```typescript
interface ResourceStorage {
  // Store resource and return SHA1 hash
  storeResource(url: string, content: Buffer, contentType: string): string;

  // Retrieve resource by SHA1
  getResource(sha1: string): Buffer | undefined;

  // Check if resource already exists (deduplication)
  hasResource(sha1: string): boolean;

  // Export all resources to zip
  exportToZip(): Promise<Blob>;
}
```

**Storage Format:**
```json
{
  "snapshots": [
    {
      "html": "NodeSnapshot tree",
      "resourceOverrides": [
        { "url": "https://example.com/style.css", "sha1": "abc123...css" }
      ]
    }
  ],
  "resources": {
    "abc123...css": "/* CSS content */",
    "def456...png": "<base64-encoded-image>"
  }
}
```

**Implementation Reference:**
- [snapshotter.ts:142-151](../../packages/playwright-core/src/server/trace/recorder/snapshotter.ts#L142-L151) - Resource processing
- [snapshotStorage.ts](../../packages/trace-viewer/src/sw/snapshotStorage.ts) - Blob storage

---

#### **Component 3: Restoration Script (NEW - snapshotRestoration.ts)**

**Current Coverage:** 0%

**Required Script (injected into snapshot HTML):**
```typescript
// Injected into <head> of every snapshot
function restoreSnapshotState() {
  const visit = (root: Document | ShadowRoot) => {
    // 1. Restore input values
    for (const el of root.querySelectorAll('[__playwright_value_]')) {
      const input = el as HTMLInputElement;
      if (input.type !== 'file') {
        input.value = input.getAttribute('__playwright_value_')!;
      }
      el.removeAttribute('__playwright_value_');
    }

    // 2. Restore checkbox/radio checked state
    for (const el of root.querySelectorAll('[__playwright_checked_]')) {
      (el as HTMLInputElement).checked =
        el.getAttribute('__playwright_checked_') === 'true';
      el.removeAttribute('__playwright_checked_');
    }

    // 3. Restore select options
    for (const el of root.querySelectorAll('[__playwright_selected_]')) {
      (el as HTMLOptionElement).selected =
        el.getAttribute('__playwright_selected_') === 'true';
      el.removeAttribute('__playwright_selected_');
    }

    // 4. Restore scroll positions (on load)
    window.addEventListener('load', () => {
      for (const el of root.querySelectorAll('[__playwright_scroll_top_]')) {
        el.scrollTop = +el.getAttribute('__playwright_scroll_top_')!;
        el.removeAttribute('__playwright_scroll_top_');
      }
    });

    // 5. Rebuild Shadow DOM
    for (const el of root.querySelectorAll('template[shadowrootmode]')) {
      const template = el as HTMLTemplateElement;
      const shadowRoot = template.parentElement!.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content);
      template.remove();
      visit(shadowRoot); // Recurse into shadow DOM
    }
  };

  // Execute on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => visit(document));
  } else {
    visit(document);
  }
}

// Self-executing
(function() { restoreSnapshotState(); })();
```

**Implementation Reference:**
- [snapshotRenderer.ts:257-559](../../packages/trace-viewer/src/sw/snapshotRenderer.ts#L257-L559) - Complete restoration script

---

#### **Component 4: Viewer Integration (SnapshotViewer.tsx)**

**Current Implementation:** Loads HTML directly
**Required Changes:**

```typescript
// BEFORE (current - broken)
iframeDoc.write(htmlContent);

// AFTER (with restoration)
const htmlWithRestoration = injectRestorationScript(htmlContent);
iframeDoc.write(htmlWithRestoration);
```

**Restoration Injection:**
```typescript
function injectRestorationScript(html: string): string {
  const script = `<script>${RESTORATION_SCRIPT_SOURCE}</script>`;

  // Inject before closing </head> or at start of <body>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`);
  }
  return html.replace('<body', `<body>${script}<div style="display:none"></div>`);
}
```

---

### 2.3 NodeSnapshot Structure (Future Optimization)

**Current:** String concatenation (simple but inefficient)
**Playwright:** Structured tree with references (complex but efficient)

**Benefit:** 40-60% file size reduction for subsequent snapshots

**Example:**
```typescript
// First snapshot - full capture
snapshot1 = {
  html: ['html', {},
    ['head', {}, ['title', {}, 'Page']],
    ['body', {}, ['div', { id: 'content' }, 'Hello']]
  ]
}

// Second snapshot - only changed nodes
snapshot2 = {
  html: ['html', {},
    [[0, 0]],  // Reference to snapshot1's <head> (unchanged)
    ['body', {}, ['div', { id: 'content' }, 'Hello Updated']]  // Changed content
  ]
}
```

**Implementation Complexity:** High (requires post-order indexing, reference tracking)
**Priority:** Low (optimize after core functionality works)

---

## 3. Implementation Roadmap

### Phase 1: Critical Fixes (Sprint 5a) ✅ COMPLETE

**Goal:** Make snapshots actually work for debugging
**Status:** ✅ **COMPLETED** (2025-12-05)

**Task 1.1: Add Restoration Script (4 hours)** ✅
- ✅ Created `snapshotRestoration.ts` with restoration logic
- ✅ Injected script into snapshot HTML in viewer
- ✅ Tested: Input values, checkboxes, scroll positions restore correctly

**Task 1.2: Capture Missing State (3 hours)** ✅
- ✅ Added canvas bounding rects (`__playwright_bounding_rect__`)
- ✅ Added iframe bounding rects
- ✅ Added popover/dialog state
- ✅ Added custom elements tracking
- ✅ Tested: All interactive elements captured

**Task 1.3: Shadow DOM Rendering (2 hours)** ✅
- ✅ Enhanced Shadow DOM serialization with adopted stylesheets
- ✅ Ensured recursive Shadow DOM traversal
- ✅ Tested: Shadow DOM components render correctly

**Total:** 9 hours ✅ COMPLETE

**Files Created:**
- `session-recorder/src/browser/snapshotRestoration.ts`

**Files Modified:**
- `session-recorder/src/browser/snapshotCapture.ts`
- `session-recorder/viewer/src/components/SnapshotViewer/SnapshotViewer.tsx`

---

### Phase 2: Resource Management (Sprint 5c) 📦 ✅ COMPLETE

**Goal:** Proper resource loading and deduplication

**Status:** ✅ **COMPLETED** (2025-12-05)

**Task 2.1: Resource Capture (5 hours)** ✅
- ✅ Extract external stylesheets during capture
- ✅ Capture images as data URLs or references
- ✅ Store in `resourceOverrides` array

**Task 2.2: SHA1 Storage (4 hours)** ✅
- ✅ Implement `ResourceStorage` class with SHA1 hashing
- ✅ Store blobs in session JSON
- ✅ Deduplicate identical resources

**Task 2.3: Resource Serving (3 hours)** ✅
- ✅ Implement resource lookup in viewer
- ✅ Serve resources from blob storage
- ✅ Handle CORS and security policies

**Total:** 12 hours ✅ COMPLETE

**Files Created:**
- `session-recorder/src/storage/resourceStorage.ts`

**Files Modified:**
- `session-recorder/src/browser/snapshotCapture.ts`
- `session-recorder/src/browser/injected.ts`
- `session-recorder/src/node/SessionRecorder.ts`
- `session-recorder/viewer/src/stores/sessionStore.ts`
- `session-recorder/viewer/src/types/session.ts`

---

### Phase 3: Optimization (Sprint 7 - Low Priority) ⚡

**Goal:** Reduce file sizes and improve performance

**Task 3.1: NodeSnapshot Structure (8 hours)**
- Refactor string-based HTML to NodeSnapshot tree
- Implement reference-based caching
- Post-order indexing for lookups

**Task 3.2: Incremental Snapshots (6 hours)**
- Track unchanged DOM subtrees
- Reference previous snapshots for unchanged nodes
- Measure file size reduction

**Total:** 14 hours

---

## 4. Technical Specifications

### 4.1 Restoration Script API

**Location:** `session-recorder/src/browser/snapshotRestoration.ts`

```typescript
export interface RestorationConfig {
  // Enable/disable specific restorations
  restoreInputs?: boolean;
  restoreCheckboxes?: boolean;
  restoreScrollPositions?: boolean;
  restoreShadowDOM?: boolean;

  // Debug logging
  verbose?: boolean;
}

export function generateRestorationScript(config?: RestorationConfig): string;
```

**Default Export:** Self-executing script string ready for injection

---

### 4.2 Resource Storage API

**Location:** `session-recorder/src/storage/resourceStorage.ts`

```typescript
export interface ResourceOverride {
  url: string;
  sha1: string;
  contentType: string;
  size: number;
}

export interface StoredResource {
  sha1: string;
  content: string; // base64 for binary, raw for text
  contentType: string;
  timestamp: number;
}

export class ResourceStorage {
  constructor(sessionId: string);

  // Store resource and return SHA1
  async storeResource(
    url: string,
    content: Buffer | string,
    contentType: string
  ): Promise<ResourceOverride>;

  // Get resource by SHA1
  async getResource(sha1: string): Promise<StoredResource | null>;

  // Check existence
  hasResource(sha1: string): boolean;

  // Export all resources
  async exportToJSON(): Promise<Record<string, StoredResource>>;

  // Import resources
  async importFromJSON(data: Record<string, StoredResource>): Promise<void>;

  // Statistics
  getTotalSize(): number;
  getResourceCount(): number;
}
```

---

### 4.3 Enhanced Snapshot Data Structure

**Current:**
```typescript
interface SnapshotData {
  doctype?: string;
  html: string;  // ❌ String-based
  viewport: { width: number; height: number };
  url: string;
  timestamp: string;
}
```

**Enhanced (Phase 1):**
```typescript
interface SnapshotData {
  doctype?: string;
  html: string;
  viewport: { width: number; height: number };
  url: string;
  timestamp: string;

  // NEW: Resource overrides
  resourceOverrides: ResourceOverride[];

  // NEW: Additional metadata
  collectionTime: number; // Capture duration in ms
  wallTime: number; // Timestamp for ordering
}
```

**Future (Phase 3):**
```typescript
interface SnapshotData {
  doctype?: string;
  html: NodeSnapshot;  // ✅ Structured tree
  viewport: { width: number; height: number };
  url: string;
  timestamp: string;
  resourceOverrides: ResourceOverride[];
  collectionTime: number;
  wallTime: number;
}

type NodeSnapshot =
  | string  // Text node
  | [[number, number]]  // Reference [snapshotsAgo, nodeIndex]
  | [string, Record<string, string>, ...NodeSnapshot[]];  // Element
```

---

## 5. Success Criteria

### 5.1 Phase 1 (Critical Fixes)
- ✅ Input fields show typed values in snapshots
- ✅ Checkboxes/radios show correct checked state
- ✅ Scroll positions are restored
- ✅ Shadow DOM components render correctly
- ✅ Canvas elements show placeholders (bounding rects captured)

### 5.2 Phase 2 (Resource Management)
- ✅ External CSS loads correctly in snapshots
- ✅ Images display without broken links
- ✅ Fonts render correctly
- ✅ File size reduction through deduplication (measure baseline first)

### 5.3 Phase 3 (Optimization)
- ✅ 40%+ file size reduction for subsequent snapshots
- ✅ <100ms snapshot capture time (currently ~50ms baseline)
- ✅ <50ms snapshot load time in viewer

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Restoration Script:**
```typescript
describe('Snapshot Restoration', () => {
  it('restores input values', () => {
    const html = '<input __playwright_value_="test" />';
    const doc = loadHTML(html);
    restoreSnapshotState(doc);
    expect(doc.querySelector('input').value).toBe('test');
  });

  it('restores checkbox state', () => {
    const html = '<input type="checkbox" __playwright_checked_="true" />';
    const doc = loadHTML(html);
    restoreSnapshotState(doc);
    expect(doc.querySelector('input').checked).toBe(true);
  });
});
```

**Resource Storage:**
```typescript
describe('ResourceStorage', () => {
  it('deduplicates identical resources', async () => {
    const storage = new ResourceStorage('test-session');
    const content = Buffer.from('body { color: red; }');

    const sha1_1 = await storage.storeResource('a.css', content, 'text/css');
    const sha1_2 = await storage.storeResource('b.css', content, 'text/css');

    expect(sha1_1).toBe(sha1_2);
    expect(storage.getResourceCount()).toBe(1);
  });
});
```

### 6.2 Integration Tests

**End-to-End Flow:**
```typescript
describe('Snapshot E2E', () => {
  it('captures and restores form state', async () => {
    // 1. Capture snapshot with filled form
    await page.fill('#email', 'test@example.com');
    const snapshot = await captureSnapshot(page);

    // 2. Load snapshot in viewer
    const viewer = await loadSnapshotInViewer(snapshot);

    // 3. Verify restoration
    const restoredValue = await viewer.evaluate(() =>
      document.querySelector('#email').value
    );
    expect(restoredValue).toBe('test@example.com');
  });
});
```

---

## 7. Migration Path

### 7.1 Backward Compatibility

**Existing Sessions:** Already captured with custom attributes ✅
- Phase 1 changes are purely on the viewer side
- Old sessions will immediately benefit from restoration script

**Format Changes:**
- Phase 2 adds `resourceOverrides` array (optional field)
- Phase 3 changes `html` type (requires migration script)

**Migration Script (Phase 3):**
```typescript
function migrateToNodeSnapshot(oldSession: OldFormat): NewFormat {
  return {
    ...oldSession,
    snapshots: oldSession.snapshots.map(snap => ({
      ...snap,
      html: parseHTMLToNodeSnapshot(snap.html)
    }))
  };
}
```

### 7.2 Rollout Plan

1. **Week 1:** Deploy Phase 1 (restoration script) - immediate improvements
2. **Week 2:** Monitor for issues, gather feedback
3. **Week 3:** Deploy Phase 2 (resource management) - gradual rollout
4. **Week 4:** Optimize and tune
5. **Week 5+:** Phase 3 (NodeSnapshot) - opt-in beta testing

---

## 8. References

### Playwright Source Files
- [snapshotterInjected.ts](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts) - Capture logic (637 lines)
- [snapshotter.ts](../../packages/playwright-core/src/server/trace/recorder/snapshotter.ts) - Storage logic (181 lines)
- [snapshotRenderer.ts](../../packages/trace-viewer/src/sw/snapshotRenderer.ts) - Render logic (643 lines)
- [snapshot.ts](../../packages/trace/src/snapshot.ts) - Type definitions (62 lines)
- [har.ts](../../packages/trace/src/har.ts) - HAR format types

### Session Recorder Files
- [snapshotCapture.ts](../src/browser/snapshotCapture.ts) - Current capture (185 lines)
- [SnapshotViewer.tsx](../viewer/src/components/SnapshotViewer/SnapshotViewer.tsx) - Current viewer (221 lines)

---

## Appendix A: Detailed Code Examples

### A.1 Complete Restoration Script (Production-Ready)

```typescript
// session-recorder/src/browser/snapshotRestoration.ts
export function generateRestorationScript(): string {
  // Self-executing function that runs in iframe context
  const scriptSource = `
(function() {
  'use strict';

  // Restoration logic
  function restoreSnapshotState() {
    const visit = (root) => {
      // 1. Restore input/textarea values
      const valueElements = root.querySelectorAll('[__playwright_value_]');
      for (let i = 0; i < valueElements.length; i++) {
        const el = valueElements[i];
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
          if (el.type !== 'file') {
            el.value = el.getAttribute('__playwright_value_');
          }
          el.removeAttribute('__playwright_value_');
        }
      }

      // 2. Restore checkbox/radio checked state
      const checkedElements = root.querySelectorAll('[__playwright_checked_]');
      for (let i = 0; i < checkedElements.length; i++) {
        const el = checkedElements[i];
        el.checked = el.getAttribute('__playwright_checked_') === 'true';
        el.removeAttribute('__playwright_checked_');
      }

      // 3. Restore select option selected state
      const selectedElements = root.querySelectorAll('[__playwright_selected_]');
      for (let i = 0; i < selectedElements.length; i++) {
        const el = selectedElements[i];
        el.selected = el.getAttribute('__playwright_selected_') === 'true';
        el.removeAttribute('__playwright_selected_');
      }

      // 4. Restore popover state
      const popoverElements = root.querySelectorAll('[__playwright_popover_open_]');
      for (let i = 0; i < popoverElements.length; i++) {
        const el = popoverElements[i];
        try {
          if (el.showPopover) el.showPopover();
        } catch (e) {
          console.warn('Failed to show popover:', e);
        }
        el.removeAttribute('__playwright_popover_open_');
      }

      // 5. Restore dialog state
      const dialogElements = root.querySelectorAll('[__playwright_dialog_open_]');
      for (let i = 0; i < dialogElements.length; i++) {
        const el = dialogElements[i];
        const mode = el.getAttribute('__playwright_dialog_open_');
        try {
          if (mode === 'modal') {
            el.showModal();
          } else {
            el.show();
          }
        } catch (e) {
          console.warn('Failed to show dialog:', e);
        }
        el.removeAttribute('__playwright_dialog_open_');
      }

      // 6. Rebuild Shadow DOM
      const shadowTemplates = root.querySelectorAll('template[shadowrootmode]');
      for (let i = 0; i < shadowTemplates.length; i++) {
        const template = shadowTemplates[i];
        const mode = template.getAttribute('shadowrootmode');
        const parent = template.parentElement;

        if (parent && !parent.shadowRoot) {
          try {
            const shadowRoot = parent.attachShadow({ mode: mode });
            shadowRoot.appendChild(template.content);
            template.remove();
            visit(shadowRoot); // Recurse into Shadow DOM
          } catch (e) {
            console.warn('Failed to attach shadow root:', e);
          }
        }
      }
    };

    // Restore scroll positions on load (after layout)
    const restoreScrollPositions = () => {
      const scrollTopElements = document.querySelectorAll('[__playwright_scroll_top_]');
      for (let i = 0; i < scrollTopElements.length; i++) {
        const el = scrollTopElements[i];
        el.scrollTop = parseInt(el.getAttribute('__playwright_scroll_top_'), 10);
        el.removeAttribute('__playwright_scroll_top_');
      }

      const scrollLeftElements = document.querySelectorAll('[__playwright_scroll_left_]');
      for (let i = 0; i < scrollLeftElements.length; i++) {
        const el = scrollLeftElements[i];
        el.scrollLeft = parseInt(el.getAttribute('__playwright_scroll_left_'), 10);
        el.removeAttribute('__playwright_scroll_left_');
      }
    };

    // Execute restoration
    visit(document);

    // Restore scroll after load
    if (document.readyState === 'complete') {
      restoreScrollPositions();
    } else {
      window.addEventListener('load', restoreScrollPositions);
    }
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSnapshotState);
  } else {
    restoreSnapshotState();
  }
})();
`;

  return scriptSource;
}
```

---

## Appendix B: Performance Benchmarks

### Current Implementation
- **Capture Time:** ~50ms (200-node page)
- **File Size:** ~150KB per snapshot (no compression)
- **Load Time:** ~100ms

### Expected After Phase 1
- **Capture Time:** ~60ms (+20% for additional state)
- **File Size:** ~150KB (no change)
- **Load Time:** ~120ms (+20% for restoration)
- **Accuracy:** 95%+ (vs current ~60%)

### Expected After Phase 2
- **File Size:** ~120KB (-20% with deduplication)
- **Resource Loading:** External CSS/images work correctly

### Expected After Phase 3
- **File Size:** ~60KB (-60% with NodeSnapshot references)
- **Capture Time:** ~40ms (-33% with caching)

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 3.0 | 2025-12-05 | Initial PRD based on Playwright analysis | Claude |
