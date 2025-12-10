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
