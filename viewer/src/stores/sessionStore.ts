/**
 * Global state store using Zustand
 * Manages session data, UI state, and derived data
 */

import { create } from 'zustand';
import type {
  SessionData,
  RecordedAction,
  NavigationAction,
  VoiceTranscriptAction,
  NetworkEntry,
  ConsoleEntry,
  TimelineSelection,
  LoadedSessionData,
} from '@/types/session';

export interface StoredResource {
  sha1: string;
  content: string; // base64 for binary, raw for text
  contentType: string;
  size: number;
  timestamp: number;
}

export interface SessionStore {
  // Session data
  sessionData: SessionData | null;
  networkEntries: NetworkEntry[];
  consoleEntries: ConsoleEntry[];
  resources: Map<string, Blob>;
  resourceStorage: Map<string, StoredResource>; // SHA1 -> resource
  audioBlob: Blob | null; // Audio file for voice recording

  // UI state
  selectedActionIndex: number | null;
  timelineSelection: TimelineSelection | null;
  activeTab: 'information' | 'console' | 'network' | 'metadata' | 'voice';
  loading: boolean;
  error: string | null;

  // Actions
  loadSession: (data: LoadedSessionData) => void;
  selectAction: (index: number) => void;
  setTimelineSelection: (selection: TimelineSelection | null) => void;
  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata' | 'voice') => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Resource accessors
  getResourceBySha1: (sha1: string) => StoredResource | null;

  // Derived selectors (computed values)
  getFilteredActions: () => (RecordedAction | NavigationAction | VoiceTranscriptAction)[];
  getFilteredConsole: () => ConsoleEntry[];
  getFilteredNetwork: () => NetworkEntry[];
  getSelectedAction: () => RecordedAction | NavigationAction | VoiceTranscriptAction | null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessionData: null,
  networkEntries: [],
  consoleEntries: [],
  resources: new Map(),
  resourceStorage: new Map(),
  audioBlob: null,
  selectedActionIndex: null,
  timelineSelection: null,
  activeTab: 'information',
  loading: false,
  error: null,

  // Actions
  loadSession: (data: LoadedSessionData) => {
    // Load resourceStorage from session data
    const resourceStorage = new Map<string, StoredResource>();
    if (data.sessionData.resourceStorage) {
      for (const [sha1, resource] of Object.entries(data.sessionData.resourceStorage)) {
        resourceStorage.set(sha1, resource as StoredResource);
      }
    }

    set({
      sessionData: data.sessionData,
      networkEntries: data.networkEntries,
      consoleEntries: data.consoleEntries,
      resources: data.resources,
      resourceStorage,
      audioBlob: data.audioBlob || null,
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

  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata' | 'voice') => {
    set({ activeTab: tab });
  },

  clearSession: () => {
    set({
      sessionData: null,
      networkEntries: [],
      consoleEntries: [],
      resources: new Map(),
      resourceStorage: new Map(),
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

  // Resource accessors
  getResourceBySha1: (sha1: string) => {
    const state = get();
    return state.resourceStorage.get(sha1) || null;
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
