/**
 * LocalSessionsView Component
 * Panel showing all sessions with local edits stored in IndexedDB
 */

import { useState, useEffect } from 'react';
import { indexedDBService } from '@/services/indexedDBService';
import type { LocalSessionMetadata } from '@/types/editOperations';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import './LocalSessionsView.css';

export interface LocalSessionsViewProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback to load a session (user should provide zip file) */
  onLoadSession?: () => void;
  /** Current session ID (to highlight) */
  currentSessionId?: string;
  /** Callback when current session is renamed (to sync with store) */
  onRenameCurrentSession?: (newName: string) => void;
}

export const LocalSessionsView = ({
  isOpen,
  onClose,
  onLoadSession,
  currentSessionId,
  onRenameCurrentSession,
}: LocalSessionsViewProps) => {
  const [sessions, setSessions] = useState<LocalSessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    sessionId: string;
    displayName: string;
  } | null>(null);

  // Load sessions on mount and when panel opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const metadata = await indexedDBService.getAllSessionMetadata();
      // Sort by last modified, newest first
      metadata.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
      setSessions(metadata);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load local sessions');
    } finally {
      setLoading(false);
    }
  };

  // Start renaming a session
  const startRename = (session: LocalSessionMetadata) => {
    setEditingId(session.sessionId);
    setEditName(session.displayName);
  };

  // Save renamed session
  const saveRename = async (sessionId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }

    const trimmedName = editName.trim();

    try {
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        await indexedDBService.updateSessionMetadata({
          ...session,
          displayName: trimmedName,
        });
        await loadSessions();

        // If renaming the current session, also notify the parent to update the store
        if (sessionId === currentSessionId && onRenameCurrentSession) {
          onRenameCurrentSession(trimmedName);
        }
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
    setEditingId(null);
  };

  // Handle rename keyboard shortcuts
  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename(sessionId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  // Show delete confirmation
  const confirmDelete = (session: LocalSessionMetadata) => {
    setDeleteConfirm({
      isOpen: true,
      sessionId: session.sessionId,
      displayName: session.displayName,
    });
  };

  // Perform delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await indexedDBService.deleteSessionEditState(deleteConfirm.sessionId);
      await indexedDBService.deleteSessionMetadata(deleteConfirm.sessionId);
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
    setDeleteConfirm(null);
  };

  // Format date for display
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Handle click outside modal to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="local-sessions-overlay" onClick={handleOverlayClick}>
        <div className="local-sessions-panel">
          <div className="local-sessions-header">
            <h3 className="local-sessions-title">Local Sessions</h3>
            <button
              type="button"
              className="local-sessions-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="local-sessions-content">
            {loading ? (
              <div className="local-sessions-loading">
                <span className="spinner"></span>
                Loading sessions...
              </div>
            ) : error ? (
              <div className="local-sessions-error">
                <span className="error-icon">❌</span>
                {error}
              </div>
            ) : sessions.length === 0 ? (
              <div className="local-sessions-empty">
                <span className="empty-icon">📁</span>
                <p>No local sessions</p>
                <p className="empty-hint">
                  Sessions with edits will appear here
                </p>
              </div>
            ) : (
              <div className="local-sessions-list">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`local-session-card ${session.sessionId === currentSessionId ? 'current' : ''}`}
                  >
                    <div className="local-session-header">
                      {editingId === session.sessionId ? (
                        <input
                          type="text"
                          className="local-session-name-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => handleRenameKeyDown(e, session.sessionId)}
                          onBlur={() => saveRename(session.sessionId)}
                          autoFocus
                        />
                      ) : (
                        <span className="local-session-name">{session.displayName}</span>
                      )}
                      {session.sessionId === currentSessionId && (
                        <span className="local-session-current-badge">Current</span>
                      )}
                    </div>

                    <div className="local-session-meta">
                      <span className="local-session-id" title={session.sessionId}>
                        {session.sessionId.substring(0, 8)}
                      </span>
                      <span className="local-session-date">
                        Last modified: {formatDate(session.lastModified)}
                      </span>
                    </div>

                    <div className="local-session-stats">
                      {session.editCount > 0 && (
                        <span className="local-session-stat local-session-edits">
                          {session.editCount} edit{session.editCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {session.exportCount > 0 && (
                        <span className="local-session-stat local-session-exports">
                          Exported {session.exportCount}x
                        </span>
                      )}
                    </div>

                    <div className="local-session-actions">
                      <button
                        type="button"
                        className="local-session-btn local-session-btn-rename"
                        onClick={() => startRename(session)}
                        title="Rename session"
                      >
                        ✏️ Rename
                      </button>
                      <button
                        type="button"
                        className="local-session-btn local-session-btn-delete"
                        onClick={() => confirmDelete(session)}
                        title="Delete local edits"
                      >
                        🗑️ Delete Edits
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="local-sessions-footer">
            {onLoadSession && (
              <button
                type="button"
                className="local-sessions-load-btn"
                onClick={onLoadSession}
              >
                Load Session File...
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Local Edits"
          message={`Are you sure you want to delete all local edits for "${deleteConfirm.displayName}"? This cannot be undone.`}
          confirmText="Delete Edits"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
};
