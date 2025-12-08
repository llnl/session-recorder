/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 */

import { useRef, useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredActions } from '@/hooks/useFilteredActions';
import { useVirtualList } from '@/hooks/useVirtualList';
import type { VoiceTranscriptAction, RecordedAction, NavigationAction } from '@/types/session';
import './ActionList.css';

const ACTION_ITEM_HEIGHT = 80; // Estimated height per regular action item
const VOICE_ITEM_HEIGHT = 100; // Estimated height per voice transcript item (more content)
const NAV_ITEM_HEIGHT = 60; // Estimated height per navigation item

// Type guard for voice transcript actions
function isVoiceTranscriptAction(action: RecordedAction | NavigationAction | VoiceTranscriptAction): action is VoiceTranscriptAction {
  return action.type === 'voice_transcript';
}

// Type guard for navigation actions
function isNavigationAction(action: RecordedAction | NavigationAction | VoiceTranscriptAction): action is NavigationAction {
  return action.type === 'navigation';
}

export const ActionList = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const selectAction = useSessionStore((state) => state.selectAction);
  const filteredActions = useFilteredActions();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling setup with dynamic heights for different action types
  const getItemHeight = (index: number) => {
    const action = filteredActions[index];
    if (!action) return ACTION_ITEM_HEIGHT;
    if (isVoiceTranscriptAction(action)) return VOICE_ITEM_HEIGHT;
    if (isNavigationAction(action)) return NAV_ITEM_HEIGHT;
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

                return (
                  <div
                    key={action.id}
                    className={`action-list-item voice-item ${isSelected ? 'selected' : ''}`}
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

              // Render browser action
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
