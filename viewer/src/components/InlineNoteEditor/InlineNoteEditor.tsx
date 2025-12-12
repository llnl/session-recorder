/**
 * InlineNoteEditor Component
 * Compact inline editor for creating and editing notes
 * Replaces modal-based note editing with inline experience
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
  placeholder = 'Add a note... (Markdown supported)',
  onSave,
  onCancel,
  autoFocus = true,
}: InlineNoteEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      if (initialContent) {
        textareaRef.current.select();
      }
    }
  }, [autoFocus, initialContent]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Ctrl/Cmd + Enter to save
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
    <div className="inline-note-editor">
      <textarea
        ref={textareaRef}
        className="inline-note-editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        spellCheck
      />
      <div className="inline-note-editor-actions">
        <span className="inline-note-editor-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> save | <kbd>Esc</kbd> cancel
        </span>
        <div className="inline-note-editor-buttons">
          <button
            type="button"
            className="inline-note-editor-btn inline-note-editor-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-note-editor-btn inline-note-editor-btn-save"
            onClick={handleSave}
            disabled={!content.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
