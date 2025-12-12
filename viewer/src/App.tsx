/**
 * Main Application Component
 * Provides the layout for the session viewer with editing capabilities
 */

import { useState } from 'react';
import { Timeline } from '@/components/Timeline/Timeline';
import { ActionList } from '@/components/ActionList/ActionList';
import { SnapshotViewer } from '@/components/SnapshotViewer/SnapshotViewer';
import { TabPanel } from '@/components/TabPanel/TabPanel';
import { SessionLoader } from '@/components/SessionLoader/SessionLoader';
import { ResizablePanel } from '@/components/ResizablePanel/ResizablePanel';
import { EditorToolbar } from '@/components/EditorToolbar/EditorToolbar';
import { LocalSessionsView } from '@/components/LocalSessionsView/LocalSessionsView';
import { useSessionStore } from '@/stores/sessionStore';
import { exportSessionToZip, downloadZipFile, getExportFilename } from '@/utils/zipHandler';
import { indexedDBService } from '@/services/indexedDBService';
import './App.css';

function App() {
  const sessionData = useSessionStore((state) => state.sessionData);
  const networkEntries = useSessionStore((state) => state.networkEntries);
  const consoleEntries = useSessionStore((state) => state.consoleEntries);
  const resources = useSessionStore((state) => state.resources);
  const audioBlob = useSessionStore((state) => state.audioBlob);
  const loading = useSessionStore((state) => state.loading);
  const error = useSessionStore((state) => state.error);
  const clearSession = useSessionStore((state) => state.clearSession);

  // Edit state
  const editState = useSessionStore((state) => state.editState);

  // Local sessions panel state
  const [showLocalSessions, setShowLocalSessions] = useState(false);

  // Export with edit operations applied
  const handleExport = async () => {
    if (!sessionData) return;

    try {
      const editOperations = editState?.operations || [];
      const zipBlob = await exportSessionToZip(
        sessionData,
        networkEntries,
        consoleEntries,
        resources,
        { editOperations, audioBlob: audioBlob ?? undefined }
      );
      const filename = getExportFilename(sessionData);
      downloadZipFile(zipBlob, filename);

      // Update export count in IndexedDB if we have edits
      if (editState && editOperations.length > 0) {
        try {
          const metadata = await indexedDBService.getSessionMetadata(sessionData.sessionId);
          if (metadata) {
            await indexedDBService.updateSessionMetadata({
              ...metadata,
              exportCount: metadata.exportCount + 1,
              lastModified: new Date().toISOString(),
            });
          }
        } catch (dbError) {
          console.warn('Failed to update export count:', dbError);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export session');
    }
  };

  return (
    <div className="app">
      <SessionLoader />

      {loading && (
        <div className="app-loading">
          <div className="spinner"></div>
          <p>Loading session...</p>
        </div>
      )}

      {error && (
        <div className="app-error">
          <h3>Error Loading Session</h3>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      )}

      {sessionData && (
        <>
          <header className="app-header">
            <div className="app-header-left">
              <h1>Session Editor</h1>
              <span className="app-header-session-id">
                {sessionData.sessionId.substring(0, 8)}
              </span>
            </div>
            <div className="app-header-stats">
              <span className="stat-item">
                <strong>{sessionData.actions.length}</strong> actions
              </span>
              {sessionData.endTime && (
                <span className="stat-item">
                  <strong>
                    {Math.round(
                      (new Date(sessionData.endTime).getTime() -
                        new Date(sessionData.startTime).getTime()) /
                        1000
                    )}s
                  </strong>{' '}
                  duration
                </span>
              )}
              {sessionData.network && (
                <span className="stat-item">
                  <strong>{sessionData.network.count}</strong> requests
                </span>
              )}
              {sessionData.console && (
                <span className="stat-item">
                  <strong>{sessionData.console.count}</strong> logs
                </span>
              )}
            </div>
            <div className="app-header-actions">
              <button type="button" className="btn-secondary" onClick={clearSession}>
                Close Session
              </button>
              <button type="button" className="btn-primary" onClick={handleExport}>
                Export Session
              </button>
            </div>
          </header>

          {/* Editor Toolbar - shows when edits exist */}
          <EditorToolbar
            onExport={handleExport}
            onShowLocalSessions={() => setShowLocalSessions(true)}
          />

          <div className="app-layout">
            {/* Top: Timeline (Resizable) */}
            <ResizablePanel
              direction="horizontal"
              initialSize={150}
              minSize={100}
              maxSize={400}
              storageKey="timeline-height"
              className="layout-timeline"
            >
              <Timeline />
            </ResizablePanel>

            {/* Main content area */}
            <div className="layout-main">
              {/* Left: Action List (Resizable) */}
              <ResizablePanel
                direction="vertical"
                initialSize={300}
                minSize={200}
                maxSize={600}
                storageKey="sidebar-width"
                className="layout-sidebar"
              >
                <ActionList />
              </ResizablePanel>

              {/* Center: Snapshot Viewer */}
              <main className="layout-content">
                <SnapshotViewer />
              </main>
            </div>

            {/* Bottom: Tab Panel (Resizable from top) */}
            <ResizablePanel
              direction="horizontal"
              initialSize={300}
              minSize={150}
              maxSize={600}
              storageKey="tabs-height"
              className="layout-tabs"
              handlePosition="start"
            >
              <TabPanel />
            </ResizablePanel>
          </div>

          {/* Local Sessions Panel */}
          <LocalSessionsView
            isOpen={showLocalSessions}
            onClose={() => setShowLocalSessions(false)}
            currentSessionId={sessionData.sessionId}
          />
        </>
      )}
    </div>
  );
}

export default App;
