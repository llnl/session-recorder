/**
 * InlineSessionName Component
 * Inline editable session name for the header
 * Clicking on the name shows an input field for editing
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

  // Update editValue when displayName changes externally
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
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setEditValue(displayName);
    setIsEditing(true);
  }, [displayName]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayName) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, displayName, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(displayName);
    setIsEditing(false);
  }, [displayName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      handleSave();
    }, 100);
  }, [handleSave]);

  if (isEditing) {
    return (
      <div className="inline-session-name inline-session-name-editing">
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
        <span className="inline-session-name-hint">Enter to save, Esc to cancel</span>
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
