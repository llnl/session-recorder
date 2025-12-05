/**
 * Timeline Component
 * Displays horizontal timeline with screenshot thumbnails and time markers
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import './Timeline.css';

const PIXELS_PER_SECOND = 50;

export const Timeline = () => {
  const sessionData = useSessionStore((state) => state.sessionData);
  const selectedActionIndex = useSessionStore((state) => state.selectedActionIndex);
  const timelineSelection = useSessionStore((state) => state.timelineSelection);
  const setTimelineSelection = useSessionStore((state) => state.setTimelineSelection);
  const selectAction = useSessionStore((state) => state.selectAction);
  const resources = useSessionStore((state) => state.resources);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(null);

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

  }, [sessionData, timelineWidth, duration, selectedActionIndex, isDragging, dragStart, dragEnd, timelineSelection, timestampToX]);

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
      // Find hovered action
      const hoveredIndex = sessionData.actions.findIndex((action) => {
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
      // Find closest action
      if (sessionData) {
        let closestIndex = -1;
        let closestDistance = Infinity;

        sessionData.actions.forEach((action, index) => {
          const actionX = timestampToX(action.timestamp);
          const distance = Math.abs(actionX - dragStart);
          if (distance < closestDistance && distance < 10) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== -1) {
          selectAction(closestIndex);
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
  };

  const clearSelection = () => {
    setTimelineSelection(null);
  };

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
          <button type="button" className="timeline-clear-btn" onClick={clearSelection}>
            Clear Selection
          </button>
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
            const x = timestampToX(action.timestamp);
            const screenshotPath = action.before.screenshot;
            const screenshotBlob = resources.get(screenshotPath);
            const screenshotUrl = screenshotBlob ? URL.createObjectURL(screenshotBlob) : null;

            return (
              <div
                key={action.id}
                className={`timeline-thumbnail ${index === selectedActionIndex ? 'selected' : ''} ${index === hoveredActionIndex ? 'hovered' : ''}`}
                style={{ left: x - 40 }}
                onClick={() => selectAction(index)}
                title={`${action.type} at ${((new Date(action.timestamp).getTime() - new Date(sessionData.startTime).getTime()) / 1000).toFixed(2)}s`}
              >
                {screenshotUrl ? (
                  <img src={screenshotUrl} alt={`Action ${index + 1}`} />
                ) : (
                  <div className="timeline-thumbnail-placeholder">{index + 1}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
