/**
 * InlineNoteEditor Component
 * Minimal inline note editor - same size as action items
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import './InlineNoteEditor.css';

export interface InlineNoteEditorProps {
  /** Initial content for editing existing notes */
  initialContent?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Callback when saving the note */
  onSave: (content: string) => void;
  /** Callback when canceling */
  onCancel: () => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

export const InlineNoteEditor = ({
  initialContent = '',
  placeholder = 'Add a note...',
  onSave,
  onCancel,
  autoFocus = true,
}: InlineNoteEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (initialContent) {
        inputRef.current.select();
      }
    }
  }, [autoFocus, initialContent]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Enter to save
      if (e.key === 'Enter') {
        e.preventDefault();
        if (content.trim()) {
          onSave(content.trim());
        }
        return;
      }
    },
    [content, onSave, onCancel]
  );

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  return (
    <div className="compact-note-editor">
      <div className="compact-note-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="compact-note-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck
        />
        <div className="compact-note-buttons">
          <button
            type="button"
            className="compact-field-btn compact-field-btn-cancel"
            onClick={onCancel}
            title="Cancel (Esc)"
          >
            ✕
          </button>
          <button
            type="button"
            className="compact-field-btn compact-field-btn-save"
            onClick={handleSave}
            disabled={!content.trim()}
            title="Save (Enter)"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};
