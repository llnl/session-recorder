# PRD: Session Intent Pipeline & Guided Workflows

**Version:** 2.0
**Date:** 2025-12-06
**Status:** Draft
**Depends On:** Session Recorder Core, Voice Recording, OpenSearch Schema

---

## Executive Summary

Session recordings capture WHAT happened (browser actions) and WHAT was said (voice transcript), but they don't capture WHY or what was EXPECTED. This PRD defines an **Intent Pipeline** that:

1. **Extracts intent from voice** - Natural speech patterns reveal purpose without special commands
2. **Applies templates post-recording** - Same recording can generate multiple outputs
3. **Uses AI interview for clarification** - When intent is unclear, AI asks questions
4. **Generates purpose-specific outputs** - feature_list.json, tests, docs, presentations

**Key Insight:** Voice IS the intent signal. Users naturally say things like "This feature handles..." or "Nobody uses this anymore" - these phrases reveal intent without any special training.

---

## Problem Statement

### Current State
- Session recorder captures browser actions + voice transcript
- Users must know how to prompt engineer to extract value
- No structured way to go from "recording" → "actionable output"
- Different user roles need different outputs from the same recording

### The Gap
| What We Capture | What's Missing |
|-----------------|----------------|
| User clicked X | WHY they clicked X |
| User said "I'm clicking this" | What SHOULD happen after |
| Screenshot of state | What to VERIFY |
| Sequence of actions | FEATURE being demonstrated |

### The Solution: Voice as Intent Signal

Users naturally reveal intent through speech patterns:

| Natural Phrase | Extracted Intent |
|----------------|------------------|
| "This feature is called..." | Feature identification |
| "The rule is that you always..." | Business rule |
| "Nobody uses this anymore" | Deprecation marker |
| "This should show..." | Test assertion |
| "I really like how they did..." | Design inspiration (positive) |
| "We definitely don't want..." | Anti-pattern (negative) |

**No hotkeys. No special commands. Just talk naturally.**

---

## User Personas & Use Cases

### Use Case 1: Legacy Application Discovery

**Persona:** Developer in meeting with domain expert
**Scenario:** Customer knows legacy app inside out. Developer wants to extract features for rebuilding.

**Current Pain:**
- Takes notes manually during meeting
- Misses details, has to ask again
- No structured output for implementation

**Flow:**
1. Start recording (optionally set context: "Legacy app discovery with customer")
2. Customer walks through app naturally, explaining as they go
3. Recording ends → User selects "Legacy Discovery" template
4. AI extracts all mentioned features from voice patterns
5. If unclear, AI asks clarifying questions (post-recording interview)
6. Developer reviews/edits extracted feature list
7. System generates `feature_list.json` in [harness format](https://github.com/chuggies510/feature-dev-harnessed)

**Voice Pattern Examples:**
- "This is our inventory dashboard" → Feature: Inventory Dashboard
- "It updates every 5 minutes from the warehouse" → Business Rule
- "Since we got the API, nobody uses these batch reports" → Deprecation

**Output:**
```json
{
  "app": "LegacyInventoryPro",
  "features": [
    {
      "id": "inventory-dashboard",
      "name": "Inventory Dashboard",
      "status": "keep",
      "description": "Real-time stock visualization",
      "business_rules": ["Updates every 5 min", "Low stock alerts < 10 units"],
      "confidence": 0.95,
      "evidence": {
        "session_id": "session-123",
        "timestamp": "00:45",
        "transcript": "This shows our current stock levels..."
      }
    }
  ],
  "deprecated": [
    {
      "id": "batch-import",
      "reason": "Replaced by API integration",
      "mentioned_by": "domain-expert",
      "confidence": 0.88
    }
  ]
}
```

---

### Use Case 2: New Feature Documentation (QA)

**Persona:** QA engineer documenting new feature for AI knowledge base
**Scenario:** New feature deployed, QA records walkthrough for AI to answer questions about it.

**Flow:**
1. Start recording
2. QA walks through feature with voice narration naturally
3. Recording ends → Select "Feature Documentation" template
4. AI generates searchable documentation
5. Documentation indexed for AI Q&A

**Voice Pattern Examples:**
- "First you click here to..." → Step documentation
- "This should show the success message" → Expected behavior
- "If you try an empty name, you get an error" → Edge case

**Output:**
```markdown
# Feature: User Profile Settings

## Overview
Allows users to update their profile information including name, email, and avatar.

## Steps to Access
1. Click user avatar in top-right corner
2. Select "Settings" from dropdown

## Functionality

### Update Display Name
- Navigate to Profile tab
- Enter new name in "Display Name" field
- Click "Save Changes"
- **Expected:** Success toast, name updates in header

## Edge Cases (Confidence: 0.92)
- Empty name shows validation error
- Oversized file shows "File too large" error

## Screenshots
[Auto-generated from session]
```

---

### Use Case 3: Regression Test Suite Generation (QA)

**Persona:** QA engineer building test coverage
**Scenario:** Need to create automated tests for existing functionality.

**Flow:**
1. Start recording
2. QA demonstrates test scenarios naturally
3. Recording ends → Select "Test Suite" template
4. AI generates Playwright test file
5. QA reviews/runs generated tests

**Voice Pattern Examples:**
- "First I'll go to settings" → Navigation step
- "Now I'll type the new name" → Input action
- "Should see the success message" → Assertion

**Output:**
```typescript
// AUTO-GENERATED from session recording
import { test, expect } from '@playwright/test';

test.describe('User Profile Settings', () => {
  // Confidence: 0.94
  test('can update display name', async ({ page }) => {
    // From voice: "First I'll go to settings"
    await page.goto('/dashboard');
    await page.click('[data-testid="user-avatar"]');
    await page.click('text=Settings');

    // From voice: "Now I'll change my name"
    await page.fill('[name="displayName"]', 'New Name');
    await page.click('text=Save Changes');

    // From voice: "Should see success message"
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

### Use Case 4: Presentation Creation (Manager)

**Persona:** Manager presenting to stakeholders
**Scenario:** Has browser-based content to present, wants slides auto-generated.

**Flow:**
1. Start recording (optionally: "Creating Q4 presentation")
2. Manager browses dashboards, explains insights naturally
3. Recording ends → Select "Presentation" template
4. AI generates PowerPoint/Google Slides
5. Manager reviews/presents

**Voice Pattern Examples:**
- "This is our Q4 revenue dashboard" → Slide title
- "Revenue exceeded target by 15%" → Bullet point
- "The key takeaway here is..." → Emphasis/highlight

---

### Use Case 5: UI Design Research (Developer)

**Persona:** Developer/Designer collecting inspiration
**Scenario:** Building new feature, wants to reference existing UIs from multiple sites.

**Flow:**
1. Start recording (optionally: "UI research for task scheduler")
2. Developer visits Google Calendar, Todoist, Linear, etc.
3. Naturally comments on elements: "I like this...", "We don't want..."
4. Recording ends → Select "UI Research" template
5. AI generates Design Spec with positives/negatives

**Voice Pattern Examples:**
- "I really like how they show the week view" → Positive design element
- "This recurring task input is really nice" → Component inspiration
- "Don't want all these upgrade prompts" → Anti-pattern

---

## Technical Architecture

### Core Philosophy: Record Once, Use Many

```
┌─────────────────────────────────────────────────────────────────┐
│                      RECORDING PHASE                             │
│                   (Template-Agnostic Capture)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Optional Pre-Recording Context                              │ │
│  │ "What are you going to do today?" (free-form, not required) │ │
│  │ Examples: "Legacy app walkthrough", "Testing the new form"  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Standard Session Recording                    │ │
│  │                                                             │ │
│  │  • Browser actions (clicks, inputs, navigation)            │ │
│  │  • Voice transcript (continuous)                            │ │
│  │  • Screenshots (before/after each action)                   │ │
│  │  • Snapshots (DOM state)                                    │ │
│  │  • Network requests                                         │ │
│  │  • Console logs                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│                    session.zip (raw data)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING PHASE                              │
│                    (Post-Recording)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Pass 1: Universal Processing (Always)             │ │
│  │                                                             │ │
│  │  1. Parse session.json                                      │ │
│  │  2. Generate session.md (timeline with links)               │ │
│  │  3. Run Vision API on screenshots                           │ │
│  │  4. Correlate voice to actions (timing)                     │ │
│  │  5. Index in OpenSearch (sessions + actions indices)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              User Selects Intent Template                   │ │
│  │                                                             │ │
│  │  "What would you like to do with this recording?"           │ │
│  │                                                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │ Legacy   │ │ Feature  │ │ Test     │ │ Present- │       │ │
│  │  │ Discovery│ │ Docs     │ │ Suite    │ │ ation    │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │ │
│  │                                                             │ │
│  │  ┌──────────┐ ┌──────────┐                                 │ │
│  │  │ UI       │ │ Custom   │                                 │ │
│  │  │ Research │ │ Template │                                 │ │
│  │  └──────────┘ └──────────┘                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        Pass 2: Template-Specific Extraction                 │ │
│  │                                                             │ │
│  │  • Apply voice pattern matching for selected template       │ │
│  │  • Extract entities with confidence scores                  │ │
│  │  • Correlate to screenshots/actions                         │ │
│  │  • Generate initial output                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Post-Recording Interview (If Needed)                │ │
│  │                                                             │ │
│  │  AI asks clarifying questions when confidence < 0.7:        │ │
│  │                                                             │ │
│  │  "At 2:35 you said 'this is important' - can you           │ │
│  │   clarify what feature you were referring to?"              │ │
│  │                                                             │ │
│  │  "I found 3 potential features. Should 'Batch Reports'      │ │
│  │   be marked as deprecated or modified?"                     │ │
│  │                                                             │ │
│  │  "What's the business rule for the low stock threshold?"    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Human Review & Editing                         │ │
│  │                                                             │ │
│  │  • Review extracted entities with confidence scores         │ │
│  │  • Edit/correct any misinterpretations                      │ │
│  │  • Add missing items                                        │ │
│  │  • Approve final output                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│                    Final Output Generated                        │
│           (feature_list.json, tests, docs, slides)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Voice Intent Pattern System

Instead of hotkeys during recording, AI extracts intent from natural speech patterns:

```yaml
# Voice pattern definitions for each entity type

feature_patterns:
  high_confidence:  # Confidence >= 0.9
    - "this feature is called {name}"
    - "this is the {name} feature"
    - "here we have the {name}"
    - "this is our {name}"
  medium_confidence:  # Confidence 0.7-0.9
    - "this shows {description}"
    - "this is where you {action}"
    - "you can use this to {purpose}"
  low_confidence:  # Confidence 0.5-0.7
    - "this is {something}"
    - "here's the {something}"

business_rule_patterns:
  high_confidence:
    - "the rule is {rule}"
    - "it must always {requirement}"
    - "you can never {prohibition}"
    - "it has to {requirement}"
  medium_confidence:
    - "it should {expectation}"
    - "it's supposed to {expectation}"
    - "we always {practice}"

deprecation_patterns:
  high_confidence:
    - "nobody uses this anymore"
    - "this is deprecated"
    - "we're getting rid of this"
    - "this is obsolete"
  medium_confidence:
    - "we don't really use this"
    - "this is being replaced by {replacement}"
    - "this is old"

keep_patterns:
  high_confidence:
    - "this is critical"
    - "we definitely need this"
    - "this is essential"
    - "can't live without this"
  medium_confidence:
    - "this is important"
    - "we use this a lot"
    - "this works well"

test_assertion_patterns:
  high_confidence:
    - "should see {expected}"
    - "you should see {expected}"
    - "it should show {expected}"
    - "verify that {condition}"
    - "make sure {condition}"
  medium_confidence:
    - "then {outcome}"
    - "and {outcome} appears"

design_positive_patterns:
  high_confidence:
    - "I really like {element}"
    - "this is exactly what we want"
    - "we should do it like this"
  medium_confidence:
    - "I like {element}"
    - "this is nice"
    - "this works well"

design_negative_patterns:
  high_confidence:
    - "we definitely don't want {element}"
    - "avoid this"
    - "this is terrible"
  medium_confidence:
    - "don't like {element}"
    - "not a fan of {element}"
    - "skip this"
```

### Intent Template System

Each use case is defined by an **Intent Template** (applied POST-recording):

```yaml
template_id: "legacy-discovery"
name: "Legacy Application Discovery"
description: "Extract features from legacy app walkthrough with domain expert"

roles: ["developer"]
typical_duration: "30-60 minutes"

# Simple pre-recording prompt (optional, not required)
pre_recording_prompt: |
  You're about to record a legacy app discovery session.
  Just talk naturally - explain what each feature does,
  which ones are important, and which ones are no longer used.

# What AI extracts from voice patterns
extraction:
  entities:
    - type: "feature"
      patterns: feature_patterns
      correlate_with: ["screenshot", "url", "action"]
    - type: "business_rule"
      patterns: business_rule_patterns
      attach_to: "nearest_feature"
    - type: "deprecation"
      patterns: deprecation_patterns
      correlate_with: ["feature"]
    - type: "keep"
      patterns: keep_patterns
      correlate_with: ["feature"]

  # When confidence is low, ask these questions
  interview_questions:
    - condition: "feature.confidence < 0.7"
      question: "At {timestamp}, you mentioned '{transcript_excerpt}' - what feature were you referring to?"
    - condition: "business_rule.feature_id == null"
      question: "The business rule '{rule}' - which feature does this apply to?"
    - condition: "deprecation.reason == null"
      question: "You mentioned '{feature_name}' is deprecated - what's replacing it?"

# Output generators
outputs:
  primary:
    type: "feature_list_json"
    format: "harness"  # github.com/chuggies510/feature-dev-harnessed
  secondary:
    - type: "implementation_harness"
      format: "anthropic"  # anthropic.com/engineering/effective-harnesses
    - type: "deprecation_report"
      format: "markdown"
```

### Confidence Scoring System

Every extracted entity includes a confidence score:

```typescript
interface ExtractedEntity {
  id: string;
  type: 'feature' | 'business_rule' | 'deprecation' | 'test_case' | 'design_element';
  value: string;
  confidence: number;  // 0.0 - 1.0

  // Evidence supporting this extraction
  evidence: {
    transcript_excerpt: string;
    timestamp: string;
    pattern_matched: string;
    screenshot_id?: string;
    action_id?: string;
  };

  // For human review
  needs_review: boolean;  // true if confidence < 0.7
  review_question?: string;  // AI-generated clarifying question
}
```

**Confidence Thresholds:**
- **0.9 - 1.0:** High confidence, auto-accept (but show in review)
- **0.7 - 0.9:** Medium confidence, include but flag for review
- **0.5 - 0.7:** Low confidence, ask clarifying question
- **< 0.5:** Very low confidence, suggest but require confirmation

### Post-Recording Interview

When the AI isn't sure about something, it asks clarifying questions:

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Assistant: Clarifying Questions                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  I've extracted 8 features from your recording. A few things    │
│  I'd like to clarify:                                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Question 1 of 3                                            │ │
│  │                                                             │ │
│  │ At 2:35, you said "this is really important for daily use" │ │
│  │ while looking at the Reports section.                       │ │
│  │                                                             │ │
│  │ [Screenshot thumbnail]                                      │ │
│  │                                                             │ │
│  │ Were you referring to:                                      │ │
│  │ ○ The Daily Summary report                                  │ │
│  │ ○ The entire Reports section                                │ │
│  │ ○ Something else: [text input]                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Skip] [Previous] [Next]                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Pass Processing

Same recording can generate multiple outputs:

```
Recording: legacy-discovery-session-123.zip
           │
           ├──→ [Legacy Discovery Template] ──→ feature_list.json
           │
           ├──→ [Test Suite Template] ──→ regression-tests.spec.ts
           │
           ├──→ [Documentation Template] ──→ feature-docs.md
           │
           └──→ [Presentation Template] ──→ stakeholder-update.pptx
```

**Why this matters:**
- Developer uses Legacy Discovery → gets feature_list.json
- Same recording, QA uses Test Suite → gets test files
- Same recording, PM uses Presentation → gets slides
- No need to re-record for different purposes

---

## Session Markdown Format

The universal intermediate format (session.md):

```markdown
# Session: legacy-discovery-2025-12-06

## Metadata
- **Duration:** 45 minutes
- **Recorded By:** developer@company.com
- **Pre-Recording Context:** "Legacy app walkthrough with domain expert"
- **App URL:** https://inventorypro.local

## Timeline

### 00:00:05 - Session Start
> "Okay, let's walk through the inventory system"

### 00:00:45 - Navigation to Dashboard
> "This is our main dashboard, it shows real-time stock levels"

- **Action:** Click on "Dashboard" link
- **Element:** `a.nav-link[href="/dashboard"]`
- **URL:** https://inventorypro.local/dashboard
- **[Before Screenshot](./screenshots/action-1-before.png)**
- **[After Screenshot](./screenshots/action-1-after.png)**

**AI Extracted (Confidence: 0.92):**
- Feature: "Inventory Dashboard"
- Description: "Real-time stock level visualization"
- Status: Keep (positive language detected)

### 00:01:23 - Explaining Update Frequency
> "It updates every 5 minutes from the warehouse API"

**AI Extracted (Confidence: 0.88):**
- Business Rule: "Update frequency: 5 minutes from warehouse API"
- Applies To: Inventory Dashboard

### 00:03:45 - Click: "Reports" menu
> "Nobody really uses these batch reports anymore"

- **Action:** Click on "Reports" link
- **Element:** `a.nav-link[href="/reports"]`
- **[Screenshot](./screenshots/action-2-after.png)**

**AI Extracted (Confidence: 0.85):**
- Feature: "Batch Reports"
- Status: Deprecated
- Reason: Implied replacement (needs clarification)

### 00:03:52 - Elaboration
> "Since we got the API integration, these are obsolete"

**AI Extracted (Confidence: 0.94):**
- Updates: Batch Reports deprecation reason = "Replaced by API integration"

---

## Extracted Features (for review)

| # | Feature | Status | Confidence | Business Rules | Evidence |
|---|---------|--------|------------|----------------|----------|
| 1 | Inventory Dashboard | Keep | 0.92 | 5-min updates | 00:00:45 |
| 2 | Low Stock Alerts | Keep | 0.88 | Threshold < 10 | 00:02:15 |
| 3 | Batch Reports | Deprecated | 0.85 | - | 00:03:45 |
| 4 | Manual Entry | Needs Review | 0.62 | Needs validation | 00:05:30 |

---

## Items Needing Clarification

### Manual Entry (Confidence: 0.62)
At 05:30, the transcript mentions "manual entry" but the context is unclear.

**Question:** Is "Manual Entry" a feature to keep, modify, or deprecate?

**Options:**
- [ ] Keep as-is
- [ ] Keep but modify
- [ ] Deprecate
- [ ] Not a feature (skip)
```

---

## User Interface

### Template Selection Screen (Post-Recording)

```
┌─────────────────────────────────────────────────────────────────┐
│  Recording Complete! What would you like to do with it?         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 📋              │  │ 📝              │  │ 🧪              │ │
│  │ Legacy App      │  │ Feature         │  │ Test Suite      │ │
│  │ Discovery       │  │ Documentation   │  │ Generation      │ │
│  │                 │  │                 │  │                 │ │
│  │ Extract features│  │ Document for    │  │ Build automated │ │
│  │ from expert     │  │ AI knowledge    │  │ test cases      │ │
│  │ walkthrough     │  │ base            │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 📊              │  │ 🎨              │  │ ➕              │ │
│  │ Presentation    │  │ UI Research     │  │ Custom          │ │
│  │ Creation        │  │                 │  │ Template        │ │
│  │                 │  │                 │  │                 │ │
│  │ Generate slides │  │ Collect design  │  │ Create your own │ │
│  │ from walkthrough│  │ inspiration     │  │ workflow        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ───────────────────────────────────────────────────────────── │
│                                                                  │
│  Or apply multiple templates:                                   │
│  ☐ Legacy Discovery  ☐ Test Suite  ☐ Documentation              │
│                                                                  │
│  [Process Recording]                                [Cancel]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pre-Recording Context (Optional, Simple)

```
┌─────────────────────────────────────────────────────────────────┐
│  Before you start recording...                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What are you going to do? (optional)                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Legacy app walkthrough with domain expert               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  This helps the AI understand your recording better, but        │
│  you can also just start recording and talk naturally.          │
│                                                                  │
│  [Start Recording]                           [Skip & Record]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Review & Edit Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Extracted Features                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  We found 8 features in your recording.                         │
│  Items with ⚠️ need your review.                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Inventory Dashboard                   95% [Keep ▼]   │   │
│  │   "Real-time stock level visualization"                 │   │
│  │   Rules: Updates every 5 min, Low stock alerts          │   │
│  │   [Edit] [View Evidence] [Play Audio]                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✅ Batch Reports                         85% [Deprecated]│   │
│  │   "Legacy batch reporting system"                       │   │
│  │   Reason: Replaced by API integration                   │   │
│  │   [Edit] [View Evidence] [Play Audio]                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚠️ Manual Entry                         62% [Modify ▼]  │   │
│  │   "Manual stock entry form"                             │   │
│  │   ⚠️ Low confidence - please verify                     │   │
│  │   [Edit] [View Evidence] [Play Audio]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [+ Add Feature]  [Answer Questions (2)]  [Generate Output]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Output Generators

### 1. Feature List Generator (Harness Format)

Generates `feature_list.json` compatible with [feature-dev-harnessed](https://github.com/chuggies510/feature-dev-harnessed):

```json
{
  "project": {
    "name": "InventoryPro Rebuild",
    "source_session": "session-1733500000000",
    "generated_at": "2025-12-06T10:00:00Z"
  },
  "features": [
    {
      "id": "inventory-dashboard",
      "name": "Inventory Dashboard",
      "status": "active",
      "priority": 1,
      "confidence": 0.92,
      "description": "Real-time stock level visualization",
      "business_rules": [
        {
          "id": "br-001",
          "rule": "Update frequency: 5 minutes from warehouse API",
          "confidence": 0.88,
          "source": "voice-transcript",
          "timestamp": "00:01:23"
        }
      ],
      "evidence": {
        "screenshots": ["screenshots/action-1-after.png"],
        "transcript_excerpts": [
          "This is our main dashboard, it shows real-time stock levels"
        ]
      }
    }
  ],
  "deprecated": [...],
  "needs_review": [
    {
      "id": "manual-entry",
      "confidence": 0.62,
      "question": "Should this be kept, modified, or deprecated?"
    }
  ]
}
```

### 2. Test Suite Generator

Generates Playwright test file with confidence annotations:

```typescript
// tests/inventory-dashboard.spec.ts
// AUTO-GENERATED from session: legacy-discovery-2025-12-06
// Review items marked with // TODO: REVIEW

import { test, expect } from '@playwright/test';

test.describe('Inventory Dashboard', () => {
  // Confidence: 0.92 - From session at 00:00:45
  test('displays real-time stock levels', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.stock-grid')).toBeVisible();
  });

  // Confidence: 0.88 - From business rule at 00:01:23
  test('updates every 5 minutes', async ({ page }) => {
    await page.goto('/dashboard');
    // TODO: REVIEW - Verify update frequency test logic
    const initialUpdate = await page.locator('.last-updated').textContent();
    await page.waitForTimeout(5 * 60 * 1000);
    const newUpdate = await page.locator('.last-updated').textContent();
    expect(newUpdate).not.toBe(initialUpdate);
  });
});
```

### 3. Documentation Generator

Generates searchable markdown with confidence scores visible for review.

### 4. Presentation Generator

Generates PowerPoint/Google Slides from recording.

### 5. Design Spec Generator

Generates design specification from multi-site UI research.

---

## Implementation Phases

### Phase 1: Core Pipeline (16 hours)
- [ ] Intent template schema definition
- [ ] Session.md generator from session.json
- [ ] Voice pattern matching engine
- [ ] Confidence scoring system
- [ ] feature_list.json output generator

### Phase 2: AI Interview System (12 hours)
- [ ] Low-confidence detection
- [ ] Question generation from templates
- [ ] Interview UI
- [ ] Answer integration into extracted data

### Phase 3: Human Review UI (12 hours)
- [ ] Extracted data review screen
- [ ] Edit/correct interface
- [ ] Evidence linking (click to view source)
- [ ] Play audio at timestamp
- [ ] Export options

### Phase 4: Additional Extractors (20 hours)
- [ ] Test case generator with assertions
- [ ] Documentation generator
- [ ] Presentation generator
- [ ] Design spec generator

### Phase 5: Multi-Template Processing (8 hours)
- [ ] Apply multiple templates to one recording
- [ ] Template selection UI
- [ ] Output format options
- [ ] Re-processing existing recordings

**Total Estimated Effort: 68 hours**

---

## Success Metrics

1. **Natural Capture:** 0% of users need to learn special commands
2. **Extraction Accuracy:** 85%+ of features correctly extracted (after review)
3. **Confidence Calibration:** Confidence scores accurate within 10%
4. **Review Efficiency:** <5 minutes to review and approve extracted data
5. **Multi-Use:** Average recording used for 2+ output types

---

## Open Questions

1. **Interview Depth:** How many clarifying questions before it becomes annoying?
2. **Multi-Language:** Support for non-English voice patterns?
3. **Pattern Learning:** Should system learn from user corrections?
4. **Offline Processing:** Support for processing without internet?

---

## Appendix: Template Examples

### Legacy Discovery Template
```yaml
template_id: legacy-discovery
name: "Legacy Application Discovery"
description: "Extract features from legacy app walkthrough with domain expert"

pre_recording_prompt: |
  You're about to record a legacy app discovery session.
  Just talk naturally - explain what each feature does.

extraction:
  entities:
    - type: feature
      patterns: feature_patterns
      correlate_with: [screenshot, url]
    - type: business_rule
      patterns: business_rule_patterns
      attach_to: nearest_feature
    - type: deprecation
      patterns: deprecation_patterns

  interview_questions:
    - condition: "entity.confidence < 0.7"
      question: "At {timestamp}, what feature were you describing?"

outputs:
  primary:
    type: feature_list_json
    format: harness
```

### Test Suite Template
```yaml
template_id: test-suite-generation
name: "Regression Test Suite"
description: "Generate automated tests from manual walkthrough"

extraction:
  entities:
    - type: test_step
      from: actions
    - type: assertion
      patterns: test_assertion_patterns
    - type: selector
      from: action_data

outputs:
  primary:
    type: playwright_test
    format: typescript
```

### UI Research Template
```yaml
template_id: ui-research
name: "UI Design Research"
description: "Collect design inspiration from multiple sites"

extraction:
  entities:
    - type: design_element
      patterns: design_positive_patterns
      correlate_with: [screenshot, url]
    - type: anti_pattern
      patterns: design_negative_patterns
      correlate_with: [screenshot, url]

outputs:
  primary:
    type: design_spec
    format: markdown
```
