/**
 * InlineFieldEditor Component
 * Minimal inline editor - input replaces text directly with buttons inside
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import './InlineNoteEditor.css';

export type FieldType = 'text' | 'markdown';

export interface InlineFieldEditorProps {
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
  value: initialValue,
  fieldType: _fieldType,
  onSave,
  onCancel,
  autoFocus = true,
}: InlineFieldEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (value !== initialValue) {
          onSave(value);
        } else {
          onCancel();
        }
      }
    },
    [value, initialValue, onSave, onCancel]
  );

  const handleSave = () => {
    if (value !== initialValue) {
      onSave(value);
    } else {
      onCancel();
    }
  };

  return (
    <div className="compact-field-editor">
      <div className="compact-field-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="compact-field-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Edit value..."
        />
        <div className="compact-field-buttons">
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
            title="Save (Enter)"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};
