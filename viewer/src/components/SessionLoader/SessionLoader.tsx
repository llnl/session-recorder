/**
 * Session Loader Component
 * Handles importing sessions from zip files or directories
 * Shows previous sessions from IndexedDB for quick reload
 */

import { useRef, useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { importSessionFromZip } from '@/utils/zipHandler';
import { loadSessionFromFiles } from '@/utils/sessionLoader';
import { indexedDBService } from '@/services/indexedDBService';
import type { LocalSessionMetadata } from '@/types/editOperations';
import './SessionLoader.css';

interface SessionLoaderProps {
  pendingSessionId?: string | null;
}

export const SessionLoader = ({ pendingSessionId }: SessionLoaderProps) => {
  const loadSession = useSessionStore((state) => state.loadSession);
  const loadSessionFromStorage = useSessionStore((state) => state.loadSessionFromStorage);
  const setLoading = useSessionStore((state) => state.setLoading);
  const setError = useSessionStore((state) => state.setError);
  const sessionData = useSessionStore((state) => state.sessionData);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<LocalSessionMetadata[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(true);

  // Load previous sessions on mount
  useEffect(() => {
    const loadPreviousSessions = async () => {
      try {
        const sessions = await indexedDBService.getAllSessionMetadata();
        // Filter to only sessions with stored blobs
        const sessionsWithBlobs = sessions.filter((s) => s.hasStoredBlob);
        setPreviousSessions(sessionsWithBlobs);
      } catch (error) {
        console.warn('Failed to load previous sessions:', error);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousSessions();
  }, []);

  const handleZipImport = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const loadedData = await importSessionFromZip(file);
      // Pass the original file blob for storage
      loadSession(loadedData, file);

      console.log('Session loaded successfully:', loadedData.sessionData.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setError(message);
      console.error('Session load error:', error);
    }
  };

  const handleFilesImport = async (files: FileList) => {
    try {
      setLoading(true);
      setError(null);

      const loadedData = await loadSessionFromFiles(files);
      // Note: Directory imports don't store blob (no single file)
      loadSession(loadedData);

      console.log('Session loaded successfully:', loadedData.sessionData.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setError(message);
      console.error('Session load error:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if it's a single zip file
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      await handleZipImport(files[0]);
    } else {
      // Multiple files from directory
      await handleFilesImport(files);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Check if it's a single zip file
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      await handleZipImport(files[0]);
    } else {
      await handleFilesImport(files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadPreviousSession = async (sessionId: string) => {
    const success = await loadSessionFromStorage(sessionId);
    if (!success) {
      // Remove from list if blob is no longer available
      setPreviousSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    }
  };

  const handleDeletePreviousSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await indexedDBService.deleteAllSessionData(sessionId);
      setPreviousSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessionData) {
    return null; // Hide loader when session is loaded
  }

  return (
    <div className="session-loader">
      <div className="session-loader-container">
        {/* Show pending session message when URL has session ID but blob not found */}
        {pendingSessionId && (
          <div className="session-loader-pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="session-loader-pending-content">
              <strong>Session requested from URL:</strong>
              <code>{pendingSessionId}</code>
              <span>Please load the session file below</span>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.json"
          multiple
          onChange={handleFileSelect}
          className="session-loader-input"
          aria-label="Select session file"
          title="Select session file to import"
        />

        <div
          className={`session-loader-dropzone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="session-loader-content">
            <svg className="session-loader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>

            <h2>Import Session Recording</h2>
            <p className="session-loader-description">
              Drag and drop a session zip file here, or click to browse
            </p>

            <button type="button" className="session-loader-button" onClick={handleButtonClick}>
              Choose File
            </button>

            <p className="session-loader-hint">
              Supports: .zip archives or multiple session files
            </p>
          </div>
        </div>

        {/* Previous Sessions Section */}
        {!loadingPrevious && previousSessions.length > 0 && (
          <div className="session-loader-previous">
            <h3 className="session-loader-previous-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Previous Sessions
            </h3>
            <div className="session-loader-previous-list">
              {previousSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="session-loader-previous-item"
                >
                  <button
                    type="button"
                    className="session-loader-previous-item-load"
                    onClick={() => handleLoadPreviousSession(session.sessionId)}
                  >
                    <span className="session-loader-previous-item-name">
                      {session.displayName}
                    </span>
                    <span className="session-loader-previous-item-meta">
                      {session.actionCount !== undefined && (
                        <span className="session-loader-previous-item-actions">
                          {session.actionCount} actions
                        </span>
                      )}
                      {session.editCount > 0 && (
                        <span className="session-loader-previous-item-edits">
                          {session.editCount} edits
                        </span>
                      )}
                      <span className="session-loader-previous-item-date">
                        {formatDate(session.lastModified)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="session-loader-previous-item-delete"
                    onClick={(e) => handleDeletePreviousSession(e, session.sessionId)}
                    title="Delete session"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
