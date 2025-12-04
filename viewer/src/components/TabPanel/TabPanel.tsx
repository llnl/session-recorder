/**
 * Tab Panel Component
 * Container for Information, Console, Network, and Metadata tabs
 */

import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredConsole } from '@/hooks/useFilteredConsole';
import { useFilteredNetwork } from '@/hooks/useFilteredNetwork';
import './TabPanel.css';

export const TabPanel = () => {
  const activeTab = useSessionStore((state) => state.activeTab);
  const setActiveTab = useSessionStore((state) => state.setActiveTab);
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedAction = useSessionStore((state) => state.getSelectedAction());

  const consoleLogs = useFilteredConsole();
  const networkRequests = useFilteredNetwork();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="tab-panel">
      <div className="tab-panel-header">
        <button
          type="button"
          className={`tab-button ${activeTab === 'information' ? 'active' : ''}`}
          onClick={() => setActiveTab('information')}
        >
          Information
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          Console
          {consoleLogs.length > 0 && (
            <span className="tab-badge">{consoleLogs.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network
          {networkRequests.length > 0 && (
            <span className="tab-badge">{networkRequests.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          Metadata
        </button>
      </div>

      <div className="tab-panel-content">
        {activeTab === 'information' && (
          <div className="tab-content">
            {selectedAction ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Action Type:</span>
                  <span className="info-value">{selectedAction.type}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Timestamp:</span>
                  <span className="info-value">{formatTimestamp(selectedAction.timestamp)}</span>
                </div>
                {selectedAction.action.x !== undefined && (
                  <div className="info-item">
                    <span className="info-label">Coordinates:</span>
                    <span className="info-value">({selectedAction.action.x}, {selectedAction.action.y})</span>
                  </div>
                )}
                {selectedAction.action.value && (
                  <div className="info-item">
                    <span className="info-label">Value:</span>
                    <span className="info-value">{selectedAction.action.value}</span>
                  </div>
                )}
                {selectedAction.action.key && (
                  <div className="info-item">
                    <span className="info-label">Key:</span>
                    <span className="info-value">{selectedAction.action.key}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">URL:</span>
                  <span className="info-value">{selectedAction.before.url}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Viewport:</span>
                  <span className="info-value">
                    {selectedAction.before.viewport.width} x {selectedAction.before.viewport.height}
                  </span>
                </div>
              </div>
            ) : (
              <div className="tab-empty">
                <p>Select an action to view details</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'console' && (
          <div className="tab-content">
            {consoleLogs.length > 0 ? (
              <div className="console-list">
                {consoleLogs.map((log, index) => (
                  <div key={index} className={`console-item ${log.level}`}>
                    <span className="console-time">{formatTimestamp(log.timestamp)}</span>
                    <span className={`console-level ${log.level}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="console-message">
                      {log.args.map((arg) => JSON.stringify(arg)).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No console logs in selected time range</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="tab-content">
            {networkRequests.length > 0 ? (
              <div className="network-list">
                {networkRequests.map((request, index) => (
                  <div key={index} className="network-item">
                    <div className="network-item-header">
                      <span className={`network-method ${request.method.toLowerCase()}`}>
                        {request.method}
                      </span>
                      <span className={`network-status status-${Math.floor(request.status / 100)}xx`}>
                        {request.status}
                      </span>
                      {request.fromCache && <span className="network-cached">Cached</span>}
                      <span className="network-url">{request.url}</span>
                    </div>
                    <div className="network-item-details">
                      <div className="network-detail">
                        <span className="network-detail-label">Type:</span>
                        <span className="network-detail-value">{request.resourceType}</span>
                      </div>
                      <div className="network-detail">
                        <span className="network-detail-label">Size:</span>
                        <span className="network-detail-value">{(request.size / 1024).toFixed(2)} KB</span>
                      </div>
                      <div className="network-detail">
                        <span className="network-detail-label">Time:</span>
                        <span className="network-detail-value">{request.timing.total.toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No network requests in selected time range</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="tab-content">
            {sessionData ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Session ID:</span>
                  <span className="info-value">{sessionData.sessionId}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Start Time:</span>
                  <span className="info-value">{new Date(sessionData.startTime).toLocaleString()}</span>
                </div>
                {sessionData.endTime && (
                  <div className="info-item">
                    <span className="info-label">End Time:</span>
                    <span className="info-value">{new Date(sessionData.endTime).toLocaleString()}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Total Actions:</span>
                  <span className="info-value">{sessionData.actions.length}</span>
                </div>
                {sessionData.network && (
                  <div className="info-item">
                    <span className="info-label">Network Requests:</span>
                    <span className="info-value">{sessionData.network.count}</span>
                  </div>
                )}
                {sessionData.console && (
                  <div className="info-item">
                    <span className="info-label">Console Logs:</span>
                    <span className="info-value">{sessionData.console.count}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No session loaded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
