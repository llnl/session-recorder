/**
 * Timeline Component
 * Displays horizontal timeline with screenshot thumbnails and time markers
 * Supports note indicators and bulk delete operations
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import type { VoiceTranscriptAction, NavigationAction, RecordedAction, AnyAction, PageVisibilityAction, MediaAction, DownloadAction, FullscreenAction, PrintAction, NoteAction } from '@/types/session';
import { LazyThumbnail, LazyPreviewImage } from './LazyThumbnail';
import { usePreloadResources } from '@/hooks/useLazyResource';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import './Timeline.css';

const PIXELS_PER_SECOND = 50;

// Helper function to extract screenshot path from any action type
const getScreenshotPath = (action: AnyAction): string | null => {
  if (action.type === 'voice_transcript') return null;

  if (action.type === 'navigation') {
    return (action as NavigationAction).snapshot?.screenshot || null;
  }

  if (['page_visibility', 'media', 'download', 'fullscreen', 'print'].includes(action.type)) {
    const eventAction = action as PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction;
    return eventAction.snapshot?.screenshot || null;
  }

  // RecordedAction (click, input, etc.)
  return (action as RecordedAction).before?.screenshot || null;
};

export const Timeline = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const timelineSelection = useSessionStore((state) => state.timelineSelection);
  const setTimelineSelection = useSessionStore((state) => state.setTimelineSelection);
  const selectAction = useSessionStore((state) => state.selectAction);

  // Edit state for notes and bulk delete
  const editState = useSessionStore((state) => state.editState);
  const getEditedActions = useSessionStore((state) => state.getEditedActions);
  const deleteAction = useSessionStore((state) => state.deleteAction);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk delete confirmation state
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{
    isOpen: boolean;
    actionCount: number;
  } | null>(null);

  // Preload resources around the selected action for smooth scrolling
  usePreloadResources(selectedActionIndex);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredVoiceAction, setHoveredVoiceAction] = useState<VoiceTranscriptAction | null>(null);
  const [voiceHoverPosition, setVoiceHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNoteAction, setHoveredNoteAction] = useState<NoteAction | null>(null);
  const [noteHoverPosition, setNoteHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Get edited actions (with notes and deletions applied)
  const editedActions = editState ? getEditedActions() : sessionData?.actions || [];

  // Calculate timeline duration
  const getDuration = useCallback(() => {
    if (!sessionData || sessionData.actions.length === 0) return 0;
    const start = new Date(sessionData.startTime).getTime();
    const lastAction = sessionData.actions[sessionData.actions.length - 1];
    const end = new Date(lastAction.timestamp).getTime();
    return (end - start) / 1000; // duration in seconds
  }, [sessionData]);

  const duration = getDuration();
  const timelineWidth = Math.max(duration * PIXELS_PER_SECOND, 1000);

  // Convert x position to timestamp
  const xToTimestamp = useCallback((x: number): string => {
    if (!sessionData) return '';
    const seconds = x / PIXELS_PER_SECOND;
    const startMs = new Date(sessionData.startTime).getTime();
    return new Date(startMs + seconds * 1000).toISOString();
  }, [sessionData]);

  // Convert timestamp to x position
  const timestampToX = useCallback((timestamp: string): number => {
    if (!sessionData) return 0;
    const startMs = new Date(sessionData.startTime).getTime();
    const timestampMs = new Date(timestamp).getTime();
    const seconds = (timestampMs - startMs) / 1000;
    return seconds * PIXELS_PER_SECOND;
  }, [sessionData]);

  // Draw timeline canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = timelineWidth * dpr;
    canvas.height = 60 * dpr;
    canvas.style.width = `${timelineWidth}px`;
    canvas.style.height = '60px';
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, timelineWidth, 60);

    // Draw time markers
    ctx.strokeStyle = '#ddd';
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';

    const interval = duration > 60 ? 10 : 5; // 5s or 10s markers
    for (let sec = 0; sec <= duration; sec += interval) {
      const x = sec * PIXELS_PER_SECOND;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, sec % (interval * 2) === 0 ? 20 : 10);
      ctx.stroke();

      if (sec % (interval * 2) === 0) {
        ctx.fillText(`${sec}s`, x + 2, 30);
      }
    }

    // Draw action indicators
    sessionData.actions.forEach((action, index) => {
      if (action.type === 'voice_transcript') return; // Skip voice actions, rendered separately
      
      const x = timestampToX(action.timestamp);

      // Draw vertical line for action
      ctx.strokeStyle = index === selectedActionIndex ? '#4ade80' : '#999';
      ctx.lineWidth = index === selectedActionIndex ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 35);
      ctx.lineTo(x, 60);
      ctx.stroke();

      // Draw dot at top
      ctx.fillStyle = index === selectedActionIndex ? '#4ade80' : '#999';
      ctx.beginPath();
      ctx.arc(x, 40, index === selectedActionIndex ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw voice transcript segments with source-based coloring (FEAT-05)
    const voiceActions = sessionData.actions.filter(
      (action): action is VoiceTranscriptAction => action.type === 'voice_transcript'
    );

    // Separate voice and system segments for stacking (overlapping support)
    const voiceSegments = voiceActions.filter(a => a.source !== 'system');  // 'voice' or undefined (backward compat)
    const systemSegments = voiceActions.filter(a => a.source === 'system');

    // Draw voice segments (microphone) in blue at y=2
    voiceSegments.forEach((voiceAction) => {
      const startTime = new Date(voiceAction.transcript.startTime).getTime();
      const endTime = new Date(voiceAction.transcript.endTime).getTime();
      const sessionStart = new Date(sessionData.startTime).getTime();

      const startX = ((startTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
      const endX = ((endTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
      const width = Math.max(endX - startX, 4);  // Minimum 4px width for visibility

      // Blue for voice (microphone)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';  // Blue-500
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1;

      // Rounded rectangle
      const radius = 3;
      const y = 2;
      const height = 12;

      ctx.beginPath();
      ctx.moveTo(startX + radius, y);
      ctx.lineTo(startX + width - radius, y);
      ctx.quadraticCurveTo(startX + width, y, startX + width, y + radius);
      ctx.lineTo(startX + width, y + height - radius);
      ctx.quadraticCurveTo(startX + width, y + height, startX + width - radius, y + height);
      ctx.lineTo(startX + radius, y + height);
      ctx.quadraticCurveTo(startX, y + height, startX, y + height - radius);
      ctx.lineTo(startX, y + radius);
      ctx.quadraticCurveTo(startX, y, startX + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw system segments (display audio) in green at y=16
    systemSegments.forEach((voiceAction) => {
      const startTime = new Date(voiceAction.transcript.startTime).getTime();
      const endTime = new Date(voiceAction.transcript.endTime).getTime();
      const sessionStart = new Date(sessionData.startTime).getTime();

      const startX = ((startTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
      const endX = ((endTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
      const width = Math.max(endX - startX, 4);  // Minimum 4px width for visibility

      // Green for system (display audio)
      ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';  // Green-500
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 1;

      // Rounded rectangle
      const radius = 3;
      const y = 16;
      const height = 12;

      ctx.beginPath();
      ctx.moveTo(startX + radius, y);
      ctx.lineTo(startX + width - radius, y);
      ctx.quadraticCurveTo(startX + width, y, startX + width, y + radius);
      ctx.lineTo(startX + width, y + height - radius);
      ctx.quadraticCurveTo(startX + width, y + height, startX + width - radius, y + height);
      ctx.lineTo(startX + radius, y + height);
      ctx.quadraticCurveTo(startX, y + height, startX, y + height - radius);
      ctx.lineTo(startX, y + radius);
      ctx.quadraticCurveTo(startX, y, startX + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw note indicators (amber/orange bars)
    const noteActions = editedActions.filter(
      (action): action is NoteAction => action.type === 'note'
    );

    noteActions.forEach((noteAction) => {
      const noteX = timestampToX(noteAction.timestamp);

      // Draw amber diamond/marker for note
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;

      // Draw diamond shape for note indicator
      const y = 22;
      const size = 6;

      ctx.beginPath();
      ctx.moveTo(noteX, y - size);
      ctx.lineTo(noteX + size, y);
      ctx.lineTo(noteX, y + size);
      ctx.lineTo(noteX - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw connecting line to timeline
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(noteX, y + size);
      ctx.lineTo(noteX, 35);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw selection rectangle if dragging or selection exists
    const drawSelection = (startX: number, endX: number) => {
      const left = Math.min(startX, endX);
      const width = Math.abs(endX - startX);

      ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
      ctx.fillRect(left, 0, width, 60);

      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.strokeRect(left, 0, width, 60);
    };

    if (isDragging && dragStart !== null && dragEnd !== null) {
      drawSelection(dragStart, dragEnd);
    } else if (timelineSelection) {
      const startX = timestampToX(timelineSelection.startTime);
      const endX = timestampToX(timelineSelection.endTime);
      drawSelection(startX, endX);
    }

  }, [sessionData, timelineWidth, duration, selectedActionIndex, isDragging, dragStart, dragEnd, timelineSelection, timestampToX, editedActions]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    setIsDragging(true);
    setDragStart(x);
    setDragEnd(x);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !sessionData) return;

    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);

    if (isDragging) {
      setDragEnd(x);
    } else {
      // Check if hovering over voice/system transcript segments (FEAT-05)
      const voiceActions = sessionData.actions.filter(
        (action): action is VoiceTranscriptAction => action.type === 'voice_transcript'
      );

      // Separate by source for Y-position checking
      const voiceSegments = voiceActions.filter(a => a.source !== 'system');
      const systemSegments = voiceActions.filter(a => a.source === 'system');

      let foundVoice = false;
      const mouseY = e.clientY - rect.top;

      // Check voice segments (blue, y=2-14)
      if (mouseY >= 0 && mouseY <= 18) {
        for (const voiceAction of voiceSegments) {
          const startTime = new Date(voiceAction.transcript.startTime).getTime();
          const endTime = new Date(voiceAction.transcript.endTime).getTime();
          const sessionStart = new Date(sessionData.startTime).getTime();

          const startX = ((startTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
          const endX = ((endTime - sessionStart) / 1000) * PIXELS_PER_SECOND;

          if (x >= startX && x <= endX) {
            setHoveredVoiceAction(voiceAction);
            setVoiceHoverPosition({ x: e.clientX, y: e.clientY });
            foundVoice = true;
            break;
          }
        }
      }

      // Check system segments (green, y=16-28)
      if (!foundVoice && mouseY >= 12 && mouseY <= 32) {
        for (const voiceAction of systemSegments) {
          const startTime = new Date(voiceAction.transcript.startTime).getTime();
          const endTime = new Date(voiceAction.transcript.endTime).getTime();
          const sessionStart = new Date(sessionData.startTime).getTime();

          const startX = ((startTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
          const endX = ((endTime - sessionStart) / 1000) * PIXELS_PER_SECOND;

          if (x >= startX && x <= endX) {
            setHoveredVoiceAction(voiceAction);
            setVoiceHoverPosition({ x: e.clientX, y: e.clientY });
            foundVoice = true;
            break;
          }
        }
      }

      if (!foundVoice) {
        setHoveredVoiceAction(null);
        setVoiceHoverPosition(null);
      }

      // Check if hovering over note indicator
      const noteActions = editedActions.filter(
        (action): action is NoteAction => action.type === 'note'
      );

      let foundNote = false;
      for (const noteAction of noteActions) {
        const noteX = timestampToX(noteAction.timestamp);
        // Note diamond is at y=22, size=6, check if within diamond area
        if (Math.abs(x - noteX) < 10 && e.clientY - rect.top >= 15 && e.clientY - rect.top <= 35) {
          setHoveredNoteAction(noteAction);
          setNoteHoverPosition({ x: e.clientX, y: e.clientY });
          foundNote = true;
          break;
        }
      }

      if (!foundNote) {
        setHoveredNoteAction(null);
        setNoteHoverPosition(null);
      }

      // Find hovered action (browser actions only)
      const hoveredIndex = sessionData.actions.findIndex((action) => {
        if (action.type === 'voice_transcript') return false;
        const actionX = timestampToX(action.timestamp);
        return Math.abs(actionX - x) < 5;
      });
      setHoveredActionIndex(hoveredIndex === -1 ? null : hoveredIndex);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStart === null || dragEnd === null) return;

    const minX = Math.min(dragStart, dragEnd);
    const maxX = Math.max(dragStart, dragEnd);

    // If selection is too small (< 10px), treat as click
    if (maxX - minX < 10) {
      if (sessionData) {
        // Check if clicking on voice segment
        const voiceActions = sessionData.actions.filter(
          (action): action is VoiceTranscriptAction => action.type === 'voice_transcript'
        );

        let clickedVoice = false;
        for (let i = 0; i < voiceActions.length; i++) {
          const voiceAction = voiceActions[i];
          const startTime = new Date(voiceAction.transcript.startTime).getTime();
          const endTime = new Date(voiceAction.transcript.endTime).getTime();
          const sessionStart = new Date(sessionData.startTime).getTime();

          const startX = ((startTime - sessionStart) / 1000) * PIXELS_PER_SECOND;
          const endX = ((endTime - sessionStart) / 1000) * PIXELS_PER_SECOND;

          if (dragStart >= startX && dragStart <= endX) {
            // Find the index in the full actions array
            const voiceIndex = sessionData.actions.findIndex(a => a.id === voiceAction.id);
            if (voiceIndex !== -1) {
              selectAction(voiceIndex, true); // Scroll to action in list
              clickedVoice = true;
              break;
            }
          }
        }

        // If not clicked on voice, find closest browser action
        if (!clickedVoice) {
          let closestIndex = -1;
          let closestDistance = Infinity;

          sessionData.actions.forEach((action, index) => {
            if (action.type === 'voice_transcript') return;
            const actionX = timestampToX(action.timestamp);
            const distance = Math.abs(actionX - dragStart);
            if (distance < closestDistance && distance < 10) {
              closestDistance = distance;
              closestIndex = index;
            }
          });

          if (closestIndex !== -1) {
            selectAction(closestIndex, true); // Scroll to action in list
          }
        }
      }
      setTimelineSelection(null);
    } else {
      // Create time range selection
      const startTime = xToTimestamp(minX);
      const endTime = xToTimestamp(maxX);
      setTimelineSelection({ startTime, endTime });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleMouseLeave = () => {
    setHoveredActionIndex(null);
    setHoverPosition(null);
    setHoveredVoiceAction(null);
    setVoiceHoverPosition(null);
    setHoveredNoteAction(null);
    setNoteHoverPosition(null);
  };

  const handleThumbnailMouseEnter = (e: React.MouseEvent, index: number) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredActionIndex(index);
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  };

  const handleThumbnailMouseLeave = () => {
    setHoveredActionIndex(null);
    setHoverPosition(null);
  };

  const clearSelection = () => {
    setTimelineSelection(null);
  };

  // Get actions within the current timeline selection
  const getSelectedActions = useCallback(() => {
    if (!timelineSelection || !sessionData) return [];

    const startMs = new Date(timelineSelection.startTime).getTime();
    const endMs = new Date(timelineSelection.endTime).getTime();

    return sessionData.actions.filter((action) => {
      const actionMs = new Date(action.timestamp).getTime();
      return actionMs >= startMs && actionMs <= endMs;
    });
  }, [timelineSelection, sessionData]);

  // Count selected actions for bulk delete
  const selectedActionsCount = getSelectedActions().length;

  // Handle bulk delete button click
  const handleBulkDeleteClick = () => {
    const count = selectedActionsCount;
    if (count > 0) {
      setBulkDeleteConfirm({
        isOpen: true,
        actionCount: count,
      });
    }
  };

  // Perform bulk delete
  const handleBulkDelete = () => {
    if (!bulkDeleteConfirm || !editState) return;

    const actionsToDelete = getSelectedActions();
    actionsToDelete.forEach((action) => {
      deleteAction(action.id);
    });

    setBulkDeleteConfirm(null);
    setTimelineSelection(null);
  };

  // Auto-scroll to selected action
  useEffect(() => {
    if (selectedActionIndex === null || !sessionData || !containerRef.current) return;

    const action = sessionData.actions[selectedActionIndex];
    if (!action) return;

    const x = timestampToX(action.timestamp);
    const container = containerRef.current;
    const containerWidth = container.clientWidth;

    // Scroll to center the action in the container
    const scrollTarget = x - containerWidth / 2;
    container.scrollTo({
      left: Math.max(0, scrollTarget),
      behavior: 'smooth',
    });
  }, [selectedActionIndex, sessionData, timestampToX]);

  if (!sessionData) {
    return (
      <div className="timeline">
        <div className="timeline-empty">No session loaded</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-title">Timeline</div>
        <div className="timeline-info">
          Duration: {duration.toFixed(1)}s | Actions: {sessionData.actions.length}
        </div>
        {timelineSelection && (
          <div className="timeline-selection-controls">
            {editState && selectedActionsCount > 0 && (
              <button
                type="button"
                className="timeline-delete-btn"
                onClick={handleBulkDeleteClick}
                title={`Delete ${selectedActionsCount} action${selectedActionsCount !== 1 ? 's' : ''}`}
              >
                🗑️ Delete {selectedActionsCount}
              </button>
            )}
            <button type="button" className="timeline-clear-btn" onClick={clearSelection}>
              Clear Selection
            </button>
          </div>
        )}
      </div>

      <div className="timeline-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="timeline-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />

        <div className="timeline-thumbnails" style={{ width: timelineWidth }}>
          {sessionData.actions.map((action, index) => {
            // Skip voice actions (they don't have screenshots)
            if (action.type === 'voice_transcript') return null;

            const x = timestampToX(action.timestamp);
            const screenshotPath = getScreenshotPath(action);

            return (
              <LazyThumbnail
                key={`${action.id}-${index}`}
                screenshotPath={screenshotPath}
                alt={`Action ${index + 1}`}
                index={index}
                isSelected={index === selectedActionIndex}
                isHovered={index === hoveredActionIndex}
                style={{ left: x - 40 }}
                onClick={() => selectAction(index, true)} // Scroll to action in list
                onMouseEnter={(e) => handleThumbnailMouseEnter(e, index)}
                onMouseLeave={handleThumbnailMouseLeave}
              />
            );
          })}
        </div>

        {/* Hover Zoom Preview */}
        {hoveredActionIndex !== null && hoverPosition && sessionData && (
          <div
            className="timeline-hover-zoom"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
            }}
          >
            <div className="timeline-hover-zoom-preview">
              {(() => {
                const action = sessionData.actions[hoveredActionIndex];
                if (action.type === 'voice_transcript') return null;
                const screenshotPath = getScreenshotPath(action);
                return (
                  <LazyPreviewImage
                    screenshotPath={screenshotPath}
                    alt={`Action ${hoveredActionIndex + 1}`}
                  />
                );
              })()}
            </div>
            <div className="timeline-hover-zoom-tooltip">
              <div className="timeline-hover-zoom-tooltip-type">
                {(() => {
                  const action = sessionData.actions[hoveredActionIndex];
                  switch (action.type) {
                    case 'navigation':
                      return (action as NavigationAction).navigation.navigationType === 'initial' ? 'Page Load' : 'Navigation';
                    case 'page_visibility':
                      return (action as PageVisibilityAction).visibility.state === 'visible' ? 'Tab Focused' : 'Tab Switched';
                    case 'media':
                      return `Media ${(action as MediaAction).media.event}`;
                    case 'download':
                      return `Download (${(action as DownloadAction).download.state})`;
                    case 'fullscreen':
                      return (action as FullscreenAction).fullscreen.state === 'entered' ? 'Fullscreen' : 'Exit Fullscreen';
                    case 'print':
                      return (action as PrintAction).print.event === 'beforeprint' ? 'Print Started' : 'Print Ended';
                    default:
                      return action.type;
                  }
                })()}
              </div>
              <div className="timeline-hover-zoom-tooltip-time">
                {((new Date(sessionData.actions[hoveredActionIndex].timestamp).getTime() -
                   new Date(sessionData.startTime).getTime()) / 1000).toFixed(2)}s
              </div>
              {(() => {
                const action = sessionData.actions[hoveredActionIndex];
                if (action.type === 'voice_transcript') return null;
                if (action.type === 'navigation') {
                  return (
                    <div className="timeline-hover-zoom-tooltip-target">
                      {action.navigation.toUrl}
                    </div>
                  );
                }
                // Browser event types - show URL from snapshot if available
                if (['page_visibility', 'media', 'download', 'fullscreen', 'print'].includes(action.type)) {
                  const eventAction = action as PageVisibilityAction | MediaAction | DownloadAction | FullscreenAction | PrintAction;
                  if (eventAction.snapshot?.url) {
                    return (
                      <div className="timeline-hover-zoom-tooltip-target">
                        {eventAction.snapshot.url}
                      </div>
                    );
                  }
                  return null;
                }
                // RecordedAction
                if ((action as RecordedAction).before?.url) {
                  return (
                    <div className="timeline-hover-zoom-tooltip-target">
                      {(action as RecordedAction).before.url}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Voice/System Segment Hover Tooltip (FEAT-05) */}
        {hoveredVoiceAction && voiceHoverPosition && (
          <div
            className={`timeline-voice-tooltip ${hoveredVoiceAction.source === 'system' ? 'timeline-voice-tooltip--system' : 'timeline-voice-tooltip--voice'}`}
            style={{
              left: `${voiceHoverPosition.x}px`,
              top: `${voiceHoverPosition.y + 10}px`,
            }}
          >
            <div className="timeline-voice-tooltip-header">
              <span className="timeline-voice-tooltip-icon">
                {hoveredVoiceAction.source === 'system' ? '🔊' : '🎤'}
              </span>
              <span className="timeline-voice-tooltip-source">
                {hoveredVoiceAction.source === 'system' ? 'System Audio' : 'Voice'}
              </span>
            </div>
            <div className="timeline-voice-tooltip-time">
              {((new Date(hoveredVoiceAction.transcript.startTime).getTime() -
                 new Date(sessionData.startTime).getTime()) / 1000).toFixed(2)}s
            </div>
            <div className="timeline-voice-tooltip-text">
              {hoveredVoiceAction.transcript.text.slice(0, 100)}
              {hoveredVoiceAction.transcript.text.length > 100 ? '...' : ''}
            </div>
            <div className="timeline-voice-tooltip-duration">
              Duration: {((new Date(hoveredVoiceAction.transcript.endTime).getTime() -
                          new Date(hoveredVoiceAction.transcript.startTime).getTime()) / 1000).toFixed(1)}s
              {' | '}
              Confidence: {(hoveredVoiceAction.transcript.confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Note Hover Tooltip */}
        {hoveredNoteAction && noteHoverPosition && (
          <div
            className="timeline-note-tooltip"
            style={{
              left: `${noteHoverPosition.x}px`,
              top: `${noteHoverPosition.y + 10}px`,
            }}
          >
            <div className="timeline-note-tooltip-header">
              <span className="timeline-note-tooltip-icon">📝</span>
              <span className="timeline-note-tooltip-title">Note</span>
            </div>
            <div className="timeline-note-tooltip-time">
              {((new Date(hoveredNoteAction.timestamp).getTime() -
                 new Date(sessionData.startTime).getTime()) / 1000).toFixed(2)}s
            </div>
            <div className="timeline-note-tooltip-content">
              {hoveredNoteAction.note.content.slice(0, 150)}
              {hoveredNoteAction.note.content.length > 150 ? '...' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteConfirm && (
        <ConfirmDialog
          isOpen={bulkDeleteConfirm.isOpen}
          title="Delete Selected Actions"
          message={`Are you sure you want to delete ${bulkDeleteConfirm.actionCount} action${bulkDeleteConfirm.actionCount !== 1 ? 's' : ''} within the selected time range? This cannot be undone.`}
          confirmText={`Delete ${bulkDeleteConfirm.actionCount} Action${bulkDeleteConfirm.actionCount !== 1 ? 's' : ''}`}
          destructive
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirm(null)}
        />
      )}
    </div>
  );
};
