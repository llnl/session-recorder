/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 * Supports note insertion, editing, and deletion
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useVirtualList } from '@/hooks/useVirtualList';
import { NoteEditor } from '@/components/NoteEditor/NoteEditor';
import { ActionEditor, useActionEditor, type FieldType } from '@/components/ActionEditor/ActionEditor';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { renderMarkdown } from '@/utils/markdownRenderer';
import type { VoiceTranscriptAction, RecordedAction, NavigationAction, PageVisibilityAction, MediaAction, DownloadAction, FullscreenAction, PrintAction, AnyAction, NoteAction } from '@/types/session';
import { isNoteAction } from '@/types/session';
import './ActionList.css';

const ACTION_ITEM_HEIGHT = 80; // Estimated height per regular action item
const VOICE_ITEM_HEIGHT = 100; // Estimated height per voice transcript item (more content)
const NAV_ITEM_HEIGHT = 60; // Estimated height per navigation item
const EVENT_ITEM_HEIGHT = 50; // Estimated height for simple event items
const NOTE_ITEM_HEIGHT = 80; // Estimated height for note items

// Type guard for voice transcript actions
function isVoiceTranscriptAction(action: AnyAction): action is VoiceTranscriptAction {
  return action.type === 'voice_transcript';
}

// Type guard for navigation actions
function isNavigationAction(action: AnyAction): action is NavigationAction {
  return action.type === 'navigation';
}

// Type guard for browser event actions (visibility, media, download, fullscreen, print)
function isBrowserEventAction(action: AnyAction): action is PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction {
  return ['page_visibility', 'media', 'download', 'fullscreen', 'print'].includes(action.type);
}

export const ActionList = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const selectAction = useSessionStore((state) => state.selectAction);
  const audioBlob = useSessionStore((state) => state.audioBlob);
  const getEditedActions = useSessionStore((state) => state.getEditedActions);
  const addNote = useSessionStore((state) => state.addNote);
  const editNote = useSessionStore((state) => state.editNote);
  const editActionField = useSessionStore((state) => state.editActionField);
  const deleteAction = useSessionStore((state) => state.deleteAction);

  // Use edited actions instead of raw actions
  const editedActions = getEditedActions();

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentSegmentEnd, setCurrentSegmentEnd] = useState<number | null>(null);

  // Note editor state
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteEditorContent, setNoteEditorContent] = useState('');
  const [noteEditorActionId, setNoteEditorActionId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Action editor state
  const { editingState, startEditing, stopEditing } = useActionEditor();

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

  // Get the audio recording start time from the first voice transcript's startTime
  const audioStartTime = useMemo(() => {
    if (!sessionData) return null;
    const firstVoice = sessionData.actions.find(isVoiceTranscriptAction);
    if (!firstVoice) return null;
    return new Date(firstVoice.transcript.startTime).getTime();
  }, [sessionData]);

  // Handle audio timeupdate to stop at segment end
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

  // Virtual scrolling setup with dynamic heights for different action types
  const getItemHeight = (index: number) => {
    const action = editedActions[index];
    if (!action) return ACTION_ITEM_HEIGHT;
    if (isNoteAction(action)) return NOTE_ITEM_HEIGHT;
    if (isVoiceTranscriptAction(action)) return VOICE_ITEM_HEIGHT;
    if (isNavigationAction(action)) return NAV_ITEM_HEIGHT;
    if (isBrowserEventAction(action)) return EVENT_ITEM_HEIGHT;
    return ACTION_ITEM_HEIGHT;
  };

  const { virtualizer, items: virtualItems, totalSize } = useVirtualList({
    items: editedActions,
    estimateSize: getItemHeight,
    scrollElement: scrollRef,
    overscan: 5,
  });

  // Auto-scroll to selected action
  useEffect(() => {
    if (selectedActionIndex !== null && sessionData) {
      const actionInFiltered = editedActions.findIndex(
        (_, idx) => idx === selectedActionIndex
      );

      if (actionInFiltered !== -1) {
        virtualizer.scrollToIndex(actionInFiltered, {
          align: 'center',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedActionIndex, editedActions, sessionData, virtualizer]);

  const formatTime = (timestamp: string) => {
    if (!sessionData) return '';
    const date = new Date(timestamp);
    const sessionStart = new Date(sessionData.startTime);
    const elapsed = (date.getTime() - sessionStart.getTime()) / 1000;
    return `${elapsed.toFixed(2)}s`;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click':
        return '🖱️';
      case 'input':
      case 'change':
        return '⌨️';
      case 'submit':
        return '✅';
      case 'keydown':
        return '🔤';
      case 'voice_transcript':
        return '🎙️';
      case 'navigation':
        return '🔗';
      case 'page_visibility':
        return '👁️';
      case 'media':
        return '🎬';
      case 'download':
        return '📥';
      case 'fullscreen':
        return '📺';
      case 'print':
        return '🖨️';
      case 'note':
        return '📝';
      default:
        return '▶️';
    }
  };

  const getClickDetails = (action: RecordedAction) => {
    const parts: string[] = [];

    if (action.action.button === 1) {
      parts.push('Middle');
    } else if (action.action.button === 2) {
      parts.push('Right');
    }

    if (action.action.modifiers) {
      const mods = action.action.modifiers;
      if (mods.ctrl) parts.push('Ctrl');
      if (mods.shift) parts.push('Shift');
      if (mods.alt) parts.push('Alt');
      if (mods.meta) parts.push('Cmd');
    }

    return parts.length > 0 ? parts.join('+') + ' click' : null;
  };

  // Handle adding a new note
  const handleAddNote = (afterActionId: string | null) => {
    setNoteEditorActionId(afterActionId);
    setNoteEditorContent('');
    setEditingNoteId(null);
    setNoteEditorOpen(true);
  };

  // Handle editing an existing note
  const handleEditNote = (e: React.MouseEvent, note: NoteAction) => {
    e.stopPropagation();
    setNoteEditorActionId(null);
    setNoteEditorContent(note.note.content);
    setEditingNoteId(note.id);
    setNoteEditorOpen(true);
  };

  // Handle saving note from editor
  const handleSaveNote = async (content: string) => {
    if (editingNoteId) {
      await editNote(editingNoteId, content);
    } else {
      await addNote(noteEditorActionId, content);
    }
    setNoteEditorOpen(false);
    setNoteEditorContent('');
    setNoteEditorActionId(null);
    setEditingNoteId(null);
  };

  // Handle closing note editor
  const handleCloseNoteEditor = () => {
    setNoteEditorOpen(false);
    setNoteEditorContent('');
    setNoteEditorActionId(null);
    setEditingNoteId(null);
  };

  // Handle editing an action field
  const handleEditField = (e: React.MouseEvent, actionId: string, fieldPath: string, currentValue: string, fieldType: FieldType, fieldName?: string) => {
    e.stopPropagation();
    startEditing(actionId, fieldPath, currentValue, fieldType, fieldName);
  };

  // Handle saving edited field
  const handleSaveField = async (actionId: string, fieldPath: string, newValue: string) => {
    await editActionField(actionId, fieldPath, newValue);
    stopEditing();
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

  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await deleteAction(deleteConfirm.actionId);
      setDeleteConfirm(null);
    }
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

  return (
    <div className="action-list">
      {/* Hidden audio element for voice playback */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" className="audio-hidden" />
      )}

      {/* Note Editor Modal */}
      <NoteEditor
        isOpen={noteEditorOpen}
        initialContent={noteEditorContent}
        title={editingNoteId ? 'Edit Note' : 'Add Note'}
        onSave={handleSaveNote}
        onClose={handleCloseNoteEditor}
      />

      {/* Action Editor (for inline/modal editing) */}
      {editingState && (
        <ActionEditor
          actionId={editingState.actionId}
          fieldPath={editingState.fieldPath}
          currentValue={editingState.currentValue}
          fieldType={editingState.fieldType}
          fieldName={editingState.fieldName}
          onSave={handleSaveField}
          onCancel={stopEditing}
        />
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
          </div>
        ) : (
          <div
            className="action-list-virtual-container"
            style={{ height: `${totalSize}px`, position: 'relative' }}
          >
            {virtualItems.map((virtualRow) => {
              const action = editedActions[virtualRow.index];
              const isSelected = selectedActionIndex === virtualRow.index;

              // Render note action
              if (isNoteAction(action)) {
                return (
                  <div
                    key={`${action.id}-${virtualRow.index}`}
                    className={`action-list-item note-item ${isSelected ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => selectAction(virtualRow.index)}
                  >
                    <div className="action-list-item-header">
                      <span className="action-list-item-icon">📝</span>
                      <span className="action-list-item-type">Note</span>
                      <span className="action-list-item-time">
                        {formatTime(action.timestamp)}
                      </span>
                      <div className="action-item-buttons">
                        <button
                          type="button"
                          className="action-edit-btn"
                          onClick={(e) => handleEditNote(e, action)}
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
                    </div>
                    <div
                      className="action-list-item-details note-content markdown-content"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(action.note.content) }}
                    />
                  </div>
                );
              }

              // Render voice transcript action
              if (isVoiceTranscriptAction(action)) {
                const voiceAction = action;
                const duration = ((new Date(voiceAction.transcript.endTime).getTime() -
                                  new Date(voiceAction.transcript.startTime).getTime()) / 1000).toFixed(1);
                const isPlayingThis = playingVoiceId === voiceAction.id;

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
                    onClick={() => selectAction(virtualRow.index)}
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
                          onClick={(e) => handleEditField(e, action.id, 'transcript.text', voiceAction.transcript.text, 'markdown', 'Transcript')}
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

                    <div className="action-list-item-details voice-text">
                      {voiceAction.transcript.text.substring(0, 80)}
                      {voiceAction.transcript.text.length > 80 ? '...' : ''}
                    </div>

                    <div className="action-list-item-meta voice-meta">
                      {audioUrl && (
                        <button
                          type="button"
                          className={`voice-play-btn ${isPlayingThis ? 'playing' : ''}`}
                          onClick={(e) => handleVoicePlayPause(e, voiceAction)}
                          title={isPlayingThis ? 'Pause' : 'Play segment'}
                        >
                          {isPlayingThis ? '❚❚' : '▶'}
                        </button>
                      )}
                      <span className="voice-duration">{duration}s</span>
                      <span className="voice-confidence">
                        {(voiceAction.transcript.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // Render navigation action
              if (isNavigationAction(action)) {
                const navAction = action as NavigationAction;
                const displayUrl = navAction.navigation.toUrl.length > 50
                  ? navAction.navigation.toUrl.substring(0, 47) + '...'
                  : navAction.navigation.toUrl;

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
                    onClick={() => selectAction(virtualRow.index)}
                  >
                    <div className="action-list-item-header">
                      <span className="action-list-item-icon">🔗</span>
                      {hasMultipleTabs && (
                        <span className="action-list-item-tab" title={navAction.navigation.toUrl}>
                          Tab {navAction.tabId + 1}
                        </span>
                      )}
                      <span className="action-list-item-type">
                        {navAction.navigation.navigationType === 'initial' ? 'Page Load' : 'Navigation'}
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

                    <div className="action-list-item-url navigation-url" title={navAction.navigation.toUrl}>
                      {displayUrl}
                    </div>
                  </div>
                );
              }

              // Render browser event actions
              if (isBrowserEventAction(action)) {
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
                    onClick={() => selectAction(virtualRow.index)}
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
              }

              // Render browser action (click, input, etc.)
              const browserAction = action as RecordedAction;

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
                  onClick={() => selectAction(virtualRow.index)}
                >
                  <div className="action-list-item-header">
                    <span className="action-list-item-icon">
                      {getActionIcon(action.type)}
                    </span>
                    {hasMultipleTabs && browserAction.tabId !== undefined && (
                      <span className="action-list-item-tab" title={browserAction.tabUrl || 'Tab ' + browserAction.tabId}>
                        Tab {browserAction.tabId + 1}
                      </span>
                    )}
                    <span className="action-list-item-type">{action.type}</span>
                    <span className="action-list-item-time">
                      {formatTime(action.timestamp)}
                    </span>
                    <div className="action-item-buttons">
                      {browserAction.action.value && (
                        <button
                          type="button"
                          className="action-edit-btn"
                          onClick={(e) => handleEditField(e, action.id, 'action.value', browserAction.action.value!, 'text', 'Value')}
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

                  {browserAction.action.value && (
                    <div className="action-list-item-details">
                      <span className="action-list-item-value">
                        {browserAction.action.value.substring(0, 50)}
                        {browserAction.action.value.length > 50 ? '...' : ''}
                      </span>
                    </div>
                  )}

                  {browserAction.action.key && (
                    <div className="action-list-item-details">
                      <span className="action-list-item-key">Key: {browserAction.action.key}</span>
                    </div>
                  )}

                  {browserAction.action.type === 'click' && getClickDetails(browserAction) && (
                    <div className="action-list-item-details">
                      <span className="action-list-item-modifiers">{getClickDetails(browserAction)}</span>
                    </div>
                  )}

                  <div className="action-list-item-url">
                    {browserAction.before.url}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Note Button (floating) */}
      <button
        type="button"
        className="action-list-add-note-btn"
        onClick={() => handleAddNote(editedActions.length > 0 ? editedActions[editedActions.length - 1].id : null)}
        title="Add note at end"
      >
        + Add Note
      </button>
    </div>
  );
};
