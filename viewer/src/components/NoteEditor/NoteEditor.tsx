/**
 * NoteEditor Component
 * Modal for creating and editing notes with markdown support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { renderMarkdown } from '@/utils/markdownRenderer';
import './NoteEditor.css';

export interface NoteEditorProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial content for editing existing notes */
  initialContent?: string;
  /** Title for the modal */
  title?: string;
  /** Callback when saving the note */
  onSave: (content: string) => void;
  /** Callback when closing without saving */
  onClose: () => void;
}

type TabMode = 'edit' | 'preview';

export const NoteEditor = ({
  isOpen,
  initialContent = '',
  title = 'Add Note',
  onSave,
  onClose,
}: NoteEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<TabMode>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset content when modal opens with new initialContent
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setActiveTab('edit');
    }
  }, [isOpen, initialContent]);

  // Focus textarea when modal opens in edit mode
  useEffect(() => {
    if (isOpen && activeTab === 'edit' && textareaRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeTab]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl+Enter to save
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (content.trim()) {
          onSave(content.trim());
        }
        return;
      }
    },
    [isOpen, content, onSave, onClose]
  );

  // Add/remove keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle click outside modal to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="note-editor-overlay" onClick={handleOverlayClick}>
      <div className="note-editor-modal" ref={modalRef}>
        <div className="note-editor-header">
          <h3 className="note-editor-title">{title}</h3>
          <button
            type="button"
            className="note-editor-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="note-editor-tabs">
          <button
            type="button"
            className={`note-editor-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={`note-editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>

        <div className="note-editor-content">
          {activeTab === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="note-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your note... (Markdown supported)"
              spellCheck
            />
          ) : (
            <div
              className="note-editor-preview markdown-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<p class="preview-empty">Nothing to preview</p>' }}
            />
          )}
        </div>

        <div className="note-editor-footer">
          <div className="note-editor-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
          </div>
          <div className="note-editor-actions">
            <button
              type="button"
              className="note-editor-btn note-editor-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="note-editor-btn note-editor-btn-save"
              onClick={handleSave}
              disabled={!content.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
