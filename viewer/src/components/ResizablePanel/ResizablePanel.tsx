/**
 * ResizablePanel Component
 * Provides resizable panels with drag handles and localStorage persistence
 */

import { useState, useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import './ResizablePanel.css';

interface ResizablePanelProps {
  children: ReactNode;
  direction: 'horizontal' | 'vertical';
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
  storageKey?: string;
  className?: string;
  /** Position of resize handle: 'start' (top/left) or 'end' (bottom/right). Default: 'end' */
  handlePosition?: 'start' | 'end';
}

export const ResizablePanel = ({
  children,
  direction,
  initialSize = 300,
  minSize = 100,
  maxSize = 800,
  storageKey,
  className = '',
  handlePosition = 'end',
}: ResizablePanelProps) => {
  const [size, setSize] = useState<number>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedSize = parseInt(stored, 10);
        return Math.max(minSize, Math.min(maxSize, parsedSize));
      }
    }
    return initialSize;
  });

  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<number>(0);
  const startSizeRef = useRef<number>(0);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, size.toString());
    }
  }, [size, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientY : e.clientX;
    startSizeRef.current = size;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientY : e.clientX;
      let delta = currentPos - startPosRef.current;
      // Invert delta when handle is at start (top/left) - dragging down/right should decrease size
      if (handlePosition === 'start') {
        delta = -delta;
      }
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSize, maxSize, handlePosition]);

  const style: CSSProperties = direction === 'horizontal'
    ? { height: `${size}px` }
    : { width: `${size}px` };

  return (
    <div
      className={`resizable-panel ${direction} handle-${handlePosition} ${className}`}
      style={style}
    >
      <div className="resizable-panel-content">
        {children}
      </div>
      <div
        className={`resizable-handle ${direction} handle-${handlePosition} ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="resizable-handle-indicator" />
      </div>
    </div>
  );
};
