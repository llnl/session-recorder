# Markdown Export - Implementation Tasks

**PRD:** [PRD-markdown-export.md](PRD-markdown-export.md)
**Last Updated:** 2025-12-13
**Overall Status:** ✅ Complete (100%)

---

## Table of Contents

- [FR-1: Element Context Extraction](#fr-1-element-context-extraction) ✅
- [FR-2: Transcript Markdown](#fr-2-transcript-markdown) ✅
- [FR-3: Actions Markdown](#fr-3-actions-markdown) ✅
- [FR-4: Console Summary](#fr-4-console-summary) ✅
- [FR-5: Network Summary](#fr-5-network-summary) ✅
- [FR-6: Auto-Generation](#fr-6-auto-generation) ✅
- [Technical Requirements](#technical-requirements) ✅
- [Estimated Effort](#estimated-effort)
- [Implementation Priority](#implementation-priority)
- [File Reference](#file-reference)

---

## FR-1: Element Context Extraction

> **PRD Reference:** [FR-1: Element Context Extraction](PRD-markdown-export.md#fr-1-element-context-extraction)

### FR-1.1: Core Parser

- [x] Create `src/export/elementContext.ts` file
- [x] Add cheerio dependency for HTML parsing
- [x] Implement `findRecordedElement()` - locate `data-recorded-el="true"`
- [x] Implement `walkAncestors()` - traverse DOM tree upward
- [x] Create TypeScript interfaces for element context

### FR-1.2: Ancestor Rules

- [x] Table detection: extract column header, row number, table name
- [x] Form detection: extract form name/purpose, field labels
- [x] Modal/dialog detection: extract title from `<dialog>` or `[role="dialog"]`
- [x] Navigation detection: extract nav section name
- [x] List detection: extract list name, item position
- [x] Section/article detection: extract heading text
- [x] Header/footer detection: identify page region
- [x] Aside/sidebar detection: identify sidebar context
- [x] Main content detection: identify main region
- [x] Menu role detection: identify dropdown menus
- [x] Tab panel detection: extract tab name

### FR-1.3: Element Description Format

- [x] Button: "'Submit' button"
- [x] Link: "'Learn more' link"
- [x] Input: "email input" / "password input" / "search input"
- [x] Checkbox: "'Remember me' checkbox"
- [x] Select: "'Country' dropdown"
- [x] Generic: "'Edit' span" / "icon"
- [x] Build full description: `{element} in {ancestor1} in {ancestor2}...`

### FR-1.4: Edge Cases

- [x] Handle missing `data-recorded-el` attribute gracefully
- [x] Handle deeply nested elements (>10 ancestors)
- [x] Handle elements with no text content (use aria-label, placeholder)
- [x] Handle SVG icons (identify as "icon")

**Implementation:** [elementContext.ts](../src/export/elementContext.ts)

---

## FR-2: Transcript Markdown

> **PRD Reference:** [FR-2: Transcript Markdown](PRD-markdown-export.md#fr-2-transcript-markdown)

- [x] Create `src/export/transcriptToMarkdown.ts` file
- [x] Parse transcript.json file
- [x] Extract metadata: duration, language
- [x] Format full narrative text section
- [x] Generate timestamped segments table
- [x] Convert seconds to MM:SS format
- [x] Write to transcript.md file
- [x] Handle missing transcript.json (skip gracefully)

**Implementation:** [transcriptToMarkdown.ts](../src/export/transcriptToMarkdown.ts)

---

## FR-3: Actions Markdown

> **PRD Reference:** [FR-3: Actions Markdown](PRD-markdown-export.md#fr-3-actions-markdown)

### FR-3.1: Core Generator

- [x] Create `src/export/actionsToMarkdown.ts` file
- [x] Parse session.json file
- [x] Extract session metadata (id, start time, end time, action count)
- [x] Iterate actions chronologically

### FR-3.2: Action Formatting

- [x] Navigation actions: URL + screenshot/HTML table
- [x] Click actions: element context + before/after table
- [x] Input actions: element context + value + before/after table
- [x] Change actions: element context + before/after table
- [x] Submit actions: element context + before/after table
- [x] Keydown actions: key + element context

### FR-3.3: Voice Integration

- [x] Find voice_transcript actions with matching `associatedActionId`
- [x] Extract relevant text snippet for associated action
- [x] Format as blockquote under action

### FR-3.4: Asset Linking

- [x] Generate relative paths for screenshots
- [x] Generate relative paths for HTML snapshots
- [x] Format as markdown table (Type | Screenshot | HTML Snapshot)

**Implementation:** [actionsToMarkdown.ts](../src/export/actionsToMarkdown.ts)

---

## FR-4: Console Summary

> **PRD Reference:** [FR-4: Console Summary Markdown](PRD-markdown-export.md#fr-4-console-summary-markdown)

### FR-4.1: Core Parser

- [x] Create `src/export/consoleSummary.ts` file
- [x] Parse session.console JSON Lines file
- [x] Count entries by level (error, warn, info, debug, log)

### FR-4.2: Pattern Grouping

- [x] Normalize URLs to `*`
- [x] Normalize numbers to `*`
- [x] Normalize UUIDs to `*`
- [x] Normalize timestamps to `*`
- [x] Group by normalized pattern
- [x] Count occurrences per pattern

### FR-4.3: Output Formatting

- [x] Generate summary header with totals
- [x] Generate errors section with count/message/timestamps table
- [x] Include stack traces for error entries
- [x] Generate warnings section with pattern/count table
- [x] Generate info highlights (key messages only)
- [x] Write to console-summary.md

**Implementation:** [consoleSummary.ts](../src/export/consoleSummary.ts)

---

## FR-5: Network Summary

> **PRD Reference:** [FR-5: Network Summary Markdown](PRD-markdown-export.md#fr-5-network-summary-markdown)

### FR-5.1: Core Parser

- [x] Create `src/export/networkSummary.ts` file
- [x] Parse session.network JSON Lines file
- [x] Calculate total requests, success rate

### FR-5.2: Statistics

- [x] Calculate total size transferred
- [x] Group by resource type (document, script, stylesheet, image, xhr, etc.)
- [x] Count cached vs fresh requests
- [x] Identify failed requests (status >= 400 or status === 0)
- [x] Sort by response time for slowest list

### FR-5.3: Output Formatting

- [x] Generate summary header with overview stats
- [x] Generate resource type breakdown table
- [x] Generate failed requests table (time, URL, status, error)
- [x] Generate slowest requests table (top 10)
- [x] Generate cache statistics
- [x] Write to network-summary.md

**Implementation:** [networkSummary.ts](../src/export/networkSummary.ts)

---

## FR-6: Auto-Generation

> **PRD Reference:** [FR-6: Auto-Generation](PRD-markdown-export.md#fr-6-auto-generation)

- [x] Create `src/export/index.ts` barrel file
- [x] Export all generator functions
- [x] Add `generateMarkdownExports()` method
- [x] Call generators from `stopRecording()` after saving session
- [x] Handle errors gracefully (don't fail recording if export fails)
- [x] Log export completion/errors

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts), [index.ts](../src/export/index.ts)

---

## Technical Requirements

> **PRD Reference:** [Technical Requirements](PRD-markdown-export.md#technical-requirements)

### TR-1: No LLM Dependency ✅ COMPLETE

> [PRD: TR-1](PRD-markdown-export.md#tr-1-no-llm-dependency)

- [x] Ensure all markdown generation is deterministic
- [x] Use rule-based DOM parsing for element context
- [x] Use pattern matching for console/network aggregation
- [x] No external AI API calls in core export functions

### TR-2: Performance ✅ COMPLETE

> [PRD: TR-2](PRD-markdown-export.md#tr-2-performance)

- [x] Complete generation in <5 seconds for typical sessions
- [x] Handle 500+ action sessions without timeout
- [x] Implement parallel generation for all markdown files

| Metric | PRD Target | Current |
|--------|------------|---------|
| Generation Time | <5s | ✅ <2s (parallel) |
| Max Actions | 500+ | ✅ Supported |

### TR-3: Dependencies ✅ COMPLETE

> [PRD: TR-3](PRD-markdown-export.md#tr-3-dependencies)

- [x] Add cheerio dependency to package.json
- [x] Verify no additional runtime dependencies required

---

## Estimated Effort

### Completed Work

| Phase | Hours | Status |
|-------|-------|--------|
| FR-1: Element Context Extraction | 4h | ✅ Complete |
| FR-2: Transcript Markdown | 1h | ✅ Complete |
| FR-3: Actions Markdown | 3h | ✅ Complete |
| FR-4: Console Summary | 2h | ✅ Complete |
| FR-5: Network Summary | 2h | ✅ Complete |
| FR-6: Auto-Generation | 1h | ✅ Complete |
| TR: Technical Requirements | 0.5h | ✅ Complete |
| **Total** | **~13.5h** | **✅ Complete** |

---

## Implementation Priority

### ~~Immediate (First)~~ ✅ DONE

1. ~~**Element Context Extraction** - Core utility needed by actions.md (4h)~~
2. ~~**Console Summary** - Simplest standalone, good test case (2h)~~

### ~~Short-Term (Second)~~ ✅ DONE

1. ~~**Network Summary** - Similar pattern to console (2h)~~
2. ~~**Transcript Markdown** - Straightforward conversion (1h)~~

### ~~Medium-Term (Third)~~ ✅ DONE

1. ~~**Actions Markdown** - Depends on element context (3h)~~
2. ~~**Auto-Generation Hook** - Wire everything up (1h)~~

---

## File Reference

### New Files (Created)

- [src/export/elementContext.ts](../src/export/elementContext.ts) - Element context extraction ✅
- [src/export/transcriptToMarkdown.ts](../src/export/transcriptToMarkdown.ts) - Transcript converter ✅
- [src/export/actionsToMarkdown.ts](../src/export/actionsToMarkdown.ts) - Actions converter ✅
- [src/export/consoleSummary.ts](../src/export/consoleSummary.ts) - Console summarizer ✅
- [src/export/networkSummary.ts](../src/export/networkSummary.ts) - Network summarizer ✅
- [src/export/index.ts](../src/export/index.ts) - Barrel export ✅

### Modified Files

- [src/node/SessionRecorder.ts](../src/node/SessionRecorder.ts) - Added auto-generation hook ✅

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-11 | Initial document |
| 1.1 | 2025-12-11 | Added TR sections per template, fixed TOC anchors, updated task count to 56 |
| 2.0 | 2025-12-13 | **All tasks implemented**: Element context extraction (FR-1), transcript.md (FR-2), actions.md (FR-3), console-summary.md (FR-4), network-summary.md (FR-5), auto-generation hook (FR-6). Added cheerio dependency. All TR requirements met. |
