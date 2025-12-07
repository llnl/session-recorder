# TASKS-Performance: Performance Optimization Implementation Tasks

**Related PRD:** [PRD-performance.md](./PRD-performance.md)
**Status:** 🔴 CRITICAL - Sprint 5c required IMMEDIATELY
**Total Estimated Time:** 23 hours (2 hours CRITICAL + 7 hours core + 14 hours optional)
**Dependencies:** Multi-tab recording (complete)

---

## Overview

This document breaks down performance optimization objectives into actionable tasks for handling extended recording sessions (4+ hours) and very large file sizes.

**CRITICAL UPDATE:** Sprint 5c (Recorder Performance) must be implemented IMMEDIATELY due to severe slowdown (6-25 second page loads) caused by multi-tab resource capture blocking.

---

## Sprint 5c: Recorder Performance Fix (2 hours) - 🔴 CRITICAL

**Goal:** Eliminate blocking resource capture that causes 6-25 second page load delays
**Deliverable:** Instant page navigation with background async resource capture
**Priority:** IMMEDIATE - Recording is currently unusable

### Problem Analysis

**Current bottleneck in `SessionRecorder._handleNetworkResponse()` (lines 790-869):**
- Line 854: `buffer = await response.body()` - Blocks waiting for full download
- Line 857: `this._calculateSha1(buffer)` - CPU-intensive, blocks event loop
- Line 865: `this.onContentBlob()` - Synchronous disk I/O
- Lines 868-880: CSS rewriting adds additional processing

**Impact with multi-tab:**
- 3 tabs × 100 resources each = 300 total resources
- 300 resources × 100ms average = 30 seconds of blocking
- User experiences 6-25 second delays during page navigation

### Task 5c.1: ResourceCaptureQueue Implementation (1 hour)

**Priority:** 🔴 CRITICAL
**File:** Create `src/node/ResourceCaptureQueue.ts`

#### Implementation

Create a queue class with concurrency limits and priority support:

```typescript
import { Response } from '@playwright/test';

interface ResourceCapture {
  url: string;
  response: Response;
  priority: number; // 0=critical, 1=normal, 2=low
  tabId: number;
}

export class ResourceCaptureQueue {
  private queue: ResourceCapture[] = [];
  private activeDownloads = 0;
  private readonly maxConcurrent = 5;
  private processing = false;
  private onCapture: (capture: ResourceCapture) => Promise<void>;

  constructor(onCapture: (capture: ResourceCapture) => Promise<void>) {
    this.onCapture = onCapture;
  }

  enqueue(capture: ResourceCapture): void {
    // Insert based on priority
    const insertIndex = this.queue.findIndex(item => item.priority > capture.priority);
    if (insertIndex === -1) {
      this.queue.push(capture);
    } else {
      this.queue.splice(insertIndex, 0, capture);
    }

    if (!this.processing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;

    setImmediate(async () => {
      while (this.queue.length > 0 && this.activeDownloads < this.maxConcurrent) {
        const capture = this.queue.shift()!;
        this.activeDownloads++;

        this.onCapture(capture)
          .catch(err => console.warn(`[Tab ${capture.tabId}] Resource capture failed: ${err.message}`))
          .finally(() => {
            this.activeDownloads--;
            if (this.queue.length > 0) {
              this.processQueue();
            } else {
              this.processing = false;
            }
          });
      }
    });
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.activeDownloads > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

#### Acceptance Criteria

- ✅ ResourceCaptureQueue class created
- ✅ Concurrency limited to 5 downloads
- ✅ Priority-based queue insertion
- ✅ Drain method for graceful shutdown

---

### Task 5c.2: Non-Blocking Resource Capture (0.5 hour)

**Priority:** 🔴 CRITICAL
**File:** `src/node/SessionRecorder.ts`

#### Changes Required

1. **Add resource queue to SessionRecorder** (line ~40):
```typescript
private resourceQueue: ResourceCaptureQueue;
```

2. **Initialize queue in constructor**:
```typescript
this.resourceQueue = new ResourceCaptureQueue(this._captureResource.bind(this));
```

3. **Update response handler** (line ~195 in `_attachToPage`):
```typescript
// OLD (blocking):
page.on('response', async (response) => {
  await this._handleNetworkResponse(response);
});

// NEW (non-blocking):
page.on('response', (response) => {
  const priority = this._getResourcePriority(response);
  this.resourceQueue.enqueue({
    url: response.url(),
    response,
    priority,
    tabId
  });
});
```

4. **Add priority helper**:
```typescript
private _getResourcePriority(response: Response): number {
  const contentType = response.headers()['content-type'] || '';
  // Critical: CSS, fonts
  if (contentType.includes('text/css') || contentType.includes('font/')) return 0;
  // Normal: JS, images
  if (contentType.includes('javascript') || contentType.includes('image/')) return 1;
  // Low: other
  return 2;
}
```

5. **Rename `_handleNetworkResponse` to `_captureResource`** and update signature:
```typescript
private async _captureResource(capture: ResourceCapture): Promise<void> {
  const { response, url, tabId } = capture;
  // ... existing logic from _handleNetworkResponse ...
}
```

6. **Wait for queue in stop()** (line ~500):
```typescript
async stop(): Promise<void> {
  // Wait for any pending actions to complete
  await this.actionQueue;

  // NEW: Wait for resource queue to drain
  console.log('⏳ Waiting for resource captures to complete...');
  await this.resourceQueue.drain();

  // ... rest of existing stop logic ...
}
```

#### Acceptance Criteria

- ✅ Response handler is non-blocking
- ✅ Resources enqueued with priority
- ✅ Queue drains before stop() completes
- ✅ No `await` in response handler

---

### Task 5c.3: Background SHA1 Hashing (0.25 hour)

**Priority:** 🟡 MEDIUM
**File:** `src/node/SessionRecorder.ts`

#### Changes Required

Replace synchronous SHA1 with async version using `setImmediate`:

```typescript
/**
 * Calculate SHA1 asynchronously to prevent blocking
 */
private async _calculateSha1Async(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    setImmediate(() => {
      const hash = crypto.createHash('sha1');
      hash.update(buffer);
      resolve(hash.digest('hex'));
    });
  });
}
```

Update all calls in `_captureResource`:
```typescript
// OLD:
const sha1 = this._calculateSha1(buffer);

// NEW:
const sha1 = await this._calculateSha1Async(buffer);
```

#### Acceptance Criteria

- ✅ SHA1 wrapped in setImmediate
- ✅ All callers use async version
- ✅ Event loop remains responsive

---

### Task 5c.4: Testing & Verification (0.25 hour)

**Priority:** 🔴 CRITICAL

#### Test Plan

1. **Navigation speed test:**
   - Record 3 tabs (Todoist, GitHub, Twitter)
   - Navigate between tabs rapidly
   - Verify <500ms delay (vs previous 6-25s)

2. **Resource correctness:**
   - Check session.json has all resources
   - Verify viewer loads resources correctly

3. **Queue monitoring:**
   - Add console logging: `console.log('📦 Queue status:', this.resourceQueue.getStatus())`
   - Verify queue processes in background

4. **Graceful shutdown:**
   - Heavy resource load → immediate stop()
   - Verify drain() completes
   - Confirm all resources saved

#### Acceptance Criteria

- ✅ Page navigation <500ms
- ✅ Resources captured correctly
- ✅ Multi-tab browsing smooth
- ✅ Graceful shutdown works

---

## Sprint 5d: Viewer Performance & Polish (7 hours)

**Goal:** Optimize viewer for large sessions (1000+ actions) and add metadata view
**Deliverable:** Viewer handles extended sessions smoothly with comprehensive statistics

### Task 5d.1: Large Session Test Generation (1 hour)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

1. **Create test session generator** (1 hour)

```typescript
// test/generators/largeSession.ts
import { SessionData, RecordedAction } from '../../viewer/src/types/session';

export function generateLargeSession(actionCount: number = 1000): SessionData {
  const startTime = new Date('2024-12-01T10:00:00.000Z');
  const actions: RecordedAction[] = [];

  for (let i = 0; i < actionCount; i++) {
    const timestamp = new Date(startTime.getTime() + i * 5000); // Every 5 seconds

    actions.push({
      id: `action-${i + 1}`,
      type: i % 4 === 0 ? 'click' : i % 4 === 1 ? 'input' : i % 4 === 2 ? 'change' : 'submit',
      timestamp: timestamp.toISOString(),
      before: generateMockSnapshot(`before-${i + 1}`),
      after: generateMockSnapshot(`after-${i + 1}`),
      action: generateMockActionDetails(i)
    });
  }

  return {
    sessionId: `large-session-${actionCount}`,
    startTime: startTime.toISOString(),
    endTime: new Date(startTime.getTime() + actionCount * 5000).toISOString(),
    actions,
    resourceStorage: {
      version: '1.0',
      resources: {}
    }
  };
}

function generateMockSnapshot(id: string) {
  return {
    snapshotId: id,
    html: '<html><body><h1>Test Page</h1><p>Content here</p></body></html>',
    url: 'http://localhost:3000',
    timestamp: new Date().toISOString(),
    viewport: { width: 1280, height: 720 },
    screenshot: `data:image/png;base64,...` // Small test image
  };
}

function generateMockActionDetails(index: number) {
  return {
    selector: `button#test-${index}`,
    value: index % 2 === 0 ? 'test value' : undefined,
    key: index % 3 === 0 ? 'Enter' : undefined
  };
}
```

#### Acceptance Criteria

- ✅ Can generate sessions with 100, 500, 1000, 2000+ actions
- ✅ Generated sessions have realistic data structure
- ✅ Sessions can be loaded in viewer for testing

---

### Task 5d.2: Performance Optimization (4 hours)

**Priority:** 🔴 HIGH

#### Implementation Steps

1. **Lazy loading for snapshot iframes** (1.5 hours)

```typescript
// viewer/src/components/SnapshotViewer/SnapshotViewer.tsx
const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  // Only load snapshot HTML when component is visible
  if (!snapshot || isLoading) return;

  setIsLoading(true);

  // Defer loading slightly to prevent blocking main thread
  setTimeout(() => {
    setSnapshotHtml(snapshot.html);
    setIsLoading(false);
  }, 0);

  // Cleanup on unmount
  return () => {
    setSnapshotHtml(null);
  };
}, [snapshot?.snapshotId]);
```

2. **Progressive image loading** (1 hour)

```typescript
// viewer/src/components/Timeline/Timeline.tsx
const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

const loadImage = (actionId: string, imageUrl: string) => {
  if (loadedImages.has(actionId)) return;

  const img = new Image();
  img.onload = () => {
    setLoadedImages(prev => new Set(prev).add(actionId));
  };
  img.src = imageUrl;
};

// Load images in viewport + buffer
useEffect(() => {
  const visibleRange = getVisibleActionRange();
  const buffer = 10; // Load 10 actions before/after visible range

  for (let i = visibleRange.start - buffer; i < visibleRange.end + buffer; i++) {
    if (actions[i]?.after?.screenshot) {
      loadImage(actions[i].id, actions[i].after.screenshot);
    }
  }
}, [scrollPosition, actions]);
```

3. **Memory profiling and cleanup** (1 hour)

```typescript
// viewer/src/components/App.tsx
useEffect(() => {
  // Monitor memory usage (dev mode only)
  if (process.env.NODE_ENV === 'development') {
    const interval = setInterval(() => {
      if (performance.memory) {
        console.log('Memory usage:', {
          used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }
}, []);

// Cleanup resources when changing actions
useEffect(() => {
  return () => {
    // Revoke object URLs
    if (currentSnapshot?.screenshot?.startsWith('blob:')) {
      URL.revokeObjectURL(currentSnapshot.screenshot);
    }
  };
}, [selectedActionId]);
```

4. **Timeline rendering optimization** (0.5 hours)

```typescript
// viewer/src/components/Timeline/Timeline.tsx
// Use requestAnimationFrame for smooth scrubbing
const handleTimelineScrub = useCallback((clientX: number) => {
  if (!timelineRef.current) return;

  requestAnimationFrame(() => {
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = x / rect.width;
    const time = startTime + (duration * percentage);

    onTimeChange(time);
  });
}, [startTime, duration, onTimeChange]);

// Debounce canvas redraw
const redrawCanvas = useMemo(
  () => debounce(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Draw timeline...
  }, 16), // ~60fps
  [actions, viewport]
);
```

#### Acceptance Criteria

- ✅ Viewer loads 1000-action session in <5 seconds
- ✅ Timeline scrubbing maintains 60fps
- ✅ Memory usage stays <500MB for typical sessions
- ✅ No memory leaks during 30-minute playback
- ✅ Images load progressively (no blocking)

---

### Task 5d.3: Metadata View (2 hours)

**Priority:** 🟡 MEDIUM

#### Implementation Steps

1. **Create SessionMetadata component** (1.5 hours)

```tsx
// viewer/src/components/SessionMetadata/SessionMetadata.tsx
import React from 'react';
import { SessionData } from '@/types/session';

interface Props {
  session: SessionData;
}

export default function SessionMetadata({ session }: Props) {
  const stats = calculateStatistics(session);
  const performance = calculatePerformanceMetrics(session);

  return (
    <div className="session-metadata">
      <h2>Session Information</h2>

      <section className="metadata-section">
        <h3>Overview</h3>
        <dl>
          <dt>Session ID:</dt>
          <dd>{session.sessionId}</dd>

          <dt>Start Time:</dt>
          <dd>{formatDateTime(session.startTime)}</dd>

          <dt>End Time:</dt>
          <dd>{formatDateTime(session.endTime)}</dd>

          <dt>Duration:</dt>
          <dd>{formatDuration(stats.duration)}</dd>
        </dl>
      </section>

      <section className="metadata-section">
        <h3>Statistics</h3>
        <dl>
          <dt>Total Actions:</dt>
          <dd>{stats.totalActions}</dd>

          <dt>Actions by Type:</dt>
          <dd>
            <ul>
              {Object.entries(stats.actionsByType).map(([type, count]) => (
                <li key={type}>{type}: {count}</li>
              ))}
            </ul>
          </dd>

          <dt>Snapshots:</dt>
          <dd>{stats.totalSnapshots}</dd>

          <dt>Screenshots:</dt>
          <dd>{stats.totalScreenshots}</dd>

          <dt>Network Requests:</dt>
          <dd>{stats.totalNetworkRequests}</dd>

          <dt>Console Logs:</dt>
          <dd>{stats.totalConsoleLogs}</dd>

          {stats.totalVoiceSegments !== undefined && (
            <>
              <dt>Voice Segments:</dt>
              <dd>{stats.totalVoiceSegments}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="metadata-section">
        <h3>Performance</h3>
        <dl>
          <dt>Average Snapshot Size:</dt>
          <dd>{formatBytes(performance.avgSnapshotSize)}</dd>

          <dt>Average Screenshot Size:</dt>
          <dd>{formatBytes(performance.avgScreenshotSize)}</dd>

          <dt>Total Zip Size:</dt>
          <dd>{formatBytes(performance.totalZipSize)}</dd>

          <dt>Capture Rate:</dt>
          <dd>{performance.captureRate.toFixed(1)} actions/min</dd>
        </dl>
      </section>

      <section className="metadata-section">
        <h3>Browser</h3>
        <dl>
          <dt>Type:</dt>
          <dd>{session.browser?.type || 'Unknown'}</dd>

          <dt>Version:</dt>
          <dd>{session.browser?.version || 'Unknown'}</dd>

          <dt>User Agent:</dt>
          <dd className="user-agent">{session.browser?.userAgent || 'Unknown'}</dd>
        </dl>
      </section>
    </div>
  );
}

function calculateStatistics(session: SessionData) {
  const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000;

  const actionsByType: Record<string, number> = {};
  session.actions.forEach(action => {
    actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
  });

  return {
    duration,
    totalActions: session.actions.length,
    actionsByType,
    totalSnapshots: session.actions.length * 2, // before + after
    totalScreenshots: session.actions.length * 2,
    totalNetworkRequests: 0, // TODO: Count from session.network
    totalConsoleLogs: 0, // TODO: Count from session.console
    totalVoiceSegments: session.actions.filter(a => a.type === 'voice_transcript').length
  };
}

function calculatePerformanceMetrics(session: SessionData) {
  const totalSnapshotSize = session.actions.reduce((sum, action) => {
    return sum + (action.before?.html?.length || 0) + (action.after?.html?.length || 0);
  }, 0);

  const totalScreenshotSize = session.actions.reduce((sum, action) => {
    return sum + (action.before?.screenshot?.length || 0) + (action.after?.screenshot?.length || 0);
  }, 0);

  const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60;

  return {
    avgSnapshotSize: totalSnapshotSize / (session.actions.length * 2),
    avgScreenshotSize: totalScreenshotSize / (session.actions.length * 2),
    totalZipSize: totalSnapshotSize + totalScreenshotSize, // Approximate
    captureRate: session.actions.length / duration
  };
}
```

2. **Add styling** (0.5 hours)

```css
/* viewer/src/components/SessionMetadata/SessionMetadata.css */
.session-metadata {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.metadata-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.metadata-section h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #ddd;
  padding-bottom: 0.5rem;
}

.metadata-section dl {
  margin: 0;
}

.metadata-section dt {
  font-weight: 600;
  color: #555;
  margin-top: 0.75rem;
}

.metadata-section dd {
  margin-left: 0;
  color: #333;
}

.user-agent {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}
```

#### Acceptance Criteria

- ✅ Metadata view shows comprehensive session statistics
- ✅ Performance metrics calculated accurately
- ✅ Browser information displayed
- ✅ Accessible via new tab in viewer

---

### Task 5d.4: Testing (1 hour)

**Priority:** 🟡 MEDIUM

#### Test Scenarios

1. **Large session test** (0.5 hours)
   - Generate 1000-action session
   - Load in viewer
   - Verify load time <5 seconds
   - Verify timeline remains smooth

2. **Memory leak test** (0.5 hours)
   - Play session for 30 minutes
   - Monitor memory usage
   - Verify no continuous growth
   - Check for cleanup on unmount

---

## Sprint 7: Advanced Optimization (14 hours) - ⚡ OPTIONAL

**Goal:** Implement NodeSnapshot structure for 40-60% file size reduction
**Deliverable:** Structured snapshot system with incremental updates

**Note:** Only implement this AFTER Sprint 5d is complete and you have real-world data showing file size is a problem. This is a complex refactoring that should not be rushed.

### Task 7.1: NodeSnapshot Structure (8 hours)

**Priority:** ⚡ LOW (Optional Enhancement)

#### Implementation Steps

1. **Define NodeSnapshot interfaces** (1 hour)

```typescript
// src/types/nodeSnapshot.ts
export interface NodeSnapshot {
  nodeIndex: number;      // Post-order index
  nodeType: number;       // 1=Element, 3=Text, 8=Comment, etc.
  nodeName: string;       // Lowercase tag name
  attributes?: Array<[string, string]>;
  textContent?: string;   // For text nodes
  childNodes?: number[];  // Child node indices
}

export interface FrameSnapshot {
  version: '2.0';
  url: string;
  timestamp: string;
  viewport: { width: number; height: number };
  nodes: NodeSnapshot[];
  rootIndex: number;
}

export interface IncrementalSnapshot {
  version: '2.0';
  baseSnapshotId: string;
  timestamp: string;
  changes: Array<{
    type: 'add' | 'remove' | 'update' | 'reorder';
    nodeIndex: number;
    parentIndex?: number;
    node?: NodeSnapshot;
    attributes?: Array<[string, string]>;
    newChildren?: number[];
  }>;
}
```

2. **Implement HTML to NodeSnapshot converter** (3 hours)

```typescript
// src/browser/nodeSnapshotCapture.ts
export function captureNodeSnapshot(document: Document): FrameSnapshot {
  const nodes: NodeSnapshot[] = [];
  let nodeIndex = 0;

  function traverse(node: Node): number {
    const currentIndex = nodeIndex++;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const childIndices: number[] = [];

      // Traverse children first (post-order)
      for (const child of Array.from(element.childNodes)) {
        childIndices.push(traverse(child));
      }

      nodes.push({
        nodeIndex: currentIndex,
        nodeType: node.nodeType,
        nodeName: element.tagName.toLowerCase(),
        attributes: Array.from(element.attributes).map(attr => [attr.name, attr.value]),
        childNodes: childIndices
      });
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) { // Skip empty text nodes
        nodes.push({
          nodeIndex: currentIndex,
          nodeType: node.nodeType,
          nodeName: '#text',
          textContent: text
        });
      }
    }
    // Handle other node types (comments, etc.)

    return currentIndex;
  }

  const rootIndex = traverse(document.documentElement);

  return {
    version: '2.0',
    url: document.location.href,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    nodes,
    rootIndex
  };
}
```

3. **Implement NodeSnapshot to HTML reconstructor** (2 hours)

```typescript
// viewer/src/utils/nodeSnapshotRestore.ts
export function reconstructHTML(snapshot: FrameSnapshot): string {
  const nodeMap = new Map<number, NodeSnapshot>();
  snapshot.nodes.forEach(node => nodeMap.set(node.nodeIndex, node));

  function buildElement(nodeIndex: number): string {
    const node = nodeMap.get(nodeIndex);
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const attrs = node.attributes?.map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ') || '';
      const children = node.childNodes?.map(buildElement).join('') || '';

      return `<${node.nodeName}${attrs ? ' ' + attrs : ''}>${children}</${node.nodeName}>`;
    }

    return '';
  }

  return `<!DOCTYPE html>${buildElement(snapshot.rootIndex)}`;
}
```

4. **Testing and validation** (2 hours)

```typescript
// test/nodeSnapshot.test.ts
describe('NodeSnapshot', () => {
  it('converts HTML to NodeSnapshot and back', () => {
    const originalHTML = '<html><body><h1>Test</h1></body></html>';
    const doc = new DOMParser().parseFromString(originalHTML, 'text/html');

    const snapshot = captureNodeSnapshot(doc);
    const reconstructed = reconstructHTML(snapshot);

    expect(normalizeHTML(reconstructed)).toBe(normalizeHTML(originalHTML));
  });

  it('reduces file size compared to HTML string', () => {
    const doc = createLargeTestDocument();

    const htmlString = doc.documentElement.outerHTML;
    const snapshot = captureNodeSnapshot(doc);

    const htmlSize = new Blob([htmlString]).size;
    const snapshotSize = new Blob([JSON.stringify(snapshot)]).size;

    // NodeSnapshot should be smaller or comparable
    expect(snapshotSize).toBeLessThanOrEqual(htmlSize * 1.2); // Allow 20% overhead
  });
});
```

#### Acceptance Criteria

- ✅ NodeSnapshot interfaces defined
- ✅ HTML to NodeSnapshot conversion works
- ✅ NodeSnapshot to HTML reconstruction works
- ✅ Roundtrip conversion preserves content
- ✅ File size comparable or smaller than HTML

---

### Task 7.2: Incremental Snapshots (6 hours)

**Priority:** ⚡ LOW (Optional Enhancement)

#### Implementation Steps

1. **Implement delta detection** (3 hours)

```typescript
// src/browser/incrementalSnapshot.ts
export function generateIncrementalSnapshot(
  previous: FrameSnapshot,
  current: FrameSnapshot
): IncrementalSnapshot {
  const changes: IncrementalSnapshot['changes'] = [];

  const prevMap = new Map(previous.nodes.map(n => [n.nodeIndex, n]));
  const currMap = new Map(current.nodes.map(n => [n.nodeIndex, n]));

  // Detect removed nodes
  for (const [index, node] of prevMap) {
    if (!currMap.has(index)) {
      changes.push({
        type: 'remove',
        nodeIndex: index
      });
    }
  }

  // Detect added and updated nodes
  for (const [index, node] of currMap) {
    const prevNode = prevMap.get(index);

    if (!prevNode) {
      // New node
      changes.push({
        type: 'add',
        nodeIndex: index,
        parentIndex: findParentIndex(current, index),
        node
      });
    } else if (hasNodeChanged(prevNode, node)) {
      // Updated node
      changes.push({
        type: 'update',
        nodeIndex: index,
        attributes: node.attributes,
        newChildren: node.childNodes
      });
    }
  }

  return {
    version: '2.0',
    baseSnapshotId: `snapshot-${previous.timestamp}`,
    timestamp: current.timestamp,
    changes
  };
}

function hasNodeChanged(prev: NodeSnapshot, curr: NodeSnapshot): boolean {
  if (prev.nodeType !== curr.nodeType) return true;
  if (prev.nodeName !== curr.nodeName) return true;
  if (prev.textContent !== curr.textContent) return true;

  // Compare attributes
  const prevAttrs = JSON.stringify(prev.attributes || []);
  const currAttrs = JSON.stringify(curr.attributes || []);
  if (prevAttrs !== currAttrs) return true;

  // Compare children
  const prevChildren = JSON.stringify(prev.childNodes || []);
  const currChildren = JSON.stringify(curr.childNodes || []);
  if (prevChildren !== currChildren) return true;

  return false;
}
```

2. **Implement incremental snapshot application in viewer** (2 hours)

```typescript
// viewer/src/utils/applyIncrementalSnapshot.ts
export function applyIncrementalSnapshot(
  base: FrameSnapshot,
  incremental: IncrementalSnapshot
): FrameSnapshot {
  const nodes = [...base.nodes];

  for (const change of incremental.changes) {
    switch (change.type) {
      case 'add':
        if (change.node) {
          nodes.push(change.node);
        }
        break;

      case 'remove':
        const removeIdx = nodes.findIndex(n => n.nodeIndex === change.nodeIndex);
        if (removeIdx >= 0) {
          nodes.splice(removeIdx, 1);
        }
        break;

      case 'update':
        const updateIdx = nodes.findIndex(n => n.nodeIndex === change.nodeIndex);
        if (updateIdx >= 0) {
          nodes[updateIdx] = {
            ...nodes[updateIdx],
            attributes: change.attributes,
            childNodes: change.newChildren
          };
        }
        break;
    }
  }

  return {
    ...base,
    timestamp: incremental.timestamp,
    nodes
  };
}
```

3. **Measure file size reduction** (1 hour)

```typescript
// test/incrementalSnapshot.test.ts
describe('Incremental Snapshots', () => {
  it('reduces file size by 40-60%', () => {
    const snapshots = generateSequentialSnapshots(10);

    // Full snapshots
    const fullSize = snapshots.reduce((sum, s) => sum + JSON.stringify(s).length, 0);

    // Incremental: 1 full + 9 incremental
    const incrementalSnapshots = [
      snapshots[0],
      ...snapshots.slice(1).map((s, i) => generateIncrementalSnapshot(snapshots[i], s))
    ];
    const incrementalSize = incrementalSnapshots.reduce((sum, s) => sum + JSON.stringify(s).length, 0);

    const reduction = ((fullSize - incrementalSize) / fullSize) * 100;

    console.log(`File size reduction: ${reduction.toFixed(1)}%`);
    expect(reduction).toBeGreaterThanOrEqual(40);
    expect(reduction).toBeLessThanOrEqual(60);
  });
});
```

#### Acceptance Criteria

- ✅ Delta detection algorithm works correctly
- ✅ Incremental snapshots can be applied to reconstruct full snapshot
- ✅ File size reduction measured at 40-60%
- ✅ Viewer correctly loads incremental snapshots
- ✅ Backward compatibility maintained (can load old HTML snapshots)

---

## Summary

### Total Estimated Effort: 21 hours

| Sprint | Hours | Priority | When to Implement |
|--------|-------|----------|-------------------|
| Sprint 5d: Performance & Polish | 7 | 🟡 MEDIUM | After PRD-4 completion |
| Sprint 7: Advanced Optimization | 14 | ⚡ LOW | Only if file size becomes a problem |

### Implementation Priority

**Should Have (Post-Production):**
1. Sprint 5d: Performance optimization (7h) - Implement after PRD-4

**Nice to Have (Future Enhancement):**
2. Sprint 7: NodeSnapshot optimization (14h) - Only if needed

### Success Metrics

| Metric | Target (Sprint 5d) | Target (Sprint 7) |
|--------|-------------------|-------------------|
| Viewer load time (1000 actions) | <5s | <3s |
| Memory usage | <500MB | <300MB |
| Timeline rendering | 60fps | 60fps |
| File size reduction | N/A | 40-60% |
| Snapshot capture time | ~60ms | ~40ms |

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-05 | Extracted performance tasks from TASKS-3.md | Claude |
