# PRD-Performance: Performance Optimization & Advanced Features

**Version:** 1.0
**Date:** 2025-12-05
**Status:** 🎯 POST-MVP - Performance Enhancements
**Depends On:** PRD-4.md (Production Deployment)

---

## Executive Summary

After achieving production-ready Session Recorder with 1-2 hour recording sessions (PRD-4), this PRD focuses on performance optimizations and advanced features for handling extremely long sessions and large file sizes.

**Target:** Enable recording sessions lasting 4+ hours with minimal performance impact and optimized file sizes.

---

## 1. Problem Statement

**Current State:** Session recorder handles 1-2 hour sessions well but hasn't been optimized for:
- Very long recording sessions (4+ hours)
- Large file sizes with hundreds of snapshots
- Performance degradation during extended use
- Memory usage optimization

**Performance Gaps:**
- ❌ No performance testing for extended sessions
- ❌ File sizes not optimized for very long recordings
- ❌ Viewer performance with 1000+ actions untested
- ❌ No incremental snapshot optimization (NodeSnapshot structure)

---

## 2. Goals

### Primary Goal
Optimize Session Recorder for production use with very long recording sessions (4+ hours) and minimal performance impact.

### Objectives

#### 2.0 Recorder Performance Optimization (Sprint 5c) - 🔴 CRITICAL
**Target Users:** All users experiencing slow recording performance

**Requirements:**
- Async non-blocking resource capture
- Resource queue with concurrency limits
- Network capture throttling
- Multi-tab resource capture optimization

**Performance Targets:**
- Page navigation <500ms delay (currently 6-25 seconds)
- Resource capture doesn't block user interaction
- Concurrent resource downloads limited to 5 per tab
- Background SHA1 hashing with queue

**Impact:**
- **Current:** 300-500 resources × 65-250ms = 6-25 second page load delays
- **Target:** <500ms total overhead, all resource capture in background
- **User Experience:** Instant page navigation, no perceptible slowdown

#### 2.1 Performance Optimization (Sprint 5d)
**Target Users:** All users with extended recording sessions

**Requirements:**
- Large session handling (1000+ actions)
- Viewer performance optimization
- Memory usage monitoring
- Metadata view for session statistics

**Performance Targets:**
- Viewer loads sessions with 1000+ actions in <5 seconds
- Timeline scrubbing remains smooth (60fps)
- Memory usage <500MB for typical sessions
- No memory leaks during extended playback

#### 2.2 Advanced NodeSnapshot Optimization (Sprint 7)
**Target Users:** Power users with very large sessions

**Requirements:**
- NodeSnapshot structure (structured DOM instead of HTML strings)
- Reference-based caching for unchanged nodes
- Incremental snapshots with delta encoding
- 40-60% file size reduction for multi-snapshot sessions

**Impact:**
- Reduced file sizes by 40-60%
- Faster snapshot capture (~40ms vs ~60ms)
- Better compression ratios
- Efficient storage for unchanged DOM subtrees

---

## 3. Technical Requirements

### 3.0 Recorder Performance Optimization (Sprint 5c)

**Problem Analysis:**

Current implementation in `SessionRecorder._handleNetworkResponse()` (lines 790-869):
- **Synchronous blocking:** `await response.body()` waits for full download
- **Multi-tab multiplication:** Every tab's network capture runs independently
- **No throttling:** All resources captured simultaneously
- **CPU-intensive hashing:** SHA1 calculation blocks Node.js event loop

**Async Non-Blocking Architecture:**

```typescript
// Resource capture queue with concurrency limit
interface ResourceCapture {
  url: string;
  response: Response;
  priority: number; // 0=critical, 1=normal, 2=low
}

class ResourceCaptureQueue {
  private queue: ResourceCapture[] = [];
  private activeDownloads = 0;
  private maxConcurrent = 5; // Per tab

  async enqueue(capture: ResourceCapture): Promise<void> {
    this.queue.push(capture);
    this.processQueue(); // Non-blocking fire-and-forget
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeDownloads < this.maxConcurrent) {
      const capture = this.queue.shift()!;
      this.activeDownloads++;

      // Process in background without blocking
      this.captureResource(capture)
        .catch(err => console.warn(`Resource capture failed: ${err.message}`))
        .finally(() => this.activeDownloads--);
    }
  }
}
```

**Implementation Changes:**

1. **Non-blocking response handler:**
```typescript
// In _attachToPage()
page.on('response', (response) => {
  // Fire and forget - don't await
  this.resourceQueue.enqueue({
    url: response.url(),
    response,
    priority: this._getResourcePriority(response)
  });
});
```

2. **Background SHA1 hashing:**
```typescript
// Move SHA1 to worker thread or defer with setImmediate
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

3. **Resource priority:**
```typescript
private _getResourcePriority(response: Response): number {
  const contentType = response.headers()['content-type'] || '';
  const resourceType = response.request().resourceType();

  // Critical: CSS, fonts (affects rendering)
  if (contentType.includes('text/css') || contentType.includes('font/')) return 0;

  // Normal: JavaScript, images
  if (contentType.includes('javascript') || contentType.includes('image/')) return 1;

  // Low: Other resources
  return 2;
}
```

**Performance Benefits:**

- Page navigation returns immediately (no blocking)
- Resource capture happens in background
- Concurrency limit prevents overwhelming system
- Priority queue ensures critical resources captured first
- SHA1 hashing deferred to prevent event loop blocking

### 3.1 Viewer Performance Optimization (Sprint 5d)

**Large Session Handling:**
- Virtual scrolling for action lists (already implemented)
- Canvas-based timeline rendering (already implemented)
- Lazy loading of snapshot iframes
- Progressive image loading
- Resource cleanup on unmount

**Metadata View:**
```typescript
interface SessionMetadata {
  sessionId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // seconds

  // Statistics
  stats: {
    totalActions: number;
    actionsByType: Record<string, number>;
    totalSnapshots: number;
    totalScreenshots: number;
    totalNetworkRequests: number;
    totalConsoleLogs: number;
    totalVoiceSegments?: number;
  };

  // Performance metrics
  performance: {
    avgSnapshotSize: number; // bytes
    avgScreenshotSize: number; // bytes
    totalZipSize: number; // bytes
    captureRate: number; // actions per minute
  };

  // Browser info
  browser: {
    type: string; // "chromium" | "firefox" | "webkit"
    version: string;
    userAgent: string;
  };
}
```

**Performance Testing:**
- Generate test session with 1000+ actions
- Measure viewer load time
- Monitor memory usage during playback
- Profile timeline rendering performance

### 3.2 Advanced NodeSnapshot Optimization (Sprint 7)

**NodeSnapshot Structure:**

Instead of storing snapshots as HTML strings, use a structured node representation:

```typescript
interface NodeSnapshot {
  nodeIndex: number;      // Post-order index for this node
  nodeType: number;       // 1=Element, 3=Text, 8=Comment, etc.
  nodeName: string;       // Lowercase tag name or node name
  attributes?: Array<[string, string]>; // Attribute key-value pairs
  textContent?: string;   // For text nodes
  childNodes?: number[];  // References to child node indices
}

interface FrameSnapshot {
  version: string;
  url: string;
  timestamp: string;
  viewport: { width: number; height: number };
  nodes: NodeSnapshot[];  // All nodes in post-order
  rootIndex: number;      // Index of document root
}
```

**Reference-Based Caching:**

Track unchanged DOM subtrees and reference previous snapshots:

```typescript
interface IncrementalSnapshot {
  baseSnapshotId: string; // Reference to previous snapshot
  changes: Array<{
    type: 'add' | 'remove' | 'update';
    nodeIndex: number;
    parentIndex?: number;
    node?: NodeSnapshot;
    attributes?: Array<[string, string]>;
  }>;
}
```

**Benefits:**
- **40-60% file size reduction** for subsequent snapshots
- **Faster capture** (~40ms vs ~60ms for large DOMs)
- **Better compression** (structured data compresses better than HTML)
- **Efficient queries** (can search without parsing HTML)

**Implementation Approach:**
1. Capture first snapshot as full NodeSnapshot tree
2. For subsequent snapshots:
   - Compare with previous snapshot
   - Generate delta (only changed nodes)
   - Reference unchanged subtrees by nodeIndex
3. Viewer reconstruction:
   - Load base snapshot
   - Apply incremental changes
   - Rebuild DOM from NodeSnapshot structure

---

## 4. Success Criteria

### 4.0 Recorder Performance Optimization (Sprint 5c)
- ✅ Page navigation overhead reduced to <500ms (from 6-25 seconds)
- ✅ Resource capture doesn't block user interaction
- ✅ Concurrent resource downloads limited to 5 per tab
- ✅ SHA1 hashing happens in background (setImmediate)
- ✅ ResourceCaptureQueue class implemented with priority support
- ✅ Recording session feels instant and responsive

### 4.1 Viewer Performance Optimization (Sprint 5d)
- ✅ Viewer loads 1000+ action sessions in <5 seconds
- ✅ Timeline scrubbing maintains 60fps
- ✅ Memory usage <500MB for typical sessions
- ✅ No memory leaks during 30-minute playback test
- ✅ Metadata view shows comprehensive statistics
- ✅ Large session test (1000+ actions) passes

### 4.2 Advanced NodeSnapshot Optimization (Sprint 7)
- ✅ NodeSnapshot structure implemented
- ✅ File size reduction measured at 40-60%
- ✅ Snapshot capture time reduced by 30%
- ✅ Viewer correctly reconstructs DOM from NodeSnapshot
- ✅ Incremental snapshots work correctly
- ✅ Backward compatibility maintained (can load old HTML snapshots)

---

## 5. Performance Targets

| Metric | Current | Target (Sprint 5c) | Target (Sprint 5d) | Target (Sprint 7) |
|--------|---------|-------------------|-------------------|-------------------|
| **Recorder: Page navigation overhead** | 6-25s | <500ms | <500ms | <500ms |
| **Recorder: Resource capture blocking** | Yes | No (async) | No | No |
| **Recorder: Concurrent downloads** | Unlimited | 5 per tab | 5 per tab | 5 per tab |
| **Viewer: Load time (100 actions)** | ~2s | ~2s | <2s | <1.5s |
| **Viewer: Load time (1000 actions)** | Untested | Untested | <5s | <3s |
| **Viewer: Memory usage (typical)** | Unknown | Unknown | <500MB | <300MB |
| **Viewer: Timeline rendering** | 60fps | 60fps | 60fps | 60fps |
| **Snapshot: Capture time** | ~60ms | ~60ms | ~60ms | ~40ms |
| **Snapshot: File size (100 snapshots)** | ~20MB | ~20MB | ~20MB | ~8MB |
| **Snapshot: File size reduction** | N/A | N/A | N/A | 40-60% |

---

## 6. Non-Goals (Out of Scope)

- ❌ Real-time streaming of recording data
- ❌ Cloud storage optimization
- ❌ Video compression algorithms
- ❌ Distributed recording across multiple browsers
- ❌ Custom snapshot formats (other than NodeSnapshot)
- ❌ GPU-accelerated rendering

---

## 7. Dependencies

### Sprint 5c: Recorder Performance (CRITICAL)
- Multi-tab recording implementation (complete)
- Understanding of network resource capture flow
- Node.js async patterns and concurrency control

### Sprint 5d: Viewer Performance Optimization
- Existing viewer (Sprints 1-5c complete)
- Large session test generator
- Performance profiling tools

### Sprint 7: Advanced Optimization
- PRD-3.md Phase 3 concepts
- Snapshot architecture understanding
- Delta encoding algorithms

---

## 8. Implementation Roadmap

### Sprint 5c: Recorder Performance Fix (2 hours) - 🔴 CRITICAL

**Priority:** IMMEDIATE - Recording is unusably slow (6-25 second page loads)

1. **ResourceCaptureQueue implementation** (1h)
   - Create queue class with priority support
   - Implement concurrency limiting (5 concurrent per tab)
   - Add resource priority calculation
   - Background processing without blocking

2. **Async resource capture** (0.5h)
   - Convert `_handleNetworkResponse` to fire-and-forget
   - Remove `await` from response body downloads
   - Add error handling for background failures

3. **Background SHA1 hashing** (0.25h)
   - Wrap SHA1 calculation in `setImmediate`
   - Prevent blocking Node.js event loop

4. **Testing & verification** (0.25h)
   - Test page navigation feels instant
   - Verify resources still captured correctly
   - Confirm no blocking during multi-tab browsing

### Sprint 5d: Viewer Performance & Polish (7 hours)

1. **Performance optimization** (4h)
   - Large session test generation
   - Memory profiling and optimization
   - Lazy loading implementation
   - Timeline rendering optimization

2. **Metadata view** (2h)
   - SessionMetadata component
   - Statistics calculation
   - Performance metrics display

3. **Testing** (1h)
   - Load test with 1000+ actions
   - Memory leak detection
   - Performance regression tests

### Sprint 7: Advanced Optimization (14 hours) - ⚡ OPTIONAL

1. **NodeSnapshot structure** (8h)
   - Implement NodeSnapshot interfaces
   - Convert HTML to NodeSnapshot tree
   - Post-order indexing
   - DOM reconstruction from NodeSnapshot

2. **Incremental snapshots** (6h)
   - Delta detection algorithm
   - Reference-based caching
   - Incremental snapshot storage
   - Viewer delta application

**Total Estimated Effort:** 23 hours (2 hours CRITICAL + 7 hours core + 14 hours optional)

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| NodeSnapshot complexity too high | High | Phase implementation, keep HTML fallback |
| File size reduction <40% | Medium | Fine-tune delta detection algorithm |
| Backward compatibility breaks | High | Maintain dual-format support (HTML + NodeSnapshot) |
| Performance regression | Medium | Comprehensive benchmarking before/after |
| Memory leaks in long sessions | High | Regular profiling, automated leak detection tests |

---

## 10. Future Enhancements (Post-Performance)

- Advanced compression algorithms (Brotli, LZMA)
- Snapshot diffing and visualization
- Automatic session archival after N days
- Session analytics and insights
- Machine learning-based snapshot optimization
- Distributed storage for team recordings

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-05 | Extracted performance requirements from PRD-3 | Claude |
