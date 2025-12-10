# Full Session Recording - Design Rationale

## Overview

This document outlines the architectural decisions and requirements for comprehensive session recording, optimized for enterprise use cases where recordings cannot be repeated.

## Problem Statement

Enterprise recordings often capture irreplaceable knowledge:

> A domain expert spends 2 hours walking through a legacy system that's being retired. Six months later, the reimplementation team has questions about a specific edge case. That expert has left the company.

**You cannot go back.**

The core challenge: capture everything needed for future use cases while storing it efficiently.

---

## Use Case Requirements

| Use Case | Screenshots | Actions | DOM | Transcript | Output |
|----------|-------------|---------|-----|------------|--------|
| **Legacy App Documentation** | ✅ Visual reference | ✅ What was done | ✅ Structure for reimplementation | ✅ Expert knowledge capture | Documentation, rewrite specs |
| **Feature Documentation** | ✅ | ✅ | ⚠️ Nice to have | ✅ Explanations | User guides, release notes |
| **Full App Documentation** | ✅ | ✅ | ✅ Sitemap/structure | ✅ | Comprehensive docs |
| **Bug Reproduction** | ✅ Evidence | ✅ Exact steps | ✅ Hidden state matters | ⚠️ Context | Bug ticket with steps |
| **Regression Test Gen** | ⚠️ Assertions | ✅ CRITICAL | ✅ Selectors + state assertions | ✅ Voice = test annotations | Playwright/Cypress code |
| **BA/PM/Designer Flows** | ✅ | ✅ | ❌ Don't care | ✅ | Requirements, wireframes |

---

## Architecture: Capture Full, Store Smart

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CAPTURE LAYER (miss nothing)                   │
├─────────────────────────────────────────────────────────────────────┤
│  • Full DOM snapshot on page load / navigation                      │
│  • DOM mutations between snapshots (not full DOM each time)         │
│  • All actions with values                                          │
│  • Screenshots at key moments (action + periodic)                   │
│  • Audio (full quality during recording)                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER (compress aggressively)          │
├─────────────────────────────────────────────────────────────────────┤
│  • DOM: gzip (5-10x reduction)                                      │
│  • Screenshots: JPEG 70% quality (3-5x reduction)                   │
│  • Audio: MP3 64kbps (20x reduction from WAV)                       │
│  • Mutations: Already tiny                                          │
│  • Actions: Already tiny                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER (on-demand)                   │
├─────────────────────────────────────────────────────────────────────┤
│  • Transcription (Whisper) → searchable text                        │
│  • Test generation → Playwright/Cypress code                        │
│  • Documentation → Markdown/Confluence export                       │
│  • Bug report → Jira/Linear integration                             │
│  • Video export → MP4 for sharing                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Specification: DOM Mutations

Following the rrweb approach for efficient DOM capture:

```typescript
// INITIAL: Full DOM snapshot on page load
{ type: 'full_snapshot', html: '<!DOCTYPE html>...', timestamp: 0 }

// SUBSEQUENT: Only capture what changed
{ type: 'mutation', added: [...], removed: [...], attributes: [...], text: [...], timestamp: 1234 }
{ type: 'mutation', attributes: [{ target: '#btn', name: 'disabled', value: 'true' }], timestamp: 1235 }
```

**Size comparison (10-minute session):**

| Approach | DOM Data Size |
|----------|---------------|
| Full DOM every action (50 actions × 100KB) | ~5 MB |
| Full DOM + mutations | ~150 KB (1 full + tiny diffs) |

**Result: Same reconstruction capability at 3% of the size.**

---

## Storage Estimates

| Component | Raw | Optimized | 30 min | 2 hours |
|-----------|-----|-----------|--------|---------|
| **DOM** | 100KB/snapshot | 100KB initial + ~2KB/mutation | ~200 KB | ~500 KB |
| **Screenshots** | 500KB each | 80KB JPEG @ 70% | 8 MB (100 shots) | 32 MB |
| **Audio** | 1.4 Mbps WAV | 64kbps MP3 | 14 MB | 58 MB |
| **Transcript** | - | ~10KB/30min | 10 KB | 40 KB |
| **Actions** | - | Already tiny | 20 KB | 80 KB |
| **TOTAL** | - | - | **~23 MB** | **~90 MB** |

**Target: 4-5x reduction** from ~400 MB/hour while retaining full DOM capability.

---

## Output Examples

### Bug Reproduction
```
Generated from recording:

## Steps to Reproduce
1. Navigate to /settings/users
2. Click "Add User" button
3. Enter "test@example.com" in email field
4. Click "Save"

## Expected: User created
## Actual: Error "Invalid email format"

## Technical Details
- Button was enabled (not disabled)
- Form had class "validated"
- Network request returned 400
- DOM state at failure: [expandable snapshot]
```

### Regression Test Generation
```typescript
// Auto-generated from recording + voice annotations
// Voice: "This test verifies the user creation flow"

test('user creation flow', async ({ page }) => {
  await page.goto('/settings/users');
  await page.click('[data-testid="add-user-btn"]');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('[data-testid="save-btn"]');

  // Voice: "Should show success message"
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

### Legacy App Documentation
- AI analyzes full DOM structure → generates sitemap, identifies components
- Transcript + screenshots → generates documentation drafts
- DOM + actions → understands data flow between screens

---

## Implementation Priority

| Priority | Item | Rationale |
|----------|------|-----------|
| 🔴 **P0** | DOM mutations instead of full snapshots | Biggest size reduction |
| 🔴 **P0** | Capture `change` event values | Required for test generation |
| 🔴 **P0** | JPEG compression (70% quality) | Easy win, significant savings |
| 🟡 **P1** | dblclick, contextmenu, copy/cut/paste | Action completeness |
| 🟡 **P1** | MP3 audio conversion | Storage reduction |
| 🟢 **P2** | Periodic DOM checkpoints (every 60s) | Safety net for long sessions |

---

## Key Decision: Full DOM Capture

**Question:** Is it important to capture the entire DOM to understand state changes?

**Answer:** Yes, for enterprise use cases—but via mutations, not full snapshots.

The **initial snapshot + mutation** pattern provides:
- ✅ Full DOM reconstruction at any point in time
- ✅ Hidden state, disabled elements, data attributes
- ✅ Structure for legacy app analysis
- ✅ Selectors and assertions for test generation
- ✅ 95%+ size reduction
