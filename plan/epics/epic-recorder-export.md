# Epic: Markdown Export

<epic>
  <id>recorder-export</id>
  <initiative>session-recorder</initiative>
  <status>tested</status>
  <name>Markdown Export Auto-Generation</name>
  <goal>Auto-generate markdown documentation from recorded sessions</goal>
  <original_prd>PRDs/PRD-markdown-export.md</original_prd>
  <original_tasks>PRDs/TASKS-markdown-export.md</original_tasks>

  <requirements>
    <requirement id="FR-1" status="done">Element context extraction from DOM</requirement>
    <requirement id="FR-2" status="done">Transcript markdown generation</requirement>
    <requirement id="FR-3" status="done">Actions markdown with voice integration</requirement>
    <requirement id="FR-4" status="done">Console summary with pattern grouping</requirement>
    <requirement id="FR-5" status="done">Network summary with statistics</requirement>
    <requirement id="FR-6" status="done">Auto-generation on session stop</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
    <dependency type="epic">recorder-voice</dependency>
  </dependencies>
</epic>

---

## Overview

This epic implements automatic markdown generation when sessions stop, producing human-readable documentation without requiring LLM processing.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Element Context | src/export/elementContext.ts | DOM parsing for element descriptions |
| Transcript | src/export/transcriptToMarkdown.ts | Voice transcript converter |
| Actions | src/export/actionsToMarkdown.ts | Action list with context |
| Console | src/export/consoleSummary.ts | Grouped console log summary |
| Network | src/export/networkSummary.ts | Request statistics |
| Barrel | src/export/index.ts | Export all generators |

## Generated Files

Each session generates:
- `transcript.md` - Voice narration with timestamps
- `actions.md` - Chronological action list with element context
- `console-summary.md` - Grouped/deduplicated console logs
- `network-summary.md` - Request statistics and errors

## Current Status (100% Complete)

All features implemented and tested:
- Element context extraction using cheerio
- All 4 markdown generators working
- Auto-generation hook in SessionRecorder.stop()
- Performance: <2s generation time (parallel)

---

## Change Log (from TASKS-markdown-export.md)

| Date | Changes |
|------|---------|
| 2025-12-11 | Initial document |
| 2025-12-11 | Added TR sections per template, fixed TOC anchors |
| 2025-12-13 | All tasks implemented: Element context (FR-1), transcript.md (FR-2), actions.md (FR-3), console-summary.md (FR-4), network-summary.md (FR-5), auto-generation hook (FR-6) |
