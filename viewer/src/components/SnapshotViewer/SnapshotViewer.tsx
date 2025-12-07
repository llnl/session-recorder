/**
 * Snapshot Viewer Component
 * Displays before/after HTML snapshots in iframes with element highlighting
 */

import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { generateRestorationScript } from '../../../../src/browser/snapshotRestoration';
import type { RecordedAction } from '@/types/session';
import './SnapshotViewer.css';

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

  /**
   * Find the closest previous action that has snapshots (for voice transcript actions)
   */
  const getClosestSnapshotAction = (): { action: RecordedAction; index: number } | null => {
    if (!sessionData || selectedActionIndex === null) return null;

    // Search backwards from the current action
    for (let i = selectedActionIndex - 1; i >= 0; i--) {
      const action = sessionData.actions[i];
      if (action.type !== 'voice_transcript' && 'before' in action && 'after' in action) {
        return { action: action as RecordedAction, index: i };
      }
    }
    return null;
  };

  const [currentView, setCurrentView] = useState<SnapshotView>('before');
  const [zoom, setZoom] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Reset view when action changes
  useEffect(() => {
    setCurrentView('before');
    setZoom(100);
    setError(null);
  }, [selectedAction?.id]);

  // Load snapshot and highlight element
  useEffect(() => {
    if (!selectedAction || !iframeRef.current) return;

    // Determine which action to use for snapshots
    let actionForSnapshot: RecordedAction | null = null;

    if (selectedAction.type === 'voice_transcript') {
      // Find closest previous action with snapshots
      const fallback = getClosestSnapshotAction();
      if (!fallback) {
        setError('No snapshots available before this voice transcript');
        return;
      }
      actionForSnapshot = fallback.action;
    } else {
      actionForSnapshot = selectedAction as RecordedAction;
    }

    const snapshot = currentView === 'before' ? actionForSnapshot.before : actionForSnapshot.after;
    const htmlPath = snapshot.html;

    // Get HTML content from resources
    const htmlBlob = resources.get(htmlPath);
    if (!htmlBlob) {
      setError(`Snapshot not found: ${htmlPath}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Load HTML into iframe
    htmlBlob.text().then((htmlContent) => {
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
      let processedHtml = removeChromeUrls(htmlContent);

      // Convert resource paths to blob URLs so CSS/images load correctly
      let htmlWithBlobUrls = convertResourcePathsToBlobUrls(processedHtml, resources);
      // Also convert CSS url() references (fonts, background images in inline styles)
      htmlWithBlobUrls = convertCSSUrlsToBlobUrls(htmlWithBlobUrls, resources);

      // Inject restoration script to restore form state, scroll positions, and Shadow DOM
      const htmlWithRestoration = injectRestorationScript(htmlWithBlobUrls);

      iframeDoc.open();
      iframeDoc.write(htmlWithRestoration);
      iframeDoc.close();

      // Wait for iframe to load
      iframe.onload = () => {
        setIsLoading(false);

        // Highlight element only for 'before' snapshot
        if (currentView === 'before') {
          highlightElement(iframe);
        }
      };
    }).catch((err) => {
      setError(`Failed to load snapshot: ${err.message}`);
      setIsLoading(false);
    });
  }, [selectedAction, currentView, resources, sessionData, selectedActionIndex]);

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

  // For voice transcripts, find the closest previous snapshot
  const fallbackSnapshot = selectedAction.type === 'voice_transcript' ? getClosestSnapshotAction() : null;

  if (selectedAction.type === 'voice_transcript' && !fallbackSnapshot) {
    return (
      <div className="snapshot-viewer">
        <div className="snapshot-viewer-empty">
          <p>No snapshots available before this voice transcript</p>
        </div>
      </div>
    );
  }

  // Use fallback action for voice transcripts
  const displayAction = selectedAction.type === 'voice_transcript' && fallbackSnapshot
    ? fallbackSnapshot.action
    : selectedAction as RecordedAction;

  const currentSnapshot = currentView === 'before' ? displayAction.before : displayAction.after;

  return (
    <div className="snapshot-viewer">
      <div className="snapshot-viewer-controls">
        {/* Before/After Toggle */}
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
        <div className="snapshot-metadata">
          {fallbackSnapshot && (
            <span className="metadata-item fallback-notice">
              Showing snapshot from previous action
            </span>
          )}
          <span className="metadata-item">
            <strong>URL:</strong> {currentSnapshot.url}
          </span>
          <span className="metadata-item">
            <strong>Viewport:</strong> {currentSnapshot.viewport.width} × {currentSnapshot.viewport.height}
          </span>
          <span className="metadata-item">
            <strong>Time:</strong> {new Date(currentSnapshot.timestamp).toLocaleTimeString()}
          </span>
        </div>
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

        <div className="snapshot-iframe-container" style={{ transform: `scale(${zoom / 100})` }}>
          <iframe
            ref={iframeRef}
            className="snapshot-iframe"
            title={`${currentView} snapshot`}
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
};
