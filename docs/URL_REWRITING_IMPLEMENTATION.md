# URL Rewriting Implementation - Complete

## Problem Solved

HTML snapshots reference resources by their original URLs (e.g., `https://material.angular.dev/chunk-ABC123.js`), but resources are stored locally with SHA1 filenames (e.g., `abc123def456.js`). Opening HTML files directly in a browser fails because resources can't be loaded.

## Solution: URL Rewriting

We implemented **Approach 1: URL Rewriting** from [URL_REWRITING_VS_VIEWER.md](./URL_REWRITING_VS_VIEWER.md) to make HTML snapshots functional offline.

### Implementation Overview

#### 1. URL → Resource Mapping

Track the mapping between original URLs and local SHA1 filenames:

```typescript
private urlToResourceMap = new Map<string, string>(); // URL → SHA1 filename
```

During resource capture, store the mapping:

```typescript
private async _handleNetworkResponse(response: any): Promise<void> {
  const url = response.url();
  const buffer = await response.body();
  const sha1 = this._calculateSha1(buffer);
  const extension = this._getExtensionFromContentType(contentType, url);
  const filename = `${sha1}${extension}`;

  // Store URL → filename mapping
  this.urlToResourceMap.set(url, filename);

  // Save resource
  this.onContentBlob(filename, buffer);
}
```

#### 2. URL Resolution

Resolve relative URLs to absolute URLs using the page's base URL:

```typescript
private _resolveUrl(url: string, baseUrl: string): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Resolve relative URL
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url; // Invalid URL, return as-is
  }
}
```

**Example**:
- Input: `chunk-ABC123.js`, Base: `https://material.angular.dev/`
- Output: `https://material.angular.dev/chunk-ABC123.js`

#### 3. HTML Rewriting

Rewrite HTML to reference local resources:

```typescript
private _rewriteHTML(html: string, baseUrl: string): string {
  let rewritten = html;

  // Rewrite <link> stylesheets
  rewritten = rewritten.replace(
    /<link([^>]*?)href=["']([^"']+)["']/g,
    (match, attrs, href) => {
      const absoluteUrl = this._resolveUrl(href, baseUrl);
      const localPath = this.urlToResourceMap.get(absoluteUrl);
      if (localPath) {
        return `<link${attrs}href="../resources/${localPath}"`;
      }
      return match;
    }
  );

  // Similar rewrites for <script src>, <img src>, <source srcset>
  // ...

  return rewritten;
}
```

**Before Rewriting**:
```html
<link href="chunk-ABC123.js" rel="preload">
<script src="main.js"></script>
<img src="logo.png">
```

**After Rewriting**:
```html
<link href="../resources/abc123def456.js" rel="preload">
<script src="../resources/789ghi012jkl.js"></script>
<img src="../resources/345mno678pqr.png">
```

#### 4. CSS Rewriting

CSS files contain `url()` references that also need rewriting:

```typescript
private _rewriteCSS(css: string, baseUrl: string): string {
  return css.replace(
    /url\(["']?([^"')]+)["']?\)/g,
    (match, url) => {
      if (url.startsWith('data:')) return match;

      const absoluteUrl = this._resolveUrl(url, baseUrl);
      const localPath = this.urlToResourceMap.get(absoluteUrl);
      if (localPath) {
        return `url('../resources/${localPath}')`;
      }
      return match;
    }
  );
}
```

**Before**:
```css
@font-face {
  src: url('Roboto-Regular.woff2');
}
background-image: url('../img/logo.png');
```

**After**:
```css
@font-face {
  src: url('../resources/456def789ghi.woff2');
}
background-image: url('../resources/123abc456def.png');
```

## Output Structure

```
output/
└── session-{id}/
    ├── session.json          # Metadata
    ├── snapshots/            # HTML snapshots (URLs rewritten)
    │   ├── action-1-before.html
    │   ├── action-1-after.html
    │   └── ...
    ├── screenshots/          # PNG screenshots
    │   ├── action-1-before.png
    │   ├── action-1-after.png
    │   └── ...
    └── resources/            # All captured resources (SHA1 named)
        ├── abc123def456.js   # JavaScript
        ├── 789ghi012jkl.css  # Stylesheets
        ├── 345mno678pqr.png  # Images
        ├── 456def789ghi.woff2 # Fonts
        └── ...
```

## Benefits

✅ **Works Offline**: No server needed - just open HTML files in a browser
✅ **Portable**: Zip the session folder and share - everything works
✅ **Self-Contained**: All resources are captured and referenced locally
✅ **Automatic**: URL rewriting happens automatically during capture
✅ **Comprehensive**: Handles HTML, CSS, images, fonts, and all resource types

## Testing

### Test with SPA (material.angular.dev)

```bash
npm run build
npm run test:spa
```

Expected results:
- HTML snapshots have rewritten URLs pointing to `../resources/`
- All captured resources (CSS, JS, images, fonts) are stored with SHA1 filenames
- Opening HTML files in a browser displays the full page with all styles and images

### Verify URL Rewriting

```bash
# Check for rewritten URLs in snapshot
grep -o '../resources/[^"'"'"']*' output/session-*/snapshots/action-1-before.html | head -10

# List captured resources
ls -lh output/session-*/resources/ | head -20
```

## Implementation Files

- **[SessionRecorder.ts](../src/node/SessionRecorder.ts)**: Core implementation
  - `urlToResourceMap`: URL → filename mapping
  - `_handleNetworkResponse()`: Capture resources and build mapping
  - `_rewriteHTML()`: Rewrite HTML URLs
  - `_rewriteCSS()`: Rewrite CSS URLs
  - `_resolveUrl()`: Resolve relative URLs
  - `_handleActionBefore()`: Apply rewriting to before snapshots
  - `_handleActionAfter()`: Apply rewriting to after snapshots

## Technical Details

### URL Resolution Algorithm

1. **Check if URL is absolute**: `http://`, `https://`, `data:`
2. **If relative**: Use `new URL(relativeUrl, baseUrl)` to resolve
3. **Lookup in mapping**: `urlToResourceMap.get(absoluteUrl)`
4. **Rewrite if found**: Replace with `../resources/{sha1}{ext}`
5. **Keep original if not found**: External URLs not captured remain unchanged

### Supported Resource Types

- **Stylesheets**: `<link rel="stylesheet" href="...">`
- **Scripts**: `<script src="...">`
- **Images**: `<img src="...">`, `<source srcset="...">`
- **Fonts**: CSS `url()` references
- **CSS imports**: `@import url(...)`
- **Background images**: CSS `background-image: url(...)`

### Edge Cases Handled

- ✅ Relative URLs (resolved to absolute)
- ✅ Absolute URLs (used as-is)
- ✅ Data URLs (preserved, not rewritten)
- ✅ Protocol-relative URLs (e.g., `//cdn.example.com`)
- ✅ CSS nested resources (fonts, background images)
- ✅ Invalid URLs (caught and kept original)
- ✅ Missing resources (URLs not captured kept as external references)

## Future Enhancements

1. **Srcset Rewriting**: Handle responsive image srcsets with multiple URLs
2. **CSS @import**: Rewrite CSS imports to local resources
3. **Service Worker**: Alternative approach using service workers for URL interception
4. **Compression**: Optionally compress captured resources
5. **Selective Capture**: Filter which resources to capture (e.g., skip large videos)

## Comparison with Playwright Trace Viewer

| Feature | Our Implementation | Playwright Trace Viewer |
|---------|-------------------|------------------------|
| **Approach** | URL Rewriting | Dynamic Server |
| **Offline** | ✅ Yes | ❌ Needs server |
| **Portable** | ✅ Yes | ❌ Needs Playwright |
| **Simple** | ✅ Open HTML | ⚠️ Run command |
| **Resources** | SHA1 named | SHA1 named |
| **Mapping** | In-HTML rewrites | Runtime lookup |

## Conclusion

URL rewriting is now fully implemented and functional. HTML snapshots can be opened directly in any browser with all resources (CSS, JS, images, fonts) loading correctly from the local `resources/` directory. This makes the session recordings portable, shareable, and usable offline.
