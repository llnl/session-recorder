/**
 * Voice Recording Test
 * Tests the SessionRecorder with voice_record enabled
 */

import { chromium } from '@playwright/test';
import { SessionRecorder } from '../src/node/SessionRecorder';

async function main() {
  console.log('🎙️  Starting Voice Recording Test...\n');

  // Test 1: Browser + Voice recording
  console.log('Test 1: Browser + Voice Recording');
  const recorder1 = new SessionRecorder('voice-test-1', {
    browser_record: true,
    voice_record: true,
    whisper_model: 'base'
  });

  const browser1 = await chromium.launch({ headless: false });
  const context1 = await browser1.newContext();
  const page1 = await context1.newPage();

  await recorder1.start(page1);

  console.log('\n🎯 Instructions:');
  console.log('1. Navigate to a website');
  console.log('2. Speak into your microphone while performing actions');
  console.log('3. Describe what you are doing');
  console.log('4. After 30 seconds, the test will stop automatically\n');

  // Navigate to a test page
  await page1.goto('https://example.com');
  await page1.click('a');

  // Wait for 30 seconds to allow user to interact and speak
  console.log('⏱️  Recording for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await recorder1.stop();
  const zipPath1 = await recorder1.createZip();
  console.log(`\n✅ Test 1 Complete: ${zipPath1}\n`);

  await browser1.close();

  // Test 2: Voice-only recording (no browser capture)
  console.log('Test 2: Voice-Only Recording');
  const recorder2 = new SessionRecorder('voice-test-2', {
    browser_record: false,
    voice_record: true,
    whisper_model: 'tiny'  // Faster model for testing
  });

  const browser2 = await chromium.launch({ headless: false });
  const context2 = await browser2.newContext();
  const page2 = await context2.newPage();

  await recorder2.start(page2);

  console.log('\n🎯 Voice-only recording (no DOM snapshots)');
  console.log('Speak for 15 seconds...\n');

  await page2.goto('https://example.com');

  // Wait for 15 seconds
  await new Promise(resolve => setTimeout(resolve, 15000));

  await recorder2.stop();
  const zipPath2 = await recorder2.createZip();
  console.log(`\n✅ Test 2 Complete: ${zipPath2}\n`);

  await browser2.close();

  console.log('🎉 All tests completed!');
  console.log('\nTo view results:');
  console.log(`1. Extract: unzip ${zipPath1}`);
  console.log(`2. Open viewer: npm run viewer`);
  console.log(`3. Load the session.json file`);
}

main().catch(console.error);
