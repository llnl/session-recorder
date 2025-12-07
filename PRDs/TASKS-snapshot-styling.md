# TASKS: Snapshot Styling & Font Rendering Issues

**Status:** 🚧 NOT STARTED
**Priority:** 🔴 HIGH
**Estimated Time:** 4-6 hours
**Date:** 2025-12-06

---

## Problem Summary

When viewing captured snapshots in the Session Recorder Viewer, fonts and some styling elements appear different from the original page. External font URLs in inline `<style>` tags and CSS `url()` references are not being rewritten during snapshotting, causing fallback fonts to be used.

---

## Issues Observed

### 1. Font Rendering Issues
- **Description:** Fonts appear as fallback system fonts instead of the original custom fonts (e.g., Todoist's Twemoji Country Flags font)
- **Severity:** 🔴 HIGH - Major visual fidelity issue
- **Location:** Inline `<style>` tags containing `@font-face` declarations with external URLs

### 2. Absolute Path Font URLs Not Captured

- **Description:** Font URLs with absolute paths like `url(/assets/fonts/xxx.woff2)` are not being captured or rewritten
- **Severity:** 🔴 HIGH - These point to original server, not captured resources
- **Example:** `url(/assets/fonts/6bf10064f94bd524.woff2)` remains unchanged

### 3. Icon Rendering Issues

- **Description:** Custom icon fonts or SVG icons may not render correctly
- **Severity:** 🟡 MEDIUM - Some icons may appear as boxes or fallback characters
- **Root Cause:** Same as font rendering - external URL references not captured

### 4. Background Images in CSS

- **Description:** CSS `background-image: url()` references to external resources may fail
- **Severity:** 🟡 MEDIUM - Visual elements missing
- **Location:** Both inline styles and external CSS files

### 5. Layout Spacing Differences

- **Description:** Minor layout shifts due to fallback font metrics differing from original fonts
- **Severity:** 🟢 LOW - Consequence of font issues, will resolve when fonts are fixed

---

## Root Cause Analysis

### Primary Issue: Inline `<style>` Tag Content Not Processed

**File:** `session-recorder/src/node/SessionRecorder.ts`
**Function:** `_rewriteHTML()` (lines ~826-891)

The `_rewriteHTML` function currently rewrites URLs in:
- ✅ `<link href="...">` - External stylesheets
- ✅ `<script src="...">` - External scripts
- ✅ `<img src="...">` - Images
- ✅ `style="..."` attributes - Inline style attributes

**But does NOT rewrite:**
- ❌ `<style>...</style>` tag content - **THE MAIN ISSUE**

**Example of unprocessed inline style:**
```html
<style>
@font-face {
  font-family: "Twemoji Country Flags";
  src: url("https://todoist.b-cdn.net/assets/fonts/582b900e65a231a2.woff2") format("woff2");
}
</style>
```
This external font URL is never rewritten to a local resource path.

### Secondary Issue: CSS `url()` in External Stylesheets

**Function:** `_rewriteCSSUrls()` (lines ~903-936)

This function correctly handles CSS `url()` references, BUT:
- It's only called for external CSS files (via `_rewriteResource`)
- It's NOT called for inline `<style>` tag content

### Tertiary Issue: Absolute Path URLs Not in `urlToResourceMap`

**Problem:** `_rewriteCSSUrls` only rewrites URLs that exist in `urlToResourceMap`.

If fonts use absolute paths like `/assets/fonts/xxx.woff2`:

- The URL resolution may differ from what was captured
- These URLs won't be found in the map
- Result: URL remains unchanged, points to original server (404 in viewer)

### Code Flow

```
Snapshot Capture (browser)
    ↓
extractResources() - Captures external stylesheets via document.styleSheets
    ↓
SessionRecorder._rewriteHTML() - Rewrites URLs in HTML
    ↓
  ✅ <link href> → local path
  ✅ <script src> → local path
  ✅ <img src> → local path
  ❌ <style>url(...)</style> → NOT PROCESSED (BUG)
    ↓
SessionRecorder._rewriteCSSUrls() - Called for CSS files only
    ↓
Output: HTML with some broken font/resource references
```

---

## Tasks

### Task 1: Add Inline `<style>` Tag URL Rewriting

**Priority:** 🔴 HIGH
**Estimated Time:** 2 hours
**File:** `session-recorder/src/node/SessionRecorder.ts`

#### Implementation Steps

1. **Locate `_rewriteHTML` function** (~line 826)

2. **Add inline style rewriting BEFORE the return statement:**

```typescript
// Rewrite <style> tag content
rewritten = rewritten.replace(
  /<style([^>]*)>([\s\S]*?)<\/style>/gi,
  (match, attrs, content) => {
    const rewrittenContent = this._rewriteCSSUrls(content, baseUrl);
    return `<style${attrs}>${rewrittenContent}</style>`;
  }
);
```

3. **Ensure `_rewriteCSSUrls` handles all URL patterns:**
   - `url("https://...")` - External absolute URLs
   - `url('/assets/...')` - Absolute path URLs
   - `url('../fonts/...')` - Relative URLs
   - `url(data:...)` - Skip data URLs (already embedded)

#### Acceptance Criteria
- [ ] Inline `<style>` tags have their `url()` references rewritten
- [ ] External font URLs converted to local resource paths
- [ ] Data URLs are preserved unchanged
- [ ] No breaking changes to existing functionality

---

### Task 2: Enhance CSS `url()` Pattern Matching

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 hour
**File:** `session-recorder/src/node/SessionRecorder.ts`

#### Current Implementation Issues

The current `_rewriteCSSUrls` function may not handle all URL patterns. Verify it handles:

```typescript
// Patterns to support:
url("https://example.com/font.woff2")    // External absolute
url('https://example.com/font.woff2')    // Single quotes
url(https://example.com/font.woff2)      // No quotes
url("/assets/fonts/file.woff2")          // Absolute path
url('../fonts/file.woff2')               // Relative path
url(data:font/woff2;base64,...)          // Data URL (skip)
```

#### Implementation Steps

1. **Review current regex pattern** in `_rewriteCSSUrls`

2. **Ensure pattern handles all quote styles:**
```typescript
const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
```

3. **Add logic to skip data URLs:**
```typescript
if (urlValue.startsWith('data:')) {
  return match; // Skip data URLs
}
```

#### Acceptance Criteria
- [ ] All CSS url() quote styles handled (double, single, none)
- [ ] Data URLs are skipped (not converted)
- [ ] Relative and absolute paths both converted correctly

---

### Task 3: Resource Capture for Fonts

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1.5 hours
**Files:**
- `session-recorder/src/browser/snapshotCapture.ts`
- `session-recorder/src/node/SessionRecorder.ts`

#### Problem

Even if URLs are rewritten, the actual font files need to be captured and stored. Currently:
- `extractResources()` captures stylesheets via `document.styleSheets`
- Font files referenced in those stylesheets may not be captured

#### Implementation Steps

1. **Parse captured CSS for font URLs:**
```typescript
// In extractResources() or new function
function extractFontUrls(cssContent: string): string[] {
  const fontPattern = /url\(\s*(['"]?)([^'")]+\.(woff2?|ttf|otf|eot))\1\s*\)/gi;
  const urls: string[] = [];
  let match;
  while ((match = fontPattern.exec(cssContent)) !== null) {
    urls.push(match[2]);
  }
  return urls;
}
```

2. **Fetch and store font files:**
   - Use `fetch()` to download font files
   - Store in ResourceStorage with proper content type
   - Handle CORS errors gracefully (fallback to original URL)

3. **Add font file extensions to resource storage:**
```typescript
// In resourceStorage.ts getExtension()
'font/woff': 'woff',
'font/woff2': 'woff2',
'font/ttf': 'ttf',
'font/otf': 'otf',
```

#### Acceptance Criteria
- [ ] Font files (woff, woff2, ttf, otf) are captured and stored
- [ ] CORS-blocked fonts fail gracefully
- [ ] Font file URLs in CSS point to local resources

---

### Task 4: Viewer Blob URL Conversion for CSS `url()`

**Priority:** 🟡 MEDIUM
**Estimated Time:** 1 hour
**File:** `session-recorder/viewer/src/components/SnapshotViewer/SnapshotViewer.tsx`

#### Problem

The current `convertResourcePathsToBlobUrls` function only handles:
```typescript
const resourcePattern = /(?:href|src)=["']([^"']*?(?:\.\.\/)?resources\/[^"']+)["']/gi;
```

This misses CSS `url()` references in inline styles.

#### Implementation Steps

1. **Add CSS url() pattern matching:**
```typescript
function convertCSSUrlsToBlobUrls(
  html: string,
  resources: Map<string, Blob>
): string {
  // Pattern for url() in CSS
  const cssUrlPattern = /url\(\s*(['"]?)([^'")]*(?:\.\.\/)?resources\/[^'")\s]+)\1\s*\)/gi;

  return html.replace(cssUrlPattern, (match, quote, relativePath) => {
    // Normalize path
    let resourceKey = relativePath;
    if (relativePath.startsWith('../')) {
      resourceKey = relativePath.substring(3);
    }

    const blob = resources.get(resourceKey);
    if (!blob) {
      console.warn(`CSS resource not found: ${resourceKey}`);
      return match;
    }

    // Check/create blob URL
    if (!blobUrlCache.has(resourceKey)) {
      blobUrlCache.set(resourceKey, URL.createObjectURL(blob));
    }

    return `url(${quote}${blobUrlCache.get(resourceKey)}${quote})`;
  });
}
```

2. **Call from main conversion flow:**
```typescript
// In useEffect that loads HTML
let htmlWithBlobUrls = convertResourcePathsToBlobUrls(htmlContent, resources);
htmlWithBlobUrls = convertCSSUrlsToBlobUrls(htmlWithBlobUrls, resources);
```

#### Acceptance Criteria
- [ ] CSS `url()` references converted to blob URLs
- [ ] Fonts load correctly in snapshot iframe
- [ ] No memory leaks from blob URLs

---

### Task 5: Testing & Verification

**Priority:** 🟢 LOW
**Estimated Time:** 0.5 hours

#### Test Cases

1. **Capture site with custom fonts:**
   - Navigate to Todoist or similar site with custom fonts
   - Record session
   - Verify fonts display correctly in viewer

2. **Capture site with icon fonts:**
   - Test Font Awesome or similar icon fonts
   - Verify icons render correctly

3. **Edge cases:**
   - Data URLs in CSS (should be preserved)
   - CORS-blocked fonts (should fail gracefully)
   - Very large font files (>100KB)

#### Acceptance Criteria
- [ ] Todoist snapshot fonts match original
- [ ] Icon fonts render correctly
- [ ] No console errors for resource loading

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/node/SessionRecorder.ts` | Add inline `<style>` URL rewriting in `_rewriteHTML()` |
| `src/node/SessionRecorder.ts` | Verify/enhance `_rewriteCSSUrls()` pattern matching |
| `src/browser/snapshotCapture.ts` | Add font file extraction from CSS |
| `src/storage/resourceStorage.ts` | Add font MIME type mappings |
| `viewer/src/components/SnapshotViewer/SnapshotViewer.tsx` | Add CSS `url()` blob URL conversion |

---

## Implementation Order

1. **Task 1** - Inline `<style>` rewriting (fixes main issue)
2. **Task 2** - CSS url() pattern enhancement (ensures all patterns work)
3. **Task 3** - Font resource capture (ensures fonts are actually stored)
4. **Task 4** - Viewer CSS url() conversion (ensures fonts load in viewer)
5. **Task 5** - Testing & verification

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Font rendering accuracy | Matches original page |
| Icon rendering | All icons visible |
| Console errors for fonts | 0 errors |
| Snapshot file size increase | <10% for typical pages |

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-06 | Initial task breakdown for snapshot styling issues | Claude |
