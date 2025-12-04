/**
 * Main Application Component
 * Provides the layout for the session viewer
 */

import { Timeline } from '@/components/Timeline/Timeline';
import { ActionList } from '@/components/ActionList/ActionList';
import { SnapshotViewer } from '@/components/SnapshotViewer/SnapshotViewer';
import { TabPanel } from '@/components/TabPanel/TabPanel';
import { SessionLoader } from '@/components/SessionLoader/SessionLoader';
import { useSessionStore } from '@/stores/sessionStore';
import { exportSessionToZip, downloadZipFile, getExportFilename } from '@/utils/zipHandler';
import './App.css';

function App() {
  const sessionData = useSessionStore((state) => state.sessionData);
  const networkEntries = useSessionStore((state) => state.networkEntries);
  const consoleEntries = useSessionStore((state) => state.consoleEntries);
  const resources = useSessionStore((state) => state.resources);
  const loading = useSessionStore((state) => state.loading);
  const error = useSessionStore((state) => state.error);
  const clearSession = useSessionStore((state) => state.clearSession);

  const handleExport = async () => {
    if (!sessionData) return;

    try {
      const zipBlob = await exportSessionToZip(
        sessionData,
        networkEntries,
        consoleEntries,
        resources
      );
      const filename = getExportFilename(sessionData);
      downloadZipFile(zipBlob, filename);
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
              <h1>Session Recorder Viewer</h1>
              <span className="app-header-session-id">
                {sessionData.sessionId.substring(0, 8)}
              </span>
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

          <div className="app-layout">
            {/* Top: Timeline */}
            <div className="layout-timeline">
              <Timeline />
            </div>

            {/* Main content area */}
            <div className="layout-main">
              {/* Left: Action List */}
              <aside className="layout-sidebar">
                <ActionList />
              </aside>

              {/* Center: Snapshot Viewer */}
              <main className="layout-content">
                <SnapshotViewer />
              </main>
            </div>

            {/* Bottom: Tab Panel */}
            <div className="layout-tabs">
              <TabPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
