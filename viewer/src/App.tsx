/**
 * Main Application Component
 * Provides the layout for the session viewer with editing capabilities
 * Supports URL-based deep linking for sessions and actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Timeline } from '@/components/Timeline/Timeline';
import { ActionList } from '@/components/ActionList/ActionList';
import { SnapshotViewer } from '@/components/SnapshotViewer/SnapshotViewer';
import { TabPanel } from '@/components/TabPanel/TabPanel';
import { SessionLoader } from '@/components/SessionLoader/SessionLoader';
import { ResizablePanel } from '@/components/ResizablePanel/ResizablePanel';
import { EditorToolbar } from '@/components/EditorToolbar/EditorToolbar';
import { LocalSessionsView } from '@/components/LocalSessionsView/LocalSessionsView';
import { InlineSessionName } from '@/components/InlineSessionName/InlineSessionName';
import { useSessionStore } from '@/stores/sessionStore';
import { exportSessionToZip, downloadZipFile, getExportFilename } from '@/utils/zipHandler';
import { indexedDBService } from '@/services/indexedDBService';
import { useUrlState, parseUrlState } from '@/hooks/useUrlState';
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
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const getEditedActions = useSessionStore((state) => state.getEditedActions);
  const selectActionById = useSessionStore((state) => state.selectActionById);
  const loadSessionFromStorage = useSessionStore((state) => state.loadSessionFromStorage);
  const getDisplayName = useSessionStore((state) => state.getDisplayName);
  const setDisplayName = useSessionStore((state) => state.setDisplayName);

  // Edit state
  const editState = useSessionStore((state) => state.editState);

  // Local sessions panel state
  const [showLocalSessions, setShowLocalSessions] = useState(false);

  // URL state management
  const { setSessionInUrl, setActionInUrl, clearUrlState } = useUrlState();
  const pendingActionId = useRef<string | null>(null);
  const hasInitialized = useRef(false);

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

  // Handle closing session and clearing URL
  const handleCloseSession = useCallback(() => {
    clearSession();
    clearUrlState();
  }, [clearSession, clearUrlState]);

  // Load session from URL on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadFromUrl = async () => {
      const urlState = parseUrlState();

      if (urlState.session) {
        // Store pending action to select after session loads
        if (urlState.action) {
          pendingActionId.current = urlState.action;
        }

        // Try to load the session from storage
        const success = await loadSessionFromStorage(urlState.session);
        if (!success) {
          // Clear invalid URL params if session doesn't exist
          clearUrlState();
        }
      }
    };

    loadFromUrl();
  }, [loadSessionFromStorage, clearUrlState]);

  // Update URL when session loads
  useEffect(() => {
    if (sessionData) {
      setSessionInUrl(sessionData.sessionId);

      // Handle pending action selection
      if (pendingActionId.current) {
        const success = selectActionById(pendingActionId.current);
        if (!success) {
          // Clear invalid action param
          setActionInUrl(null);
        }
        pendingActionId.current = null;
      }
    }
  }, [sessionData, setSessionInUrl, selectActionById, setActionInUrl]);

  // Update URL when action is selected
  useEffect(() => {
    if (sessionData && selectedActionIndex !== null) {
      const actions = getEditedActions();
      const selectedAction = actions[selectedActionIndex];
      if (selectedAction) {
        setActionInUrl(selectedAction.id);
      }
    } else if (sessionData) {
      // Clear action param when no action selected
      setActionInUrl(null);
    }
  }, [sessionData, selectedActionIndex, getEditedActions, setActionInUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlState = parseUrlState();

      if (!urlState.session && sessionData) {
        // User navigated back to no session
        clearSession();
      } else if (urlState.session && sessionData && urlState.session !== sessionData.sessionId) {
        // User navigated to a different session
        loadSessionFromStorage(urlState.session);
      } else if (urlState.action && sessionData) {
        // User navigated to a different action
        selectActionById(urlState.action);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessionData, clearSession, loadSessionFromStorage, selectActionById]);

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
              <InlineSessionName
                displayName={getDisplayName()}
                sessionId={sessionData.sessionId}
                onSave={setDisplayName}
              />
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
              <button type="button" className="btn-secondary" onClick={handleCloseSession}>
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
            onRenameCurrentSession={setDisplayName}
          />
        </>
      )}
    </div>
  );
}

export default App;
