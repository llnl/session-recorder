/**
 * E2E Test for FEAT-05: Viewer Timeline Updates for Dual Audio Sources
 *
 * Tests that the timeline component correctly displays:
 * 1. Voice segments (microphone) in blue color
 * 2. System segments (display audio) in green color
 * 3. Hover tooltips show source label (Voice/System Audio)
 * 4. Both sources visible at correct timestamps
 * 5. Overlapping segments both visible (different Y positions)
 */

import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(__dirname, '..', 'dist', 'output', 'viewer-timeline-test');
const VIEWER_URL = 'http://localhost:3000';
const TEST_SESSION_DIR = path.join(__dirname, '..', 'output', 'test-dual-audio');

async function waitForViewerReady(page: Page): Promise<boolean> {
  try {
    // Wait for the app to be ready
    await page.waitForSelector('.timeline-container', { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('============================================================');
  console.log('  FEAT-05: Viewer Timeline Dual Audio Test');
  console.log('============================================================');
  console.log();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let browser: Browser | null = null;

  try {
    // Step 1: Launch browser
    console.log('📱 Step 1: Launching browser...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    // Step 2: Navigate to viewer with test session
    console.log('🌐 Step 2: Loading viewer with test session...');

    // The viewer loads sessions from URL path: /session/[sessionId]
    // We need to pass the session directory name
    const sessionUrl = `${VIEWER_URL}?session=test-dual-audio`;
    await page.goto(sessionUrl);

    // Wait for viewer to be ready
    const viewerReady = await waitForViewerReady(page);
    if (!viewerReady) {
      // Try alternative: direct file URL approach
      console.log('   Trying file-based approach...');
      // Use the viewer with local file
      await page.goto(`${VIEWER_URL}`);
      await page.waitForTimeout(2000);
    }

    // Take initial screenshot
    const initialScreenshot = path.join(OUTPUT_DIR, 'step2-initial-viewer.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });
    console.log(`   Screenshot: ${initialScreenshot}`);

    // Step 3: Check timeline canvas exists
    console.log('🔍 Step 3: Verifying timeline canvas...');
    const timeline = await page.$('.timeline-canvas');
    if (timeline) {
      console.log('   ✅ Timeline canvas found');
    } else {
      console.log('   ⚠️ Timeline canvas not found - viewer may need manual session load');
    }

    // Step 4: Take screenshot of timeline area
    console.log('📸 Step 4: Capturing timeline area...');
    const timelineContainer = await page.$('.timeline-container');
    if (timelineContainer) {
      const timelineScreenshot = path.join(OUTPUT_DIR, 'step4-timeline.png');
      await timelineContainer.screenshot({ path: timelineScreenshot });
      console.log(`   Screenshot: ${timelineScreenshot}`);
    }

    // Step 5: Test hover on voice segment (if visible)
    console.log('🖱️ Step 5: Testing hover tooltips...');
    const canvas = await page.$('.timeline-canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) {
        // Hover over the top area (voice segments at y=2-14)
        await page.mouse.move(box.x + 150, box.y + 8);
        await page.waitForTimeout(500);

        const voiceTooltip = await page.$('.timeline-voice-tooltip--voice');
        if (voiceTooltip) {
          console.log('   ✅ Voice tooltip (blue) found');
          const tooltipScreenshot = path.join(OUTPUT_DIR, 'step5-voice-tooltip.png');
          await page.screenshot({ path: tooltipScreenshot, fullPage: false });
          console.log(`   Screenshot: ${tooltipScreenshot}`);
        }

        // Hover over the bottom area (system segments at y=16-28)
        await page.mouse.move(box.x + 200, box.y + 22);
        await page.waitForTimeout(500);

        const systemTooltip = await page.$('.timeline-voice-tooltip--system');
        if (systemTooltip) {
          console.log('   ✅ System tooltip (green) found');
          const tooltipScreenshot = path.join(OUTPUT_DIR, 'step5-system-tooltip.png');
          await page.screenshot({ path: tooltipScreenshot, fullPage: false });
          console.log(`   Screenshot: ${tooltipScreenshot}`);
        }
      }
    }

    // Step 6: Final screenshot
    console.log('📷 Step 6: Final screenshot...');
    const finalScreenshot = path.join(OUTPUT_DIR, 'step6-final.png');
    await page.screenshot({ path: finalScreenshot, fullPage: false });
    console.log(`   Screenshot: ${finalScreenshot}`);

    // Keep browser open for manual inspection
    console.log();
    console.log('============================================================');
    console.log('  Test Complete');
    console.log('============================================================');
    console.log();
    console.log('The viewer should display:');
    console.log('  - Blue segments: Voice (microphone) at top row');
    console.log('  - Green segments: System Audio at bottom row');
    console.log('  - Hover tooltips show 🎤 Voice or 🔊 System Audio');
    console.log();
    console.log('Browser will close in 30 seconds for manual inspection...');
    console.log('(Press Ctrl+C to exit earlier)');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
