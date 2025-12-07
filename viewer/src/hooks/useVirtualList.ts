/**
 * Custom hook wrapper for TanStack Virtual
 * Provides virtual scrolling for large lists
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';

export interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize: number | ((index: number) => number);
  scrollElement?: RefObject<HTMLDivElement | null>;
  overscan?: number;
}

export function useVirtualList<T>({
  items,
  estimateSize: itemSize,
  scrollElement,
  overscan = 5,
}: UseVirtualListOptions<T>) {
  const getSizeForIndex = typeof itemSize === 'function' ? itemSize : () => itemSize;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement?.current ?? null,
    estimateSize: getSizeForIndex,
    overscan,
  });

  return {
    virtualizer,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
