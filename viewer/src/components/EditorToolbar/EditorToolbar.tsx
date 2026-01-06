/**
 * EditorToolbar Component
 * Toolbar with undo/redo, edit count, and export functionality
 */

import { useEffect, useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import './EditorToolbar.css';

export interface EditorToolbarProps {
  /** Callback when export is requested */
  onExport?: () => void;
  /** Callback when local sessions view is requested */
  onShowLocalSessions?: () => void;
}

export const EditorToolbar = ({ onExport, onShowLocalSessions }: EditorToolbarProps) => {
  const editState = useSessionStore((state) => state.editState);
  const undo = useSessionStore((state) => state.undo);
  const redo = useSessionStore((state) => state.redo);
  const canUndo = useSessionStore((state) => state.canUndo);
  const canRedo = useSessionStore((state) => state.canRedo);
  const getEditCount = useSessionStore((state) => state.getEditCount);
  const getDisplayName = useSessionStore((state) => state.getDisplayName);

  const editCount = getEditCount();
  const displayName = getDisplayName();
  const canUndoValue = canUndo();
  const canRedoValue = canRedo();

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      const modKey = e.ctrlKey || e.metaKey;
      if (!modKey) return;

      // Ctrl+Z for undo
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndoValue) {
          undo();
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (canRedoValue) {
          redo();
        }
        return;
      }
    },
    [canUndoValue, canRedoValue, undo, redo]
  );

  // Add/remove keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!editState) {
    return null;
  }

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-left">
        {onShowLocalSessions && (
          <button
            type="button"
            className="editor-toolbar-btn editor-toolbar-btn-secondary"
            onClick={onShowLocalSessions}
            title="View local sessions with edits"
          >
            <span className="editor-toolbar-btn-icon">📂</span>
            Local Sessions
          </button>
        )}
      </div>

      <div className="editor-toolbar-center">
        <span className="editor-toolbar-session-name" title={displayName}>
          {displayName}
        </span>
        {editCount > 0 && (
          <span className="editor-toolbar-edit-badge" title={`${editCount} change${editCount !== 1 ? 's' : ''}`}>
            {editCount} {editCount === 1 ? 'change' : 'changes'}
          </span>
        )}
      </div>

      <div className="editor-toolbar-right">
        <div className="editor-toolbar-undo-redo">
          <button
            type="button"
            className="editor-toolbar-btn editor-toolbar-btn-icon-only"
            onClick={() => undo()}
            disabled={!canUndoValue}
            title="Undo (Ctrl+Z)"
          >
            <span className="editor-toolbar-btn-icon">↶</span>
          </button>
          <button
            type="button"
            className="editor-toolbar-btn editor-toolbar-btn-icon-only"
            onClick={() => redo()}
            disabled={!canRedoValue}
            title="Redo (Ctrl+Y)"
          >
            <span className="editor-toolbar-btn-icon">↷</span>
          </button>
        </div>

        {onExport && (
          <button
            type="button"
            className="editor-toolbar-btn editor-toolbar-btn-primary"
            onClick={onExport}
            title="Export session with edits"
          >
            <span className="editor-toolbar-btn-icon">📤</span>
            Export
          </button>
        )}
      </div>
    </div>
  );
};
