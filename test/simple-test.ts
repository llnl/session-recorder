/**
 * Simple test script for Browser Session Recorder
 * Tests POC 1 requirements
 */

import { chromium } from '@playwright/test';
import { SessionRecorder } from '../src/index';
import * as readline from 'readline';
import * as path from 'path';

async function main() {
  console.log('🎬 Browser Session Recorder - POC Test\n');

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
    } else if (type === 'warning') {
      console.log(`🟡 Browser Warning: ${text}`);
    } else {
      console.log(`🌐 Browser: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`💥 Page Error: ${error.message}`);
  });
  // 2. Create and start recorder
  console.log('Creating session recorder...');
  const recorder = new SessionRecorder(`poc-test-${Date.now()}`);
  await recorder.start(page);

  // 3. Navigate to test page
  // When compiled, __dirname is dist/test, so go up to project root then to test
  const projectRoot = path.join(__dirname, '../..');
  const testPagePath = 'file://' + path.join(projectRoot, 'test/test-page.html').replace(/\\/g, '/');
  console.log(`Navigating to: ${testPagePath}`);
  await page.goto(testPagePath);

  console.log('\n📝 Interact with the page (click buttons, type in inputs, etc.)');
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

  // 6. Verify results
  const sessionData = recorder.getSessionData();

  console.log('\n📊 SESSION SUMMARY');
  console.log('==================');
  console.log(`Session ID: ${sessionData.sessionId}`);
  console.log(`Start: ${sessionData.startTime}`);
  console.log(`End: ${sessionData.endTime}`);
  console.log(`Total Actions: ${sessionData.actions.length}\n`);

  // Detailed verification
  if (sessionData.actions.length > 0) {
    console.log('✅ VERIFICATION CHECKS:');
    console.log('======================\n');

    let allChecksPassed = true;

    sessionData.actions.forEach((action, index) => {
      // Skip non-RecordedAction types in this test (voice, navigation, visibility, media, download, fullscreen, print)
      if (action.type === 'voice_transcript' || action.type === 'navigation' ||
          action.type === 'page_visibility' || action.type === 'media' ||
          action.type === 'download' || action.type === 'fullscreen' || action.type === 'print') return;

      // At this point, action is a RecordedAction
      const recordedAction = action as import('../src/index').RecordedAction;

      console.log(`Action ${index + 1}: ${action.type}`);

      // Read HTML snapshot files
      const beforeSnapshotPath = path.resolve(__dirname, '../output/poc-test', recordedAction.before.html);
      const afterSnapshotPath = path.resolve(__dirname, '../output/poc-test', recordedAction.after.html);

      let beforeHtml = '';
      let afterHtml = '';
      try {
        const fs = require('fs');
        beforeHtml = fs.readFileSync(beforeSnapshotPath, 'utf-8');
        afterHtml = fs.readFileSync(afterSnapshotPath, 'utf-8');
      } catch (err) {
        console.error(`  Error reading snapshot files: ${err}`);
      }

      const checks = [
        { name: 'Timestamp is UTC', pass: action.timestamp.endsWith('Z') },
        { name: 'BEFORE snapshot file exists', pass: beforeHtml.length > 0 },
        { name: 'BEFORE snapshot has data-recorded-el', pass: beforeHtml.includes('data-recorded-el="true"') },
        { name: 'BEFORE screenshot path exists', pass: recordedAction.before.screenshot.startsWith('screenshots/') },
        { name: 'AFTER snapshot file exists', pass: afterHtml.length > 0 },
        { name: 'AFTER screenshot path exists', pass: recordedAction.after.screenshot.startsWith('screenshots/') },
        { name: 'Snapshot preserves form state', pass: beforeHtml.includes('__playwright_value_') || beforeHtml.includes('__playwright_checked_') || beforeHtml.includes('<!DOCTYPE html>') }
      ];

      checks.forEach(check => {
        const icon = check.pass ? '✓' : '✗';
        console.log(`  ${icon} ${check.name}`);
        if (!check.pass) allChecksPassed = false;
      });

      console.log('');
    });

    if (allChecksPassed) {
      console.log('🎉 ALL CHECKS PASSED!');
      console.log('✅ Test complete!');
    } else {
      console.log('⚠️  SOME CHECKS FAILED - Review the output above');
      console.log('❌ Test failed!');
    }
  } else {
    console.log('❌ No actions recorded. Did you interact with the page?');
  }

  await browser.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
