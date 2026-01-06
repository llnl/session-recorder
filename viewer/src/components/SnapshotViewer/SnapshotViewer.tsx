/**
 * Snapshot Viewer Component
 * Displays before/after HTML snapshots in iframes with element highlighting
 * Supports gzip-compressed snapshots (TR-1 compression)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { generateRestorationScript } from '../../../../src/browser/snapshotRestoration';
import { useLazyResource } from '@/hooks/useLazyResource';
import { ungzip } from 'pako';
import type { RecordedAction, AnyAction, BrowserEventSnapshot, NavigationAction, PageVisibilityAction, MediaAction, DownloadAction, FullscreenAction, PrintAction } from '@/types/session';
import './SnapshotViewer.css';

/**
 * Decompress gzip-compressed blob content (TR-1 compression support)
 * Returns the decompressed string, or the original text if not gzip
 */
async function decompressIfGzip(blob: Blob, path: string): Promise<string> {
  // Check if the file is gzip compressed (by extension or magic bytes)
  const isGzipPath = path.endsWith('.gz');

  if (isGzipPath) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check gzip magic bytes (1f 8b)
      if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
        const decompressed = ungzip(uint8Array);
        return new TextDecoder('utf-8').decode(decompressed);
      }
    } catch (err) {
      console.warn('Failed to decompress gzip, trying as plain text:', err);
    }
  }

  // Not gzip or decompression failed - try as plain text
  return blob.text();
}

// Type guard for voice transcripts (only type without any screenshot)
function isVoiceTranscript(action: AnyAction): boolean {
  return action.type === 'voice_transcript';
}

// Type guard for browser events that have their own snapshot field
function isBrowserEventWithSnapshot(action: AnyAction): action is (PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction) {
  return ['page_visibility', 'media', 'download', 'fullscreen', 'print'].includes(action.type);
}

// Type guard for navigation events (has different screenshot structure)
function isNavigationAction(action: AnyAction): action is NavigationAction {
  return action.type === 'navigation';
}

// Get the snapshot from a browser event
// Returns null if the browser event has an HTML snapshot (should use iframe instead)
function getBrowserEventScreenshotOnly(action: AnyAction): BrowserEventSnapshot | null {
  if (isBrowserEventWithSnapshot(action)) {
    const snapshot = action.snapshot;
    // Only return for screenshot-only display if there's no HTML snapshot
    if (snapshot && !snapshot.html) {
      return snapshot;
    }
  }
  return null;
}

// Get browser event snapshot metadata (for display purposes)
function getBrowserEventSnapshot(action: AnyAction): BrowserEventSnapshot | null {
  if (isBrowserEventWithSnapshot(action)) {
    return action.snapshot || null;
  }
  return null;
}

// Get display name for event types
function getEventTypeName(type: string, action?: AnyAction): string {
  switch (type) {
    case 'voice_transcript': return 'voice transcript';
    case 'navigation': return 'navigation';
    case 'page_visibility': {
      if (action && 'visibility' in action) {
        const visAction = action as PageVisibilityAction;
        return visAction.visibility.state === 'visible' ? 'Tab Focused' : 'Tab Switched';
      }
      return 'tab visibility';
    }
    case 'media': return 'media event';
    case 'download': return 'download';
    case 'fullscreen': return 'fullscreen';
    case 'print': return 'print event';
    default: return type;
  }
}

type SnapshotView = 'before' | 'after';

// Track created blob URLs for cleanup
const blobUrlCache = new Map<string, string>();

/**
 * Remove Chrome-specific URLs that won't work in iframe
 * Handles chrome://, chrome-extension://, etc.
 */
function removeChromeUrls(html: string): string {
  // Remove chrome:// and chrome-extension:// URLs from src and href attributes
  // Replace with placeholder or empty string to avoid broken images
  return html
    .replace(/src=["']chrome:\/\/[^"']*["']/gi, 'src=""')
    .replace(/href=["']chrome:\/\/[^"']*["']/gi, 'href=""')
    .replace(/src=["']chrome-extension:\/\/[^"']*["']/gi, 'src=""')
    .replace(/href=["']chrome-extension:\/\/[^"']*["']/gi, 'href=""');
}

/**
 * Convert relative resource paths in HTML to blob URLs
 * HTML references resources like ../resources/xxx.css (relative to snapshots/)
 * We need to convert these to blob URLs from our resources Map
 */
function convertResourcePathsToBlobUrls(
  html: string,
  resources: Map<string, Blob>
): string {
  // Determine the base path for resolving relative URLs
  // snapshotPath is like "snapshots/action-1-before.html"
  // Resources are keyed like "resources/xxx.css"

  // Pattern to match resource references in href and src attributes
  // Matches: href="../resources/xxx" or src="../resources/xxx" or href="resources/xxx"
  const resourcePattern = /(?:href|src)=["']([^"']*?(?:\.\.\/)?resources\/[^"']+)["']/gi;

  return html.replace(resourcePattern, (match, relativePath) => {
    // Normalize the path - remove ../ prefix if present
    let resourceKey = relativePath;
    if (relativePath.startsWith('../')) {
      resourceKey = relativePath.substring(3); // Remove "../"
    }

    // Check if we have this resource
    const blob = resources.get(resourceKey);
    if (!blob) {
      // Try without any path manipulation
      const altBlob = resources.get(relativePath);
      if (!altBlob) {
        console.warn(`Resource not found: ${resourceKey} (original: ${relativePath})`);
        return match; // Keep original if not found
      }
      resourceKey = relativePath;
    }

    // Check cache first
    if (blobUrlCache.has(resourceKey)) {
      const blobUrl = blobUrlCache.get(resourceKey)!;
      return match.replace(relativePath, blobUrl);
    }

    // Create blob URL
    const resourceBlob = resources.get(resourceKey)!;
    const blobUrl = URL.createObjectURL(resourceBlob);
    blobUrlCache.set(resourceKey, blobUrl);

    return match.replace(relativePath, blobUrl);
  });
}

/**
 * Convert CSS url() references to blob URLs
 * Handles font URLs and background images in inline styles and <style> tags
 */
function convertCSSUrlsToBlobUrls(
  html: string,
  resources: Map<string, Blob>
): string {
  // Pattern to match CSS url() references pointing to our resources
  // Matches: url('../resources/xxx') or url("../resources/xxx") or url(../resources/xxx)
  const cssUrlPattern = /url\(\s*(['"]?)([^'")]*?(?:\.\.\/)?resources\/[^'")]+)\1\s*\)/gi;

  return html.replace(cssUrlPattern, (match, quote, relativePath) => {
    // Normalize the path - remove ../ prefix if present
    let resourceKey = relativePath;
    if (relativePath.startsWith('../')) {
      resourceKey = relativePath.substring(3); // Remove "../"
    }

    // Check if we have this resource
    const blob = resources.get(resourceKey);
    if (!blob) {
      // Try without any path manipulation
      const altBlob = resources.get(relativePath);
      if (!altBlob) {
        // Resource not found - keep original
        return match;
      }
      resourceKey = relativePath;
    }

    // Check cache first
    if (blobUrlCache.has(resourceKey)) {
      const blobUrl = blobUrlCache.get(resourceKey)!;
      return `url(${quote}${blobUrl}${quote})`;
    }

    // Create blob URL
    const resourceBlob = resources.get(resourceKey)!;
    const blobUrl = URL.createObjectURL(resourceBlob);
    blobUrlCache.set(resourceKey, blobUrl);

    return `url(${quote}${blobUrl}${quote})`;
  });
}

export const SnapshotViewer = () => {
  const selectedAction = useSessionStore((state) => state.getSelectedAction());
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const resources = useSessionStore((state) => state.resources);
  const lazyLoadEnabled = useSessionStore((state) => state.lazyLoadEnabled);
  const getResourceLazy = useSessionStore((state) => state.getResourceLazy);

  /**
   * Find the closest previous action that has snapshots
   * (only for voice_transcript which has no screenshots)
   */
  const getClosestSnapshotAction = (): { action: RecordedAction; index: number } | null => {
    if (!sessionData || selectedActionIndex === null) return null;

    // Search backwards from the current action for a RecordedAction with snapshots
    for (let i = selectedActionIndex - 1; i >= 0; i--) {
      const action = sessionData.actions[i];
      // Only RecordedActions have before/after HTML snapshots
      if ('before' in action && 'after' in action && 'html' in (action as RecordedAction).before) {
        return { action: action as RecordedAction, index: i };
      }
    }
    return null;
  };

  const [currentView, setCurrentView] = useState<SnapshotView>('before');
  const [zoom, setZoom] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);
  // Loading state is set true by default and set false after load completes
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Injects the restoration script into snapshot HTML
   * This script restores form values, checkboxes, scroll positions, and Shadow DOM
   */
  const injectRestorationScript = (html: string): string => {
    const script = `<script type="text/javascript">${generateRestorationScript()}</script>`;

    // Try to inject before closing </head>
    if (html.includes('</head>')) {
      return html.replace('</head>', `${script}\n</head>`);
    }

    // Fallback: inject at start of <body>
    if (html.includes('<body')) {
      return html.replace(/<body([^>]*)>/, `<body$1>\n${script}`);
    }

    // Last resort: prepend to HTML
    return script + html;
  };

  // Cleanup blob URLs when session changes or component unmounts
  useEffect(() => {
    return () => {
      // Revoke all blob URLs to prevent memory leaks
      blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
      blobUrlCache.clear();
    };
  }, [sessionData?.sessionId]);

  // Track previous action to reset view state during render (not in effect)
  const prevActionIdRef = useRef<string | undefined>(undefined);
  if (selectedAction?.id !== prevActionIdRef.current) {
    prevActionIdRef.current = selectedAction?.id;
    // Reset state synchronously during render when action changes
    // For input/change actions, default to "after" to show the result of the action
    const isInputAction = selectedAction?.type === 'input' || selectedAction?.type === 'change';
    const defaultView = isInputAction ? 'after' : 'before';
    if (currentView !== defaultView) setCurrentView(defaultView);
    if (zoom !== 100) setZoom(100);
    if (error !== null) setError(null);
  }

  // Browser event screenshot path (for lazy loading)
  const browserEventScreenshotPath = useMemo(() => {
    if (!selectedAction) return null;
    const eventSnapshot = getBrowserEventScreenshotOnly(selectedAction);
    return eventSnapshot?.screenshot || null;
  }, [selectedAction]);

  // Use lazy loading hook for browser event screenshots
  const {
    url: lazyScreenshotUrl,
  } = useLazyResource(browserEventScreenshotPath, { enabled: lazyLoadEnabled });

  // Derive browser event screenshot data using useMemo (avoids setState in effects)
  // Only used for browser events that DON'T have HTML snapshots (screenshot-only fallback)
  const browserEventData = useMemo(() => {
    if (!selectedAction) return null;
    // Only return screenshot data if there's no HTML snapshot available
    const eventSnapshot = getBrowserEventScreenshotOnly(selectedAction);
    if (!eventSnapshot) return null;

    // Use lazy loaded URL if available, otherwise fall back to direct resources
    if (lazyLoadEnabled && lazyScreenshotUrl) {
      return {
        screenshotUrl: lazyScreenshotUrl,
        snapshot: eventSnapshot
      };
    }

    // Direct resource access for non-lazy mode
    const screenshotBlob = resources.get(eventSnapshot.screenshot);
    if (!screenshotBlob) return null;

    return {
      screenshotUrl: URL.createObjectURL(screenshotBlob),
      snapshot: eventSnapshot
    };
  }, [selectedAction, resources, lazyLoadEnabled, lazyScreenshotUrl]);

  // Cleanup blob URL when browserEventData changes
  useEffect(() => {
    return () => {
      if (browserEventData?.screenshotUrl) {
        URL.revokeObjectURL(browserEventData.screenshotUrl);
      }
    };
  }, [browserEventData]);

  // Compute HTML path for actions that need iframe display (memoized to prevent re-renders)
  const htmlSnapshotPath = useMemo((): { path: string } | { error: string } | null => {
    if (!selectedAction || browserEventData) return null;

    if (isVoiceTranscript(selectedAction)) {
      // Voice transcript - need fallback from previous action
      if (!sessionData || selectedActionIndex === null) return { error: 'No session data' };
      for (let i = selectedActionIndex - 1; i >= 0; i--) {
        const action = sessionData.actions[i];
        if ('before' in action && 'after' in action && 'html' in (action as RecordedAction).before) {
          const recordedAction = action as RecordedAction;
          const snapshot = currentView === 'before' ? recordedAction.before : recordedAction.after;
          return { path: snapshot.html };
        }
      }
      return { error: 'No snapshots available before this voice transcript' };
    }

    if (isNavigationAction(selectedAction)) {
      if (!selectedAction.snapshot?.html) {
        return { error: 'No HTML snapshot available for this navigation' };
      }
      return { path: selectedAction.snapshot.html };
    }

    // Browser events with HTML snapshots (page_visibility, media, download, fullscreen, print)
    if (isBrowserEventWithSnapshot(selectedAction)) {
      const snapshot = getBrowserEventSnapshot(selectedAction);
      if (snapshot?.html) {
        return { path: snapshot.html };
      }
      // No HTML, will fall through to screenshot-only display via browserEventData
      return null;
    }

    if ('before' in selectedAction && 'after' in selectedAction) {
      const recordedAction = selectedAction as RecordedAction;
      const snapshot = currentView === 'before' ? recordedAction.before : recordedAction.after;
      return { path: snapshot.html };
    }

    return { error: `No snapshot available for this ${getEventTypeName(selectedAction.type, selectedAction)}` };
  }, [selectedAction, browserEventData, sessionData, selectedActionIndex, currentView]);

  // Highlight the target element in the iframe
  const highlightElement = (iframe: HTMLIFrameElement) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Find element with data-recorded-el attribute
      const targetElement = iframeDoc.querySelector('[data-recorded-el="true"]') as HTMLElement;
      if (!targetElement) return;

      // Inject highlighting styles and improve appearance of broken resources
      const style = iframeDoc.createElement('style');
      style.textContent = `
        [data-recorded-el="true"] {
          outline: 3px solid #ff6b6b !important;
          outline-offset: 2px !important;
          background-color: rgba(255, 107, 107, 0.1) !important;
          position: relative !important;
        }
        [data-recorded-el="true"]::before {
          content: '';
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 12px !important;
          height: 12px !important;
          background-color: #ff6b6b !important;
          border-radius: 50% !important;
          border: 2px solid white !important;
          box-shadow: 0 0 0 2px #ff6b6b !important;
          pointer-events: none !important;
          z-index: 999999 !important;
        }
        /* Hide broken images to improve appearance */
        img[src=""], img:not([src]) {
          display: none;
        }
      `;
      iframeDoc.head.appendChild(style);

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error('Failed to highlight element:', err);
    }
  };

  // Load HTML snapshot into iframe (browser events are handled by useMemo above)
  useEffect(() => {
    // Skip if no valid HTML path (browser events, errors handled elsewhere)
    if (!htmlSnapshotPath || 'error' in htmlSnapshotPath) return;
    if (!iframeRef.current) return;

    const htmlPath = htmlSnapshotPath.path;
    let cancelled = false;

    const loadHtmlSnapshot = async () => {
      setIsLoading(true);

      try {
        // Get HTML content from resources (lazy or direct)
        let htmlBlob: Blob | null = null;

        if (lazyLoadEnabled) {
          // Use lazy loading
          htmlBlob = await getResourceLazy(htmlPath);
        } else {
          // Direct resource access
          htmlBlob = resources.get(htmlPath) || null;
        }

        if (cancelled) return;

        if (!htmlBlob) {
          setError('Snapshot not found');
          setIsLoading(false);
          return;
        }

        // Decompress if gzip-compressed (TR-1 compression support)
        const htmlContent = await decompressIfGzip(htmlBlob, htmlPath);
        if (cancelled) return;

        const iframe = iframeRef.current;
        if (!iframe) return;

        // Write content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          setError('Failed to access iframe document');
          setIsLoading(false);
          return;
        }

        // Remove Chrome-specific URLs that won't work in iframe
        const processedHtml = removeChromeUrls(htmlContent);

        // Convert resource paths to blob URLs so CSS/images load correctly
        // Also convert CSS url() references (fonts, background images in inline styles)
        const htmlWithBlobUrls = convertCSSUrlsToBlobUrls(
          convertResourcePathsToBlobUrls(processedHtml, resources),
          resources
        );

        // Inject restoration script to restore form state, scroll positions, and Shadow DOM
        const htmlWithRestoration = injectRestorationScript(htmlWithBlobUrls);

        iframeDoc.open();
        iframeDoc.write(htmlWithRestoration);
        iframeDoc.close();

        // Wait for iframe to load
        iframe.onload = () => {
          if (cancelled) return;
          setIsLoading(false);

          // Highlight and scroll to the target element (works for both before/after views)
          highlightElement(iframe);
        };
      } catch (err) {
        if (cancelled) return;
        setError(`Failed to load snapshot: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadHtmlSnapshot();

    return () => {
      cancelled = true;
    };
  }, [htmlSnapshotPath, resources, currentView, lazyLoadEnabled, getResourceLazy]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  if (!selectedAction) {
    return (
      <div className="snapshot-viewer">
        <div className="snapshot-viewer-empty">
          <p>Select an action to view snapshots</p>
        </div>
      </div>
    );
  }

  // Check if we're displaying a browser event screenshot
  const hasBrowserEventScreenshot = browserEventData !== null;

  // For voice transcripts only, find the closest previous snapshot (they have no screenshots)
  const needsFallback = isVoiceTranscript(selectedAction);
  const fallbackSnapshot = needsFallback ? getClosestSnapshotAction() : null;

  if (needsFallback && !fallbackSnapshot && !hasBrowserEventScreenshot) {
    const actionType = getEventTypeName(selectedAction.type, selectedAction);
    return (
      <div className="snapshot-viewer">
        <div className="snapshot-viewer-empty">
          <p>No snapshots available before this {actionType}</p>
        </div>
      </div>
    );
  }

  // Determine what snapshot metadata to show
  const isRecordedAction = 'before' in selectedAction && 'after' in selectedAction;
  const isNavigation = isNavigationAction(selectedAction);
  const displayAction = isRecordedAction
    ? selectedAction as RecordedAction
    : fallbackSnapshot?.action;

  const currentSnapshot = displayAction
    ? (currentView === 'before' ? displayAction.before : displayAction.after)
    : null;

  // Get navigation snapshot metadata
  const navigationSnapshot = isNavigation && selectedAction.snapshot
    ? {
        url: selectedAction.snapshot.url,
        viewport: selectedAction.snapshot.viewport,
        timestamp: selectedAction.timestamp
      }
    : null;

  // Get browser event snapshot metadata (for events with HTML snapshots)
  const browserEventMetadata = isBrowserEventWithSnapshot(selectedAction)
    ? getBrowserEventSnapshot(selectedAction)
    : null;

  // Use browser event snapshot metadata, navigation metadata, or recorded action snapshot
  const displayMetadata = browserEventData?.snapshot || browserEventMetadata || navigationSnapshot || currentSnapshot;

  // Check if this is a browser event (for displaying event type badge)
  const isBrowserEvent = isBrowserEventWithSnapshot(selectedAction);

  return (
    <div className="snapshot-viewer">
      <div className="snapshot-viewer-controls">
        {/* Before/After Toggle - only show for RecordedActions */}
        {isRecordedAction && !hasBrowserEventScreenshot && (
          <div className="snapshot-toggle">
            <button
              type="button"
              className={`toggle-btn ${currentView === 'before' ? 'active' : ''}`}
              onClick={() => setCurrentView('before')}
            >
              Before
            </button>
            <button
              type="button"
              className={`toggle-btn ${currentView === 'after' ? 'active' : ''}`}
              onClick={() => setCurrentView('after')}
            >
              After
            </button>
          </div>
        )}

        {/* Event type indicator for browser events and navigation */}
        {(isBrowserEvent || isNavigation) && (
          <div className="snapshot-event-type">
            <span className="event-type-badge">
              {getEventTypeName(selectedAction.type, selectedAction)}
            </span>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button type="button" onClick={handleZoomOut} disabled={zoom <= 50}>
            −
          </button>
          <span className="zoom-level">{zoom}%</span>
          <button type="button" onClick={handleZoomIn} disabled={zoom >= 200}>
            +
          </button>
          <button type="button" onClick={handleResetZoom}>
            Reset
          </button>
        </div>

        {/* Snapshot Metadata */}
        {displayMetadata && (
          <div className="snapshot-metadata">
            {fallbackSnapshot && (
              <span className="metadata-item fallback-notice">
                Showing snapshot from previous action
              </span>
            )}
            <span className="metadata-item">
              <strong>URL:</strong> {displayMetadata.url}
            </span>
            <span className="metadata-item">
              <strong>Viewport:</strong> {displayMetadata.viewport.width} × {displayMetadata.viewport.height}
            </span>
            <span className="metadata-item">
              <strong>Time:</strong> {new Date(displayMetadata.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      <div className="snapshot-viewer-content">
        {isLoading && (
          <div className="snapshot-loading">
            <div className="spinner"></div>
            <p>Loading snapshot...</p>
          </div>
        )}

        {error && (
          <div className="snapshot-error">
            <p>{error}</p>
          </div>
        )}

        {/* Browser event screenshot - display as image */}
        {hasBrowserEventScreenshot && browserEventData && (
          <div className="snapshot-image-container" style={{ transform: `scale(${zoom / 100})` }}>
            <img
              src={browserEventData.screenshotUrl}
              alt={`${getEventTypeName(selectedAction.type, selectedAction)} screenshot`}
              className="snapshot-image"
            />
          </div>
        )}

        {/* HTML snapshot - display in iframe */}
        {!hasBrowserEventScreenshot && (
          <div className="snapshot-iframe-container" style={{ transform: `scale(${zoom / 100})` }}>
            <iframe
              key={`${selectedAction?.id}-${currentView}`}
              ref={iframeRef}
              className="snapshot-iframe"
              title={`${currentView} snapshot`}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  );
};
