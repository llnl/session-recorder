# Markdown Export - Implementation Tasks

**PRD:** [PRD-markdown-export.md](PRD-markdown-export.md)
**Last Updated:** 2025-12-11
**Overall Status:** ~0% Complete (Not Started)

---

## Table of Contents

- [FR-1: Element Context Extraction](#fr-1-element-context-extraction) ❌
- [FR-2: Transcript Markdown](#fr-2-transcript-markdown) ❌
- [FR-3: Actions Markdown](#fr-3-actions-markdown) ❌
- [FR-4: Console Summary](#fr-4-console-summary) ❌
- [FR-5: Network Summary](#fr-5-network-summary) ❌
- [FR-6: Auto-Generation](#fr-6-auto-generation) ❌
- [Technical Requirements](#technical-requirements) ❌
- [Estimated Effort](#estimated-effort)
- [Implementation Priority](#implementation-priority)
- [File Reference](#file-reference)

---

## FR-1: Element Context Extraction

> **PRD Reference:** [FR-1: Element Context Extraction](PRD-markdown-export.md#fr-1-element-context-extraction)

### FR-1.1: Core Parser

- [ ] Create `src/export/elementContext.ts` file
- [ ] Add cheerio dependency for HTML parsing
- [ ] Implement `findRecordedElement()` - locate `data-recorded-el="true"`
- [ ] Implement `walkAncestors()` - traverse DOM tree upward
- [ ] Create TypeScript interfaces for element context

### FR-1.2: Ancestor Rules

- [ ] Table detection: extract column header, row number, table name
- [ ] Form detection: extract form name/purpose, field labels
- [ ] Modal/dialog detection: extract title from `<dialog>` or `[role="dialog"]`
- [ ] Navigation detection: extract nav section name
- [ ] List detection: extract list name, item position
- [ ] Section/article detection: extract heading text
- [ ] Header/footer detection: identify page region
- [ ] Aside/sidebar detection: identify sidebar context
- [ ] Main content detection: identify main region
- [ ] Menu role detection: identify dropdown menus
- [ ] Tab panel detection: extract tab name

### FR-1.3: Element Description Format

- [ ] Button: "'Submit' button"
- [ ] Link: "'Learn more' link"
- [ ] Input: "email input" / "password input" / "search input"
- [ ] Checkbox: "'Remember me' checkbox"
- [ ] Select: "'Country' dropdown"
- [ ] Generic: "'Edit' span" / "icon"
- [ ] Build full description: `{element} in {ancestor1} in {ancestor2}...`

### FR-1.4: Edge Cases

- [ ] Handle missing `data-recorded-el` attribute gracefully
- [ ] Handle deeply nested elements (>10 ancestors)
- [ ] Handle elements with no text content (use aria-label, placeholder)
- [ ] Handle SVG icons (identify as "icon")

**Implementation:** [elementContext.ts](../src/export/elementContext.ts)

---

## FR-2: Transcript Markdown

> **PRD Reference:** [FR-2: Transcript Markdown](PRD-markdown-export.md#fr-2-transcript-markdown)

- [ ] Create `src/export/transcriptToMarkdown.ts` file
- [ ] Parse transcript.json file
- [ ] Extract metadata: duration, language
- [ ] Format full narrative text section
- [ ] Generate timestamped segments table
- [ ] Convert seconds to MM:SS format
- [ ] Write to transcript.md file
- [ ] Handle missing transcript.json (skip gracefully)

**Implementation:** [transcriptToMarkdown.ts](../src/export/transcriptToMarkdown.ts)

---

## FR-3: Actions Markdown

> **PRD Reference:** [FR-3: Actions Markdown](PRD-markdown-export.md#fr-3-actions-markdown)

### FR-3.1: Core Generator

- [ ] Create `src/export/actionsToMarkdown.ts` file
- [ ] Parse session.json file
- [ ] Extract session metadata (id, start time, end time, action count)
- [ ] Iterate actions chronologically

### FR-3.2: Action Formatting

- [ ] Navigation actions: URL + screenshot/HTML table
- [ ] Click actions: element context + before/after table
- [ ] Input actions: element context + value + before/after table
- [ ] Change actions: element context + before/after table
- [ ] Submit actions: element context + before/after table
- [ ] Keydown actions: key + element context

### FR-3.3: Voice Integration

- [ ] Find voice_transcript actions with matching `associatedActionId`
- [ ] Extract relevant text snippet for associated action
- [ ] Format as blockquote under action

### FR-3.4: Asset Linking

- [ ] Generate relative paths for screenshots
- [ ] Generate relative paths for HTML snapshots
- [ ] Format as markdown table (Type | Screenshot | HTML Snapshot)

**Implementation:** [actionsToMarkdown.ts](../src/export/actionsToMarkdown.ts)

---

## FR-4: Console Summary

> **PRD Reference:** [FR-4: Console Summary Markdown](PRD-markdown-export.md#fr-4-console-summary-markdown)

### FR-4.1: Core Parser

- [ ] Create `src/export/consoleSummary.ts` file
- [ ] Parse session.console JSON Lines file
- [ ] Count entries by level (error, warn, info, debug, log)

### FR-4.2: Pattern Grouping

- [ ] Normalize URLs to `*`
- [ ] Normalize numbers to `*`
- [ ] Normalize UUIDs to `*`
- [ ] Normalize timestamps to `*`
- [ ] Group by normalized pattern
- [ ] Count occurrences per pattern

### FR-4.3: Output Formatting

- [ ] Generate summary header with totals
- [ ] Generate errors section with count/message/timestamps table
- [ ] Include stack traces for error entries
- [ ] Generate warnings section with pattern/count table
- [ ] Generate info highlights (key messages only)
- [ ] Write to console-summary.md

**Implementation:** [consoleSummary.ts](../src/export/consoleSummary.ts)

---

## FR-5: Network Summary

> **PRD Reference:** [FR-5: Network Summary Markdown](PRD-markdown-export.md#fr-5-network-summary-markdown)

### FR-5.1: Core Parser

- [ ] Create `src/export/networkSummary.ts` file
- [ ] Parse session.network JSON Lines file
- [ ] Calculate total requests, success rate

### FR-5.2: Statistics

- [ ] Calculate total size transferred
- [ ] Group by resource type (document, script, stylesheet, image, xhr, etc.)
- [ ] Count cached vs fresh requests
- [ ] Identify failed requests (status >= 400 or status === 0)
- [ ] Sort by response time for slowest list

### FR-5.3: Output Formatting

- [ ] Generate summary header with overview stats
- [ ] Generate resource type breakdown table
- [ ] Generate failed requests table (time, URL, status, error)
- [ ] Generate slowest requests table (top 10)
- [ ] Generate cache statistics
- [ ] Write to network-summary.md

**Implementation:** [networkSummary.ts](../src/export/networkSummary.ts)

---

## FR-6: Auto-Generation

> **PRD Reference:** [FR-6: Auto-Generation](PRD-markdown-export.md#fr-6-auto-generation)

- [ ] Create `src/export/index.ts` barrel file
- [ ] Export all generator functions
- [ ] Add `generateMarkdownExports()` method to SessionRecorder
- [ ] Call generators from `stopRecording()` after saving session
- [ ] Handle errors gracefully (don't fail recording if export fails)
- [ ] Log export completion/errors

**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)

---

## Technical Requirements

> **PRD Reference:** [Technical Requirements](PRD-markdown-export.md#technical-requirements)

### TR-1: No LLM Dependency ❌ NOT STARTED

> [PRD: TR-1](PRD-markdown-export.md#tr-1-no-llm-dependency)

- [ ] Ensure all markdown generation is deterministic
- [ ] Use rule-based DOM parsing for element context
- [ ] Use pattern matching for console/network aggregation
- [ ] No external AI API calls in core export functions

### TR-2: Performance ❌ NOT STARTED

> [PRD: TR-2](PRD-markdown-export.md#tr-2-performance)

- [ ] Complete generation in <5 seconds for typical sessions
- [ ] Handle 500+ action sessions without timeout
- [ ] Implement streaming writes for large files if needed

| Metric | PRD Target | Current |
|--------|------------|---------|
| Generation Time | <5s | N/A |
| Max Actions | 500+ | N/A |

### TR-3: Dependencies ❌ NOT STARTED

> [PRD: TR-3](PRD-markdown-export.md#tr-3-dependencies)

- [ ] Add cheerio dependency to package.json
- [ ] Verify no additional runtime dependencies required

---

## Estimated Effort

### Remaining Work

| Phase | Hours | Priority |
|-------|-------|----------|
| FR-1: Element Context Extraction | 4h | 🔴 HIGH |
| FR-2: Transcript Markdown | 1h | 🟢 LOW |
| FR-3: Actions Markdown | 3h | 🔴 HIGH |
| FR-4: Console Summary | 2h | 🟡 MEDIUM |
| FR-5: Network Summary | 2h | 🟡 MEDIUM |
| FR-6: Auto-Generation | 1h | 🔴 HIGH |
| TR: Technical Requirements | 0.5h | 🟡 MEDIUM |
| **Total** | **~13.5h** | |

---

## Implementation Priority

### Immediate (First)

1. **Element Context Extraction** - Core utility needed by actions.md (4h)
2. **Console Summary** - Simplest standalone, good test case (2h)

### Short-Term (Second)

1. **Network Summary** - Similar pattern to console (2h)
2. **Transcript Markdown** - Straightforward conversion (1h)

### Medium-Term (Third)

1. **Actions Markdown** - Depends on element context (3h)
2. **Auto-Generation Hook** - Wire everything up (1h)

---

## File Reference

### New Files

- [src/export/elementContext.ts](../src/export/elementContext.ts) - Element context extraction
- [src/export/transcriptToMarkdown.ts](../src/export/transcriptToMarkdown.ts) - Transcript converter
- [src/export/actionsToMarkdown.ts](../src/export/actionsToMarkdown.ts) - Actions converter
- [src/export/consoleSummary.ts](../src/export/consoleSummary.ts) - Console summarizer
- [src/export/networkSummary.ts](../src/export/networkSummary.ts) - Network summarizer
- [src/export/index.ts](../src/export/index.ts) - Barrel export

### Modified Files

- [src/node/SessionRecorder.ts](../src/node/SessionRecorder.ts) - Add auto-generation hook

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-11 | Initial document |
| 1.1 | 2025-12-11 | Added TR sections per template, fixed TOC anchors, updated task count to 56 |
