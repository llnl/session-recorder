/**
 * Browser-side coordinator - Main entry point injected via page.addInitScript()
 * Coordinates snapshot capture and action detection
 */

// This file will be injected as a string, so we need to inline the dependencies
// In production, this would be bundled

(function() {
  // Inline the snapshot capture logic
  const { captureSnapshot } = (function() {
    // [snapshotCapture.ts will be inlined here by SessionRecorder]
    return (window as any).__snapshotCapture;
  })();

  // Inline the action listener logic
  const { setupActionListeners } = (function() {
    // [actionListener.ts will be inlined here by SessionRecorder]
    return (window as any).__actionListener;
  })();

  // Inline the console capture logic
  const { startCapture, stopCapture } = (function() {
    // [consoleCapture.ts will be inlined here by SessionRecorder]
    return (window as any).__consoleCapture;
  })();

  // Start console capture
  startCapture();

  // Setup action handler
  setupActionListeners(async (action: any) => {
    try {
      // 1. Add marker attribute to target element
      action.target.setAttribute('data-recorded-el', 'true');

      // 2. Capture BEFORE snapshot (with marker)
      const beforeSnapshot = captureSnapshot();

      // 3. Notify Node.js to save before data and take screenshot
      await (window as any).__recordActionBefore({
        action: {
          type: action.type,
          x: action.x,
          y: action.y,
          value: action.value,
          key: action.key,
          timestamp: action.timestamp
        },
        beforeHtml: beforeSnapshot.html,
        beforeTimestamp: beforeSnapshot.timestamp,
        beforeUrl: beforeSnapshot.url,
        beforeViewport: beforeSnapshot.viewport,
        beforeResourceOverrides: beforeSnapshot.resourceOverrides || []
      });

      // 4. Small delay for action to execute and DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Capture AFTER snapshot (marker still present)
      const afterSnapshot = captureSnapshot();

      // 6. Notify Node.js to save after data and take screenshot
      await (window as any).__recordActionAfter({
        afterHtml: afterSnapshot.html,
        afterTimestamp: afterSnapshot.timestamp,
        afterUrl: afterSnapshot.url,
        afterViewport: afterSnapshot.viewport,
        afterResourceOverrides: afterSnapshot.resourceOverrides || []
      });

      // 7. Remove marker attribute
      action.target.removeAttribute('data-recorded-el');

    } catch (err) {
      console.error('Failed to capture action:', err);
      // Clean up marker on error
      action.target.removeAttribute('data-recorded-el');
    }
  });

  console.log('🎬 Session recorder injected and ready');
})();
