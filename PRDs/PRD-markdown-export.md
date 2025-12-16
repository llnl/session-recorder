# Markdown Export - Product Requirements Document

**Version:** 2.0
**Last Updated:** December 2025
**Status:** ✅ Complete

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Problem Statement](#problem-statement)
- [Target Users](#target-users)
- [Use Cases](#use-cases)
- [Functional Requirements](#functional-requirements)
- [Technical Requirements](#technical-requirements)
- [Quality Attributes](#quality-attributes)
- [Future Considerations](#future-considerations)

---

## Executive Summary

Markdown Export converts session recording JSON files (session.json, transcript.json, session.console, session.network) into human-readable markdown documents. The system auto-generates four markdown files on recording stop: transcript.md, actions.md, console-summary.md, and network-summary.md. These enable humans and AI systems to understand session intent without parsing raw JSON.

---

## Problem Statement

Session recordings produce rich JSON data that is difficult to:

- Read and understand quickly
- Search for specific actions or events
- Share with non-technical stakeholders
- Feed to AI systems for analysis

Markdown export solves this by creating human-readable summaries that preserve context and intent while dramatically reducing cognitive load.

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **QA Engineers** | Review session recordings to understand test scenarios |
| **Developers** | Debug issues by reading action timelines with context |
| **AI Systems** | Analyze sessions via markdown (Claude, GPT, etc.) |
| **Product Managers** | Understand user flows without technical knowledge |

---

## Use Cases

### UC-1: Review Session Actions

**Actor:** QA Engineer
**Scenario:** After a recording session, QA opens actions.md to understand what the user did. Each action shows human-readable element context ("Clicked 'Submit' button in login form in auth modal") with links to screenshots and HTML snapshots.

### UC-2: Debug Console Errors

**Actor:** Developer
**Scenario:** Developer opens console-summary.md to see grouped errors with counts. Instead of 847 duplicate warnings, they see "847x: [Snapshot] Could not capture stylesheet: *" with first/last timestamps and stack trace.

### UC-3: Feed Session to AI

**Actor:** Developer using Claude
**Scenario:** Developer provides actions.md + transcript.md to Claude, asking "What was the user trying to accomplish?" Claude reads the markdown and provides analysis without needing to parse JSON or view images.

---

## Functional Requirements

### FR-1: Element Context Extraction

Extract human-readable descriptions from HTML snapshots using `data-recorded-el="true"`.

| Output Example | Element | Ancestors |
|----------------|---------|-----------|
| "'Submit' button in login form" | `<button>Submit</button>` | `<form class="login">` |
| "'Dan' in 'Name' column, row 3 of 'Users' table" | `<td>Dan</td>` | `<tr>`, `<th>Name</th>`, `<table>` |
| "email input in auth modal" | `<input type="email">` | `<dialog>` |

#### FR-1.1: Ancestor Detection Rules

Walk up ALL ancestors, collecting significant context. Build description from innermost to outermost: `element in parent in grandparent...`

| Ancestor | Context Format |
|----------|----------------|
| `<table>` | "in 'Name' column, row 3 of 'Users' table" |
| `<form>` | "in login form" / "in search form" |
| `<dialog>`, `[role="dialog"]` | "in 'Settings' modal" |
| `<nav>` | "in main navigation" / "in sidebar" |
| `<ul>`, `<ol>` | "item 5 in task list" |
| `<section>`, `<article>` | "in 'Account' section" |
| `<header>`, `<footer>` | "in page header" |
| `<aside>` | "in sidebar" |
| `<main>` | "in main content" |
| `[role="menu"]` | "in dropdown menu" |
| `[role="tabpanel"]` | "in 'Settings' tab" |

#### FR-1.2: Element Description Format

| Element Type | Format |
|--------------|--------|
| Button | `'Submit' button` |
| Link | `'Learn more' link` |
| Input | `email input` / `password input` / `search input` |
| Checkbox | `'Remember me' checkbox` |
| Select | `'Country' dropdown` |
| Generic | `'Edit' span` / `icon` |

---

### FR-2: Transcript Markdown

Convert transcript.json to transcript.md with:

- Full narrative text section
- Timestamped segments table (MM:SS format)
- Language and duration metadata

**Output Format:**

```markdown
# Session Transcript

**Duration**: 25:18 | **Language**: en

## Full Narrative

All right, we are going to go to the application we're building,
Lighthaven Home, and I will log in through my email...

---

## Timestamped Segments

| Time | Text |
|------|------|
| 0:02 | All right, we are going to go to the application... |
| 0:12 | log in through my email. |
```

---

### FR-3: Actions Markdown

Convert session.json actions to actions.md with:

- Chronological timeline of all actions
- Human-readable element descriptions (from FR-1)
- Before/After screenshot + HTML links in tables
- Inline voice context when associated

**Output Format:**

```markdown
# Session Actions

**Session ID**: session-1765433976846
**Duration**: 25:18 (06:19:36 - 06:44:54 UTC)
**Total Actions**: 127

---

## Timeline

### 06:19:51 UTC - Click

Clicked **'Sign in with Email' button** in login options in main content area

| Type | Screenshot | HTML Snapshot |
|------|------------|---------------|
| Before | [View](screenshots/action-3-before.png) | [View](snapshots/action-3-before.html) |
| After | [View](screenshots/action-3-after.png) | [View](snapshots/action-3-after.html) |

> *Voice context*: "...and I will log in through my email."
```

---

### FR-4: Console Summary Markdown

Convert session.console to console-summary.md with:

- Total counts by level (error/warn/info/debug)
- Pattern-grouped messages with occurrence counts
- First/last timestamps per pattern
- Stack traces for errors
- Wildcard normalization (URLs, numbers, UUIDs → *)

**Pattern Matching Rules:**

- URLs → `*`
- Numbers → `*`
- UUIDs → `*`
- Timestamps → `*`
- Keep error types and function names

**Output Format:**

```markdown
# Console Summary

**Total Entries**: 3,847
**Errors**: 12 | **Warnings**: 892 | **Info**: 2,943

---

## Errors (12)

| Count | Message | First Seen | Last Seen |
|-------|---------|------------|-----------|
| 8 | `TypeError: Cannot read property 'map' of undefined` | 06:21:15 | 06:35:42 |

### Error Details

#### TypeError: Cannot read property 'map' of undefined (8 occurrences)

**Stack trace**:

```
at UserList (http://localhost:3000/src/components/UserList.tsx:45:12)
```

---

## Warnings (892)

| Count | Pattern | First Seen |
|-------|---------|------------|
| 847 | `[Snapshot] Could not capture stylesheet: *` | 06:19:49 |
```

---

### FR-5: Network Summary Markdown

Convert session.network to network-summary.md with:

- Total requests, success rate, size
- Breakdown by resource type
- Failed requests table with status and error
- Slowest requests (top 10)
- Cache hit ratio

**Output Format:**

```markdown
# Network Summary

**Total Requests**: 247
**Successful**: 241 (97.6%) | **Failed**: 6 (2.4%)
**Total Size**: 4.2 MB

---

## Overview

| Metric | Value |
|--------|-------|
| Documents | 12 |
| Scripts | 45 |
| Stylesheets | 18 |
| XHR/Fetch | 67 |

---

## Failed Requests (6)

| Time | URL | Status | Error |
|------|-----|--------|-------|
| 06:28:12 | `/api/users/123` | 500 | Internal Server Error |

---

## Slowest Requests (Top 10)

| Time | URL | Duration | Size |
|------|-----|----------|------|
| 06:25:33 | `/api/reports/generate` | 2,847ms | 1.2MB |
```

---

### FR-6: Auto-Generation

Generate all markdown files automatically when recording stops:

- Called from SessionRecorder.stopRecording()
- Files written to session directory alongside JSON
- No additional user action required

**Output Files:**

```text
session-{id}/
├── session.json              # Existing
├── transcript.json           # Existing
├── session.console           # Existing
├── session.network           # Existing
├── transcript.md             # NEW - Voice narration
├── actions.md                # NEW - Timeline of user actions
├── console-summary.md        # NEW - Grouped/deduplicated logs
├── network-summary.md        # NEW - Request statistics
└── ...
```

---

## Technical Requirements

### TR-1: No LLM Dependency

All markdown generation must be deterministic (no AI calls):

- Element context: DOM parsing with rules
- Summaries: Pattern matching and aggregation
- Only optional Image Description Tool uses LLM

### TR-2: Performance

- Generation must complete in <5 seconds for typical sessions
- Must handle 500+ action sessions without timeout
- Streaming writes for large files

### TR-3: Dependencies

- **cheerio** - HTML parsing for element context extraction
- No additional runtime dependencies required

---

## Quality Attributes

### QA-1: Readability

- Output must be human-readable without referencing JSON
- Element descriptions must be natural language

### QA-2: Completeness

- All actions must be represented in actions.md
- All console entries must be counted in summary
- All network requests must be included in stats

### QA-3: Robustness

- Missing files (e.g., no transcript.json) should be handled gracefully
- Malformed data should not crash generation
- Errors in one export should not block others

---

## Future Considerations

### Not In Scope (v1)

| Feature | Rationale |
|---------|-----------|
| AI image descriptions | Separate tool, requires LLM |
| Interactive HTML export | Complexity, focus on markdown |
| Custom templates | Premature optimization |

### Potential v2 Features

- Image deduplication with perceptual hashing
- AI-generated page descriptions for navigation events
- Configurable output format
- MCP tool for on-demand regeneration

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-11 | Initial document |
| 2.0 | 2025-12-13 | Marked as complete - all features implemented |
