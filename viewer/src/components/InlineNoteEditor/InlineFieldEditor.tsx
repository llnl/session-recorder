/**
 * InlineFieldEditor Component
 * Compact inline editor for editing action fields and transcripts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import './InlineNoteEditor.css';

export type FieldType = 'text' | 'markdown';

export interface InlineFieldEditorProps {
  /** Display label for the field */
  label?: string;
  /** Current value */
  value: string;
  /** Field type: 'text' for single line, 'markdown' for multi-line */
  fieldType: FieldType;
  /** Callback when saving */
  onSave: (newValue: string) => void;
  /** Callback when canceling */
  onCancel: () => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

export const InlineFieldEditor = ({
  label,
  value: initialValue,
  fieldType,
  onSave,
  onCancel,
  autoFocus = true,
}: InlineFieldEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    if (autoFocus) {
      const el = fieldType === 'text' ? inputRef.current : textareaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [autoFocus, fieldType]);

  // Auto-resize textarea
  useEffect(() => {
    if (fieldType === 'markdown' && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value, fieldType]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Enter to save (for text fields), Ctrl+Enter for markdown
      if (e.key === 'Enter') {
        if (fieldType === 'text' && !e.shiftKey) {
          e.preventDefault();
          if (value !== initialValue) {
            onSave(value);
          } else {
            onCancel();
          }
        } else if (fieldType === 'markdown' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (value !== initialValue) {
            onSave(value);
          } else {
            onCancel();
          }
        }
      }
    },
    [value, initialValue, fieldType, onSave, onCancel]
  );

  const handleSave = () => {
    if (value !== initialValue) {
      onSave(value);
    } else {
      onCancel();
    }
  };

  return (
    <div className="inline-field-editor">
      {label && <div className="inline-field-editor-label">{label}</div>}

      {fieldType === 'text' ? (
        <input
          ref={inputRef}
          type="text"
          className="inline-field-editor-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <textarea
          ref={textareaRef}
          className="inline-field-editor-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
      )}

      <div className="inline-field-editor-actions">
        <span className="inline-field-editor-hint">
          {fieldType === 'text' ? (
            <><kbd>Enter</kbd> save | <kbd>Esc</kbd> cancel</>
          ) : (
            <><kbd>Ctrl</kbd>+<kbd>Enter</kbd> save | <kbd>Esc</kbd> cancel</>
          )}
        </span>
        <div className="inline-field-editor-buttons">
          <button
            type="button"
            className="inline-field-editor-btn inline-field-editor-btn-cancel"
            onClick={onCancel}
            title="Cancel (Esc)"
          >
            ✕
          </button>
          <button
            type="button"
            className="inline-field-editor-btn inline-field-editor-btn-save"
            onClick={handleSave}
            title={fieldType === 'text' ? 'Save (Enter)' : 'Save (Ctrl+Enter)'}
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};
