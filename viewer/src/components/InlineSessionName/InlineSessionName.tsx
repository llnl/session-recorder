/**
 * InlineSessionName Component
 * Minimal inline editable session name - buttons inside input
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import './InlineSessionName.css';

export interface InlineSessionNameProps {
  /** Current display name */
  displayName: string;
  /** Session ID (shown as subtitle) */
  sessionId: string;
  /** Callback when name is saved */
  onSave: (name: string) => void;
}

export const InlineSessionName = ({
  displayName,
  sessionId: _sessionId,
  onSave,
}: InlineSessionNameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSavedRef = useRef(false);

  // Update editValue when displayName changes externally (only when not editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(displayName);
    }
  }, [displayName, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      hasSavedRef.current = false;
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setEditValue(displayName);
    setIsEditing(true);
  }, [displayName]);

  const handleSave = useCallback(() => {
    if (hasSavedRef.current) return;

    const trimmed = editValue.trim();
    if (trimmed) {
      hasSavedRef.current = true;
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    hasSavedRef.current = true;
    setEditValue(displayName);
    setIsEditing(false);
  }, [displayName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  if (isEditing) {
    return (
      <div className="inline-session-name-editing">
        <input
          ref={inputRef}
          type="text"
          className="inline-session-name-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Session name"
        />
        <div className="inline-session-name-buttons">
          <button
            type="button"
            className="inline-session-btn inline-session-btn-cancel"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
            onClick={handleCancel}
            title="Cancel (Esc)"
          >
            ✕
          </button>
          <button
            type="button"
            className="inline-session-btn inline-session-btn-save"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
            onClick={handleSave}
            title="Save (Enter)"
          >
            ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="inline-session-name"
      onClick={handleStartEdit}
      title="Click to rename session"
    >
      <span className="inline-session-name-text">{displayName}</span>
      <span className="inline-session-name-edit-icon">✏️</span>
    </button>
  );
};
