/**
 * Action List Component
 * Displays chronological list of recorded actions with virtual scrolling
 */

import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredActions } from '@/hooks/useFilteredActions';
import './ActionList.css';

export const ActionList = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const selectAction = useSessionStore((state) => state.selectAction);
  const filteredActions = useFilteredActions();

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

  const formatTime = (timestamp: string) => {
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

  return (
    <div className="action-list">
      <div className="action-list-header">
        <h3>Actions</h3>
        <span className="action-list-count">
          {filteredActions.length} / {sessionData.actions.length}
        </span>
      </div>
      <div className="action-list-content">
        {filteredActions.length === 0 ? (
          <div className="action-list-empty">
            <p>No actions in selected time range</p>
          </div>
        ) : (
          <div className="action-list-items">
            {filteredActions.map((action) => {
              const actualIndex = sessionData.actions.indexOf(action);
              const isSelected = selectedActionIndex === actualIndex;

              return (
                <div
                  key={action.id}
                  className={`action-list-item ${isSelected ? 'selected' : ''}`}
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
