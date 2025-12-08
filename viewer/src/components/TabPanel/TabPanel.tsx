/**
 * Tab Panel Component
 * Container for Information, Console, Network, and Metadata tabs
 */

import { useState, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useFilteredConsole } from '@/hooks/useFilteredConsole';
import { useFilteredNetwork } from '@/hooks/useFilteredNetwork';
import type { VoiceTranscriptAction, NavigationAction, RecordedAction } from '@/types/session';
import { VoiceTranscriptViewer } from '@/components/VoiceTranscriptViewer';

// Type guard for navigation actions
function isNavigationAction(action: any): action is NavigationAction {
  return action?.type === 'navigation';
}

// Type guard for recorded actions (browser interactions)
function isRecordedAction(action: any): action is RecordedAction {
  return action && 'before' in action && 'after' in action && 'action' in action;
}
import './TabPanel.css';

type ConsoleLevelFilter = 'all' | 'error' | 'warn' | 'info' | 'log' | 'debug';
type NetworkResourceFilter = 'all' | 'document' | 'stylesheet' | 'script' | 'image' | 'xhr' | 'fetch' | 'font' | 'other';
type NetworkSortOption = 'time' | 'duration' | 'size';

export const TabPanel = () => {
  const activeTab = useSessionStore((state) => state.activeTab);
  const setActiveTab = useSessionStore((state) => state.setActiveTab);
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedAction = useSessionStore((state) => state.getSelectedAction());
  const audioBlob = useSessionStore((state) => state.audioBlob);

  const consoleLogs = useFilteredConsole();
  const networkRequests = useFilteredNetwork();

  // Console tab state
  const [consoleLevelFilter, setConsoleLevelFilter] = useState<ConsoleLevelFilter>('all');
  const [expandedConsoleItems, setExpandedConsoleItems] = useState<Set<number>>(new Set());

  // Network tab state
  const [networkResourceFilter, setNetworkResourceFilter] = useState<NetworkResourceFilter>('all');
  const [networkSort, setNetworkSort] = useState<NetworkSortOption>('time');
  const [expandedNetworkItems, setExpandedNetworkItems] = useState<Set<number>>(new Set());

  // Filter console logs by level
  const filteredConsoleLogs = useMemo(() => {
    if (consoleLevelFilter === 'all') return consoleLogs;
    return consoleLogs.filter((log) => log.level === consoleLevelFilter);
  }, [consoleLogs, consoleLevelFilter]);

  // Filter and sort network requests
  const filteredAndSortedNetwork = useMemo(() => {
    let filtered = networkRequests;

    // Apply resource type filter
    if (networkResourceFilter !== 'all') {
      if (networkResourceFilter === 'other') {
        filtered = filtered.filter(
          (req) =>
            !['document', 'stylesheet', 'script', 'image', 'xhr', 'fetch', 'font'].includes(
              req.resourceType.toLowerCase()
            )
        );
      } else {
        filtered = filtered.filter(
          (req) => req.resourceType.toLowerCase() === networkResourceFilter
        );
      }
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (networkSort) {
        case 'time':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'duration':
          return b.timing.total - a.timing.total;
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });

    return sorted;
  }, [networkRequests, networkResourceFilter, networkSort]);

  // Toggle console item expansion
  const toggleConsoleExpansion = (index: number) => {
    const newExpanded = new Set(expandedConsoleItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConsoleItems(newExpanded);
  };

  // Toggle network item expansion
  const toggleNetworkExpansion = (index: number) => {
    const newExpanded = new Set(expandedNetworkItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedNetworkItems(newExpanded);
  };

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
        {sessionData?.voiceRecording?.enabled && (
          <button
            type="button"
            className={`tab-button ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            🎙️ Voice
          </button>
        )}
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
                
                {selectedAction.type === 'voice_transcript' ? (
                  // Voice transcript specific fields
                  <>
                    <div className="info-item">
                      <span className="info-label">Transcript:</span>
                      <span className="info-value">{(selectedAction as VoiceTranscriptAction).transcript.text}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Duration:</span>
                      <span className="info-value">
                        {((new Date((selectedAction as VoiceTranscriptAction).transcript.endTime).getTime() -
                          new Date((selectedAction as VoiceTranscriptAction).transcript.startTime).getTime()) / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Confidence:</span>
                      <span className="info-value">
                        {((selectedAction as VoiceTranscriptAction).transcript.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {(selectedAction as VoiceTranscriptAction).transcript.words && (
                      <div className="info-item">
                        <span className="info-label">Word Count:</span>
                        <span className="info-value">
                          {(selectedAction as VoiceTranscriptAction).transcript.words!.length}
                        </span>
                      </div>
                    )}
                  </>
                ) : isNavigationAction(selectedAction) ? (
                  // Navigation action specific fields
                  <>
                    <div className="info-item">
                      <span className="info-label">Tab:</span>
                      <span className="info-value">Tab {selectedAction.tabId}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Navigation Type:</span>
                      <span className="info-value">{selectedAction.navigation.navigationType}</span>
                    </div>
                    {selectedAction.navigation.fromUrl && (
                      <div className="info-item">
                        <span className="info-label">From URL:</span>
                        <span className="info-value">{selectedAction.navigation.fromUrl}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">To URL:</span>
                      <span className="info-value">{selectedAction.navigation.toUrl}</span>
                    </div>
                  </>
                ) : isRecordedAction(selectedAction) ? (
                  // Browser action specific fields
                  <>
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
                  </>
                ) : null}
              </div>
            ) : (
              <div className="tab-empty">
                <p>Select an action to view details</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="tab-content">
            {selectedAction && selectedAction.type === 'voice_transcript' ? (
              <VoiceTranscriptViewer
                voiceAction={selectedAction as VoiceTranscriptAction}
                audioUrl={audioBlob ? URL.createObjectURL(audioBlob) : null}
              />
            ) : (
              <div className="tab-empty">
                <p>
                  {sessionData?.voiceRecording?.enabled
                    ? 'Select a voice transcript action to view details'
                    : 'Voice recording not enabled for this session'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'console' && (
          <div className="tab-content">
            <div className="tab-controls">
              <div className="control-group">
                <label htmlFor="console-filter">Filter by level:</label>
                <select
                  id="console-filter"
                  value={consoleLevelFilter}
                  onChange={(e) => setConsoleLevelFilter(e.target.value as ConsoleLevelFilter)}
                  className="filter-select"
                >
                  <option value="all">All ({consoleLogs.length})</option>
                  <option value="error">
                    Errors ({consoleLogs.filter((l) => l.level === 'error').length})
                  </option>
                  <option value="warn">
                    Warnings ({consoleLogs.filter((l) => l.level === 'warn').length})
                  </option>
                  <option value="info">
                    Info ({consoleLogs.filter((l) => l.level === 'info').length})
                  </option>
                  <option value="log">
                    Logs ({consoleLogs.filter((l) => l.level === 'log').length})
                  </option>
                  <option value="debug">
                    Debug ({consoleLogs.filter((l) => l.level === 'debug').length})
                  </option>
                </select>
              </div>
              {consoleLevelFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setConsoleLevelFilter('all')}
                  className="clear-filter-btn"
                >
                  Clear Filter
                </button>
              )}
            </div>
            {filteredConsoleLogs.length > 0 ? (
              <div className="console-list">
                {filteredConsoleLogs.map((log, index) => {
                  const isExpanded = expandedConsoleItems.has(index);
                  const hasStack = log.stack && log.stack.trim().length > 0;

                  return (
                    <div key={index} className={`console-item ${log.level}`}>
                      <span className="console-time">{formatTimestamp(log.timestamp)}</span>
                      <span className={`console-level ${log.level}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <div className="console-content">
                        <div className="console-message">
                          {log.args.map((arg, i) => (
                            <span key={i} className="console-arg">
                              {typeof arg === 'object'
                                ? JSON.stringify(arg, null, 2)
                                : String(arg)}
                            </span>
                          ))}
                        </div>
                        {hasStack && (
                          <div className="console-stack-container">
                            <button
                              type="button"
                              onClick={() => toggleConsoleExpansion(index)}
                              className="stack-toggle-btn"
                            >
                              {isExpanded ? '▼' : '▶'} Stack Trace
                            </button>
                            {isExpanded && (
                              <pre className="console-stack">{log.stack}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tab-empty">
                <p>
                  {consoleLogs.length === 0
                    ? 'No console logs in selected time range'
                    : `No ${consoleLevelFilter} logs in selected time range`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="tab-content">
            <div className="tab-controls">
              <div className="control-group">
                <label htmlFor="network-filter">Resource type:</label>
                <select
                  id="network-filter"
                  value={networkResourceFilter}
                  onChange={(e) => setNetworkResourceFilter(e.target.value as NetworkResourceFilter)}
                  className="filter-select"
                >
                  <option value="all">All ({networkRequests.length})</option>
                  <option value="document">Document</option>
                  <option value="stylesheet">Stylesheet</option>
                  <option value="script">Script</option>
                  <option value="image">Image</option>
                  <option value="xhr">XHR</option>
                  <option value="fetch">Fetch</option>
                  <option value="font">Font</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="control-group">
                <label htmlFor="network-sort">Sort by:</label>
                <select
                  id="network-sort"
                  value={networkSort}
                  onChange={(e) => setNetworkSort(e.target.value as NetworkSortOption)}
                  className="filter-select"
                >
                  <option value="time">Time</option>
                  <option value="duration">Duration</option>
                  <option value="size">Size</option>
                </select>
              </div>
              {networkResourceFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setNetworkResourceFilter('all')}
                  className="clear-filter-btn"
                >
                  Clear Filter
                </button>
              )}
            </div>
            {filteredAndSortedNetwork.length > 0 ? (
              <div className="network-list">
                {filteredAndSortedNetwork.map((request, index) => {
                  const isExpanded = expandedNetworkItems.has(index);

                  return (
                    <div key={index} className="network-item">
                      <div
                        className="network-item-header"
                        onClick={() => toggleNetworkExpansion(index)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            toggleNetworkExpansion(index);
                          }
                        }}
                      >
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        <span className={`network-method ${request.method.toLowerCase()}`}>
                          {request.method}
                        </span>
                        <span className={`network-status status-${Math.floor(request.status / 100)}xx`}>
                          {request.status}
                        </span>
                        {request.fromCache && <span className="network-cached">Cached</span>}
                        <span className="network-url" title={request.url}>
                          {request.url}
                        </span>
                        <span className="network-duration">{request.timing.total.toFixed(0)}ms</span>
                      </div>

                      {/* Waterfall Visualization */}
                      <div className="network-waterfall">
                        <div className="waterfall-container">
                          {request.timing.dns && request.timing.dns > 0 && (
                            <div
                              className="waterfall-bar dns"
                              style={{
                                width: `${(request.timing.dns / request.timing.total) * 100}%`,
                              }}
                              title={`DNS: ${request.timing.dns.toFixed(0)}ms`}
                            />
                          )}
                          {request.timing.connect && request.timing.connect > 0 && (
                            <div
                              className="waterfall-bar connect"
                              style={{
                                width: `${(request.timing.connect / request.timing.total) * 100}%`,
                              }}
                              title={`Connect: ${request.timing.connect.toFixed(0)}ms`}
                            />
                          )}
                          <div
                            className="waterfall-bar ttfb"
                            style={{
                              width: `${(request.timing.ttfb / request.timing.total) * 100}%`,
                            }}
                            title={`TTFB: ${request.timing.ttfb.toFixed(0)}ms`}
                          />
                          <div
                            className="waterfall-bar download"
                            style={{
                              width: `${(request.timing.download / request.timing.total) * 100}%`,
                            }}
                            title={`Download: ${request.timing.download.toFixed(0)}ms`}
                          />
                        </div>
                        <span className="waterfall-total">{request.timing.total.toFixed(0)}ms</span>
                      </div>

                      {isExpanded && (
                        <div className="network-item-expanded">
                          <div className="network-detail-grid">
                            <div className="network-detail">
                              <span className="network-detail-label">Type:</span>
                              <span className="network-detail-value">{request.resourceType}</span>
                            </div>
                            <div className="network-detail">
                              <span className="network-detail-label">Size:</span>
                              <span className="network-detail-value">
                                {(request.size / 1024).toFixed(2)} KB
                              </span>
                            </div>
                            <div className="network-detail">
                              <span className="network-detail-label">Status:</span>
                              <span className="network-detail-value">
                                {request.status} {request.statusText}
                              </span>
                            </div>
                            <div className="network-detail">
                              <span className="network-detail-label">Content Type:</span>
                              <span className="network-detail-value">{request.contentType}</span>
                            </div>
                            {request.timing.dns !== undefined && (
                              <div className="network-detail">
                                <span className="network-detail-label">DNS:</span>
                                <span className="network-detail-value">
                                  {request.timing.dns.toFixed(0)}ms
                                </span>
                              </div>
                            )}
                            {request.timing.connect !== undefined && (
                              <div className="network-detail">
                                <span className="network-detail-label">Connect:</span>
                                <span className="network-detail-value">
                                  {request.timing.connect.toFixed(0)}ms
                                </span>
                              </div>
                            )}
                            <div className="network-detail">
                              <span className="network-detail-label">TTFB:</span>
                              <span className="network-detail-value">
                                {request.timing.ttfb.toFixed(0)}ms
                              </span>
                            </div>
                            <div className="network-detail">
                              <span className="network-detail-label">Download:</span>
                              <span className="network-detail-value">
                                {request.timing.download.toFixed(0)}ms
                              </span>
                            </div>
                            {request.error && (
                              <div className="network-detail network-error">
                                <span className="network-detail-label">Error:</span>
                                <span className="network-detail-value">{request.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tab-empty">
                <p>
                  {networkRequests.length === 0
                    ? 'No network requests in selected time range'
                    : `No ${networkResourceFilter} requests in selected time range`}
                </p>
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
