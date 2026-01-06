/**
 * Custom hook for filtered network requests based on timeline selection and resource type
 */

import { useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import type { NetworkEntry } from '@/types/session';

export interface UseFilteredNetworkOptions {
  resourceType?: string | 'all';
  sortBy?: 'time' | 'duration' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export function useFilteredNetwork(options: UseFilteredNetworkOptions = {}): NetworkEntry[] {
  const {
    resourceType = 'all',
    sortBy = 'time',
    sortOrder = 'asc',
  } = options;

  const networkEntries = useSessionStore((state) => state.networkEntries);
  const timelineSelection = useSessionStore((state) => state.timelineSelection);

  return useMemo(() => {
    let filtered = networkEntries;

    // Filter by timeline selection
    if (timelineSelection) {
      const startMs = new Date(timelineSelection.startTime).getTime();
      const endMs = new Date(timelineSelection.endTime).getTime();

      filtered = filtered.filter((entry) => {
        const entryMs = new Date(entry.timestamp).getTime();
        return entryMs >= startMs && entryMs <= endMs;
      });
    }

    // Filter by resource type
    if (resourceType !== 'all') {
      filtered = filtered.filter((entry) => entry.resourceType === resourceType);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'time':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'duration':
          comparison = a.timing.total - b.timing.total;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [networkEntries, timelineSelection, resourceType, sortBy, sortOrder]);
}
