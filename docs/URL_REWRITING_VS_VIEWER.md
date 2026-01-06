# URL Rewriting vs Trace Viewer - Two Approaches

## The Problem

Our captured HTML files reference original URLs:
```html
<link href="https://material.angular.dev/styles.css">
<script src="https://material.angular.dev/main.js">
<img src="https://material.angular.dev/logo.png">
```

But resources are stored locally with SHA1 names:
```
resources/
├── 65dddf0b98f74a6ae7df195f3726bcb1b562ec98.css
├── 1faa606cd6aed5a114aa413aa77493eb0ad84bb4.js
└── 306d8e7b63648edd55c04e097b37fd56eb21246b.png
```

**Result**: Opening HTML files directly doesn't work - resources fail to load!

## How Playwright Solves This

Playwright uses **Approach 2: Trace Viewer Web App**

### Playwright Trace Viewer Architecture

1. **HTTP Server** (`npx playwright show-trace trace.zip`)
   - Starts local web server (usually on localhost:random-port)
   - Serves HTML snapshots dynamically
   - Serves resources from resources/ directory

2. **Resource Mapping**
   - Maintains URL → SHA1 map from network HAR entries
   - When HTML requests `https://example.com/styles.css`
   - Viewer looks up SHA1, serves `resources/{sha1}.css`

3. **Dynamic HTML Injection**
   - Viewer can inject service worker or base tags
   - Rewrites URLs on-the-fly as HTML is served
   - Resources served through viewer's routes

## Two Approaches for Our Implementation

### Approach 1: URL Rewriting (Offline-First)

**Concept**: Rewrite URLs in HTML/CSS files to point to local resources

**Pros**:
- ✅ Works offline (no server needed)
- ✅ Simple to view (just open HTML file)
- ✅ Can commit to git and share easily
- ✅ Portable (zip folder = complete snapshot)

**Cons**:
- ❌ Must parse and rewrite HTML
- ❌ Must parse and rewrite CSS for nested resources
- ❌ Complex URL resolution (relative vs absolute)
- ❌ May break dynamic content loading

**Implementation**:
```typescript
class URLRewriter {
  private urlToSha1Map = new Map<string, string>();

  // Build map during resource capture
  async captureResource(url: string, buffer: Buffer, extension: string) {
    const sha1 = calculateSha1(buffer);
    const filename = `${sha1}${extension}`;
    this.urlToSha1Map.set(url, filename);
    fs.writeFileSync(path.join(resourcesDir, filename), buffer);
  }

  // Rewrite HTML before saving
  async rewriteHTML(html: string): Promise<string> {
    let rewritten = html;

    // Rewrite <link> tags
    rewritten = rewritten.replace(
      /<link([^>]+)href=["']([^"']+)["']/g,
      (match, attrs, href) => {
        const sha1 = this.urlToSha1Map.get(href);
        return sha1 ? `<link${attrs}href="../resources/${sha1}"` : match;
      }
    );

    // Rewrite <script> tags
    rewritten = rewritten.replace(
      /<script([^>]+)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const sha1 = this.urlToSha1Map.get(src);
        return sha1 ? `<script${attrs}src="../resources/${sha1}"` : match;
      }
    );

    // Rewrite <img> tags
    rewritten = rewritten.replace(
      /<img([^>]+)src=["']([^"']+)["']/g,
      (match, attrs, src) => {
        const sha1 = this.urlToSha1Map.get(src);
        return sha1 ? `<img${attrs}src="../resources/${sha1}"` : match;
      }
    );

    // TODO: Rewrite CSS url() references
    // TODO: Rewrite <source>, <video>, <audio>, etc.

    return rewritten;
  }

  // Also need to rewrite CSS files
  async rewriteCSS(css: string): Promise<string> {
    return css.replace(
      /url\(['"]?([^'")]+)['"]?\)/g,
      (match, url) => {
        const sha1 = this.urlToSha1Map.get(url);
        return sha1 ? `url('../resources/${sha1}')` : match;
      }
    );
  }
}
```

**Usage**:
```typescript
// During capture
await page.goto('https://material.angular.dev');

// Wait for resources to load
await page.waitForLoadState('networkidle');

// Capture with rewriting
const html = await page.content();
const rewrittenHTML = await rewriter.rewriteHTML(html);
fs.writeFileSync('snapshots/action-1-before.html', rewrittenHTML);

// Now you can just open the HTML file in a browser!
```

### Approach 2: Trace Viewer Web App (Dynamic Serving)

**Concept**: Build a simple web server that serves snapshots and resources dynamically

**Pros**:
- ✅ No HTML modification needed
- ✅ Exact behavior like Playwright
- ✅ Can serve resources on-demand
- ✅ Easier to implement initially
- ✅ Can add features (time travel, diff view, etc.)

**Cons**:
- ❌ Requires running a server
- ❌ Not portable (can't just open HTML file)
- ❌ Sharing requires zipping entire folder
- ❌ More complex deployment

**Implementation**:
```typescript
import express from 'express';
import path from 'path';
import fs from 'fs';

interface ResourceMap {
  [url: string]: string; // URL → SHA1 filename
}

class TraceViewerServer {
  private app = express();
  private sessionDir: string;
  private resourceMap: ResourceMap;

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
    this.resourceMap = this.loadResourceMap();
    this.setupRoutes();
  }

  private loadResourceMap(): ResourceMap {
    // Load session.json to get resource URLs and SHA1s
    const sessionPath = path.join(this.sessionDir, 'session.json');
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

    // Build map from HAR entries or resource metadata
    const map: ResourceMap = {};
    // TODO: Build map from network capture data
    return map;
  }

  private setupRoutes() {
    // Serve snapshots
    this.app.get('/snapshot/:actionId/:when', (req, res) => {
      const { actionId, when } = req.params;
      const htmlPath = path.join(
        this.sessionDir,
        'snapshots',
        `${actionId}-${when}.html`
      );

      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send('Snapshot not found');
      }

      // Read HTML
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Inject <base> tag to redirect resources through our server
      html = html.replace(
        '<head>',
        `<head>\n  <base href="http://localhost:${this.port}/">\n  <script>
          // Intercept fetch/XHR to redirect to our resource server
          const originalFetch = window.fetch;
          window.fetch = function(url, options) {
            // Rewrite URL to use our resource server
            const rewrittenURL = '/resource?url=' + encodeURIComponent(url);
            return originalFetch(rewrittenURL, options);
          };
        </script>`
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // Serve resources by URL lookup
    this.app.get('/resource', (req, res) => {
      const originalURL = req.query.url as string;
      const sha1 = this.resourceMap[originalURL];

      if (!sha1) {
        return res.status(404).send('Resource not found');
      }

      const resourcePath = path.join(this.sessionDir, 'resources', sha1);
      if (!fs.existsSync(resourcePath)) {
        return res.status(404).send('Resource file not found');
      }

      // Determine content type from extension
      const ext = path.extname(sha1);
      const contentType = this.getContentType(ext);
      res.setHeader('Content-Type', contentType);
      res.sendFile(resourcePath);
    });

    // Serve screenshots
    this.app.get('/screenshot/:filename', (req, res) => {
      const screenshotPath = path.join(
        this.sessionDir,
        'screenshots',
        req.params.filename
      );
      res.sendFile(screenshotPath);
    });

    // Serve session metadata
    this.app.get('/session.json', (req, res) => {
      const sessionPath = path.join(this.sessionDir, 'session.json');
      res.sendFile(sessionPath);
    });

    // Serve viewer UI (optional - could be a React app)
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Session Viewer</title>
          </head>
          <body>
            <h1>Session Viewer</h1>
            <div id="actions"></div>
            <script>
              fetch('/session.json')
                .then(r => r.json())
                .then(session => {
                  const div = document.getElementById('actions');
                  session.actions.forEach(action => {
                    const link = document.createElement('a');
                    link.href = '/snapshot/' + action.id + '/before';
                    link.textContent = action.type + ' at ' + action.timestamp;
                    div.appendChild(link);
                    div.appendChild(document.createElement('br'));
                  });
                });
            </script>
          </body>
        </html>
      `);
    });
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.json': 'application/json',
    };
    return types[ext] || 'application/octet-stream';
  }

  start(port: number = 3000) {
    this.port = port;
    this.app.listen(port, () => {
      console.log(`Session viewer running at http://localhost:${port}`);
    });
  }

  private port: number = 3000;
}
```

**Usage**:
```bash
# Start viewer
npm run view output/spa-test-angular-material

# Opens browser to http://localhost:3000
# Shows list of actions
# Click to view snapshots with all resources working!
```

## Recommendation

**Start with Approach 1 (URL Rewriting)** for these reasons:

1. **Simpler for end users** - Just open HTML file, no server needed
2. **Better for demos** - Zip folder, share, anyone can open
3. **Easier testing** - No server infrastructure to maintain
4. **Portable** - Works offline, can commit to git

**Then optionally add Approach 2 later** for:
- Enhanced viewer UI (timeline, diff view, search)
- Real-time recording viewer
- Multi-session comparison

## Implementation Plan

### Phase 1: URL Rewriting (POC 2a)
1. Build URL → SHA1 map during resource capture
2. Implement HTML rewriting for:
   - `<link href>`
   - `<script src>`
   - `<img src>`
   - `<source srcset>`
3. Implement CSS rewriting for `url()`
4. Test with simple page
5. Test with SPA (material.angular.dev)

### Phase 2: Trace Viewer (POC 3 - optional)
1. Create Express server
2. Implement resource serving routes
3. Build simple viewer UI
4. Add screenshot viewer
5. Add action timeline

### Phase 3: Advanced Features (POC 4 - optional)
1. Time travel debugging
2. DOM diff viewer
3. Network waterfall
4. Console log viewer
5. Multiple session comparison
