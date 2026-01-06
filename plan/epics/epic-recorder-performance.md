# Epic: Performance Optimization

<epic>
  <id>recorder-performance</id>
  <initiative>session-recorder</initiative>
  <status>tested</status>
  <name>Recording and Viewing Performance</name>
  <goal>Optimize recording overhead and viewer performance for large sessions</goal>
  <original_prd>PRDs/PRD-performance.md</original_prd>
  <original_tasks>PRDs/TASKS-performance.md</original_tasks>

  <requirements>
    <requirement id="TR-1" status="done">Gzip compression for DOM snapshots</requirement>
    <requirement id="TR-2" status="done">JPEG screenshots with quality control</requirement>
    <requirement id="TR-3" status="done">Non-blocking resource capture queue</requirement>
    <requirement id="TR-4" status="done">Lazy loading for large sessions</requirement>
    <requirement id="TR-5" status="done">LRU cache for memory management</requirement>
    <requirement id="TR-6" status="done">MP3 audio compression (optional)</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
    <dependency type="epic">viewer-react</dependency>
  </dependencies>
</epic>

---

## Overview

This epic focuses on reducing recording overhead and improving viewer performance for sessions with 1000+ actions.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Resource Queue | src/storage/ResourceCaptureQueue.ts | Background processing |
| Lazy Loader | viewer/src/utils/lazyResourceLoader.ts | On-demand extraction |
| LRU Cache | viewer/src/utils/lazyResourceLoader.ts | Memory management |
| Lazy Hook | viewer/src/hooks/useLazyResource.ts | IntersectionObserver |
| Lazy Thumbnail | viewer/src/components/Timeline/LazyThumbnail.tsx | Progressive loading |

## Optimizations Implemented

### Recording Performance
- **ResourceCaptureQueue**: Non-blocking disk writes with configurable batch size
- **Background SHA1**: Inline quick hash, disk write queued
- **Gzip Compression**: 5-10x size reduction for HTML snapshots
- **JPEG Screenshots**: ~75% smaller than PNG

### Viewer Performance
- **LazyResourceLoader**: JSZip lazy extraction with IntersectionObserver
- **LRU Cache**: Configurable limit (default 100 resources)
- **Progressive Loading**: Thumbnails load as user scrolls
- **Preloading**: Load 10 thumbnails around selected action

## Performance Metrics

| Metric | Before | After |
|--------|--------|-------|
| Page load delay (multi-tab) | 6-25s | <500ms |
| Session.zip size (30 min) | ~150MB | ~50MB |
| Viewer memory (1000 actions) | Unbounded | ~100MB |
| Thumbnail load time | All upfront | On-demand |

## Current Status (100% Complete)

All performance optimizations implemented.

---

## Change Log (from TASKS-performance.md)

| Date | Changes |
|------|---------|
| 2025-12-05 | Extracted performance tasks from TASKS-3.md |
| 2025-12-10 | Updated to follow template, added Table of Contents |
| 2025-12-13 | Sprint 5c Complete: ResourceCaptureQueue implemented, non-blocking response handler integrated |
