/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredActions } from '@/hooks/useFilteredActions';
import { useVirtualList } from '@/hooks/useVirtualList';
import type { VoiceTranscriptAction, RecordedAction, NavigationAction, PageVisibilityAction, MediaAction, DownloadAction, FullscreenAction, PrintAction, AnyAction } from '@/types/session';
import './ActionList.css';

const ACTION_ITEM_HEIGHT = 80; // Estimated height per regular action item
const VOICE_ITEM_HEIGHT = 100; // Estimated height per voice transcript item (more content)
const NAV_ITEM_HEIGHT = 60; // Estimated height per navigation item
const EVENT_ITEM_HEIGHT = 50; // Estimated height for simple event items

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
  const filteredActions = useFilteredActions();

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentSegmentEnd, setCurrentSegmentEnd] = useState<number | null>(null);

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
    // Use transcript's startTime as reference (consistent with segment times)
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
      // Only clear state if we're not auto-stopping at segment end
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
    e.stopPropagation(); // Don't trigger item selection

    const audio = audioRef.current;
    if (!audio || !audioUrl || !audioStartTime) return;

    if (playingVoiceId === voiceAction.id) {
      // Currently playing this segment - pause it
      audio.pause();
      setPlayingVoiceId(null);
      setCurrentSegmentEnd(null);
    } else {
      // Trust the session.json values - use transcript times directly
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
    const action = filteredActions[index];
    if (!action) return ACTION_ITEM_HEIGHT;
    if (isVoiceTranscriptAction(action)) return VOICE_ITEM_HEIGHT;
    if (isNavigationAction(action)) return NAV_ITEM_HEIGHT;
    if (isBrowserEventAction(action)) return EVENT_ITEM_HEIGHT;
    return ACTION_ITEM_HEIGHT;
  };

  const { virtualizer, items: virtualItems, totalSize } = useVirtualList({
    items: filteredActions,
    estimateSize: getItemHeight,
    scrollElement: scrollRef,
    overscan: 5,
  });

  // Auto-scroll to selected action
  useEffect(() => {
    if (selectedActionIndex !== null && sessionData) {
      const actionInFiltered = filteredActions.findIndex(
        (action) => sessionData.actions.indexOf(action) === selectedActionIndex
      );

      if (actionInFiltered !== -1) {
        virtualizer.scrollToIndex(actionInFiltered, {
          align: 'center',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedActionIndex, filteredActions, sessionData, virtualizer]);

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
      default:
        return '▶️';
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

  return (
    <div className="action-list">
      {/* Hidden audio element for voice playback */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" className="audio-hidden" />
      )}

      <div className="action-list-header">
        <h3>Actions</h3>
        <span className="action-list-count">
          {filteredActions.length} / {sessionData.actions.length}
        </span>
      </div>

      <div className="action-list-content" ref={scrollRef}>
        {filteredActions.length === 0 ? (
          <div className="action-list-empty">
            <p>No actions in selected time range</p>
          </div>
        ) : (
          <div
            className="action-list-virtual-container"
            style={{ height: `${totalSize}px`, position: 'relative' }}
          >
            {virtualItems.map((virtualRow) => {
              const action = filteredActions[virtualRow.index];
              const actualIndex = sessionData.actions.indexOf(action);
              const isSelected = selectedActionIndex === actualIndex;

              // Render voice transcript action
              if (isVoiceTranscriptAction(action)) {
                const voiceAction = action;
                const duration = ((new Date(voiceAction.transcript.endTime).getTime() -
                                  new Date(voiceAction.transcript.startTime).getTime()) / 1000).toFixed(1);
                const isPlayingThis = playingVoiceId === voiceAction.id;

                return (
                  <div
                    key={action.id}
                    className={`action-list-item voice-item ${isSelected ? 'selected' : ''} ${isPlayingThis ? 'playing' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => selectAction(actualIndex)}
                  >
                    <div className="action-list-item-header">
                      <span className="action-list-item-icon">🎙️</span>
                      <span className="action-list-item-type">Voice Transcript</span>
                      <span className="action-list-item-time">
                        {formatTime(action.timestamp)}
                      </span>
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

              // Check for multi-tab to show tab indicators
              const hasMultipleTabs = sessionData.actions.some(
                a => !isVoiceTranscriptAction(a) && !isNavigationAction(a) && (a as RecordedAction).tabId !== undefined && (a as RecordedAction).tabId !== 0
              ) || sessionData.actions.some(
                a => isNavigationAction(a) && (a as NavigationAction).tabId !== 0
              );

              // Render navigation action
              if (isNavigationAction(action)) {
                const navAction = action as NavigationAction;
                const displayUrl = navAction.navigation.toUrl.length > 50
                  ? navAction.navigation.toUrl.substring(0, 47) + '...'
                  : navAction.navigation.toUrl;

                return (
                  <div
                    key={action.id}
                    className={`action-list-item navigation-item ${isSelected ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => selectAction(actualIndex)}
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
                    </div>

                    <div className="action-list-item-url navigation-url" title={navAction.navigation.toUrl}>
                      {displayUrl}
                    </div>
                  </div>
                );
              }

              // Render browser event actions (visibility, media, download, fullscreen, print)
              if (isBrowserEventAction(action)) {
                let eventDescription = '';
                let eventClass = 'event-item';

                if (action.type === 'page_visibility') {
                  const visAction = action as PageVisibilityAction;
                  // Use clearer naming: "Tab Focused" when visible, "Tab Switched" when hidden
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
                    key={action.id}
                    className={`action-list-item ${eventClass} ${isSelected ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => selectAction(actualIndex)}
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
                    </div>
                  </div>
                );
              }

              // Render browser action (click, input, etc.)
              const browserAction = action as RecordedAction;

              return (
                <div
                  key={action.id}
                  className={`action-list-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => selectAction(actualIndex)}
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

                  <div className="action-list-item-url">
                    {browserAction.before.url}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
