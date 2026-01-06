# Why Full Session Recording?

Session recordings in enterprise contexts often can't be repeated. A domain expert walks through a legacy system for two hours, and six months later the reimplementation team has questions—but that expert has left the company.

**You can't go back.**

So the question isn't "what do we need to capture?" It's "how do we capture everything and store it efficiently?"

## What Each Use Case Needs

| Use Case | Screenshots | Actions | DOM | Transcript |
|----------|-------------|---------|-----|------------|
| **Legacy App Documentation** | ✅ Visual reference | ✅ What was done | ✅ Structure for reimplementation | ✅ Expert knowledge |
| **Feature Documentation** | ✅ | ✅ | ⚠️ Nice to have | ✅ Explanations |
| **Full App Documentation** | ✅ | ✅ | ✅ Sitemap/structure | ✅ |
| **Bug Reproduction** | ✅ Evidence | ✅ Exact steps | ✅ Hidden state | ⚠️ Context |
| **Regression Test Gen** | ⚠️ Assertions | ✅ Critical | ✅ Selectors + state | ✅ Voice = annotations |
| **BA/PM/Designer Flows** | ✅ | ✅ | ❌ Don't need | ✅ |

## The Architecture

Capture everything, compress aggressively, process on-demand.

```text
CAPTURE LAYER (miss nothing)
  • Full DOM snapshot on page load / navigation
  • DOM mutations between snapshots (not full DOM each time)
  • All actions with values
  • Screenshots at key moments
  • Audio at full quality

STORAGE LAYER (compress aggressively)
  • DOM: gzip (5-10x reduction)
  • Screenshots: JPEG 70% (3-5x reduction)
  • Audio: MP3 64kbps (20x reduction)
  • Mutations & actions: already tiny

PROCESSING LAYER (on-demand)
  • Transcription → searchable text
  • Test generation → Playwright/Cypress code
  • Documentation → Markdown/Confluence
  • Bug reports → Jira/Linear
  • Video export → MP4
```

## Why Mutations Instead of Full DOM Snapshots

This follows the rrweb approach:

```typescript
// Initial: full DOM snapshot on page load
{ type: 'full_snapshot', html: '<!DOCTYPE html>...', timestamp: 0 }

// After that: only capture what changed
{ type: 'mutation', added: [...], removed: [...], attributes: [...], timestamp: 1234 }
```

For a 10-minute session with 50 actions:

| Approach | Size |
|----------|------|
| Full DOM every action (50 × 100KB) | ~5 MB |
| Full DOM + mutations | ~150 KB |

Same reconstruction capability at 3% of the size.

## Expected Storage

| Component | Optimized | 30 min | 2 hours |
|-----------|-----------|--------|---------|
| DOM | 100KB + ~2KB/mutation | ~200 KB | ~500 KB |
| Screenshots | 80KB JPEG @ 70% | 8 MB | 32 MB |
| Audio | 64kbps MP3 | 14 MB | 58 MB |
| Transcript | ~10KB/30min | 10 KB | 40 KB |
| Actions | tiny | 20 KB | 80 KB |
| **Total** | | **~23 MB** | **~90 MB** |

That's a 4-5x reduction from ~400 MB/hour while keeping full DOM reconstruction.

## What This Enables

**Bug reproduction** gets auto-generated reports:

```text
Steps to Reproduce:
1. Navigate to /settings/users
2. Click "Add User" button
3. Enter "test@example.com" in email field
4. Click "Save"

Expected: User created
Actual: Error "Invalid email format"

Technical Details:
- Button was enabled (not disabled)
- Form had class "validated"
- Network request returned 400
```

**Test generation** from recordings + voice annotations:

```typescript
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

**Legacy app documentation** where AI can analyze full DOM structure to generate sitemaps, identify components, and understand data flow between screens.

## Implementation Priority

| Priority | Item | Why |
|----------|------|-----|
| 🔴 P0 | DOM mutations instead of full snapshots | Biggest size win |
| 🔴 P0 | Capture `change` event values | Needed for test gen |
| 🔴 P0 | JPEG compression (70%) | Easy win |
| 🟡 P1 | dblclick, contextmenu, copy/cut/paste | Completeness |
| 🟡 P1 | MP3 audio conversion | Storage reduction |
| 🟢 P2 | Periodic DOM checkpoints (60s) | Safety net |

## The Bottom Line

Full DOM capture matters for enterprise use cases—but through mutations, not full snapshots on every action. This gives us:

- Full DOM reconstruction at any point in time
- Hidden state, disabled elements, data attributes
- Structure for legacy app analysis
- Selectors and assertions for test generation
- 95%+ size reduction
