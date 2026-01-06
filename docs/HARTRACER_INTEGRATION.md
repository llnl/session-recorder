# HarTracer Integration for Asset Capture

## Discovery

Playwright **already has** automatic asset capture via `HarTracer`! We don't need to build resource discovery and download from scratch.

## How HarTracer Works

### Network Interception
```typescript
// Located in: packages/playwright-core/src/server/har/harTracer.ts

class HarTracer {
  start() {
    // Listen to network events
    this._eventListeners = [
      eventsHelper.addEventListener(apiRequest, APIRequestContext.Events.Request, ...),
      eventsHelper.addEventListener(apiRequest, APIRequestContext.Events.RequestFinished, ...),
    ];
  }

  private _onResponse(response: network.Response) {
    // When response arrives, get the body
    const promise = response.body().then(buffer => {
      // Calculate content hash with extension
      const sha1 = calculateSha1(buffer) + '.' + (mime.getExtension(content.mimeType) || 'dat');

      // Save via delegate
      this._delegate.onContentBlob(sha1, buffer);
    });
  }
}
```

### Automatic Resource Capture
**HarTracer captures ALL network traffic:**
- ✅ Stylesheets (.css)
- ✅ JavaScript bundles (.js)
- ✅ Images (.png, .jpg, .svg, .webp, etc.)
- ✅ Fonts (.woff, .woff2, .ttf, etc.)
- ✅ Videos, audio, PDFs
- ✅ API responses (JSON, XML, etc.)
- ✅ Nested resources (CSS → fonts, images)

**No parsing needed!** The browser's network stack tells us exactly what was loaded.

### Content-Based Storage
```typescript
// From: packages/playwright-core/src/server/trace/recorder/tracing.ts

private _appendResource(sha1: string, buffer: Buffer) {
  if (this._allResources.has(sha1))
    return; // Deduplication
  this._allResources.add(sha1);
  const resourcePath = path.join(this._state!.resourcesDir, sha1);
  this._fs.writeFile(resourcePath, buffer, true /* skipIfExists */);
}
```

**Benefits:**
- Content-based deduplication (same resource loaded multiple times = stored once)
- Automatic file extension based on MIME type
- No URL rewriting needed (trace viewer handles it)

## Integration with SessionRecorder

### Option 1: Use HarTracer Directly

```typescript
import { HarTracer } from '@playwright/test'; // Need to export from Playwright
import type { HarTracerDelegate } from '@playwright/test';

class SessionRecorder implements HarTracerDelegate {
  private harTracer: HarTracer;
  private resourcesDir: string;

  async start(page: Page): Promise<void> {
    this.page = page;

    // Create resources directory
    this.resourcesDir = path.join(this.sessionDir, 'resources');
    fs.mkdirSync(this.resourcesDir, { recursive: true });

    // Initialize HarTracer
    this.harTracer = new HarTracer(
      page.context(),
      page,
      this, // SessionRecorder implements HarTracerDelegate
      {
        content: 'attach',           // Save content as separate files
        includeTraceInfo: true,      // Include SHA1 in HAR entries
        recordRequestOverrides: false,
        waitForContentOnStop: false,
        omitScripts: false,          // Capture JS bundles
      }
    );

    // Start capturing network traffic
    this.harTracer.start({ omitScripts: false });

    // ... rest of injection code
  }

  // Implement HarTracerDelegate interface
  onEntryStarted(entry: har.Entry): void {
    // Optional: Track when requests start
  }

  onEntryFinished(entry: har.Entry): void {
    // Optional: Store HAR entry metadata
    // entry.response.content._sha1 contains the resource filename
  }

  onContentBlob(sha1: string, buffer: Buffer): void {
    // Save resource to disk
    const resourcePath = path.join(this.resourcesDir, sha1);
    if (!fs.existsSync(resourcePath)) {
      fs.writeFileSync(resourcePath, buffer);
      console.log(`📦 Saved resource: ${sha1} (${buffer.length} bytes)`);
    }
  }
}
```

### Option 2: Copy HarTracer Code

If we can't import HarTracer directly, copy the implementation:

```
session-recorder/
├── src/
│   ├── node/
│   │   ├── SessionRecorder.ts
│   │   ├── HarTracer.ts        ← Copy from Playwright
│   │   └── types.ts
│   └── browser/
│       └── ...
```

**Files to copy:**
- `packages/playwright-core/src/server/har/harTracer.ts`
- `packages/playwright-core/src/utils/calculateSha1.ts`
- `packages/trace/src/har.ts` (types)

## Output Structure with Resources

```
output/
└── session-{id}/
    ├── session.json          # Metadata + HAR entries
    ├── snapshots/            # HTML snapshots (no URL rewriting needed)
    │   ├── action-1-before.html
    │   ├── action-1-after.html
    ├── screenshots/          # PNG screenshots
    │   ├── action-1-before.png
    │   ├── action-1-after.png
    └── resources/            # All network resources (content-addressed)
        ├── a1b2c3.css        # Stylesheet (SHA1 hash)
        ├── d4e5f6.js         # JavaScript bundle
        ├── g7h8i9.png        # Image
        ├── j1k2l3.woff2      # Font
        └── ... (all assets)
```

## Viewing the Snapshots

### Option 1: Playwright Trace Viewer
If we save in Playwright's trace format, we can use the existing trace viewer:

```bash
npx playwright show-trace output/session-{id}/trace.zip
```

### Option 2: Custom Viewer
Build a simple viewer that:
1. Loads the HTML snapshot
2. Serves resources from the `resources/` directory
3. Maps SHA1 references to local files

```typescript
// Simple Express server for viewing
app.get('/snapshot/:actionId/:when', (req, res) => {
  const html = fs.readFileSync(`snapshots/${req.params.actionId}-${req.params.when}.html`, 'utf-8');
  res.send(html);
});

app.get('/resources/:sha1', (req, res) => {
  const resource = fs.readFileSync(`resources/${req.params.sha1}`);
  res.setHeader('Content-Type', getMimeType(req.params.sha1));
  res.send(resource);
});
```

## Testing with material.angular.dev

With HarTracer integration, when we navigate to `material.angular.dev`:

```bash
npm run build
npm run test:spa
```

**Expected Results:**
- ✅ All CSS files captured
- ✅ All JS bundles captured
- ✅ All images and icons captured
- ✅ All fonts captured
- ✅ Snapshots are fully functional when viewed
- ✅ No broken assets

**Resources directory will contain:**
```
resources/
├── abc123.css  (Angular Material styles)
├── def456.js   (Angular framework bundle)
├── ghi789.js   (Angular Material components)
├── jkl012.woff2 (Roboto font)
├── mno345.svg   (Material icons)
└── ... (100+ files for a typical Angular app)
```

## Implementation Steps

1. **Import HarTracer** (or copy code)
   ```typescript
   import { HarTracer } from '@playwright/test';
   ```

2. **Implement HarTracerDelegate in SessionRecorder**
   ```typescript
   class SessionRecorder implements HarTracerDelegate {
     onContentBlob(sha1: string, buffer: Buffer): void { ... }
   }
   ```

3. **Initialize and start HarTracer**
   ```typescript
   this.harTracer = new HarTracer(context, page, this, options);
   this.harTracer.start({ omitScripts: false });
   ```

4. **Store HAR entries in session.json**
   ```typescript
   onEntryFinished(entry: har.Entry): void {
     this.sessionData.harEntries.push(entry);
   }
   ```

5. **Test with real SPA**
   ```bash
   npm run test:spa
   ```

## Benefits Over Custom Implementation

| Feature | Custom Parsing | HarTracer |
|---------|----------------|-----------|
| Discovery | Parse HTML/CSS manually | Automatic via network |
| Download | Implement fetching | Built-in |
| Nested resources | Recursive parsing | Automatic |
| Deduplication | Custom logic | Content-addressed |
| CORS handling | Manual | Playwright context |
| Auth | Manual | Inherit from context |
| Timing | Custom tracking | Built-in HAR timing |
| **Complexity** | **~500 lines** | **~50 lines** |
| **Maintenance** | **High** | **Low** |

## Conclusion

**Use HarTracer!** It's battle-tested, handles edge cases, and saves us from implementing complex resource discovery and download logic.

All we need to do is:
1. Instantiate HarTracer with our SessionRecorder as delegate
2. Implement `onContentBlob()` to save resources
3. Optionally store HAR entries for network metadata

Total implementation: **~50 lines of code** vs **~500 lines** for custom solution.
