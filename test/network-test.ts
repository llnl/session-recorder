/**
 * Automated test for network logging verification
 */

import { chromium } from '@playwright/test';
import { SessionRecorder } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  console.log('🌐 Network Logging Test\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const recorder = new SessionRecorder('network-test');

  // Add response event listener for debugging
  page.on('response', (response) => {
    console.log(`🌐 Response: ${response.url()} - ${response.status()}`);
  });

  await recorder.start(page);

  // Navigate to local test page which has resources
  const testPagePath = 'file://' + path.join(__dirname, '../../test/test-page.html').replace(/\\/g, '/');
  console.log(`Navigating to ${testPagePath}...`);
  await page.goto(testPagePath);
  await page.waitForLoadState('networkidle');

  // Wait a bit for all network requests to complete
  await page.waitForTimeout(2000);

  await recorder.stop();
  await browser.close();

  // Verify network log file
  const sessionDir = path.join(__dirname, '../dist/output/network-test');
  const networkLogPath = path.join(sessionDir, 'session.network');
  const sessionJsonPath = path.join(sessionDir, 'session.json');

  console.log('\n📊 Verification:');

  if (fs.existsSync(networkLogPath)) {
    const networkData = fs.readFileSync(networkLogPath, 'utf-8');
    const lines = networkData.trim().split('\n').filter(l => l.length > 0);
    console.log(`✅ session.network exists with ${lines.length} entries`);

    if (lines.length > 0) {
      console.log('\n📝 Sample network entry:');
      const firstEntry = JSON.parse(lines[0]);
      console.log(JSON.stringify(firstEntry, null, 2));
    }
  } else {
    console.log('❌ session.network file not found');
  }

  if (fs.existsSync(sessionJsonPath)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));
    console.log(`\n✅ session.json contains network metadata:`);
    console.log(`   - file: ${sessionData.network?.file}`);
    console.log(`   - count: ${sessionData.network?.count}`);
  } else {
    console.log('❌ session.json not found');
  }

  console.log('\n✅ Network logging test complete!');
})();
