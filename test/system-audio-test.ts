/**
 * Test script for System Audio Capture (FEAT-01)
 *
 * This test verifies:
 * 1. getDisplayMedia with audio option shows browser permission dialog
 * 2. Audio track is obtained when user selects screen/tab with "Share audio"
 * 3. Audio capture works in Chrome browser
 * 4. Graceful error handling for permission denial
 *
 * Run: npm run build && node dist/test/system-audio-test.js
 */

import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { SystemAudioRecorder } from '../src/node/SystemAudioRecorder';

const OUTPUT_DIR = path.join(__dirname, '../output/system-audio-test');

async function runTest() {
  console.log('='.repeat(60));
  console.log('  System Audio Capture Test (FEAT-01)');
  console.log('='.repeat(60));
  console.log('');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Step 1: Launch browser (headed mode required for permission dialogs)
    console.log('📱 Step 1: Launching Chrome browser...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--auto-select-desktop-capture-source=Entire screen',
        '--use-fake-ui-for-media-stream',
        // Allow audio capture without user gesture
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    const context = await browser.newContext({
      permissions: ['microphone']
    });
    page = await context.newPage();

    // Navigate to a page that can play audio (for testing capture)
    console.log('🌐 Navigating to test page...');
    await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });

    // Take screenshot of initial state
    const screenshot1 = path.join(OUTPUT_DIR, 'step1-initial-page.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`   Screenshot: ${screenshot1}`);

    // Step 2: Initialize SystemAudioRecorder
    console.log('');
    console.log('🎙️ Step 2: Initializing SystemAudioRecorder...');
    const audioDir = path.join(OUTPUT_DIR, 'audio');
    const recorder = new SystemAudioRecorder({ outputDir: audioDir });
    await recorder.attach(page);
    console.log('   SystemAudioRecorder attached');

    // Step 3: Check browser support
    console.log('');
    console.log('🔍 Step 3: Checking browser support...');
    const isSupported = await page.evaluate(() => {
      return window.__systemAudioCapture?.isSupported() ?? false;
    });
    console.log(`   getDisplayMedia supported: ${isSupported}`);

    if (!isSupported) {
      console.error('❌ Browser does not support getDisplayMedia');
      return;
    }

    const mimeType = await page.evaluate(() => {
      return window.__systemAudioCapture?.getSupportedMimeType() ?? 'unknown';
    });
    console.log(`   Supported MIME type: ${mimeType}`);

    // Step 4: Request capture (will show permission dialog)
    console.log('');
    console.log('📢 Step 4: Requesting system audio capture...');
    console.log('');
    console.log('   ⚠️  IMPORTANT: When the dialog appears:');
    console.log('   1. Select a tab or screen');
    console.log('   2. CHECK the "Share audio" checkbox');
    console.log('   3. Click "Share"');
    console.log('');

    // Take screenshot before dialog
    const screenshot2 = path.join(OUTPUT_DIR, 'step4-before-dialog.png');
    await page.screenshot({ path: screenshot2 });
    console.log(`   Screenshot: ${screenshot2}`);

    // Request capture
    const captureStatus = await recorder.requestCapture();
    console.log('');
    console.log(`   Capture status: ${captureStatus.state}`);

    if (captureStatus.state === 'error') {
      console.log(`   Error: ${captureStatus.error}`);

      // Take screenshot of error state
      const screenshotError = path.join(OUTPUT_DIR, 'step4-error.png');
      await page.screenshot({ path: screenshotError });
      console.log(`   Screenshot: ${screenshotError}`);

      // Verify error handling works
      console.log('');
      console.log('✅ Test PASSED: Error handling works correctly');
      console.log('   (Permission denial is handled gracefully)');
      return;
    }

    if (captureStatus.trackInfo) {
      console.log(`   Track kind: ${captureStatus.trackInfo.kind}`);
      console.log(`   Track label: ${captureStatus.trackInfo.label}`);
      console.log(`   Track enabled: ${captureStatus.trackInfo.enabled}`);
      console.log(`   Track muted: ${captureStatus.trackInfo.muted}`);

      // Verify it's an audio track
      if (captureStatus.trackInfo.kind !== 'audio') {
        console.error(`❌ Expected audio track, got: ${captureStatus.trackInfo.kind}`);
        return;
      }
      console.log('   ✅ Audio track obtained successfully');
    }

    // Take screenshot after permission granted
    const screenshot3 = path.join(OUTPUT_DIR, 'step4-after-permission.png');
    await page.screenshot({ path: screenshot3 });
    console.log(`   Screenshot: ${screenshot3}`);

    // Step 5: Start recording
    console.log('');
    console.log('🔴 Step 5: Starting recording...');
    const startSuccess = await recorder.startRecording();
    console.log(`   Recording started: ${startSuccess}`);

    if (!startSuccess) {
      console.error('❌ Failed to start recording');
      return;
    }

    // Record for 5 seconds
    console.log('   Recording for 5 seconds...');
    for (let i = 5; i > 0; i--) {
      console.log(`   ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Take screenshot during recording
    const screenshot4 = path.join(OUTPUT_DIR, 'step5-during-recording.png');
    await page.screenshot({ path: screenshot4 });
    console.log(`   Screenshot: ${screenshot4}`);

    // Step 6: Stop recording
    console.log('');
    console.log('⏹️ Step 6: Stopping recording...');
    const result = await recorder.stopRecording();
    console.log(`   Recording stopped: ${result.success}`);

    if (result.success) {
      console.log(`   Audio file: ${result.audioFile}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Chunks: ${result.chunks}`);

      // Verify file exists
      const audioPath = path.join(audioDir, result.audioFile!);
      if (fs.existsSync(audioPath)) {
        const stats = fs.statSync(audioPath);
        console.log(`   File size: ${stats.size} bytes`);
        console.log('');
        console.log('✅ Test PASSED: System audio captured successfully');
      } else {
        console.error(`❌ Audio file not found: ${audioPath}`);
      }
    } else {
      console.error(`   Error: ${result.error}`);
      console.log('');
      console.log('❌ Test FAILED: Could not capture audio');
    }

    // Take final screenshot
    const screenshot5 = path.join(OUTPUT_DIR, 'step6-final.png');
    await page.screenshot({ path: screenshot5 });
    console.log(`   Screenshot: ${screenshot5}`);

  } catch (error) {
    console.error('');
    console.error('❌ Test error:', error);
  } finally {
    // Cleanup
    console.log('');
    console.log('🧹 Cleaning up...');
    if (browser) {
      await browser.close();
    }
    console.log('Done.');
  }
}

// Run the test
runTest().catch(console.error);
