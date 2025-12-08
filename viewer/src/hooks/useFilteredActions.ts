/**
 * Custom hook for filtered actions based on timeline selection
 */

import { useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import type { AnyAction } from '@/types/session';

export function useFilteredActions(): AnyAction[] {
  const sessionData = useSessionStore((state) => state.sessionData);
  const timelineSelection = useSessionStore((state) => state.timelineSelection);

  return useMemo(() => {
    if (!sessionData) return [];

    const { actions } = sessionData;

    if (!timelineSelection) {
      return actions;
    }

    // Filter actions within the timeline selection
    const startMs = new Date(timelineSelection.startTime).getTime();
    const endMs = new Date(timelineSelection.endTime).getTime();

    return actions.filter((action) => {
      const actionMs = new Date(action.timestamp).getTime();
      return actionMs >= startMs && actionMs <= endMs;
    });
  }, [sessionData, timelineSelection]);
}
