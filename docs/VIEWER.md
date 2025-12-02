# Session Viewer - Web UI for Browsing Recorded Sessions

The Session Viewer is an Express-based web application for browsing and viewing recorded browser sessions with a user-friendly interface.

## Features

✅ **Session List**: Browse all recorded sessions with metadata
✅ **Action Timeline**: View all actions in a session with before/after snapshots
✅ **Screenshot Gallery**: Visual comparison of before/after states
✅ **Clickable Snapshots**: Click screenshots to view full HTML snapshots with resources
✅ **Resource Serving**: Automatically serves HTML snapshots, screenshots, and captured resources

## Usage

### Start the Viewer

```bash
npm run viewer
```

The viewer will start on **http://localhost:3000**

### Browse Sessions

1. **Home Page** (`http://localhost:3000`):
   - Lists all recorded sessions
   - Shows session metadata: start time, duration, action count, resource count
   - Click any session to view details

2. **Session Detail Page** (`/session/:sessionId`):
   - Displays all actions in chronological order
   - Before/After screenshot comparison
   - Click screenshots to view full HTML snapshots
   - Session summary with timestamps and counts

3. **HTML Snapshots**:
   - Click any screenshot to open the full HTML snapshot in a new tab
   - All resources (CSS, JS, images, fonts) load automatically via URL rewriting

## Architecture

### Server Routes

| Route | Purpose |
|-------|---------|
| `GET /` | Home page - list all sessions |
| `GET /session/:sessionId` | Session detail page |
| `GET /session/:sessionId/snapshot/:filename` | Serve HTML snapshots |
| `GET /session/:sessionId/screenshot/:filename` | Serve screenshots |
| `GET /session/:sessionId/resources/:filename` | Serve captured resources |
| `GET /session/:sessionId/data` | Session JSON data |

### File Structure

```
dist/
├── src/
│   └── viewer/
│       └── server.js       # Viewer server
└── output/                 # Sessions directory
    └── session-{id}/
        ├── session.json    # Metadata
        ├── snapshots/      # HTML files
        ├── screenshots/    # PNG files
        └── resources/      # Captured assets
```

## Configuration

### Custom Port

```javascript
// Create custom viewer
const { SessionViewer } = require('./dist/src/viewer/server');
const viewer = new SessionViewer({ port: 8080 });
viewer.start();
```

### Custom Output Directory

```javascript
const viewer = new SessionViewer({
  port: 3000,
  outputDir: '/path/to/sessions'
});
viewer.start();
```

## Screenshot Gallery

The viewer displays before/after screenshots for each action:

- **Before**: State before user interaction
- **After**: State after user interaction
- **Click**: Opens full HTML snapshot in new tab
- **Hover**: Slight zoom effect for better visibility

## URL Rewriting Integration

The viewer works seamlessly with URL-rewritten HTML snapshots:

1. HTML snapshots contain rewritten URLs pointing to `../resources/`
2. When viewing snapshots through the viewer, resources load via Express routes
3. When opening snapshots directly in browser, resources load via relative paths
4. Both approaches work because URL rewriting makes snapshots self-contained

## Example Session

### Home Page
```
🎬 Session Viewer

┌─────────────────────────────────────┐
│ poc-test-2                          │
├─────────────────────────────────────┤
│ Started: 12/2/2024, 7:31:15 AM      │
│ Duration: 5.2s                      │
│ Actions: 17                         │
│ Resources: 1                        │
└─────────────────────────────────────┘
```

### Session Detail Page
```
Session: poc-test-2

Action 1: click
┌───────────────┬───────────────┐
│   Before      │    After      │
├───────────────┼───────────────┤
│  [Screenshot] │  [Screenshot] │
│  Click to view│  Click to view│
└───────────────┴───────────────┘
```

## Development

### Adding New Features

The viewer can be extended with:
- Timeline view (horizontal action timeline)
- Diff view (visual diff between before/after)
- Search/filter actions
- Export session as ZIP
- Side-by-side HTML comparison

### File Organization

```typescript
src/viewer/
├── server.ts          # Main server code
└── static/            # Future: CSS, JS, images for viewer UI
    ├── style.css
    └── app.js
```

## Comparison: Viewer vs Direct File Access

| Feature | Web Viewer | Direct File Access |
|---------|------------|-------------------|
| **Browse Sessions** | ✅ Visual list | ❌ File explorer |
| **View Screenshots** | ✅ Gallery | ❌ Open individually |
| **Navigate Actions** | ✅ Timeline | ❌ Manual |
| **HTML Snapshots** | ✅ One click | ✅ Open in browser |
| **Resources** | ✅ Auto-served | ✅ Via URL rewriting |
| **Requires Server** | ✅ Yes | ❌ No |
| **Portable** | ❌ Needs Node | ✅ Just files |

## Troubleshooting

### Port Already in Use

```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Use a different port

```bash
# Option 1: Kill process on port 3000
npx kill-port 3000

# Option 2: Use different port (requires code change)
```

### Sessions Not Showing

**Check Output Directory**:
```bash
ls -la dist/output/
```

**Verify Session Structure**:
```bash
ls -la dist/output/session-id/
# Should contain: session.json, snapshots/, screenshots/, resources/
```

### Resources Not Loading

**Verify Resource Files**:
```bash
ls -la dist/output/session-id/resources/
```

**Check Browser Console**: Look for 404 errors on resource requests

## Future Enhancements

- 🎨 **Rich UI**: React/Vue frontend with modern design
- 🔍 **Search**: Search actions by type, timestamp, URL
- 📊 **Analytics**: Session statistics and visualizations
- 🎞️ **Playback**: Animated replay of user actions
- 📥 **Export**: Export sessions as ZIP or share links
- 🔄 **Live View**: Watch sessions being recorded in real-time
- 🎯 **Filtering**: Filter by action type, timestamp range
- 📱 **Mobile**: Responsive design for mobile viewing

## Integration with Playwright Trace Viewer

Our viewer provides a simpler alternative to Playwright's trace viewer:

| Feature | Our Viewer | Playwright Trace Viewer |
|---------|------------|------------------------|
| **Setup** | `npm run viewer` | `npx playwright show-trace` |
| **Port** | 3000 (configurable) | Random port |
| **UI** | Simple, clean | Feature-rich, complex |
| **Focus** | User actions | All Playwright events |
| **Resources** | URL rewriting | Dynamic serving |
| **Offline** | HTML files work | Requires trace viewer |

## Conclusion

The Session Viewer provides an easy way to browse and inspect recorded browser sessions without manually navigating file systems. Combined with URL rewriting, it offers both convenience (web UI) and portability (direct file access).
