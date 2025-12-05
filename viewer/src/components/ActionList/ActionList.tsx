/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 */

import { useRef, useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredActions } from '@/hooks/useFilteredActions';
import { useVirtualList } from '@/hooks/useVirtualList';
import './ActionList.css';

const ACTION_ITEM_HEIGHT = 80; // Estimated height per action item

export const ActionList = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const selectAction = useSessionStore((state) => state.selectAction);
  const filteredActions = useFilteredActions();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling setup
  const { virtualizer, items: virtualItems, totalSize } = useVirtualList({
    items: filteredActions,
    estimateSize: ACTION_ITEM_HEIGHT,
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
                    <span className="action-list-item-type">{action.type}</span>
                    <span className="action-list-item-time">
                      {formatTime(action.timestamp)}
                    </span>
                  </div>

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

                  <div className="action-list-item-url">
                    {action.before.url}
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
