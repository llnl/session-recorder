/**
 * Custom hook wrapper for TanStack Virtual
 * Provides virtual scrolling for large lists
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';

export interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize: number;
  scrollElement?: RefObject<HTMLDivElement | null>;
  overscan?: number;
}

export function useVirtualList<T>({
  items,
  estimateSize: itemSize,
  scrollElement,
  overscan = 5,
}: UseVirtualListOptions<T>) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement?.current ?? null,
    estimateSize: () => itemSize,
    overscan,
  });

  return {
    virtualizer,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
