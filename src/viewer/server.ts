/**
 * Session Viewer - Express server for browsing recorded sessions
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface ViewerOptions {
  port?: number;
  outputDir?: string;
}

export class SessionViewer {
  private app = express();
  private port: number;
  private outputDir: string;

  constructor(options: ViewerOptions = {}) {
    this.port = options.port || 3000;
    // Default to dist/output when running from compiled code (dist/src/viewer -> dist/output)
    this.outputDir = options.outputDir || path.join(__dirname, '../../output');
    this.setupRoutes();
  }

  private setupRoutes() {
    // Serve static assets
    this.app.use('/static', express.static(path.join(__dirname, 'static')));

    // Home page - list all sessions
    this.app.get('/', (req, res) => {
      const sessions = this.listSessions();
      res.send(this.renderHomePage(sessions));
    });

    // Session detail page - show all actions
    this.app.get('/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      const sessionDir = path.join(this.outputDir, sessionId);

      if (!fs.existsSync(sessionDir)) {
        return res.status(404).send('Session not found');
      }

      const sessionData = this.loadSessionData(sessionDir);
      res.send(this.renderSessionPage(sessionId, sessionData));
    });

    // Serve HTML snapshots
    this.app.get('/session/:sessionId/snapshot/:filename', (req, res) => {
      const { sessionId, filename } = req.params;
      const snapshotPath = path.join(this.outputDir, sessionId, 'snapshots', filename);

      if (!fs.existsSync(snapshotPath)) {
        return res.status(404).send('Snapshot not found');
      }

      res.sendFile(snapshotPath);
    });

    // Serve screenshots
    this.app.get('/session/:sessionId/screenshot/:filename', (req, res) => {
      const { sessionId, filename } = req.params;
      const screenshotPath = path.join(this.outputDir, sessionId, 'screenshots', filename);

      if (!fs.existsSync(screenshotPath)) {
        return res.status(404).send('Screenshot not found');
      }

      res.sendFile(screenshotPath);
    });

    // Serve resources
    this.app.get('/session/:sessionId/resources/:filename', (req, res) => {
      const { sessionId, filename } = req.params;
      const resourcePath = path.join(this.outputDir, sessionId, 'resources', filename);

      if (!fs.existsSync(resourcePath)) {
        return res.status(404).send('Resource not found');
      }

      // Set content type based on extension
      const ext = path.extname(filename);
      const contentType = this.getContentType(ext);
      res.setHeader('Content-Type', contentType);
      res.sendFile(resourcePath);
    });

    // Serve session.json
    this.app.get('/session/:sessionId/data', (req, res) => {
      const { sessionId } = req.params;
      const sessionPath = path.join(this.outputDir, sessionId, 'session.json');

      if (!fs.existsSync(sessionPath)) {
        return res.status(404).send('Session data not found');
      }

      res.sendFile(sessionPath);
    });
  }

  private listSessions(): Array<{id: string; path: string; data: any}> {
    if (!fs.existsSync(this.outputDir)) {
      return [];
    }

    const dirs = fs.readdirSync(this.outputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    return dirs.map(id => {
      const sessionDir = path.join(this.outputDir, id);
      const data = this.loadSessionData(sessionDir);
      return { id, path: sessionDir, data };
    }).filter(session => session.data !== null);
  }

  private loadSessionData(sessionDir: string): any {
    const sessionPath = path.join(sessionDir, 'session.json');
    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.json': 'application/json',
    };
    return types[ext] || 'application/octet-stream';
  }

  private renderHomePage(sessions: Array<{id: string; path: string; data: any}>): string {
    const sessionList = sessions.map(session => {
      const duration = session.data.endTime
        ? ((new Date(session.data.endTime).getTime() - new Date(session.data.startTime).getTime()) / 1000).toFixed(1)
        : 'N/A';

      return `
        <div class="session-card">
          <h3><a href="/session/${session.id}">${session.id}</a></h3>
          <div class="session-meta">
            <div><strong>Started:</strong> ${new Date(session.data.startTime).toLocaleString()}</div>
            <div><strong>Duration:</strong> ${duration}s</div>
            <div><strong>Actions:</strong> ${session.data.actions.length}</div>
            <div><strong>Resources:</strong> ${session.data.resources?.length || 0}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Session Viewer</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h1 { margin: 0; color: #333; }
    .subtitle { color: #666; margin-top: 5px; }
    .sessions { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .session-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .session-card h3 { margin: 0 0 15px 0; }
    .session-card h3 a { color: #4CAF50; text-decoration: none; }
    .session-card h3 a:hover { text-decoration: underline; }
    .session-meta div { margin: 5px 0; color: #666; font-size: 14px; }
    .empty { text-align: center; padding: 40px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 Session Viewer</h1>
    <div class="subtitle">Browse recorded browser sessions</div>
  </div>

  ${sessions.length > 0
    ? `<div class="sessions">${sessionList}</div>`
    : `<div class="empty">No sessions recorded yet. Run tests to create sessions.</div>`
  }
</body>
</html>
    `;
  }

  private renderSessionPage(sessionId: string, sessionData: any): string {
    const actionsList = sessionData.actions.map((action: any, index: number) => `
      <div class="action-card">
        <div class="action-header">
          <h3>Action ${index + 1}: ${action.type}</h3>
          <div class="action-time">${new Date(action.timestamp).toLocaleString()}</div>
        </div>

        <div class="snapshots">
          <div class="snapshot">
            <h4>Before</h4>
            <a href="/session/${sessionId}/snapshot/${action.before.html.split('/')[1]}" target="_blank">
              <img src="/session/${sessionId}/screenshot/${action.before.screenshot.split('/')[1]}" alt="Before">
            </a>
            <div class="snapshot-meta">
              <div><strong>URL:</strong> ${action.before.url}</div>
              <div><strong>Viewport:</strong> ${action.before.viewport.width}x${action.before.viewport.height}</div>
            </div>
          </div>

          <div class="snapshot">
            <h4>After</h4>
            <a href="/session/${sessionId}/snapshot/${action.after.html.split('/')[1]}" target="_blank">
              <img src="/session/${sessionId}/screenshot/${action.after.screenshot.split('/')[1]}" alt="After">
            </a>
            <div class="snapshot-meta">
              <div><strong>URL:</strong> ${action.after.url}</div>
              <div><strong>Viewport:</strong> ${action.after.viewport.width}x${action.after.viewport.height}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Session: ${sessionId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h1 { margin: 0; color: #333; }
    .back-link { display: inline-block; margin-bottom: 10px; color: #4CAF50; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .session-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
    .info-item { color: #666; font-size: 14px; }
    .action-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .action-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    .action-header h3 { margin: 0; color: #333; }
    .action-time { color: #999; font-size: 14px; }
    .snapshots { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .snapshot { text-align: center; }
    .snapshot h4 { margin: 0 0 10px 0; color: #666; }
    .snapshot img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: transform 0.2s; }
    .snapshot img:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .snapshot-meta { text-align: left; margin-top: 10px; font-size: 12px; color: #666; }
    .snapshot-meta div { margin: 3px 0; }
  </style>
</head>
<body>
  <a href="/" class="back-link">← Back to Sessions</a>

  <div class="header">
    <h1>Session: ${sessionId}</h1>
    <div class="session-info">
      <div class="info-item"><strong>Started:</strong> ${new Date(sessionData.startTime).toLocaleString()}</div>
      <div class="info-item"><strong>Ended:</strong> ${sessionData.endTime ? new Date(sessionData.endTime).toLocaleString() : 'N/A'}</div>
      <div class="info-item"><strong>Actions:</strong> ${sessionData.actions.length}</div>
      <div class="info-item"><strong>Resources:</strong> ${sessionData.resources?.length || 0}</div>
    </div>
  </div>

  <div class="actions">
    ${actionsList}
  </div>
</body>
</html>
    `;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`\n🎬 Session Viewer running at http://localhost:${this.port}`);
      console.log(`📁 Viewing sessions from: ${this.outputDir}`);
      console.log(`\nPress Ctrl+C to stop\n`);
    });
  }
}

// CLI entry point
if (require.main === module) {
  const viewer = new SessionViewer();
  viewer.start();
}
