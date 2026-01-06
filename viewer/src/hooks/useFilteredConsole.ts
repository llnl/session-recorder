/**
 * Custom hook for filtered console logs based on timeline selection and log level
 */

import { useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import type { ConsoleEntry } from '@/types/session';

export interface UseFilteredConsoleOptions {
  level?: ConsoleEntry['level'] | 'all';
}

export function useFilteredConsole(options: UseFilteredConsoleOptions = {}): ConsoleEntry[] {
  const { level = 'all' } = options;
  const consoleEntries = useSessionStore((state) => state.consoleEntries);
  const timelineSelection = useSessionStore((state) => state.timelineSelection);

  return useMemo(() => {
    let filtered = consoleEntries;

    // Filter by timeline selection
    if (timelineSelection) {
      const startMs = new Date(timelineSelection.startTime).getTime();
      const endMs = new Date(timelineSelection.endTime).getTime();

      filtered = filtered.filter((entry) => {
        const entryMs = new Date(entry.timestamp).getTime();
        return entryMs >= startMs && entryMs <= endMs;
      });
    }

    // Filter by log level
    if (level !== 'all') {
      filtered = filtered.filter((entry) => entry.level === level);
    }

    return filtered;
  }, [consoleEntries, timelineSelection, level]);
}
