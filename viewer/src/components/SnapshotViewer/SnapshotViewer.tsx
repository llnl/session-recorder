/**
 * Snapshot Viewer Component
 * Displays before/after HTML snapshots in iframes with element highlighting
 */

import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { generateRestorationScript } from '../../../../src/browser/snapshotRestoration';
import './SnapshotViewer.css';

type SnapshotView = 'before' | 'after';

export const SnapshotViewer = () => {
  const selectedAction = useSessionStore((state) => state.getSelectedAction());
  const resources = useSessionStore((state) => state.resources);

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

  // Reset view when action changes
  useEffect(() => {
    setCurrentView('before');
    setZoom(100);
    setError(null);
  }, [selectedAction?.id]);

  // Load snapshot and highlight element
  useEffect(() => {
    if (!selectedAction || !iframeRef.current) return;

    // Voice actions don't have snapshots
    if (selectedAction.type === 'voice_transcript') {
      setError('Voice transcript actions do not have snapshots');
      return;
    }

    const snapshot = currentView === 'before' ? selectedAction.before : selectedAction.after;
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

      // ✅ NEW: Inject restoration script to restore form state, scroll positions, and Shadow DOM
      const htmlWithRestoration = injectRestorationScript(htmlContent);

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
  }, [selectedAction, currentView, resources]);

  const highlightElement = (iframe: HTMLIFrameElement) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Find element with data-recorded-el attribute
      const targetElement = iframeDoc.querySelector('[data-recorded-el="true"]') as HTMLElement;
      if (!targetElement) return;

      // Inject highlighting styles
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

  if (selectedAction.type === 'voice_transcript') {
    return (
      <div className="snapshot-viewer">
        <div className="snapshot-viewer-empty">
          <p>Voice transcript actions do not have snapshots</p>
        </div>
      </div>
    );
  }

  const currentSnapshot = currentView === 'before' ? selectedAction.before : selectedAction.after;

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
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};
