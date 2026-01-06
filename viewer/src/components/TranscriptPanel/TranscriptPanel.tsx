/**
 * Transcript Panel Component
 * Displays all transcript segments from voice and system audio sources
 * with search functionality and click-to-navigate
 */

import { useState, useMemo, useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import type { VoiceTranscriptAction } from '@/types/session';
import './TranscriptPanel.css';

type SourceFilter = 'all' | 'voice' | 'system';

export const TranscriptPanel = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectActionById = useSessionStore((state) => state.selectActionById);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const getEditedActions = useSessionStore((state) => state.getEditedActions);

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Get all voice transcript actions
  const voiceActions = useMemo(() => {
    if (!sessionData) return [];
    const editedActions = getEditedActions();
    return editedActions.filter(
      (action): action is VoiceTranscriptAction => action.type === 'voice_transcript'
    );
  }, [sessionData, getEditedActions]);

  // Get selected action ID for highlighting
  const selectedActionId = useMemo(() => {
    if (selectedActionIndex === null || !sessionData) return null;
    const editedActions = getEditedActions();
    return editedActions[selectedActionIndex]?.id ?? null;
  }, [selectedActionIndex, sessionData, getEditedActions]);

  // Filter by source and search query
  const filteredActions = useMemo(() => {
    let filtered = voiceActions;

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((action) => {
        const source = action.source ?? 'voice'; // Default to voice for backward compat
        return source === sourceFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((action) =>
        action.transcript.text.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [voiceActions, sourceFilter, searchQuery]);

  // Count segments by source
  const sourceCounts = useMemo(() => {
    const counts = { voice: 0, system: 0 };
    voiceActions.forEach((action) => {
      const source = action.source ?? 'voice';
      if (source === 'voice') counts.voice++;
      else if (source === 'system') counts.system++;
    });
    return counts;
  }, [voiceActions]);

  // Handle clicking on a transcript segment
  const handleSegmentClick = useCallback((actionId: string) => {
    selectActionById(actionId, true); // true = scroll to action
  }, [selectActionById]);

  // Format timestamp relative to session start
  const formatTime = useCallback((timestamp: string) => {
    if (!sessionData) return '';
    const date = new Date(timestamp);
    const sessionStart = new Date(sessionData.startTime);
    const elapsed = (date.getTime() - sessionStart.getTime()) / 1000;
    return `${elapsed.toFixed(1)}s`;
  }, [sessionData]);

  // Get duration of a segment
  const getDuration = useCallback((action: VoiceTranscriptAction) => {
    const start = new Date(action.transcript.startTime).getTime();
    const end = new Date(action.transcript.endTime).getTime();
    return ((end - start) / 1000).toFixed(1);
  }, []);

  // Get source icon and label
  const getSourceInfo = useCallback((action: VoiceTranscriptAction) => {
    const source = action.source ?? 'voice';
    if (source === 'system') {
      return { icon: '🔊', label: 'System', className: 'source-system' };
    }
    return { icon: '🎤', label: 'Voice', className: 'source-voice' };
  }, []);

  // Highlight search matches in text
  const highlightMatches = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  }, []);

  if (!sessionData) {
    return (
      <div className="transcript-panel">
        <div className="transcript-panel-empty">No session loaded</div>
      </div>
    );
  }

  if (voiceActions.length === 0) {
    return (
      <div className="transcript-panel">
        <div className="transcript-panel-empty">
          <p>No transcripts in this session</p>
          <p className="transcript-panel-hint">
            Record with voice or system audio enabled to see transcripts here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-panel">
      {/* Header with search and filters */}
      <div className="transcript-panel-header">
        <div className="transcript-search">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="transcript-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="transcript-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="transcript-filters">
          <button
            type="button"
            className={`transcript-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSourceFilter('all')}
          >
            All ({voiceActions.length})
          </button>
          {sourceCounts.voice > 0 && (
            <button
              type="button"
              className={`transcript-filter-btn source-voice ${sourceFilter === 'voice' ? 'active' : ''}`}
              onClick={() => setSourceFilter('voice')}
            >
              🎤 Voice ({sourceCounts.voice})
            </button>
          )}
          {sourceCounts.system > 0 && (
            <button
              type="button"
              className={`transcript-filter-btn source-system ${sourceFilter === 'system' ? 'active' : ''}`}
              onClick={() => setSourceFilter('system')}
            >
              🔊 System ({sourceCounts.system})
            </button>
          )}
        </div>
      </div>

      {/* Transcript list */}
      <div className="transcript-list">
        {filteredActions.length === 0 ? (
          <div className="transcript-panel-empty">
            <p>No transcripts match your search</p>
          </div>
        ) : (
          filteredActions.map((action) => {
            const sourceInfo = getSourceInfo(action);
            const isSelected = action.id === selectedActionId;

            return (
              <div
                key={action.id}
                className={`transcript-item ${sourceInfo.className} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSegmentClick(action.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSegmentClick(action.id);
                  }
                }}
              >
                <div className="transcript-item-header">
                  <span className={`transcript-source ${sourceInfo.className}`}>
                    <span className="transcript-source-icon">{sourceInfo.icon}</span>
                    <span className="transcript-source-label">{sourceInfo.label}</span>
                  </span>
                  <span className="transcript-time">{formatTime(action.transcript.startTime)}</span>
                  <span className="transcript-duration">{getDuration(action)}s</span>
                  <span className="transcript-confidence">
                    {(action.transcript.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="transcript-item-text">
                  {highlightMatches(action.transcript.text, searchQuery)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer with count */}
      <div className="transcript-panel-footer">
        Showing {filteredActions.length} of {voiceActions.length} segments
      </div>
    </div>
  );
};
