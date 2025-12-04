/**
 * Global state store using Zustand
 * Manages session data, UI state, and derived data
 */

import { create } from 'zustand';
import type {
  SessionData,
  RecordedAction,
  NetworkEntry,
  ConsoleEntry,
  TimelineSelection,
  LoadedSessionData,
} from '@/types/session';

export interface SessionStore {
  // Session data
  sessionData: SessionData | null;
  networkEntries: NetworkEntry[];
  consoleEntries: ConsoleEntry[];
  resources: Map<string, Blob>;

  // UI state
  selectedActionIndex: number | null;
  timelineSelection: TimelineSelection | null;
  activeTab: 'information' | 'console' | 'network' | 'metadata';
  loading: boolean;
  error: string | null;

  // Actions
  loadSession: (data: LoadedSessionData) => void;
  selectAction: (index: number) => void;
  setTimelineSelection: (selection: TimelineSelection | null) => void;
  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata') => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Derived selectors (computed values)
  getFilteredActions: () => RecordedAction[];
  getFilteredConsole: () => ConsoleEntry[];
  getFilteredNetwork: () => NetworkEntry[];
  getSelectedAction: () => RecordedAction | null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessionData: null,
  networkEntries: [],
  consoleEntries: [],
  resources: new Map(),
  selectedActionIndex: null,
  timelineSelection: null,
  activeTab: 'information',
  loading: false,
  error: null,

  // Actions
  loadSession: (data: LoadedSessionData) => {
    set({
      sessionData: data.sessionData,
      networkEntries: data.networkEntries,
      consoleEntries: data.consoleEntries,
      resources: data.resources,
      selectedActionIndex: null,
      timelineSelection: null,
      error: null,
      loading: false,
    });
  },

  selectAction: (index: number) => {
    const state = get();
    if (state.sessionData && index >= 0 && index < state.sessionData.actions.length) {
      set({ selectedActionIndex: index });
    }
  },

  setTimelineSelection: (selection: TimelineSelection | null) => {
    set({ timelineSelection: selection });
  },

  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata') => {
    set({ activeTab: tab });
  },

  clearSession: () => {
    set({
      sessionData: null,
      networkEntries: [],
      consoleEntries: [],
      resources: new Map(),
      selectedActionIndex: null,
      timelineSelection: null,
      error: null,
      loading: false,
    });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error, loading: false });
  },

  // Derived selectors
  getFilteredActions: () => {
    const state = get();
    if (!state.sessionData) return [];

    const { actions } = state.sessionData;
    const { timelineSelection } = state;

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
  },

  getFilteredConsole: () => {
    const state = get();
    const { consoleEntries, timelineSelection } = state;

    if (!timelineSelection) {
      return consoleEntries;
    }

    // Filter console logs within the timeline selection
    const startMs = new Date(timelineSelection.startTime).getTime();
    const endMs = new Date(timelineSelection.endTime).getTime();

    return consoleEntries.filter((entry) => {
      const entryMs = new Date(entry.timestamp).getTime();
      return entryMs >= startMs && entryMs <= endMs;
    });
  },

  getFilteredNetwork: () => {
    const state = get();
    const { networkEntries, timelineSelection } = state;

    if (!timelineSelection) {
      return networkEntries;
    }

    // Filter network requests within the timeline selection
    const startMs = new Date(timelineSelection.startTime).getTime();
    const endMs = new Date(timelineSelection.endTime).getTime();

    return networkEntries.filter((entry) => {
      const entryMs = new Date(entry.timestamp).getTime();
      return entryMs >= startMs && entryMs <= endMs;
    });
  },

  getSelectedAction: () => {
    const state = get();
    if (!state.sessionData || state.selectedActionIndex === null) {
      return null;
    }
    return state.sessionData.actions[state.selectedActionIndex] ?? null;
  },
}));
