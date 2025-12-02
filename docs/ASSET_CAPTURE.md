# Asset Capture Architecture (POC 2)

## Problem Statement

**Current Limitation**: We only capture HTML snapshots. External assets (CSS, JS, images, fonts) are referenced by URL but not captured, making snapshots non-functional when viewed offline.

**Example**: When capturing material.angular.dev, the HTML references:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto...">
<script src="https://material.angular.dev/main.js"></script>
<img src="https://material.angular.dev/assets/logo.svg">
```

When opening the snapshot later, these URLs won't work if:
- You're offline
- The site has changed or is down
- You're viewing from a different domain (CORS issues)

## How Playwright Trace Viewer Solves This

Playwright's trace viewer captures a complete snapshot of the page including all assets:

```
trace/
├── trace.zip
│   ├── resources/         # All external assets
│   │   ├── abc123.css     # Stylesheet with hash
│   │   ├── def456.js      # JavaScript bundle with hash
│   │   ├── ghi789.png     # Image with hash
│   │   ├── jkl012.woff2   # Font with hash
│   ├── snapshots/         # HTML snapshots
│   │   ├── snapshot-1.html (URLs rewritten to reference resources/)
```

**Key Steps**:
1. **Capture HTML** with all external resource URLs
2. **Download assets** referenced in HTML (CSS, JS, images, fonts, etc.)
3. **Hash and store** assets by content hash (deduplication)
4. **Rewrite URLs** in HTML to point to local resource files
5. **Parse CSS** for nested resources (background images, fonts)
6. **Handle data URLs** and inline resources efficiently

## Resource Types to Capture

### Primary Resources (HTML References)
```typescript
interface ResourceType {
  // Stylesheets
  'stylesheet': '<link rel="stylesheet" href="...">'

  // Scripts
  'script': '<script src="..."></script>'

  // Images
  'image': '<img src="...">, <source srcset="...">, <picture>'

  // Fonts (from CSS @font-face)
  'font': '@font-face { src: url(...) }'

  // Media
  'video': '<video src="...">'
  'audio': '<audio src="...">'

  // Other
  'favicon': '<link rel="icon" href="...">'
  'manifest': '<link rel="manifest" href="...">'
}
```

### Nested Resources (CSS References)
```css
/* Background images */
background: url('image.png');
background-image: url('icon.svg');

/* Fonts */
@font-face {
  src: url('font.woff2');
}

/* Imports */
@import url('other-styles.css');
```

## Implementation Architecture

### Phase 1: Resource Discovery
**Goal**: Find all external resources referenced by the page

```typescript
interface ResourceReference {
  type: 'stylesheet' | 'script' | 'image' | 'font' | 'media';
  url: string;           // Original URL
  element?: string;      // HTML element that references it
  source: 'html' | 'css'; // Where it was found
}

class ResourceDiscovery {
  // Browser-side: Find all resource references in DOM
  async discoverResources(): Promise<ResourceReference[]> {
    const resources: ResourceReference[] = [];

    // 1. Stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      resources.push({
        type: 'stylesheet',
        url: link.href,
        element: 'link',
        source: 'html'
      });
    });

    // 2. Scripts
    document.querySelectorAll('script[src]').forEach(script => {
      resources.push({
        type: 'script',
        url: script.src,
        element: 'script',
        source: 'html'
      });
    });

    // 3. Images
    document.querySelectorAll('img[src]').forEach(img => {
      resources.push({
        type: 'image',
        url: img.src,
        element: 'img',
        source: 'html'
      });
    });

    // 4. CSS background images (from computed styles)
    // ... more discovery logic

    return resources;
  }
}
```

### Phase 2: Resource Download
**Goal**: Download and store resources with content-based hashing

```typescript
class ResourceDownloader {
  private resourceCache = new Map<string, string>(); // url → hash
  private resourceDir: string;

  async downloadResource(url: string): Promise<string> {
    // 1. Check cache
    if (this.resourceCache.has(url)) {
      return this.resourceCache.get(url)!;
    }

    // 2. Download resource
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');

    // 3. Generate content hash
    const hash = this.generateHash(buffer);
    const extension = this.getExtension(contentType, url);
    const filename = `${hash}${extension}`;

    // 4. Save to resources directory
    const resourcePath = path.join(this.resourceDir, filename);
    fs.writeFileSync(resourcePath, Buffer.from(buffer));

    // 5. Cache mapping
    this.resourceCache.set(url, filename);

    // 6. If CSS, parse for nested resources
    if (contentType?.includes('text/css')) {
      await this.parseCSS(buffer.toString('utf-8'), url);
    }

    return filename;
  }

  private async parseCSS(cssContent: string, baseUrl: string): Promise<void> {
    // Find url(...) in CSS
    const urlPattern = /url\(['"]?([^'")]+)['"]?\)/g;
    let match;

    while ((match = urlPattern.exec(cssContent)) !== null) {
      const resourceUrl = new URL(match[1], baseUrl).href;
      await this.downloadResource(resourceUrl);
    }
  }
}
```

### Phase 3: URL Rewriting
**Goal**: Rewrite HTML to reference local resource files

```typescript
class URLRewriter {
  async rewriteHTML(html: string, resourceMap: Map<string, string>): Promise<string> {
    let rewrittenHTML = html;

    // 1. Rewrite stylesheet URLs
    rewrittenHTML = rewrittenHTML.replace(
      /<link([^>]+)rel=["']stylesheet["']([^>]+)href=["']([^"']+)["']/g,
      (match, before, middle, href) => {
        const localPath = resourceMap.get(href);
        if (localPath) {
          return `<link${before}rel="stylesheet"${middle}href="resources/${localPath}"`;
        }
        return match;
      }
    );

    // 2. Rewrite script URLs
    rewrittenHTML = rewrittenHTML.replace(
      /<script([^>]+)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const localPath = resourceMap.get(src);
        if (localPath) {
          return `<script${attrs}src="resources/${localPath}"`;
        }
        return match;
      }
    );

    // 3. Rewrite image URLs
    rewrittenHTML = rewrittenHTML.replace(
      /<img([^>]+)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const localPath = resourceMap.get(src);
        if (localPath) {
          return `<img${attrs}src="resources/${localPath}"`;
        }
        return match;
      }
    );

    // ... more rewrites for other resource types

    return rewrittenHTML;
  }

  async rewriteCSS(css: string, resourceMap: Map<string, string>): Promise<string> {
    return css.replace(
      /url\(['"]?([^'")]+)['"]?\)/g,
      (match, url) => {
        const localPath = resourceMap.get(url);
        if (localPath) {
          return `url('resources/${localPath}')`;
        }
        return match;
      }
    );
  }
}
```

### Phase 4: Integration with SessionRecorder

```typescript
class SessionRecorder {
  private resourceDownloader: ResourceDownloader;
  private urlRewriter: URLRewriter;

  async start(page: Page): Promise<void> {
    // ... existing setup

    // Initialize resource handling
    this.resourceDownloader = new ResourceDownloader(
      path.join(this.sessionDir, 'resources')
    );
    this.urlRewriter = new URLRewriter();

    // Inject resource discovery code
    await page.addInitScript(resourceDiscoveryCode);
  }

  private async _handleActionBefore(data: any): Promise<void> {
    // 1. Get HTML snapshot
    const html = data.beforeHtml;

    // 2. Discover resources
    const resources = await this.page.evaluate(() => {
      return window.__resourceDiscovery.discoverResources();
    });

    // 3. Download resources
    const resourceMap = new Map<string, string>();
    for (const resource of resources) {
      const localPath = await this.resourceDownloader.downloadResource(resource.url);
      resourceMap.set(resource.url, localPath);
    }

    // 4. Rewrite URLs in HTML
    const rewrittenHTML = await this.urlRewriter.rewriteHTML(html, resourceMap);

    // 5. Save rewritten HTML
    const snapshotPath = path.join(this.sessionDir, 'snapshots', `${actionId}-before.html`);
    fs.writeFileSync(snapshotPath, rewrittenHTML, 'utf-8');

    // ... continue with screenshot and other captures
  }
}
```

## Output Structure

```
output/
└── session-{id}/
    ├── session.json          # Session metadata
    ├── snapshots/            # HTML snapshots (URLs rewritten)
    │   ├── action-1-before.html
    │   ├── action-1-after.html
    ├── screenshots/          # PNG screenshots
    │   ├── action-1-before.png
    │   ├── action-1-after.png
    └── resources/            # All external assets
        ├── abc123.css        # Stylesheets
        ├── def456.js         # JavaScript bundles
        ├── ghi789.png        # Images
        ├── jkl012.woff2      # Fonts
        └── mno345.svg        # Icons
```

## Performance Considerations

### 1. Deduplication
- Use content hashing to avoid downloading the same resource multiple times
- Share resources across multiple snapshots in the same session

### 2. Parallel Downloads
- Download resources in parallel for better performance
- Use connection pooling and rate limiting

### 3. Selective Capture
- Option to exclude certain resource types (e.g., skip JS bundles for smaller output)
- Option to set size limits (e.g., skip resources > 10MB)

### 4. Caching
- Cache resource mappings within a session
- Reuse resources across before/after snapshots

## Security Considerations

### 1. CORS and Authentication
- Some resources may require authentication or have CORS restrictions
- Use Playwright's context to maintain cookies and auth tokens
- Handle 403/401 errors gracefully

### 2. Malicious Resources
- Validate content types before saving
- Scan for potentially malicious content
- Implement size limits to prevent DoS

### 3. Privacy
- Be careful with sensitive data in resources (API keys, tokens)
- Option to exclude certain domains/patterns

## Testing Strategy

### Test Cases
1. **Simple page** with local CSS/JS
2. **CDN resources** (fonts.googleapis.com, cdn.jsdelivr.net)
3. **SPA with chunked JS** (Angular, React, Vue)
4. **Image-heavy pages** (photo galleries)
5. **CSS with nested resources** (fonts, background images)
6. **Data URLs and inline resources**

### Validation
- Open saved snapshot in browser
- Verify all styles are applied
- Verify all images are displayed
- Verify fonts are loaded
- Check resource directory for expected files

## Implementation Priority

### POC 2a - Basic Asset Capture
- ✅ Resource discovery (CSS, JS, images)
- ✅ Resource download
- ✅ URL rewriting in HTML
- ✅ Resource deduplication

### POC 2b - Advanced Asset Capture
- ✅ CSS parsing for nested resources
- ✅ Font capture
- ✅ srcset and responsive images
- ✅ Shadow DOM resources

### POC 2c - Optimization
- ✅ Parallel downloads
- ✅ Size limits and filtering
- ✅ Compression (optional)

## References

- Playwright Trace Format: https://github.com/microsoft/playwright/tree/main/packages/trace
- Web Archive (HAR) Format: https://w3c.github.io/web-performance/specs/HAR/Overview.html
- Content Security Policy considerations
