# AI Image Analysis - Product Requirements Document

**Version:** 1.0
**Last Updated:** December 2025
**Status:** Draft

---

## Executive Summary

AI Image Analysis is an enhancement to the Session Editor that enables automatic generation of descriptive notes for screenshots captured during browser sessions. By leveraging vision-capable AI models (Claude, GPT-4 Vision, or local models), the system analyzes each screenshot and creates detailed textual descriptions. These AI-generated notes allow LLMs to understand and answer questions about session content without needing to process images directly, significantly improving the utility of recorded sessions for AI-assisted workflows.

---

## Problem Statement

Recorded browser sessions contain valuable visual information in screenshots, but this information is inaccessible to text-based AI systems:

- LLMs cannot directly interpret screenshot images when analyzing session data
- Users must manually describe each screenshot for AI tools to understand context
- Valuable visual context (UI state, error messages, form data) is lost in text-based analysis
- Manual annotation is time-consuming for sessions with many screenshots

AI Image Analysis solves this by automatically generating textual descriptions that capture the essential visual information from each screenshot.

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Developers** | Analyze sessions with AI coding assistants, generate bug reports with context |
| **QA Engineers** | Create comprehensive test documentation, share annotated sessions |
| **Technical Writers** | Generate documentation from recorded workflows |
| **Support Teams** | Analyze user-submitted session recordings with AI assistance |

---

## Goals & Objectives

### Primary Goals

1. Enable **automatic analysis** of all screenshots in a session
2. Generate **LLM-friendly descriptions** that capture essential visual information
3. Support **multiple AI providers** (Claude, OpenAI, custom/local models)
4. Integrate seamlessly with the **Session Editor note system**

### Success Metrics

- AI can generate useful descriptions for 95%+ of screenshots
- Average analysis time < 5 seconds per image
- Generated notes enable accurate LLM responses about session content
- Users can configure and start analysis in < 30 seconds

---

## Use Cases

### UC-1: Batch Session Analysis

**Actor:** Developer
**Duration:** 2-10 minutes
**Scenario:** Developer loads a recorded session and runs AI analysis to generate descriptions for all screenshots, enabling their AI coding assistant to answer questions about the recorded workflow.

**Requirements:**

- One-click analysis of entire session
- Progress indicator during batch processing
- Ability to cancel mid-process
- Results saved as notes in the session

### UC-2: Single Image Re-analysis

**Actor:** QA Engineer
**Duration:** 30 seconds
**Scenario:** QA engineer notices an AI-generated description is unclear or incomplete and triggers re-analysis of that specific screenshot with a different prompt or model.

**Requirements:**

- Re-analyze individual screenshots
- Option to modify analysis prompt
- Original note replaced or updated

### UC-3: Custom Analysis Configuration

**Actor:** Technical Writer
**Duration:** 5 minutes
**Scenario:** Technical writer configures AI analysis settings to use their organization's preferred AI provider and customizes the analysis prompt to focus on UI documentation.

**Requirements:**

- Configure AI provider and API key
- Customize analysis prompt
- Save configuration for future sessions

---

## User Stories

### US-1: Analyze Images with AI

> As a developer, I want an AI agent to automatically analyze all screenshots in my session and add descriptive notes so that LLMs can understand the visual content when answering questions about the session.

**Acceptance Criteria:**

- [ ] "Analyze Images with AI" button in editor toolbar
- [ ] Progress modal shows current image being analyzed (e.g., "Analyzing 5/42...")
- [ ] AI generates concise description for each screenshot (100-300 words)
- [ ] Descriptions include: visible UI elements, text content, page state, user context
- [ ] Notes are created with special `source: 'ai-generated'` metadata
- [ ] AI-generated notes have distinct visual styling (e.g., robot icon)
- [ ] User can review, edit, or delete AI-generated notes
- [ ] Option to skip already-annotated actions
- [ ] Supports configurable AI provider (Claude API, OpenAI, local model)
- [ ] Handles analysis errors gracefully (skip image, continue processing)

### US-2: Configure AI Settings

> As a user, I want to configure which AI provider and model to use for image analysis so that I can use my preferred service and control costs.

**Acceptance Criteria:**

- [ ] Settings modal accessible from toolbar
- [ ] Provider selection: Claude, OpenAI, Custom endpoint
- [ ] API key input (securely stored)
- [ ] Model selection based on provider
- [ ] Concurrency setting (parallel requests)
- [ ] Custom prompt override option
- [ ] "Test Connection" validates credentials
- [ ] Settings persist across sessions

### US-3: Re-analyze Single Image

> As a user, I want to re-analyze a specific screenshot if the AI-generated description is inadequate so that I can get better results without re-processing the entire session.

**Acceptance Criteria:**

- [ ] "Re-analyze" button on AI-generated notes
- [ ] Can modify prompt before re-analysis
- [ ] Option to append to or replace existing note
- [ ] Single image analysis completes quickly

---

## Functional Requirements

### FR-1: AI Analysis Engine

| ID | Requirement |
|----|-------------|
| FR-1.1 | AI analysis processes all actions with associated screenshots |
| FR-1.2 | AI provider is configurable (Claude API, OpenAI, local models) |
| FR-1.3 | Analysis runs asynchronously with cancellation support |
| FR-1.4 | Generated notes include `source: 'ai-generated'` and `analyzedAt` metadata |
| FR-1.5 | Notes describe: UI elements, visible text, page state, interaction context |
| FR-1.6 | Failed image analyses are skipped with error logged, processing continues |
| FR-1.7 | Batch processing respects API rate limits with configurable concurrency |
| FR-1.8 | Option to re-analyze specific images or entire session |

### FR-2: Provider Support

| ID | Requirement |
|----|-------------|
| FR-2.1 | Support Claude API with vision capabilities (claude-3-sonnet, claude-3-opus) |
| FR-2.2 | Support OpenAI API with vision capabilities (gpt-4-vision, gpt-4o) |
| FR-2.3 | Support custom endpoints for local models (LLaVA, etc.) |
| FR-2.4 | Provider-specific error handling and retry logic |
| FR-2.5 | API key validation before starting analysis |

### FR-3: Analysis Configuration

| ID | Requirement |
|----|-------------|
| FR-3.1 | Default analysis prompt optimized for UI screenshot description |
| FR-3.2 | User can override default prompt |
| FR-3.3 | Configurable concurrency (1-10 parallel requests) |
| FR-3.4 | Option to skip actions that already have notes |
| FR-3.5 | Configuration persisted in localStorage |

---

## Technical Requirements

### TR-1: AI Service Architecture

#### TR-1.1: Provider Abstraction

The AI analysis service shall use a provider abstraction layer to support multiple AI services.

```typescript
interface AIProvider {
  name: string;
  analyzeImage(imageBlob: Blob, prompt: string, config: ProviderConfig): Promise<string>;
  validateCredentials(config: ProviderConfig): Promise<boolean>;
}
```

#### TR-1.2: Rate Limiting

The service shall implement rate limiting to prevent API throttling.

**Default limits:**
- Claude: 3 concurrent requests
- OpenAI: 5 concurrent requests
- Custom: Configurable (default 3)

### TR-2: Security

#### TR-2.1: API Key Storage

API keys shall be stored securely and never exposed in logs or exports.

**Requirements:**
- Store in localStorage with encryption or use browser's credential storage
- Never include in exported session data
- Clear on user request
- Mask in UI (password field)

---

## AI Note Content Guidelines

Notes generated by AI should include:

- **Page identification**: What page/screen is shown (e.g., "Login page", "Shopping cart")
- **Visible UI elements**: Buttons, forms, navigation, modals visible
- **Text content**: Key text, labels, error messages, headings
- **State indicators**: Loading states, validation errors, success messages
- **Context clues**: What action likely preceded/follows this screenshot
- **Data present**: Any visible data (usernames, prices, counts) - anonymized if sensitive

**Example AI-Generated Note:**

```markdown
**Screenshot Analysis:**

This shows the checkout page of an e-commerce site. Visible elements:
- Order summary panel (right side) showing 3 items totaling $127.50
- Shipping address form (left side) with fields filled: name, street, city, zip
- "Continue to Payment" button (primary, blue) at bottom
- Progress indicator showing step 2 of 4 (Shipping)
- Header with cart icon showing "3" badge

The user has completed the shipping form and is about to proceed to payment.
```

---

## Data Schema

### AIAnalysisConfig

```typescript
interface AIAnalysisConfig {
  provider: 'claude' | 'openai' | 'custom';
  apiKey?: string;                // Stored securely, not in IndexedDB
  model: string;                  // e.g., "claude-3-sonnet-20240229"
  maxTokens: number;              // Max tokens for response (default: 500)
  concurrency: number;            // Parallel requests (default: 3)
  skipExistingNotes: boolean;     // Skip actions that already have notes
  customEndpoint?: string;        // For custom/local models
  systemPrompt?: string;          // Custom prompt override
}
```

### AI Note Metadata

```typescript
// Extended NoteAction for AI-generated notes
interface AIGeneratedNote {
  source: 'ai-generated';
  aiMetadata: {
    provider: string;          // e.g., "claude-3-sonnet", "gpt-4-vision"
    model: string;             // Full model identifier
    analyzedAt: string;        // ISO 8601
    analyzedImagePath: string; // Path to the screenshot that was analyzed
    confidence?: number;       // Optional confidence score 0-1
  };
}
```

### Default Analysis Prompt

```typescript
const DEFAULT_ANALYSIS_PROMPT = `
Analyze this screenshot and provide a concise description that will help
someone understand the visual content without seeing the image. Include:

1. Page/screen identification (what page this is)
2. Key UI elements visible (buttons, forms, navigation)
3. Important text content (headings, labels, messages)
4. Current state (loading, error, success states)
5. Context about what the user is doing

Keep the description focused and factual, 100-300 words.
`;
```

---

## Quality Attributes

### QA-1: Performance

- Individual image analysis < 5 seconds average
- Batch analysis of 50 images < 3 minutes
- UI remains responsive during analysis
- Progress updates at least every 2 seconds

### QA-2: Reliability

- API failures don't crash the application
- Failed analyses logged with error details
- Partial results saved if analysis cancelled
- Network timeouts handled gracefully

### QA-3: Security

- API keys never logged or exported
- Keys stored securely in browser
- No sensitive data sent to unintended endpoints

### QA-4: Usability

- Clear progress indication during analysis
- Easy to cancel mid-process
- AI notes visually distinct from user notes
- Simple configuration with sensible defaults

---

## UI/UX Specifications

### Toolbar Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ Session Editor  │ ↩ Undo │ ↪ Redo │ 5 changes │ 🤖 Analyze (42) │ ⚙️ │ Export │
└─────────────────────────────────────────────────────────────────┘
                                      ↑                       ↑
                              AI Analysis Button         Settings
```

### Progress Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Analyzing Images with AI                                   [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [████████████░░░░░░░░░░░░░░░░░░] 35%                         │
│                                                                 │
│   Analyzing image 15 of 42...                                  │
│   Estimated time remaining: ~2 minutes                          │
│                                                                 │
│   ┌─────────────┐                                              │
│   │ [thumbnail] │  Current: Click on "Submit Order" button     │
│   └─────────────┘                                              │
│                                                                 │
│   ✅ 14 completed  ❌ 1 failed  ⏳ 27 remaining                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                    [Cancel]  [Skip Remaining]   │
└─────────────────────────────────────────────────────────────────┘
```

### AI Note in Action List

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI Analysis                                    [Re-analyze]  │
│ ───────────────────────────────────────────────────────────────│
│ This shows the checkout page of an e-commerce site...          │
│                                                                 │
│ Visible elements:                                               │
│ - Order summary panel showing 3 items totaling $127.50         │
│ - Shipping address form with fields filled                      │
│ - "Continue to Payment" button at bottom                       │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ 🕐 Analyzed Dec 10, 2025 3:45 PM  •  claude-3-sonnet           │
└─────────────────────────────────────────────────────────────────┘
```

### Settings Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Analysis Settings                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Provider:     [Claude ▼]                                       │
│                                                                 │
│ API Key:      [••••••••••••••••••••]  [Test Connection]        │
│                                                                 │
│ Model:        [claude-3-sonnet-20240229 ▼]                     │
│                                                                 │
│ Concurrency:  [═══●═══════] 3 parallel requests                │
│                                                                 │
│ ☑ Skip actions that already have notes                         │
│                                                                 │
│ Custom Prompt (optional):                                       │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ Leave empty to use default prompt                           ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                         [Cancel]  [Save]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alternative Approach: Markdown-First Image Analysis

### Overview

An alternative to the in-app UI approach above is a **markdown-first workflow** that defers image analysis to export time and leverages AI conversation for iterative analysis. This approach:

1. **Does NOT analyze images during recording, viewing, or searching** - Keeps runtime operations fast
2. **Generates a screenshot manifest markdown** (`screenshots.md`) during export
3. **AI reads markdown and analyzes linked images** in a conversational workflow
4. **Enables iterative improvement** - Generate docs per image, refine based on analysis

### Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Session Record  │ ──► │ Export Markdown │ ──► │ AI Conversation │
│  (no analysis)  │     │ (screenshots.md)│     │  (analyze imgs) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Improved Docs   │
                                               │ (descriptions)  │
                                               └─────────────────┘
```

### Generated Markdown Format

The `screenshots.md` file serves as a manifest/catalog:

```markdown
# Session Screenshots

> **Purpose**: This document catalogs all screenshots captured during the session.
> Use this as a reference for AI-powered image analysis.

## Session Info

- **Session ID**: session-abc123
- **Total Screenshots**: 42

## Screenshot Catalog

### ss-1: Click (before)

**Time**: 10:23:45 UTC
**Image**: [screenshots/action-1-before.png](screenshots/action-1-before.png)
**URL**: https://example.com/login
**Action**: action-1 (before state of click)

**Description**: _(pending analysis)_

---

### ss-2: Click (after)
...
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **No runtime overhead** | Recording, viewing, and searching stay fast |
| **Token-efficient** | AI only processes images when explicitly asked |
| **Iterative refinement** | User can ask AI to analyze specific images or improve descriptions |
| **Flexible workflow** | Works with any AI chat interface (Claude, ChatGPT, etc.) |
| **No API key management** | Uses existing AI conversation context |
| **Subset analysis** | User can request analysis of specific images only |

### Functional Requirements (Markdown Approach)

| ID | Requirement |
|----|-------------|
| FR-M1 | Generate `screenshots.md` during markdown export |
| FR-M2 | Include all screenshot paths with relative links |
| FR-M3 | Include context metadata (action type, timestamp, URL, viewport) |
| FR-M4 | Group screenshots by action with before/after distinction |
| FR-M5 | Include quick reference table for all images |
| FR-M6 | Support regeneration via MCP tool |

### MCP Tool Integration

Add a tool for on-demand screenshot markdown generation:

```typescript
// session_generate_screenshot_docs
{
  sessionId: string;     // Session to generate for
  outputFormat?: 'catalog' | 'analysis-ready';  // Format style
}
```

### Recommended AI Workflow (Conversation-Based)

1. **Generate catalog**: `session_regenerate_markdown` → produces `screenshots.md`
2. **Load session in AI**: AI reads `screenshots.md` to understand image structure
3. **Analyze images**: User asks AI to "analyze the screenshots in this session"
4. **Iterative refinement**:
   - "Describe what's shown in ss-5 through ss-10"
   - "What error messages are visible in the screenshots?"
   - "Summarize the user journey based on these screenshots"
5. **Update descriptions**: AI can fill in description sections

---

## Full Analysis Mode

For thorough analysis of features and user flows, a **full analysis mode** can process all screenshots automatically. This runs **after recording** and is triggered on-demand by the user.

### When to Use Full Analysis

| Use Case | Description |
|----------|-------------|
| **Feature documentation** | Generate comprehensive docs for a feature workflow |
| **User flow analysis** | Understand complete user journeys with visual context |
| **QA review** | Document all states and transitions for testing |
| **Bug investigation** | Capture detailed visual state at each step |

### Full Analysis Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Session Record  │ ──► │ screenshots.md  │ ──► │ User triggers   │
│  (no analysis)  │     │   (catalog)     │     │ full analysis   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ AI analyzes all │
                                               │   screenshots   │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ image-analysis  │
                                               │      .md        │
                                               └─────────────────┘
```

### Cost Estimate

| Session Size | Images | Estimated Cost | Time |
|--------------|--------|----------------|------|
| Small | 20-50 | ~$0.06-0.15 | 1-2 min |
| Medium | 50-100 | ~$0.15-0.30 | 2-4 min |
| Large | 100-200 | ~$0.30-0.60 | 4-8 min |
| Very Large | 200-500 | ~$0.60-1.50 | 8-20 min |

*Based on ~$0.003 per image with Claude Vision API*

### Why Analyze All Images?

**Don't try to deduplicate** - Even "similar" screenshots may have important differences:
- Input validation errors appearing
- Loading states vs loaded states
- Hover/focus states
- Toast notifications
- Modal dialogs appearing/disappearing
- Data changes in tables/lists

The cost is minimal (~$0.30-1.50 for most sessions) compared to missing critical state changes.

### Full Analysis Output Format

Generates `image-analysis.md`:

```markdown
# Session Image Analysis

**Session ID**: session-abc123
**Analyzed**: 2025-12-16 10:30:00 UTC
**Total Images**: 42
**Analysis Model**: claude-3-5-sonnet

---

## Summary

This session shows a user completing a checkout flow on an e-commerce site.
Key observations:
- User logged in successfully
- Added 3 items to cart
- Encountered a validation error on shipping form
- Completed purchase after fixing address

---

## Detailed Analysis

### ss-1: Navigation
**Image**: [screenshots/nav-1.png](screenshots/nav-1.png)
**URL**: https://shop.example.com

**Description**:
Homepage of an e-commerce site showing a hero banner with "Summer Sale 50% Off"
promotion. Navigation bar has: Home, Products, Cart (0), Account. Search bar
visible in header. Featured products grid shows 6 items below the fold.

---

### ss-2: Click (before)
**Image**: [screenshots/action-1-before.png](screenshots/action-1-before.png)

**Description**:
Product listing page showing "Running Shoes" category. Grid of 12 products
with images, names, and prices. User is about to click on "Nike Air Max"
priced at $129.99. Filter sidebar shows size and color options.

---
...
```

### Functional Requirements (Full Analysis Mode)

| ID | Requirement |
|----|-------------|
| FR-FA1 | Full analysis triggered on-demand after recording |
| FR-FA2 | Process all screenshots in session (no deduplication) |
| FR-FA3 | Generate `image-analysis.md` with detailed descriptions |
| FR-FA4 | Include session summary with key observations |
| FR-FA5 | Show progress during analysis (X of Y images) |
| FR-FA6 | Support cancellation mid-analysis |
| FR-FA7 | Handle failures gracefully (skip failed, continue) |

### MCP Tool for Full Analysis

```typescript
// session_analyze_images
{
  sessionId: string;           // Session to analyze
  model?: string;              // AI model (default: claude-3-5-sonnet)
  includeContext?: boolean;    // Include action context in prompt (default: true)
}

// Returns:
{
  outputPath: string;          // Path to image-analysis.md
  imagesAnalyzed: number;
  imagesFailed: number;
  estimatedCost: string;
  duration: number;            // milliseconds
}
```

---

## Future Considerations

### Not In Scope (v1)

| Feature | Rationale |
|---------|-----------|
| Video frame analysis | Screenshots sufficient for v1, video adds complexity |
| Multiple prompts per image | Single comprehensive prompt sufficient initially |
| Prompt templates library | Users can copy/paste custom prompts |
| Cost estimation | Varies by provider, complex to calculate accurately |
| Offline/local-only mode | Requires bundling large models |

### Potential v2 Features

- Batch re-analysis with modified prompt
- Analysis quality scoring and feedback
- Prompt template library
- Cost tracking and budget limits
- Comparison view (original screenshot + AI description)
- Export AI notes as standalone documentation

---

## Dependencies

This feature depends on:

- **Session Editor** (PRD-session-editor.md) - Note system and persistence
- **External AI APIs** - Claude, OpenAI, or custom endpoints
- **Browser APIs** - Fetch for API calls, localStorage for config

---

## Appendix

### A. Supported AI Models

| Provider | Models | Vision Support |
|----------|--------|----------------|
| Claude | claude-3-opus, claude-3-sonnet, claude-3-haiku | Yes (all) |
| OpenAI | gpt-4-vision-preview, gpt-4o, gpt-4o-mini | Yes (all) |
| Custom | Varies | Must support vision |

### B. Error Messages

| Scenario | Message |
|----------|---------|
| Invalid API key | "API key validation failed. Please check your credentials." |
| Rate limited | "Rate limit exceeded. Waiting {N} seconds before retry." |
| Network error | "Network error. Check your connection and try again." |
| Analysis failed | "Failed to analyze image: {error}. Skipping to next." |
| All failed | "Analysis failed for all images. Please check your settings." |
