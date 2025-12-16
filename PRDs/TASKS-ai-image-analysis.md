# AI Image Analysis - Implementation Tasks

**PRD:** [PRD-ai-image-analysis.md](PRD-ai-image-analysis.md)
**Last Updated:** 2025-12-10
**Overall Status:** 0% Complete (Not Started)

---

## Table of Contents

- [Phase 1: AI Service Foundation](#phase-1-ai-service-foundation)
- [Phase 2: UI Components](#phase-2-ui-components)
- [Phase 3: Integration](#phase-3-integration)
- [Estimated Effort](#estimated-effort)
- [Known Issues & Blockers](#known-issues--blockers)

---

## Task Overview

| Phase | Tasks | PRD References | Status |
|-------|-------|----------------|--------|
| Phase 0: Markdown-First Approach | 4 tasks | FR-M1-M6, FR-FA1-FA7 | Not Started |
| Phase 1: AI Service Foundation | 2 tasks | FR-1, FR-2 | Not Started |
| Phase 2: UI Components | 2 tasks | FR-3, US-2 | Not Started |
| Phase 3: Integration | 2 tasks | US-1, US-3 | Not Started |
| **Total** | **10 tasks** | | |

---

## Phase 0: Markdown-First Approach (Recommended First)

> **PRD Reference:** [Alternative Approach: Markdown-First Image Analysis](PRD-ai-image-analysis.md#alternative-approach-markdown-first-image-analysis)

This phase implements the markdown-first workflow for AI image analysis. **This approach is recommended to implement first** as it:
- Has no UI dependencies
- Works with any AI chat interface
- Provides immediate value with minimal implementation effort

### Task 0.1: Create Screenshots to Markdown Export Module NOT STARTED

> [PRD: FR-M1-M5](PRD-ai-image-analysis.md#functional-requirements-markdown-approach)

**Priority:** P0 - Critical
**Estimated Effort:** Medium (3h)
**Dependencies:** None

**File:** `session-recorder/src/export/screenshotsToMarkdown.ts` (NEW)

**Description:**
Create a module that generates `screenshots.md` - a catalog of all screenshots in a session with context metadata. This file enables AI-powered image analysis workflows.

**Subtasks:**

- [ ] Create `ScreenshotEntry` interface with: id, path, timestamp, type, actionId, actionType, url, viewport
- [ ] Create `extractScreenshots(sessionData): ScreenshotEntry[]` to collect all screenshots from actions
  - Handle RecordedAction (before/after screenshots)
  - Handle NavigationAction (snapshot screenshot)
  - Handle event actions (media, download, fullscreen, print - snapshot screenshot)
  - Skip voice_transcript actions (no screenshots)
- [ ] Create `generateScreenshotsMarkdown(sessionData, screenshots): string` to generate markdown
  - Header with session info
  - Summary table (counts by type)
  - Unique URLs visited
  - Screenshot catalog with context for each image
  - Quick reference table at end
- [ ] Create `generateScreenshotsMarkdownFile(sessionDir): Promise<string | null>`
  - Read session.json
  - Extract screenshots
  - Verify screenshot files exist on disk
  - Generate and write screenshots.md
- [ ] Export from `session-recorder/src/export/index.ts`

**Markdown Output Format:**

```markdown
# Session Screenshots

> **Purpose**: This document catalogs all screenshots captured during the session.
> Use this as a reference for AI-powered image analysis.

## Session Info
- **Session ID**: {sessionId}
- **Total Screenshots**: {count}

### Screenshot Summary
| Type | Count |
|------|-------|
| before | X |
| after | X |
| navigation | X |

## Screenshot Catalog

### ss-1: Click (before)
**Time**: 10:23:45 UTC
**Image**: [screenshots/action-1-before.png](screenshots/action-1-before.png)
**URL**: https://example.com
**Action**: action-1 (before state of click)
**Description**: _(pending analysis)_

---

## Quick Reference
| # | Time | Type | Action | Screenshot |
|---|------|------|--------|------------|
| ss-1 | 10:23:45 | before | click | [View](path) |
```

**Acceptance Criteria:**

- [ ] Extracts all screenshots from RecordedAction (before/after)
- [ ] Extracts screenshots from NavigationAction
- [ ] Extracts screenshots from event actions (media, download, etc.)
- [ ] Generates valid markdown with relative image links
- [ ] Includes context metadata for each screenshot
- [ ] Quick reference table lists all images
- [ ] Handles sessions with 0 screenshots gracefully

---

### Task 0.2: Integrate Screenshots Export NOT STARTED

> [PRD: FR-M1](PRD-ai-image-analysis.md#functional-requirements-markdown-approach)

**Priority:** P0 - Critical
**Estimated Effort:** Small (1h)
**Dependencies:** Task 0.1

**Files:**
- `session-recorder/src/export/index.ts` (MODIFY)
- `session-recorder/src/node/SessionRecorder.ts` (no change needed - uses generateMarkdownExports)

**Description:**
Integrate screenshots.md generation into the markdown export pipeline.

**Subtasks:**

- [ ] Export `generateScreenshotsMarkdown`, `generateScreenshotsMarkdownFile`, `ScreenshotEntry` from index.ts
- [ ] Update `MarkdownExportResult` interface to include `screenshots?: string | null`
- [ ] Add screenshots export to `generateMarkdownExports()` parallel Promise.all
- [ ] Update summary log to include screenshots.md

**Code Changes:**

```typescript
// index.ts additions
export { generateScreenshotsMarkdown, generateScreenshotsMarkdownFile, ScreenshotEntry } from './screenshotsToMarkdown';

interface MarkdownExportResult {
  // ... existing
  screenshots?: string | null;  // NEW
}

// In generateMarkdownExports()
const [transcript, actions, consoleSummary, networkSummary, screenshots] = await Promise.all([
  // ... existing
  generateScreenshotsMarkdownFile(sessionDir).catch(err => {
    errors.push(`screenshots.md: ${err.message}`);
    return null;
  })
]);
result.screenshots = screenshots;
```

**Acceptance Criteria:**

- [ ] screenshots.md generated automatically when recording stops
- [ ] Generation runs in parallel with other exports
- [ ] Errors don't block other exports
- [ ] Result includes screenshots path

---

### Task 0.3: Add MCP Tool for Screenshot Docs NOT STARTED

> [PRD: FR-M6](PRD-ai-image-analysis.md#mcp-tool-integration)

**Priority:** P1 - High
**Estimated Effort:** Small (1h)
**Dependencies:** Task 0.1

**File:** `session-recorder/mcp-server/src/tools/session.ts` (MODIFY)

**Description:**
Extend `session_regenerate_markdown` to support screenshots.md or add dedicated tool.

**Subtasks:**

- [ ] Option A: Update `session_regenerate_markdown` to also regenerate screenshots.md
- [ ] Option B: Add `session_get_markdown` type 'screenshots' support
- [ ] Test regeneration works for loaded sessions

**Acceptance Criteria:**

- [ ] Can regenerate screenshots.md via MCP tool
- [ ] Works with currently loaded session
- [ ] Returns path to generated file

---

### Task 0.4: Full Image Analysis Mode NOT STARTED

> [PRD: FR-FA1-FA7](PRD-ai-image-analysis.md#full-analysis-mode)

**Priority:** P1 - High
**Estimated Effort:** Large (4h)
**Dependencies:** Task 0.1

**Files:**

- `session-recorder/src/analysis/imageAnalysis.ts` (NEW)
- `session-recorder/mcp-server/src/tools/session.ts` (MODIFY)

**Description:**
Create on-demand full analysis mode that processes all screenshots using AI vision and generates `image-analysis.md` with detailed descriptions.

**Subtasks:**

- [ ] Create `imageAnalysis.ts` module with:
  - `analyzeImage(imagePath: string, context: ImageContext): Promise<string>` - Analyze single image
  - `analyzeAllImages(sessionDir: string, options: AnalysisOptions): Promise<AnalysisResult>` - Batch analysis
  - `generateImageAnalysisMarkdown(sessionData, analyses): string` - Generate markdown output
- [ ] Implement Claude Vision API integration for image analysis
- [ ] Include action context in analysis prompt (action type, URL, before/after)
- [ ] Generate session summary after all images analyzed
- [ ] Add progress callback for tracking (X of Y images)
- [ ] Support cancellation via AbortController
- [ ] Handle failures gracefully (skip failed, log error, continue)
- [ ] Add `session_analyze_images` MCP tool
- [ ] Return analysis stats (images analyzed, failed, duration, estimated cost)

**Analysis Prompt Template:**

```
Analyze this screenshot from a browser session recording.

Context:
- Action: {actionType} ({beforeOrAfter} state)
- URL: {url}
- Timestamp: {timestamp}

Describe:
1. What page/screen is shown
2. Key UI elements visible
3. Important text content
4. Current state (loading, errors, success)
5. What the user is doing or about to do

Keep description concise (100-200 words).
```

**Acceptance Criteria:**

- [ ] Analyzes all screenshots in a session
- [ ] Generates `image-analysis.md` with detailed descriptions
- [ ] Includes session summary with key observations
- [ ] Shows progress during analysis
- [ ] Handles API errors gracefully
- [ ] Reports estimated cost after completion
- [ ] Works via MCP tool `session_analyze_images`

---

## Prerequisites

This feature requires the **Session Editor** to be implemented first:

- [ ] Session Editor Phase 1 (Foundation) complete
- [ ] Session Editor Phase 2 (Store & Persistence) complete
- [ ] Note system functional (add, edit, delete notes)

See [TASKS-session-editor.md](TASKS-session-editor.md) for Session Editor implementation status.

---

## Phase 1: AI Service Foundation

> **PRD Reference:** [FR-1: AI Analysis Engine](PRD-ai-image-analysis.md#fr-1-ai-analysis-engine), [FR-2: Provider Support](PRD-ai-image-analysis.md#fr-2-provider-support)

### Task 1.1: Create AI Analysis Service NOT STARTED

> [PRD: FR-1.1-1.8, FR-2.1-2.5](PRD-ai-image-analysis.md#fr-1-ai-analysis-engine)

**Priority:** P0 - Critical
**Estimated Effort:** Large (6h)
**Dependencies:** None

**File:** `session-recorder/viewer/src/services/aiAnalysisService.ts` (NEW)

**Description:**
Create a service for analyzing images using AI providers with provider abstraction.

**Subtasks:**

- [ ] Create `AIAnalysisConfig` interface matching PRD schema
- [ ] Create `AIProvider` interface for provider abstraction
- [ ] Create `AIAnalysisService` class with provider management
- [ ] Implement `analyzeImage(imageBlob: Blob, config: AIAnalysisConfig): Promise<string>`
- [ ] Implement Claude provider using Anthropic SDK (vision API)
- [ ] Implement OpenAI provider using OpenAI SDK (GPT-4 Vision)
- [ ] Add support for custom endpoint (for local models like LLaVA)
- [ ] Implement rate limiting with configurable concurrency using p-limit or similar
- [ ] Add cancellation support via AbortController
- [ ] Create `DEFAULT_ANALYSIS_PROMPT` constant
- [ ] Implement `validateCredentials(config): Promise<boolean>` for each provider
- [ ] Add error handling with typed errors (RateLimitError, AuthError, NetworkError)
- [ ] Export singleton instance

**Code Structure:**

```typescript
// services/aiAnalysisService.ts

interface AIProvider {
  name: string;
  analyzeImage(imageBlob: Blob, prompt: string, signal?: AbortSignal): Promise<string>;
  validateCredentials(): Promise<boolean>;
}

class ClaudeProvider implements AIProvider { ... }
class OpenAIProvider implements AIProvider { ... }
class CustomProvider implements AIProvider { ... }

class AIAnalysisService {
  private provider: AIProvider;
  private config: AIAnalysisConfig;
  private limiter: ReturnType<typeof pLimit>;

  setConfig(config: AIAnalysisConfig): void;
  analyzeImage(imageBlob: Blob, signal?: AbortSignal): Promise<string>;
  analyzeBatch(images: Array<{id: string, blob: Blob}>, onProgress: ProgressCallback): Promise<Map<string, string>>;
  validateCredentials(): Promise<boolean>;
}
```

**Acceptance Criteria:**

- [ ] Can analyze image with Claude API
- [ ] Can analyze image with OpenAI API
- [ ] Can analyze image with custom endpoint
- [ ] Rate limiting prevents API throttling
- [ ] Cancellation stops pending requests
- [ ] Errors are typed and informative
- [ ] Credentials validation works for all providers

---

### Task 1.2: Create AI Types NOT STARTED

> [PRD: Data Schema](PRD-ai-image-analysis.md#data-schema)

**Priority:** P0 - Critical
**Estimated Effort:** Small (1h)
**Dependencies:** None

**File:** `session-recorder/viewer/src/types/aiAnalysis.ts` (NEW)

**Description:**
Create TypeScript types for AI analysis configuration and metadata.

**Subtasks:**

- [ ] Create `AIProvider` type union ('claude' | 'openai' | 'custom')
- [ ] Create `AIAnalysisConfig` interface
- [ ] Create `AIAnalysisProgress` interface for tracking batch progress
- [ ] Create `AIGeneratedNoteMetadata` interface for note metadata
- [ ] Create typed error classes (AIAnalysisError, RateLimitError, etc.)
- [ ] Create `AnalysisResult` type for batch results
- [ ] Export all types

**Acceptance Criteria:**

- [ ] All types exported and importable
- [ ] Types match PRD schema
- [ ] No `any` types used

---

## Phase 2: UI Components

> **PRD Reference:** [FR-3: Analysis Configuration](PRD-ai-image-analysis.md#fr-3-analysis-configuration), [US-2: Configure AI Settings](PRD-ai-image-analysis.md#us-2-configure-ai-settings)

### Task 2.1: Create AI Settings Component NOT STARTED

> [PRD: US-2, FR-3.1-3.5](PRD-ai-image-analysis.md#us-2-configure-ai-settings)

**Priority:** P1 - High
**Estimated Effort:** Medium (3h)
**Dependencies:** Task 1.2

**Files:**

- `session-recorder/viewer/src/components/AISettings/AISettings.tsx` (NEW)
- `session-recorder/viewer/src/components/AISettings/AISettings.css` (NEW)
- `session-recorder/viewer/src/components/AISettings/index.ts` (NEW)

**Description:**
Create a settings modal for configuring AI analysis options.

**Subtasks:**

- [ ] Create component with props: isOpen, config, onSave, onClose
- [ ] Add provider selector dropdown (Claude, OpenAI, Custom)
- [ ] Add API key input (password field)
- [ ] Add model selector dropdown (options change based on provider)
- [ ] Add concurrency slider (1-10, default 3)
- [ ] Add "Skip existing notes" checkbox
- [ ] Add custom endpoint input (shown only for Custom provider)
- [ ] Add custom prompt textarea (optional override, collapsible)
- [ ] Implement "Test Connection" button with loading/success/error states
- [ ] Load config from localStorage on mount
- [ ] Save config to localStorage on save (API key stored separately)
- [ ] Style as modal with form layout
- [ ] Add form validation (required fields, URL format)

**Acceptance Criteria:**

- [ ] Settings persist across sessions
- [ ] API key input uses password masking
- [ ] Test connection validates credentials and shows result
- [ ] Provider change updates available models
- [ ] Custom endpoint field appears only when Custom selected
- [ ] Form validates before allowing save

---

### Task 2.2: Create AI Analysis Progress Modal NOT STARTED

> [PRD: US-1](PRD-ai-image-analysis.md#us-1-analyze-images-with-ai)

**Priority:** P1 - High
**Estimated Effort:** Medium (3h)
**Dependencies:** Task 1.1

**Files:**

- `session-recorder/viewer/src/components/AIAnalysisProgress/AIAnalysisProgress.tsx` (NEW)
- `session-recorder/viewer/src/components/AIAnalysisProgress/AIAnalysisProgress.css` (NEW)
- `session-recorder/viewer/src/components/AIAnalysisProgress/index.ts` (NEW)

**Description:**
Create a progress modal showing AI analysis status during batch processing.

**Subtasks:**

- [ ] Create component with props: isOpen, progress, total, currentAction, errors, onCancel, onSkipRemaining
- [ ] Show progress bar with percentage
- [ ] Show current image thumbnail being analyzed
- [ ] Show "Analyzing X of Y images..." text
- [ ] Calculate and show estimated time remaining (based on average per image)
- [ ] Show completed/failed/remaining counts with icons
- [ ] Add Cancel button with confirmation dialog
- [ ] Add "Skip Remaining" button to finish with partial results
- [ ] Show scrollable error log for failed analyses
- [ ] Style as modal with progress indicators
- [ ] Add animation for active state

**Acceptance Criteria:**

- [ ] Progress updates in real-time
- [ ] Time estimate updates as images complete
- [ ] Cancel shows confirmation before stopping
- [ ] Skip Remaining saves completed work
- [ ] Errors displayed clearly with action context
- [ ] Modal cannot be dismissed by clicking outside during processing

---

## Phase 3: Integration

> **PRD Reference:** [US-1: Analyze Images with AI](PRD-ai-image-analysis.md#us-1-analyze-images-with-ai), [US-3: Re-analyze Single Image](PRD-ai-image-analysis.md#us-3-re-analyze-single-image)

### Task 3.1: Extend Session Store - AI Analysis NOT STARTED

> [PRD: FR-1.4, FR-1.8](PRD-ai-image-analysis.md#fr-1-ai-analysis-engine)

**Priority:** P0 - Critical
**Estimated Effort:** Medium (3h)
**Dependencies:** Task 1.1, Session Editor Phase 2 complete

**File:** `session-recorder/viewer/src/stores/sessionStore.ts` (MODIFY)

**Description:**
Add AI analysis methods and state to the session store.

**Subtasks:**

- [ ] Add state: `aiAnalysisProgress: { current: number, total: number, isRunning: boolean, errors: Array<{actionId: string, error: string}> } | null`
- [ ] Add state: `aiConfig: AIAnalysisConfig | null`
- [ ] Add state: `aiAnalysisAbortController: AbortController | null`
- [ ] Implement `loadAIConfig()` - Load from localStorage on init
- [ ] Implement `saveAIConfig(config)` - Save to localStorage
- [ ] Implement `getActionsWithScreenshots()` - Filter actions that have screenshots
- [ ] Implement `getActionsWithoutAINotes()` - For skip existing functionality
- [ ] Implement `startAIAnalysis(config?: AIAnalysisConfig)` - Begin batch analysis
  - Get actions with screenshots
  - Filter by skipExistingNotes if enabled
  - Create abort controller
  - For each action, call AI service and create note with AI metadata
  - Track progress and update state
  - Handle errors: log, skip failed, continue processing
- [ ] Implement `cancelAIAnalysis()` - Abort and save partial results
- [ ] Implement `analyzeAction(actionId: string)` - Analyze single action (for re-analyze)
- [ ] Implement `getUnanalyzedCount()` - For toolbar button badge

**Acceptance Criteria:**

- [ ] Batch analysis processes all screenshot actions
- [ ] Progress state updates correctly
- [ ] Failed analyses logged but don't block others
- [ ] AI-generated notes have correct metadata (source, aiMetadata)
- [ ] Cancel stops processing and saves completed notes
- [ ] Re-analyze single action works correctly

---

### Task 3.2: Add AI Analysis UI Integration NOT STARTED

> [PRD: US-1, US-3](PRD-ai-image-analysis.md#us-1-analyze-images-with-ai)

**Priority:** P1 - High
**Estimated Effort:** Medium (3h)
**Dependencies:** Tasks 2.1, 2.2, 3.1

**Files:**

- `session-recorder/viewer/src/components/EditorToolbar/EditorToolbar.tsx` (MODIFY)
- `session-recorder/viewer/src/components/ActionList/ActionList.tsx` (MODIFY)
- `session-recorder/viewer/src/components/ActionList/ActionList.css` (MODIFY)
- `session-recorder/viewer/src/App.tsx` (MODIFY)

**Description:**
Add AI analysis button to toolbar and integrate all AI components.

**Subtasks:**

- [ ] Add AI button to EditorToolbar with icon and unanalyzed count badge
- [ ] Add settings gear icon next to AI button
- [ ] Disable AI button if no session loaded or no screenshots
- [ ] Clicking AI button: if no config, open settings; else start analysis
- [ ] Wire up AISettings modal (open, save, close handlers)
- [ ] Wire up AIAnalysisProgress modal (progress updates, cancel, skip)
- [ ] Add AI note styling to ActionList:
  - Robot icon for AI-generated notes
  - Distinct border color (purple/violet)
  - "Analyzed by {provider}" metadata display
  - Timestamp of analysis
- [ ] Add "Re-analyze" button on AI-generated notes
- [ ] Re-analyze opens confirmation, then calls store.analyzeAction()
- [ ] Add keyboard shortcut: Ctrl+Shift+A to start analysis
- [ ] Show toast notification when analysis completes (success/partial/failed)

**Acceptance Criteria:**

- [ ] AI button visible in toolbar with badge count
- [ ] Settings accessible via gear icon
- [ ] Progress modal shows during analysis
- [ ] AI notes visually distinct from user notes
- [ ] Re-analyze works for individual notes
- [ ] Keyboard shortcut works
- [ ] Toast shows completion status

---

## Implementation Schedule

```text
Phase 1: AI Service Foundation (7h)
├── Task 1.1: AI Analysis Service (6h)
└── Task 1.2: AI Types (1h)

Phase 2: UI Components (6h)
├── Task 2.1: AI Settings Component (3h)
└── Task 2.2: AI Progress Modal (3h)

Phase 3: Integration (6h)
├── Task 3.1: Session Store - AI Analysis (3h)
└── Task 3.2: UI Integration (3h)
```

---

## File Changes Summary

### Phase 0: Markdown-First (New Files: 1, Modified: 2)

| File | Description |
|------|-------------|
| `src/export/screenshotsToMarkdown.ts` | **NEW** - Screenshot catalog markdown generator |
| `src/export/index.ts` | **MODIFY** - Add screenshots export to pipeline |
| `mcp-server/src/tools/session.ts` | **MODIFY** - Add screenshots to regenerate tool |

### Phases 1-3: In-App UI (New Files: 8, Modified: 5)

| File | Description |
|------|-------------|
| `viewer/src/types/aiAnalysis.ts` | AI analysis type definitions |
| `viewer/src/services/aiAnalysisService.ts` | AI provider abstraction and analysis service |
| `viewer/src/components/AISettings/AISettings.tsx` | AI configuration modal |
| `viewer/src/components/AISettings/AISettings.css` | AI settings styles |
| `viewer/src/components/AISettings/index.ts` | Component export |
| `viewer/src/components/AIAnalysisProgress/AIAnalysisProgress.tsx` | Analysis progress modal |
| `viewer/src/components/AIAnalysisProgress/AIAnalysisProgress.css` | Progress modal styles |
| `viewer/src/components/AIAnalysisProgress/index.ts` | Component export |

### Modified Files (Phases 1-3)

| File | Changes |
|------|---------|
| `stores/sessionStore.ts` | Add AI analysis state and methods |
| `components/EditorToolbar/EditorToolbar.tsx` | Add AI analysis button |
| `components/ActionList/ActionList.tsx` | Add AI note styling and re-analyze |
| `components/ActionList/ActionList.css` | AI note styles |
| `App.tsx` | Wire up AI modals |

### Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API client |
| `openai` | OpenAI API client |
| `p-limit` | Rate limiting for concurrent requests |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI API rate limits | Medium | Configurable concurrency, exponential backoff |
| AI API costs for large sessions | Medium | Show image count before analysis, allow partial |
| API key security in browser | High | Use password fields, never log keys, clear on request |
| AI analysis quality variance | Low | Allow re-analysis, user can edit generated notes |
| CORS issues with AI APIs | Medium | APIs typically support browser requests; document if proxy needed |
| Large image size | Medium | Resize images before sending if needed |

---

## Definition of Done

A task is complete when:

- [ ] Code implemented and compiles
- [ ] Self-reviewed for quality
- [ ] No TypeScript errors or warnings
- [ ] Feature works as described in acceptance criteria
- [ ] Error handling covers edge cases
- [ ] No console errors in browser
- [ ] Tested with at least one AI provider

---

## Estimated Effort

### Remaining Work

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 0: Markdown-First Approach | 9h | HIGH (Recommended First) |
| Phase 1: AI Service Foundation | 7h | LOW (Optional) |
| Phase 2: UI Components | 6h | LOW (Optional) |
| Phase 3: Integration | 6h | LOW (Optional) |
| **Total** | **~28h** | |

### Phase 0 Breakdown

| Task | Hours | Description |
|------|-------|-------------|
| 0.1 | 3h | Screenshots to Markdown export module |
| 0.2 | 1h | Integrate into export pipeline |
| 0.3 | 1h | MCP tool for screenshot docs |
| 0.4 | 4h | Full image analysis mode |

### Summary

| Category | Hours |
|----------|-------|
| Completed | 0h |
| Phase 0 (Recommended) | 9h |
| Phases 1-3 (Optional) | 19h |
| **Grand Total** | **~28h** |

### Recommended Implementation Order

1. **Phase 0 first** - Markdown-first approach provides immediate value (~9h)
   - Tasks 0.1-0.3: Catalog mode (`screenshots.md`) - 5h
   - Task 0.4: Full analysis mode (`image-analysis.md`) - 4h
2. **Phases 1-3 optional** - In-app UI approach can be added later if needed

---

## Known Issues & Blockers

### Prerequisites

- [ ] Session Editor must be implemented first (Phases 1-2 minimum)

### Potential Blockers

**1. AI Provider SDK Compatibility**

- [ ] Verify Anthropic SDK works in browser environment
- [ ] Verify OpenAI SDK works in browser environment
- [ ] May need to use fetch directly if SDKs are Node-only

**2. API Key Security**

- [ ] Research best practices for storing API keys in browser
- [ ] Consider using browser's Credential Management API

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial task breakdown document |
