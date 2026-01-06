#!/usr/bin/env node
/**
 * Session Recorder CLI
 * Production-ready CLI for recording browser sessions with optional voice
 *
 * Usage:
 *   npx ts-node test/record-session.ts [options] [url]
 *   node dist/test/record-session.js [options] [url]
 *
 * Options:
 *   --mode <mode>     Recording mode: full | browser | voice (default: full)
 *   --url <url>       Starting URL (default: https://example.com)
 *   --session <id>    Custom session ID (default: auto-generated)
 *   --no-zip          Skip creating zip file after recording
 *   --headless        Run browser in headless mode
 *   --connect <port>  Connect to existing Chrome via CDP (e.g., --connect 9222)
 *   --help            Show help
 *
 * Examples:
 *   npx ts-node test/record-session.ts --mode browser https://github.com
 *   npx ts-node test/record-session.ts --mode voice
 *   npx ts-node test/record-session.ts --mode full --session my-test
 *
 * Connect to existing browser (for authenticated sessions):
 *   1. Launch Chrome: chrome.exe --remote-debugging-port=9222
 *   2. Navigate to site and log in
 *   3. Run: npx ts-node test/record-session.ts --connect 9222
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { SessionRecorder } from '../src/index';
import { spawn, exec, ChildProcess } from 'child_process';
import * as os from 'os';
import * as readline from 'readline';

import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the Chrome executable path based on OS
 */
function getChromePath(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows - check common Chrome locations
    const possiblePaths = [
      path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    // Fallback - hope it's in PATH
    return 'chrome.exe';
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    // Linux
    return 'google-chrome';
  }
}

/**
 * Launch Chrome with remote debugging enabled
 * Uses a dedicated user data dir to avoid conflicts with existing Chrome instances
 */
function launchChrome(port: number): ChildProcess {
  const chromePath = getChromePath();

  // Use ~/.browser-recorder/ for persistent Chrome profile
  // This preserves logins and settings across recording sessions
  const userDataDir = path.join(os.homedir(), '.browser-recorder', 'chrome-profile');

  // Ensure the directory exists
  fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[Chrome] Launching: ${chromePath}`);
  console.log(`[Chrome] Debug port: ${port}`);
  console.log(`[Chrome] User data: ${userDataDir}`);

  let child: ChildProcess;

  if (os.platform() === 'win32') {
    // Windows: Use PowerShell's Start-Process via exec for reliable Chrome launching
    // spawn() with detached:true doesn't work reliably on Windows
    const psCommand = `powershell -NoProfile -Command "Start-Process -FilePath '${chromePath}' -ArgumentList '--remote-debugging-port=${port}','--user-data-dir=${userDataDir.replace(/\\/g, '\\\\')}','--no-first-run','--no-default-browser-check'"`;

    child = exec(psCommand, (error) => {
      if (error) {
        console.error(`[Chrome] Launch error: ${error.message}`);
      }
    });
  } else {
    // macOS/Linux: Use spawn directly
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ];

    child = spawn(chromePath, args, {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  }

  child.on('error', (err) => {
    console.error(`[Chrome] Failed to launch: ${err.message}`);
  });

  child.unref(); // Don't wait for Chrome to exit

  return child;
}

/**
 * Wait for user to press Enter
 */
async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Try to connect to Chrome, with retry logic
 */
async function connectWithRetry(port: number, maxAttempts: number = 10, delayMs: number = 500): Promise<Browser> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
      return browser;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Failed to connect after retries');
}

interface CLIOptions {
  mode: 'full' | 'browser' | 'voice';
  url: string;
  sessionId: string;
  createZip: boolean;
  headless: boolean;
  connectPort: number | null;  // CDP port for connecting to existing browser
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    mode: 'full',
    url: 'https://example.com',
    sessionId: `session-${Date.now()}`,
    createZip: true,
    headless: false,
    connectPort: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--mode' || arg === '-m') {
      const mode = args[++i];
      if (!['full', 'browser', 'voice'].includes(mode)) {
        console.error(`Invalid mode: ${mode}. Must be: full, browser, or voice`);
        process.exit(1);
      }
      options.mode = mode as 'full' | 'browser' | 'voice';
    } else if (arg === '--url' || arg === '-u') {
      options.url = args[++i];
    } else if (arg === '--session' || arg === '-s') {
      options.sessionId = args[++i];
    } else if (arg === '--no-zip') {
      options.createZip = false;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--connect' || arg === '-c') {
      const port = parseInt(args[++i], 10);
      if (isNaN(port)) {
        console.error(`Invalid port: ${args[i]}. Must be a number (e.g., 9222)`);
        process.exit(1);
      }
      options.connectPort = port;
    } else if (!arg.startsWith('-') && arg.startsWith('http')) {
      options.url = arg;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Session Recorder CLI
====================

Record browser sessions with optional voice narration.

Usage:
  npx ts-node test/record-session.ts [options] [url]

Options:
  --mode, -m <mode>     Recording mode (default: full)
                        - full: Record browser + voice
                        - browser: Record browser only
                        - voice: Record voice only (browser for navigation)

  --url, -u <url>       Starting URL (default: https://example.com)
  --session, -s <id>    Custom session ID (default: auto-generated)
  --no-zip              Skip creating zip file after recording
  --headless            Run browser in headless mode
  --connect, -c <port>  Connect to existing Chrome via CDP instead of launching new
  --help, -h            Show this help

Examples:
  # Full recording (browser + voice)
  npx ts-node test/record-session.ts --mode full https://github.com

  # Browser only
  npx ts-node test/record-session.ts --mode browser https://material.angular.dev

  # Voice only (browser open for context)
  npx ts-node test/record-session.ts --mode voice

  # Custom session name
  npx ts-node test/record-session.ts -m browser -s my-test-session https://example.com

Connect to Existing Browser (for authenticated sessions):
  This is useful when you need to record on a page that requires login,
  especially in incognito mode where credentials aren't saved.

  Step 1: Launch Chrome with remote debugging enabled:
    Windows:  chrome.exe --remote-debugging-port=9222
    Mac:      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
    Linux:    google-chrome --remote-debugging-port=9222

  Step 2: Navigate to your site and log in manually

  Step 3: Connect the recorder:
    npx ts-node test/record-session.ts --connect 9222

  The recorder will attach to your existing browser and use the current page.

Controls:
  - Interact with the browser to record actions
  - Close the browser window to stop recording
  - Press Ctrl+C to cancel recording

Output:
  - Session files saved to: session-recorder/output/<session-id>/
  - Zip archive created at: session-recorder/output/<session-id>.zip
`);
}

function printBanner(options: CLIOptions): void {
  const modeLabels = {
    full: 'Browser + Voice',
    browser: 'Browser Only',
    voice: 'Voice Only'
  };

  console.log('');
  console.log('='.repeat(60));
  console.log('  Session Recorder');
  console.log('='.repeat(60));
  console.log(`  Mode:       ${modeLabels[options.mode]}`);
  console.log(`  Session:    ${options.sessionId}`);
  if (options.connectPort) {
    console.log(`  Connect:    CDP port ${options.connectPort} (existing browser)`);
  } else {
    console.log(`  URL:        ${options.url}`);
    console.log(`  Headless:   ${options.headless ? 'Yes' : 'No'}`);
  }
  console.log('='.repeat(60));
  console.log('');
}

async function main(): Promise<void> {
  const options = parseArgs();
  printBanner(options);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let recorder: SessionRecorder | null = null;
  let isShuttingDown = false;
  let isConnectedBrowser = false;  // Track if we connected to existing browser

  // Graceful shutdown handler
  async function shutdown(reason: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('');
    console.log(`[${new Date().toLocaleTimeString()}] Stopping: ${reason}`);

    try {
      // Stop recording
      if (recorder) {
        console.log('[Recording] Saving session data...');
        await recorder.stop();

        // Create zip if enabled
        if (options.createZip) {
          console.log('[Recording] Creating zip archive...');
          const zipPath = await recorder.createZip();
          console.log(`[Recording] Zip created: ${zipPath}`);
        }

        // Print summary
        const summary = recorder.getSummary();
        printSummary(summary, recorder.getSessionDir());
      }

      // Close browser
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (err) {
      console.error('[Error] Shutdown error:', err);
    }

    process.exit(0);
  }

  // Handle process signals
  process.on('SIGINT', () => shutdown('User interrupted (Ctrl+C)'));
  process.on('SIGTERM', () => shutdown('Process terminated'));

  try {
    // Determine recording options based on mode
    const recorderOptions = {
      browser_record: options.mode === 'full' || options.mode === 'browser',
      voice_record: options.mode === 'full' || options.mode === 'voice'
    };

    // Create recorder first (voice recording starts early)
    console.log('[Recorder] Initializing...');
    recorder = new SessionRecorder(options.sessionId, recorderOptions);

    // Connect to existing browser OR launch new one

    if (options.connectPort) {
      // Connect to existing Chrome via CDP
      console.log(`[Browser] Connecting to existing Chrome on port ${options.connectPort}...`);
      try {
        browser = await chromium.connectOverCDP(`http://localhost:${options.connectPort}`);
        isConnectedBrowser = true;
        console.log('[Browser] Connected to existing browser!');

        // Get existing contexts and pages
        const contexts = browser.contexts();
        if (contexts.length > 0) {
          context = contexts[0];
          const pages = context.pages();

          if (pages.length > 0) {
            // Show available pages
            console.log(`[Browser] Found ${pages.length} open page(s):`);
            pages.forEach((p, i) => {
              console.log(`  ${i + 1}. ${p.url()}`);
            });

            // Use the first page (usually the active one)
            page = pages[0];
            console.log(`[Browser] Using: ${page.url()}`);
          } else {
            // No pages, create one
            page = await context.newPage();
            console.log('[Browser] No pages found, created new page');
          }
        } else {
          // No contexts, create one
          context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
          page = await context.newPage();
          console.log('[Browser] No contexts found, created new context and page');
        }
      } catch (err) {
        // Chrome not running - offer to launch it
        console.log(`\n⚠️  Chrome not found on port ${options.connectPort}`);
        console.log('\nWould you like me to launch Chrome for you?');
        console.log('  - Chrome will open with remote debugging enabled');
        console.log('  - Recording will start automatically once connected\n');

        await waitForEnter('Press Enter to launch Chrome (or Ctrl+C to cancel)...');

        // Launch Chrome
        console.log('\n[Chrome] Launching browser...');
        launchChrome(options.connectPort);

        // Start voice recording immediately while Chrome launches
        await recorder.startVoiceEarly();

        // Wait a moment for Chrome to start
        console.log('[Chrome] Waiting for Chrome to start...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to connect with retries
        console.log(`[Browser] Connecting to Chrome on port ${options.connectPort}...`);
        try {
          browser = await connectWithRetry(options.connectPort, 15, 1000);
          isConnectedBrowser = true;
          console.log('[Browser] Connected!');

          // Get the page they navigated to
          const contexts = browser.contexts();
          if (contexts.length > 0) {
            context = contexts[0];
            const pages = context.pages();
            if (pages.length > 0) {
              // Show available pages
              console.log(`[Browser] Found ${pages.length} open page(s):`);
              pages.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.url()}`);
              });
              page = pages[0];
              console.log(`[Browser] Using: ${page.url()}`);
            } else {
              page = await context.newPage();
            }
          } else {
            context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
            page = await context.newPage();
          }
        } catch (retryErr) {
          console.error(`\n❌ Failed to connect to Chrome on port ${options.connectPort}`);
          console.error('Chrome may not have launched correctly.');
          console.error('\nTry launching Chrome manually:');
          console.error(`  Windows:  chrome.exe --remote-debugging-port=${options.connectPort}`);
          console.error(`  Mac:      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${options.connectPort}`);
          console.error(`  Linux:    google-chrome --remote-debugging-port=${options.connectPort}`);
          process.exit(1);
        }
      }
    } else {
      // Launch new browser
      console.log('[Browser] Launching...');
      browser = await chromium.launch({
        headless: options.headless,
        slowMo: 50
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });

      page = await context.newPage();
    }

    // Handle browser close - this is the key feature
    browser.on('disconnected', () => {
      if (!isShuttingDown) {
        shutdown(isConnectedBrowser ? 'Browser disconnected' : 'Browser closed');
      }
    });

    // Helper to check if all pages are closed and trigger shutdown
    const checkAllPagesClosed = () => {
      if (!isShuttingDown && browser?.isConnected()) {
        // Check ALL contexts for remaining pages
        const allPages = browser.contexts().flatMap(ctx => ctx.pages());
        if (allPages.length === 0) {
          shutdown('All pages closed');
        }
      }
    };

    // Handle page close for initial page
    page.on('close', checkAllPagesClosed);

    // Listen for new pages (tabs) in ALL contexts and attach close handlers
    const attachPageCloseHandler = (ctx: BrowserContext) => {
      ctx.on('page', (newPage) => {
        newPage.on('close', checkAllPagesClosed);
      });
    };

    // Attach to all existing contexts (for CDP-connected browsers)
    for (const ctx of browser.contexts()) {
      attachPageCloseHandler(ctx);
    }

    // Capture console messages (optional logging)
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('Session recorder')) {
        console.log(`[Browser Console] Error: ${text.slice(0, 100)}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`[Browser Error] ${error.message.slice(0, 100)}`);
    });

    // Start recording
    console.log('[Recorder] Starting...');
    await recorder.start(page);

    // When connected to existing browser, attach to all existing pages
    if (isConnectedBrowser) {
      await recorder.attachToExistingPages();
      console.log(`[Recorder] Recording ${recorder.getTrackedPageCount()} tab(s)`);

      // Also attach close handlers to all existing pages (not just the initial one)
      for (const ctx of browser.contexts()) {
        for (const p of ctx.pages()) {
          if (p !== page) {  // Skip the initial page, already has handler
            p.on('close', checkAllPagesClosed);
          }
        }
      }
    }

    // Navigate to URL (skip if connecting to existing browser with page already open)
    if (!isConnectedBrowser || page.url() === 'about:blank') {
      console.log(`[Browser] Navigating to: ${options.url}`);
      await page.goto(options.url, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`[Browser] Using existing page: ${page.url()}`);
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log('  Recording in progress');
    console.log('-'.repeat(60));
    console.log('');
    console.log('  Instructions:');
    console.log('    - Interact with the page to record actions');
    if (recorderOptions.voice_record) {
      console.log('    - Speak to record voice narration');
    }
    console.log('    - Close the browser window to stop recording');
    console.log('');
    console.log('-'.repeat(60));
    console.log('');

    // Keep process alive while browser is open
    // The 'disconnected' event will trigger shutdown
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!browser?.isConnected() || isShuttingDown) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });

  } catch (err) {
    console.error('[Error]', err);

    if (browser) {
      await browser.close().catch(() => {});
    }

    process.exit(1);
  }
}

function printSummary(summary: any, sessionDir: string): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Session Summary');
  console.log('='.repeat(60));
  console.log(`  Session ID:     ${summary.sessionId}`);
  console.log(`  Duration:       ${summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : 'N/A'}`);
  console.log(`  Total Actions:  ${summary.totalActions}`);
  console.log(`  Resources:      ${summary.totalResources}`);
  console.log(`  Output:         ${sessionDir}`);
  console.log('='.repeat(60));

  if (summary.actions.length > 0) {
    console.log('');
    console.log('Actions:');
    summary.actions.slice(0, 10).forEach((action: any, i: number) => {
      if (action.type === 'voice_transcript') {
        console.log(`  ${i + 1}. voice: "${action.text?.slice(0, 40)}..."`);
      } else {
        console.log(`  ${i + 1}. ${action.type}: ${action.url?.slice(0, 40) || 'N/A'}`);
      }
    });

    if (summary.actions.length > 10) {
      console.log(`  ... and ${summary.actions.length - 10} more`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
