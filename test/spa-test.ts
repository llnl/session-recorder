/**
 * SPA test script for Browser Session Recorder
 * Tests recording on a real-world Angular SPA (material.angular.dev)
 * This will expose the limitation of HTML-only capture
 */

import { chromium } from '@playwright/test';
import { SessionRecorder } from '../src/index';
import * as readline from 'readline';

async function main() {
  console.log('🎬 Browser Session Recorder - SPA Test (material.angular.dev)\n');

  // 1. Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Capture browser console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`🔴 Browser Error: ${text}`);
    } else if (text.includes('Session recorder') || text.includes('Captured') || text.includes('Recorded')) {
      console.log(`🌐 Browser: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`💥 Page Error: ${error.message}`);
  });

  // 2. Create and start recorder
  console.log('Creating session recorder...');
  const recorder = new SessionRecorder(`spa-test-${Date.now()}`);
  await recorder.start(page);

  // 3. Navigate to Angular Material site
  console.log('Navigating to: https://material.angular.dev');
  await page.goto('https://material.angular.dev', { waitUntil: 'networkidle' });

  console.log('\n📝 Interact with the page:');
  console.log('   - Click on navigation items');
  console.log('   - Click on component examples');
  console.log('   - Interact with UI components');
  console.log('⏸️  Press ENTER when done to stop recording...\n');

  // 4. Wait for user input
  await new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('', () => {
      rl.close();
      resolve(undefined);
    });
  });

  // 5. Stop recording
  console.log('\nStopping recording...');
  await recorder.stop();

  // 5.5. Create zip file
  console.log('\n📦 Creating zip file...');
  const zipPath = await recorder.createZip();

  // 6. Show results
  const sessionData = recorder.getSessionData();
  const summary = recorder.getSummary();

  console.log('\n📊 SESSION SUMMARY');
  console.log('==================');
  console.log(`Session ID: ${sessionData.sessionId}`);
  console.log(`Start: ${sessionData.startTime}`);
  console.log(`End: ${sessionData.endTime}`);
  console.log(`Duration: ${summary.duration}ms`);
  console.log(`Total Actions: ${sessionData.actions.length}`);
  console.log(`Zip File: ${zipPath}\n`);

  if (sessionData.actions.length > 0) {
    console.log('📋 RECORDED ACTIONS:');
    console.log('===================\n');

    sessionData.actions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.type} at (${action.action.x}, ${action.action.y})`);
      console.log(`   URL: ${action.after.url}`);
      console.log(`   Snapshots: ${action.before.html} → ${action.after.html}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No actions recorded. Did you interact with the page?');
  }

  await browser.close();
  console.log('\n✅ Test complete!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
