/**
 * ActionEditor Component
 * For editing action fields and transcripts
 * Supports inline text editing and modal editing for markdown
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { NoteEditor } from '@/components/NoteEditor/NoteEditor';
import './ActionEditor.css';

export type FieldType = 'text' | 'markdown';

export interface ActionEditorProps {
  /** ID of the action being edited */
  actionId: string;
  /** Dot-notation path to the field being edited */
  fieldPath: string;
  /** Current value of the field */
  currentValue: string;
  /** Type of field: 'text' for simple input, 'markdown' for textarea with preview */
  fieldType: FieldType;
  /** Display name for the field */
  fieldName?: string;
  /** Callback when saving the edit */
  onSave: (actionId: string, fieldPath: string, newValue: string) => void;
  /** Callback when canceling the edit */
  onCancel: () => void;
}

export const ActionEditor = ({
  actionId,
  fieldPath,
  currentValue,
  fieldType,
  fieldName,
  onSave,
  onCancel,
}: ActionEditorProps) => {
  const [value, setValue] = useState(currentValue);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount for inline editing
  useEffect(() => {
    if (fieldType === 'text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (fieldType === 'markdown') {
      // Open modal for markdown editing
      setIsModalOpen(true);
    }
  }, [fieldType]);

  // Handle keyboard shortcuts for inline editing
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value !== currentValue) {
          onSave(actionId, fieldPath, value);
        } else {
          onCancel();
        }
      }
    },
    [actionId, fieldPath, value, currentValue, onSave, onCancel]
  );

  // Handle inline save
  const handleInlineSave = () => {
    if (value !== currentValue) {
      onSave(actionId, fieldPath, value);
    } else {
      onCancel();
    }
  };

  // Handle modal save for markdown
  const handleModalSave = (newContent: string) => {
    if (newContent !== currentValue) {
      onSave(actionId, fieldPath, newContent);
    } else {
      onCancel();
    }
    setIsModalOpen(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    onCancel();
  };

  // Determine display label for the field
  const displayName = fieldName || fieldPath.split('.').pop() || 'Field';

  // Render markdown editor in modal
  if (fieldType === 'markdown') {
    return (
      <NoteEditor
        isOpen={isModalOpen}
        initialContent={currentValue}
        title={`Edit ${displayName}`}
        onSave={handleModalSave}
        onClose={handleModalClose}
      />
    );
  }

  // Render inline text editor
  return (
    <div className="action-editor-inline">
      <div className="action-editor-inline-label">{displayName}</div>
      <div className="action-editor-inline-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="action-editor-inline-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleInlineSave}
        />
        <div className="action-editor-inline-actions">
          <button
            type="button"
            className="action-editor-inline-btn action-editor-inline-btn-save"
            onClick={handleInlineSave}
            title="Save (Enter)"
          >
            ✓
          </button>
          <button
            type="button"
            className="action-editor-inline-btn action-editor-inline-btn-cancel"
            onClick={onCancel}
            title="Cancel (Esc)"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="action-editor-inline-original">
        Original: <span className="action-editor-inline-original-value">{currentValue}</span>
      </div>
    </div>
  );
};

/**
 * Hook to manage action editing state
 */
export interface EditingState {
  actionId: string;
  fieldPath: string;
  currentValue: string;
  fieldType: FieldType;
  fieldName?: string;
}

export function useActionEditor() {
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  const startEditing = useCallback(
    (actionId: string, fieldPath: string, currentValue: string, fieldType: FieldType, fieldName?: string) => {
      setEditingState({ actionId, fieldPath, currentValue, fieldType, fieldName });
    },
    []
  );

  const stopEditing = useCallback(() => {
    setEditingState(null);
  }, []);

  return {
    editingState,
    startEditing,
    stopEditing,
    isEditing: editingState !== null,
  };
}
