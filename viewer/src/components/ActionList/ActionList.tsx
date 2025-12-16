/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 * Supports inline note insertion, editing, and deletion
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useVirtualList } from '@/hooks/useVirtualList';
import { InlineNoteEditor, InlineFieldEditor, type FieldType } from '@/components/InlineNoteEditor';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { renderMarkdown } from '@/utils/markdownRenderer';
import type { VoiceTranscriptAction, RecordedAction, NavigationAction, PageVisibilityAction, MediaAction, DownloadAction, FullscreenAction, PrintAction, AnyAction, NoteAction } from '@/types/session';
import { isNoteAction } from '@/types/session';
import './ActionList.css';

const ACTION_ITEM_HEIGHT = 80;
const VOICE_ITEM_HEIGHT = 100;
const NAV_ITEM_HEIGHT = 60;
const EVENT_ITEM_HEIGHT = 50;
const NOTE_ITEM_HEIGHT = 80;
const NOTE_EDITING_HEIGHT = 120;
const INSERT_POINT_HEIGHT = 24; // Large enough to click the "+" button

// Type guards
function isVoiceTranscriptAction(action: AnyAction): action is VoiceTranscriptAction {
  return action.type === 'voice_transcript';
}

function isNavigationAction(action: AnyAction): action is NavigationAction {
  return action.type === 'navigation';
}

function isBrowserEventAction(action: AnyAction): action is PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction {
  return ['page_visibility', 'media', 'download', 'fullscreen', 'print'].includes(action.type);
}

// Virtual list item types
type VirtualItemType = 'action' | 'insert-point';

interface VirtualItem {
  type: VirtualItemType;
  actionIndex?: number;
  action?: AnyAction;
  insertAfterActionId: string | null;
}

export const ActionList = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const shouldScrollToAction = useSessionStore((state) => state.shouldScrollToAction);
  const selectAction = useSessionStore((state) => state.selectAction);
  const clearScrollFlag = useSessionStore((state) => state.clearScrollFlag);
  const audioBlob = useSessionStore((state) => state.audioBlob);
  const getEditedActions = useSessionStore((state) => state.getEditedActions);
  const addNote = useSessionStore((state) => state.addNote);
  const editNote = useSessionStore((state) => state.editNote);
  const editActionField = useSessionStore((state) => state.editActionField);
  const deleteAction = useSessionStore((state) => state.deleteAction);

  const editedActions = getEditedActions();

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentSegmentEnd, setCurrentSegmentEnd] = useState<number | null>(null);

  // Inline editing state
  // editingNoteId: ID of note being edited (either existing or newly created)
  // newNoteId: ID of a just-created note that should be deleted if cancelled
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const [editingFieldState, setEditingFieldState] = useState<{
    actionId: string;
    fieldPath: string;
    currentValue: string;
    fieldType: FieldType;
    fieldName?: string;
  } | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    actionId: string;
    actionType: string;
  } | null>(null);

  // Create audio URL from blob
  const audioUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Get the audio recording start time
  const audioStartTime = useMemo(() => {
    if (!sessionData) return null;
    const firstVoice = sessionData.actions.find(isVoiceTranscriptAction);
    if (!firstVoice) return null;
    return new Date(firstVoice.transcript.startTime).getTime();
  }, [sessionData]);

  // Handle audio timeupdate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioStartTime) return;

    const handleTimeUpdate = () => {
      if (currentSegmentEnd !== null) {
        const currentAbsTime = audioStartTime + audio.currentTime * 1000;
        if (currentAbsTime >= currentSegmentEnd) {
          audio.pause();
          setPlayingVoiceId(null);
          setCurrentSegmentEnd(null);
        }
      }
    };

    const handleEnded = () => {
      setPlayingVoiceId(null);
      setCurrentSegmentEnd(null);
    };

    const handlePause = () => {
      if (currentSegmentEnd === null) {
        setPlayingVoiceId(null);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioStartTime, currentSegmentEnd]);

  // Play/pause voice segment
  const handleVoicePlayPause = useCallback((e: React.MouseEvent, voiceAction: VoiceTranscriptAction) => {
    e.stopPropagation();

    const audio = audioRef.current;
    if (!audio || !audioUrl || !audioStartTime) return;

    if (playingVoiceId === voiceAction.id) {
      audio.pause();
      setPlayingVoiceId(null);
      setCurrentSegmentEnd(null);
    } else {
      const segmentStart = new Date(voiceAction.transcript.startTime).getTime();
      const segmentEnd = Math.ceil(new Date(voiceAction.transcript.endTime).getTime() / 1000) * 1000;
      const relativeStart = (segmentStart - audioStartTime) / 1000;

      audio.currentTime = Math.max(0, relativeStart);
      setCurrentSegmentEnd(segmentEnd);
      setPlayingVoiceId(voiceAction.id);
      audio.play().catch(console.error);
    }
  }, [playingVoiceId, audioUrl, audioStartTime]);

  // Build virtual items list (actions + insert points)
  const virtualItems: VirtualItem[] = useMemo(() => {
    const items: VirtualItem[] = [];

    // Add initial insert point (before first action)
    items.push({
      type: 'insert-point',
      insertAfterActionId: null,
    });

    // Add actions with insert points after each
    editedActions.forEach((action, index) => {
      items.push({
        type: 'action',
        actionIndex: index,
        action,
        insertAfterActionId: null,
      });

      // Add insert point after each action
      items.push({
        type: 'insert-point',
        insertAfterActionId: action.id,
      });
    });

    return items;
  }, [editedActions]);

  // Calculate item heights
  const getItemHeight = useCallback((index: number) => {
    const item = virtualItems[index];
    if (!item) return ACTION_ITEM_HEIGHT;

    if (item.type === 'insert-point') {
      return INSERT_POINT_HEIGHT;
    }

    const action = item.action;
    if (!action) return ACTION_ITEM_HEIGHT;

    // Check if this note is being edited inline
    if (isNoteAction(action) && editingNoteId === action.id) {
      return NOTE_EDITING_HEIGHT;
    }
    if (editingFieldState?.actionId === action.id) {
      return isVoiceTranscriptAction(action) ? VOICE_ITEM_HEIGHT + 80 : ACTION_ITEM_HEIGHT + 60;
    }

    if (isNoteAction(action)) return NOTE_ITEM_HEIGHT;
    if (isVoiceTranscriptAction(action)) return VOICE_ITEM_HEIGHT;
    if (isNavigationAction(action)) return NAV_ITEM_HEIGHT;
    if (isBrowserEventAction(action)) return EVENT_ITEM_HEIGHT;
    return ACTION_ITEM_HEIGHT;
  }, [virtualItems, editingNoteId, editingFieldState]);

  const { virtualizer, items: virtualRows, totalSize } = useVirtualList({
    items: virtualItems,
    estimateSize: getItemHeight,
    scrollElement: scrollRef,
    overscan: 5,
  });

  // Store virtualizer in a ref to access current value without dependency
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  // Auto-scroll to selected action (only when requested via shouldScrollToAction)
  useEffect(() => {
    // Only scroll if shouldScrollToAction is true (from URL or timeline click)
    if (!shouldScrollToAction || selectedActionIndex === null || !sessionData) {
      return;
    }

    // Clear the flag immediately so we only scroll once
    clearScrollFlag();

    // Find the virtual row for this action
    const rowIndex = virtualItems.findIndex(
      item => item.type === 'action' && item.actionIndex === selectedActionIndex
    );
    if (rowIndex !== -1) {
      virtualizerRef.current.scrollToIndex(rowIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [shouldScrollToAction, selectedActionIndex, sessionData, virtualItems, clearScrollFlag]);

  const formatTime = (timestamp: string) => {
    if (!sessionData) return '';
    const date = new Date(timestamp);
    const sessionStart = new Date(sessionData.startTime);
    const elapsed = (date.getTime() - sessionStart.getTime()) / 1000;
    return `${elapsed.toFixed(2)}s`;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return '🖱️';
      case 'input':
      case 'change': return '⌨️';
      case 'submit': return '✅';
      case 'keydown': return '🔤';
      case 'voice_transcript': return '🎙️';
      case 'navigation': return '🔗';
      case 'page_visibility': return '👁️';
      case 'media': return '🎬';
      case 'download': return '📥';
      case 'fullscreen': return '📺';
      case 'print': return '🖨️';
      case 'note': return '📝';
      default: return '▶️';
    }
  };

  const getClickDetails = (action: RecordedAction) => {
    const parts: string[] = [];

    if (action.action.button === 1) parts.push('Middle');
    else if (action.action.button === 2) parts.push('Right');

    if (action.action.modifiers) {
      const mods = action.action.modifiers;
      if (mods.ctrl) parts.push('Ctrl');
      if (mods.shift) parts.push('Shift');
      if (mods.alt) parts.push('Alt');
      if (mods.meta) parts.push('Cmd');
    }

    return parts.length > 0 ? parts.join('+') + ' click' : null;
  };

  // Handle insert point click - immediately create a note and put it in edit mode
  const handleInsertPointClick = async (afterActionId: string | null) => {
    // Clear any existing editing state
    setEditingFieldState(null);

    // Create a new empty note immediately
    const noteId = await addNote(afterActionId, '');

    // Put the new note in edit mode and track it as a new note
    if (noteId) {
      setEditingNoteId(noteId);
      setNewNoteId(noteId);
    }
  };

  // Handle editing an existing note
  const handleStartEditNote = (e: React.MouseEvent, note: NoteAction) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setNewNoteId(null); // This is an existing note, not a new one
    setEditingFieldState(null);
  };

  // Handle saving note content
  const handleSaveNote = async (noteId: string, content: string) => {
    if (content.trim()) {
      await editNote(noteId, content.trim());
    } else if (newNoteId === noteId) {
      // Empty content on a new note - delete it
      await deleteAction(noteId);
    }
    setEditingNoteId(null);
    setNewNoteId(null);
  };

  // Handle canceling note edit
  const handleCancelNoteEdit = async (noteId: string) => {
    if (newNoteId === noteId) {
      // This was a new note - delete it
      await deleteAction(noteId);
    }
    setEditingNoteId(null);
    setNewNoteId(null);
  };

  // Handle editing an action field
  const handleStartEditField = (e: React.MouseEvent, actionId: string, fieldPath: string, currentValue: string, fieldType: FieldType, fieldName?: string) => {
    e.stopPropagation();
    setEditingFieldState({ actionId, fieldPath, currentValue, fieldType, fieldName });
    setEditingNoteId(null);
    setNewNoteId(null);
  };

  // Handle saving edited field
  const handleSaveField = async (newValue: string) => {
    if (editingFieldState) {
      await editActionField(editingFieldState.actionId, editingFieldState.fieldPath, newValue);
      setEditingFieldState(null);
    }
  };

  // Handle delete confirmation
  const handleDeleteAction = (e: React.MouseEvent, action: AnyAction) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      actionId: action.id,
      actionType: action.type,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await deleteAction(deleteConfirm.actionId);
      setDeleteConfirm(null);
    }
  };

  // Cancel field editing
  const cancelFieldEditing = () => {
    setEditingFieldState(null);
  };

  if (!sessionData) {
    return (
      <div className="action-list">
        <div className="action-list-header">
          <h3>Actions</h3>
        </div>
        <div className="action-list-content action-list-empty">
          <p>No session loaded</p>
        </div>
      </div>
    );
  }

  // Check for multi-tab
  const hasMultipleTabs = sessionData.actions.some(
    a => !isVoiceTranscriptAction(a) && !isNavigationAction(a) && !isNoteAction(a) && (a as RecordedAction).tabId !== undefined && (a as RecordedAction).tabId !== 0
  ) || sessionData.actions.some(
    a => isNavigationAction(a) && (a as NavigationAction).tabId !== 0
  );

  // Render insert point (just a hover target, no editing state)
  const renderInsertPoint = (item: VirtualItem, virtualRow: any) => {
    const afterActionId = item.insertAfterActionId;

    return (
      <div
        key={`insert-${afterActionId || 'start'}`}
        className="action-insert-point"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => handleInsertPointClick(afterActionId)}
      >
        <div className="action-insert-point-line" />
        <button
          type="button"
          className="action-insert-point-button"
          onClick={(e) => {
            e.stopPropagation();
            handleInsertPointClick(afterActionId);
          }}
          title="Add note here"
        >
          +
        </button>
      </div>
    );
  };

  // Render note action
  const renderNoteAction = (action: NoteAction, virtualRow: any, isSelected: boolean, actionIndex: number) => {
    const isEditing = editingNoteId === action.id;
    const isNew = newNoteId === action.id;

    return (
      <div
        key={`${action.id}-${virtualRow.index}`}
        className={`action-list-item note-item ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => !isEditing && selectAction(actionIndex)}
      >
        <div className="action-list-item-header">
          <span className="action-list-item-icon">📝</span>
          <span className="action-list-item-type">Note</span>
          <span className="action-list-item-time">
            {formatTime(action.timestamp)}
          </span>
          {!isEditing && (
            <div className="action-item-buttons">
              <button
                type="button"
                className="action-edit-btn"
                onClick={(e) => handleStartEditNote(e, action)}
                title="Edit note"
              >
                ✏️
              </button>
              <button
                type="button"
                className="action-delete-btn"
                onClick={(e) => handleDeleteAction(e, action)}
                title="Delete note"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <InlineNoteEditor
            initialContent={isNew ? '' : action.note.content}
            placeholder="Type your note..."
            onSave={(content) => handleSaveNote(action.id, content)}
            onCancel={() => handleCancelNoteEdit(action.id)}
          />
        ) : (
          <div
            className="action-list-item-details note-content markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(action.note.content) }}
          />
        )}
      </div>
    );
  };

  // Render voice transcript action
  const renderVoiceAction = (action: VoiceTranscriptAction, virtualRow: any, isSelected: boolean, actionIndex: number) => {
    const duration = ((new Date(action.transcript.endTime).getTime() -
                      new Date(action.transcript.startTime).getTime()) / 1000).toFixed(1);
    const isPlayingThis = playingVoiceId === action.id;
    const isEditing = editingFieldState?.actionId === action.id;

    return (
      <div
        key={`${action.id}-${virtualRow.index}`}
        className={`action-list-item voice-item ${isSelected ? 'selected' : ''} ${isPlayingThis ? 'playing' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => !isEditing && selectAction(actionIndex)}
      >
        <div className="action-list-item-header">
          <span className="action-list-item-icon">🎙️</span>
          <span className="action-list-item-type">Voice Transcript</span>
          <span className="action-list-item-time">
            {formatTime(action.timestamp)}
          </span>
          <div className="action-item-buttons">
            <button
              type="button"
              className="action-edit-btn"
              onClick={(e) => handleStartEditField(e, action.id, 'transcript.text', action.transcript.text, 'markdown', 'Transcript')}
              title="Edit transcript"
            >
              ✏️
            </button>
            <button
              type="button"
              className="action-delete-btn"
              onClick={(e) => handleDeleteAction(e, action)}
              title="Delete action"
            >
              🗑️
            </button>
          </div>
        </div>

        {isEditing ? (
          <InlineFieldEditor
            value={editingFieldState.currentValue}
            fieldType={editingFieldState.fieldType}
            onSave={handleSaveField}
            onCancel={cancelFieldEditing}
          />
        ) : (
          <div className="action-list-item-details voice-text">
            {action.transcript.text.substring(0, 80)}
            {action.transcript.text.length > 80 ? '...' : ''}
          </div>
        )}

        {!isEditing && (
          <div className="action-list-item-meta voice-meta">
            {audioUrl && (
              <button
                type="button"
                className={`voice-play-btn ${isPlayingThis ? 'playing' : ''}`}
                onClick={(e) => handleVoicePlayPause(e, action)}
                title={isPlayingThis ? 'Pause' : 'Play segment'}
              >
                {isPlayingThis ? '❚❚' : '▶'}
              </button>
            )}
            <span className="voice-duration">{duration}s</span>
            <span className="voice-confidence">
              {(action.transcript.confidence * 100).toFixed(0)}%
            </span>
            {action.transcript.mergedSegments && (
              <span
                className="voice-merged-indicator"
                title={`Merged from ${action.transcript.mergedSegments.count} segments`}
              >
                ({action.transcript.mergedSegments.count} merged)
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render navigation action
  const renderNavigationAction = (action: NavigationAction, virtualRow: any, isSelected: boolean, actionIndex: number) => {
    const displayUrl = action.navigation.toUrl.length > 50
      ? action.navigation.toUrl.substring(0, 47) + '...'
      : action.navigation.toUrl;

    return (
      <div
        key={`${action.id}-${virtualRow.index}`}
        className={`action-list-item navigation-item ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => selectAction(actionIndex)}
      >
        <div className="action-list-item-header">
          <span className="action-list-item-icon">🔗</span>
          {hasMultipleTabs && (
            <span className="action-list-item-tab" title={action.navigation.toUrl}>
              Tab {action.tabId + 1}
            </span>
          )}
          <span className="action-list-item-type">
            {action.navigation.navigationType === 'initial' ? 'Page Load' : 'Navigation'}
          </span>
          <span className="action-list-item-time">
            {formatTime(action.timestamp)}
          </span>
          <div className="action-item-buttons">
            <button
              type="button"
              className="action-delete-btn"
              onClick={(e) => handleDeleteAction(e, action)}
              title="Delete action"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="action-list-item-url navigation-url" title={action.navigation.toUrl}>
          {displayUrl}
        </div>
      </div>
    );
  };

  // Render browser event action
  const renderBrowserEventAction = (action: PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction, virtualRow: any, isSelected: boolean, actionIndex: number) => {
    let eventDescription = '';
    let eventClass = 'event-item';

    if (action.type === 'page_visibility') {
      const visAction = action as PageVisibilityAction;
      eventDescription = visAction.visibility.state === 'visible' ? 'Tab Focused' : 'Tab Switched';
      eventClass = visAction.visibility.state === 'visible' ? 'event-item visibility-visible' : 'event-item visibility-hidden';
    } else if (action.type === 'media') {
      const mediaAction = action as MediaAction;
      eventDescription = `${mediaAction.media.mediaType} ${mediaAction.media.event}`;
      eventClass = 'event-item media-item';
    } else if (action.type === 'download') {
      const dlAction = action as DownloadAction;
      eventDescription = `${dlAction.download.suggestedFilename || 'File'} (${dlAction.download.state})`;
      eventClass = dlAction.download.state === 'completed' ? 'event-item download-completed' : 'event-item download-item';
    } else if (action.type === 'fullscreen') {
      const fsAction = action as FullscreenAction;
      eventDescription = fsAction.fullscreen.state === 'entered' ? 'Entered fullscreen' : 'Exited fullscreen';
      eventClass = 'event-item fullscreen-item';
    } else if (action.type === 'print') {
      const printAction = action as PrintAction;
      eventDescription = printAction.print.event === 'beforeprint' ? 'Print started' : 'Print ended';
      eventClass = 'event-item print-item';
    }

    return (
      <div
        key={`${action.id}-${virtualRow.index}`}
        className={`action-list-item ${eventClass} ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => selectAction(actionIndex)}
      >
        <div className="action-list-item-header">
          <span className="action-list-item-icon">{getActionIcon(action.type)}</span>
          {hasMultipleTabs && 'tabId' in action && (
            <span className="action-list-item-tab">
              Tab {(action as any).tabId + 1}
            </span>
          )}
          <span className="action-list-item-type">{eventDescription}</span>
          <span className="action-list-item-time">
            {formatTime(action.timestamp)}
          </span>
          <div className="action-item-buttons">
            <button
              type="button"
              className="action-delete-btn"
              onClick={(e) => handleDeleteAction(e, action)}
              title="Delete action"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render browser action (click, input, etc.)
  const renderBrowserAction = (action: RecordedAction, virtualRow: any, isSelected: boolean, actionIndex: number) => {
    const isEditing = editingFieldState?.actionId === action.id;

    return (
      <div
        key={`${action.id}-${virtualRow.index}`}
        className={`action-list-item ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => !isEditing && selectAction(actionIndex)}
      >
        <div className="action-list-item-header">
          <span className="action-list-item-icon">
            {getActionIcon(action.type)}
          </span>
          {hasMultipleTabs && action.tabId !== undefined && (
            <span className="action-list-item-tab" title={action.tabUrl || 'Tab ' + action.tabId}>
              Tab {action.tabId + 1}
            </span>
          )}
          <span className="action-list-item-type">{action.type}</span>
          <span className="action-list-item-time">
            {formatTime(action.timestamp)}
          </span>
          <div className="action-item-buttons">
            {action.action.value && (
              <button
                type="button"
                className="action-edit-btn"
                onClick={(e) => handleStartEditField(e, action.id, 'action.value', action.action.value!, 'text', 'Value')}
                title="Edit value"
              >
                ✏️
              </button>
            )}
            <button
              type="button"
              className="action-delete-btn"
              onClick={(e) => handleDeleteAction(e, action)}
              title="Delete action"
            >
              🗑️
            </button>
          </div>
        </div>

        {isEditing ? (
          <InlineFieldEditor
            value={editingFieldState.currentValue}
            fieldType={editingFieldState.fieldType}
            onSave={handleSaveField}
            onCancel={cancelFieldEditing}
          />
        ) : (
          <>
            {action.action.value && (
              <div className="action-list-item-details">
                <span className="action-list-item-value">
                  {action.action.value.substring(0, 50)}
                  {action.action.value.length > 50 ? '...' : ''}
                </span>
              </div>
            )}

            {action.action.key && (
              <div className="action-list-item-details">
                <span className="action-list-item-key">Key: {action.action.key}</span>
              </div>
            )}

            {action.action.type === 'click' && getClickDetails(action) && (
              <div className="action-list-item-details">
                <span className="action-list-item-modifiers">{getClickDetails(action)}</span>
              </div>
            )}
          </>
        )}

        <div className="action-list-item-url">
          {action.before.url}
        </div>
      </div>
    );
  };

  return (
    <div className="action-list">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" className="audio-hidden" />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Action"
          message={`Are you sure you want to delete this ${deleteConfirm.actionType === 'note' ? 'note' : 'action'}? This cannot be undone.`}
          confirmText="Delete"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="action-list-header">
        <h3>Actions</h3>
        <span className="action-list-count">
          {editedActions.length} / {sessionData.actions.length}
        </span>
      </div>

      <div className="action-list-content" ref={scrollRef}>
        {editedActions.length === 0 ? (
          <div className="action-list-empty">
            <p>No actions in selected time range</p>
            <button
              type="button"
              className="action-list-add-first-note-btn"
              onClick={() => handleInsertPointClick(null)}
            >
              + Add Note
            </button>
          </div>
        ) : (
          <div
            className="action-list-virtual-container"
            style={{ height: `${totalSize}px`, position: 'relative' }}
          >
            {virtualRows.map((virtualRow) => {
              const item = virtualItems[virtualRow.index];
              if (!item) return null;

              // Render insert point
              if (item.type === 'insert-point') {
                return renderInsertPoint(item, virtualRow);
              }

              // Render action
              const action = item.action!;
              const actionIndex = item.actionIndex!;
              const isSelected = selectedActionIndex === actionIndex;

              if (isNoteAction(action)) {
                return renderNoteAction(action, virtualRow, isSelected, actionIndex);
              }

              if (isVoiceTranscriptAction(action)) {
                return renderVoiceAction(action, virtualRow, isSelected, actionIndex);
              }

              if (isNavigationAction(action)) {
                return renderNavigationAction(action, virtualRow, isSelected, actionIndex);
              }

              if (isBrowserEventAction(action)) {
                return renderBrowserEventAction(action, virtualRow, isSelected, actionIndex);
              }

              return renderBrowserAction(action as RecordedAction, virtualRow, isSelected, actionIndex);
            })}
          </div>
        )}
      </div>
    </div>
  );
};
