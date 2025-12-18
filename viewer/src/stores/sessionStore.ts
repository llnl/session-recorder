/**
 * Global state store using Zustand
 * Manages session data, UI state, edit operations, and derived data
 */

import { create } from 'zustand';
import type {
  SessionData,
  AnyAction,
  NetworkEntry,
  ConsoleEntry,
  TimelineSelection,
  LoadedSessionData,
  NoteAction,
} from '@/types/session';
import type {
  SessionEditState,
  EditOperation,
  AddNoteOperation,
  EditNoteOperation,
  EditFieldOperation,
  DeleteActionOperation,
  BulkDeleteOperation,
} from '@/types/editOperations';
import {
  createInitialEditState,
  createLocalSessionMetadata,
  generateOperationId,
  generateNoteId,
} from '@/types/editOperations';
import {
  applyOperations,
  getExcludedFilesFromOperations,
  getActionAssociatedFiles,
  getNestedValue,
} from '@/utils/editOperationsProcessor';
import { indexedDBService } from '@/services/indexedDBService';
import { getLazyResourceLoader, resetLazyResourceLoader } from '@/utils/lazyResourceLoader';
import { importSessionFromZip } from '@/utils/zipHandler';

// Maximum number of operations to keep (oldest are trimmed)
const MAX_OPERATIONS = 100;

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
  audioBlob: Blob | null; // Voice audio file (microphone) for voice recording
  systemAudioBlob: Blob | null; // System audio file (display audio) for system recording

  // Lazy loading state (FR-4.7)
  lazyLoadEnabled: boolean;
  loadingResources: Set<string>; // Currently loading resource paths

  // Edit state
  editState: SessionEditState | null;

  // UI state
  selectedActionIndex: number | null;
  shouldScrollToAction: boolean; // Whether selection change should trigger auto-scroll
  timelineSelection: TimelineSelection | null;
  activeTab: 'information' | 'console' | 'network' | 'metadata' | 'voice' | 'transcript';
  loading: boolean;
  error: string | null;

  // Session actions
  loadSession: (data: LoadedSessionData, sourceBlob?: Blob) => Promise<void>;
  loadSessionFromStorage: (sessionId: string) => Promise<boolean>;
  selectAction: (index: number, scroll?: boolean) => void;
  selectActionById: (actionId: string, scroll?: boolean) => boolean;
  clearScrollFlag: () => void;
  setTimelineSelection: (selection: TimelineSelection | null) => void;
  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata' | 'voice' | 'transcript') => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Resource accessors
  getResourceBySha1: (sha1: string) => StoredResource | null;

  // Lazy loading methods (FR-4.7)
  getResourceLazy: (path: string) => Promise<Blob | null>;
  isResourceLoading: (path: string) => boolean;
  preloadResourcesAround: (index: number) => void;

  // Derived selectors (computed values)
  getFilteredActions: () => AnyAction[];
  getFilteredConsole: () => ConsoleEntry[];
  getFilteredNetwork: () => NetworkEntry[];
  getSelectedAction: () => AnyAction | null;

  // Edit state management (Task 2.1)
  loadEditState: (sessionId: string) => Promise<void>;
  getEditedActions: () => AnyAction[];
  getExcludedFiles: () => Set<string>;

  // Edit actions (Task 2.2)
  addNote: (insertAfterActionId: string | null, content: string) => Promise<string | null>;
  editNote: (noteId: string, newContent: string) => Promise<void>;
  editActionField: (actionId: string, fieldPath: string, newValue: unknown) => Promise<void>;
  deleteAction: (actionId: string) => Promise<void>;
  deleteBulkActions: (startTime: string, endTime: string) => Promise<void>;

  // Undo/Redo (Task 2.3)
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Export support (Task 2.4)
  markAsExported: () => Promise<void>;
  getDisplayName: () => string;
  setDisplayName: (name: string) => Promise<void>;
  getEditCount: () => number;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessionData: null,
  networkEntries: [],
  consoleEntries: [],
  resources: new Map(),
  resourceStorage: new Map(),
  audioBlob: null,
  systemAudioBlob: null,
  lazyLoadEnabled: false,
  loadingResources: new Set(),
  editState: null,
  selectedActionIndex: null,
  shouldScrollToAction: false,
  timelineSelection: null,
  activeTab: 'information',
  loading: false,
  error: null,

  // Actions
  loadSession: async (data: LoadedSessionData, sourceBlob?: Blob) => {
    // Reset lazy resource loader when loading a new session
    resetLazyResourceLoader();

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
      systemAudioBlob: data.systemAudioBlob || null,
      lazyLoadEnabled: data.lazyLoadEnabled || false,
      loadingResources: new Set(),
      selectedActionIndex: null,
      shouldScrollToAction: false,
      timelineSelection: null,
      error: null,
      loading: false,
    });

    // Load edit state from IndexedDB
    await get().loadEditState(data.sessionData.sessionId);

    // Store the source blob for reload support
    if (sourceBlob) {
      const sessionId = data.sessionData.sessionId;
      try {
        await indexedDBService.saveSessionBlob(sessionId, sourceBlob);

        // Update metadata with blob status and action count
        const metadata = await indexedDBService.getSessionMetadata(sessionId);
        if (metadata) {
          await indexedDBService.updateSessionMetadata({
            ...metadata,
            actionCount: data.sessionData.actions.length,
            hasStoredBlob: true,
          });
        }
      } catch (error) {
        console.warn('Failed to store session blob:', error);
      }
    }
  },

  loadSessionFromStorage: async (sessionId: string) => {
    const state = get();

    // Check if we have a stored blob for this session
    const blob = await indexedDBService.getSessionBlob(sessionId);
    if (!blob) {
      console.warn(`No stored blob found for session ${sessionId}`);
      return false;
    }

    try {
      state.setLoading(true);
      state.setError(null);

      // Create a File from the blob for the import function
      const file = new File([blob], `${sessionId}.zip`, { type: 'application/zip' });
      const loadedData = await importSessionFromZip(file);

      // Load without storing again (already stored)
      // Reset lazy resource loader when loading a new session
      resetLazyResourceLoader();

      // Load resourceStorage from session data
      const resourceStorage = new Map<string, StoredResource>();
      if (loadedData.sessionData.resourceStorage) {
        for (const [sha1, resource] of Object.entries(loadedData.sessionData.resourceStorage)) {
          resourceStorage.set(sha1, resource as StoredResource);
        }
      }

      set({
        sessionData: loadedData.sessionData,
        networkEntries: loadedData.networkEntries,
        consoleEntries: loadedData.consoleEntries,
        resources: loadedData.resources,
        resourceStorage,
        audioBlob: loadedData.audioBlob || null,
        systemAudioBlob: loadedData.systemAudioBlob || null,
        lazyLoadEnabled: loadedData.lazyLoadEnabled || false,
        loadingResources: new Set(),
        selectedActionIndex: null,
        shouldScrollToAction: false,
        timelineSelection: null,
        error: null,
        loading: false,
      });

      // Load edit state from IndexedDB
      await get().loadEditState(loadedData.sessionData.sessionId);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session from storage';
      state.setError(message);
      console.error('Failed to load session from storage:', error);
      return false;
    }
  },

  selectAction: (index: number, scroll: boolean = false) => {
    const state = get();
    const editedActions = state.getEditedActions();
    if (index >= 0 && index < editedActions.length) {
      set({ selectedActionIndex: index, shouldScrollToAction: scroll });
    }
  },

  selectActionById: (actionId: string, scroll: boolean = false) => {
    const state = get();
    const editedActions = state.getEditedActions();
    const index = editedActions.findIndex((a) => a.id === actionId);
    if (index !== -1) {
      set({ selectedActionIndex: index, shouldScrollToAction: scroll });
      return true;
    }
    return false;
  },

  clearScrollFlag: () => {
    set({ shouldScrollToAction: false });
  },

  setTimelineSelection: (selection: TimelineSelection | null) => {
    set({ timelineSelection: selection });
  },

  setActiveTab: (tab: 'information' | 'console' | 'network' | 'metadata' | 'voice' | 'transcript') => {
    set({ activeTab: tab });
  },

  clearSession: () => {
    // Reset lazy resource loader when clearing session
    resetLazyResourceLoader();

    set({
      sessionData: null,
      networkEntries: [],
      consoleEntries: [],
      resources: new Map(),
      resourceStorage: new Map(),
      audioBlob: null,
      systemAudioBlob: null,
      lazyLoadEnabled: false,
      loadingResources: new Set(),
      editState: null,
      selectedActionIndex: null,
      shouldScrollToAction: false,
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

  // ============== Lazy Loading Methods (FR-4.7) ==============

  getResourceLazy: async (path: string) => {
    const state = get();

    // If not using lazy loading, return from resources map directly
    if (!state.lazyLoadEnabled) {
      return state.resources.get(path) || null;
    }

    // Check if already in resources cache
    const cached = state.resources.get(path);
    if (cached) {
      return cached;
    }

    // Mark as loading
    const newLoadingSet = new Set(state.loadingResources);
    newLoadingSet.add(path);
    set({ loadingResources: newLoadingSet });

    try {
      const loader = getLazyResourceLoader();
      const blob = await loader.getResource(path);

      if (blob) {
        // Add to resources cache
        const updatedResources = new Map(get().resources);
        updatedResources.set(path, blob);
        set({ resources: updatedResources });
      }

      return blob;
    } finally {
      // Remove from loading set
      const updatedLoadingSet = new Set(get().loadingResources);
      updatedLoadingSet.delete(path);
      set({ loadingResources: updatedLoadingSet });
    }
  },

  isResourceLoading: (path: string) => {
    const state = get();
    return state.loadingResources.has(path);
  },

  preloadResourcesAround: (index: number) => {
    const state = get();

    if (!state.lazyLoadEnabled || !state.sessionData) {
      return;
    }

    const actions = state.getEditedActions();
    const loader = getLazyResourceLoader();

    // Collect screenshot/snapshot paths around the current index
    const pathsToPreload: string[] = [];
    const radius = 5;

    for (let i = Math.max(0, index - radius); i <= Math.min(actions.length - 1, index + radius); i++) {
      const action = actions[i];
      if (!action) continue;

      // Get screenshot paths
      if ('before' in action && action.before?.screenshot) {
        pathsToPreload.push(action.before.screenshot);
      }
      if ('after' in action && action.after?.screenshot) {
        pathsToPreload.push(action.after.screenshot);
      }
      if ('snapshot' in action && action.snapshot?.screenshot) {
        pathsToPreload.push((action as any).snapshot.screenshot);
      }

      // Get snapshot HTML paths
      if ('before' in action && action.before?.html) {
        pathsToPreload.push(action.before.html);
      }
      if ('after' in action && action.after?.html) {
        pathsToPreload.push(action.after.html);
      }
      if ('snapshot' in action && action.snapshot?.html) {
        pathsToPreload.push((action as any).snapshot.html);
      }
    }

    // Trigger preload (non-blocking)
    loader.preloadAround(pathsToPreload, Math.floor(pathsToPreload.length / 2));
  },

  // Derived selectors
  getFilteredActions: () => {
    const state = get();
    const editedActions = state.getEditedActions();
    const { timelineSelection } = state;

    if (!timelineSelection) {
      return editedActions;
    }

    // Filter actions within the timeline selection
    const startMs = new Date(timelineSelection.startTime).getTime();
    const endMs = new Date(timelineSelection.endTime).getTime();

    return editedActions.filter((action) => {
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
    const editedActions = state.getEditedActions();
    if (state.selectedActionIndex === null) {
      return null;
    }
    return editedActions[state.selectedActionIndex] ?? null;
  },

  // ============== Edit State Management (Task 2.1) ==============

  loadEditState: async (sessionId: string) => {
    try {
      const existingState = await indexedDBService.getSessionEditState(sessionId);

      if (existingState) {
        set({ editState: existingState });
      } else {
        // Create new edit state
        const state = get();
        const displayName = state.sessionData?.sessionId.substring(0, 8) || sessionId;
        const newState = createInitialEditState(sessionId, displayName);
        set({ editState: newState });
        await indexedDBService.saveSessionEditState(newState);

        // Also create metadata entry
        if (state.sessionData) {
          const metadata = createLocalSessionMetadata(
            sessionId,
            displayName,
            state.sessionData.startTime
          );
          await indexedDBService.updateSessionMetadata(metadata);
        }
      }
    } catch (error) {
      console.error('Failed to load edit state:', error);
      // Create new state as fallback
      const newState = createInitialEditState(sessionId);
      set({ editState: newState });
    }
  },

  getEditedActions: () => {
    const state = get();
    if (!state.sessionData) return [];

    const { actions } = state.sessionData;
    const { editState } = state;

    if (!editState || editState.operations.length === 0) {
      return actions;
    }

    // Apply all operations to get the edited actions
    return applyOperations(actions, editState.operations);
  },

  getExcludedFiles: () => {
    const state = get();
    if (!state.editState) {
      return new Set<string>();
    }
    return getExcludedFilesFromOperations(state.editState.operations);
  },

  // ============== Edit Actions (Task 2.2) ==============

  addNote: async (insertAfterActionId: string | null, content: string) => {
    const state = get();
    if (!state.sessionData || !state.editState) return null;

    const now = new Date().toISOString();
    const noteId = generateNoteId();

    const operation: AddNoteOperation = {
      id: generateOperationId(),
      type: 'add_note',
      timestamp: now,
      sessionId: state.sessionData.sessionId,
      noteId,
      content,
      insertAfterActionId,
    };

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, operation]),
      redoStack: [], // Clear redo stack on new operation
      lastModified: now,
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
    return noteId;
  },

  editNote: async (noteId: string, newContent: string) => {
    const state = get();
    if (!state.sessionData || !state.editState) return;

    // Find the current content of the note
    const editedActions = state.getEditedActions();
    const note = editedActions.find((a) => a.id === noteId && a.type === 'note') as NoteAction | undefined;
    if (!note) {
      console.warn(`Note ${noteId} not found`);
      return;
    }

    const now = new Date().toISOString();

    const operation: EditNoteOperation = {
      id: generateOperationId(),
      type: 'edit_note',
      timestamp: now,
      sessionId: state.sessionData.sessionId,
      noteId,
      previousContent: note.note.content,
      newContent,
    };

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, operation]),
      redoStack: [],
      lastModified: now,
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  editActionField: async (actionId: string, fieldPath: string, newValue: unknown) => {
    const state = get();
    if (!state.sessionData || !state.editState) return;

    // Find the current value
    const editedActions = state.getEditedActions();
    const action = editedActions.find((a) => a.id === actionId);
    if (!action) {
      console.warn(`Action ${actionId} not found`);
      return;
    }

    const previousValue = getNestedValue(action, fieldPath);

    const now = new Date().toISOString();

    const operation: EditFieldOperation = {
      id: generateOperationId(),
      type: 'edit_field',
      timestamp: now,
      sessionId: state.sessionData.sessionId,
      actionId,
      fieldPath,
      previousValue,
      newValue,
    };

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, operation]),
      redoStack: [],
      lastModified: now,
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  deleteAction: async (actionId: string) => {
    const state = get();
    if (!state.sessionData || !state.editState) return;

    // Find the action and its index
    const editedActions = state.getEditedActions();
    const originalIndex = editedActions.findIndex((a) => a.id === actionId);
    if (originalIndex === -1) {
      console.warn(`Action ${actionId} not found`);
      return;
    }

    const action = editedActions[originalIndex];
    const associatedFiles = getActionAssociatedFiles(action);

    const now = new Date().toISOString();

    const operation: DeleteActionOperation = {
      id: generateOperationId(),
      type: 'delete_action',
      timestamp: now,
      sessionId: state.sessionData.sessionId,
      actionId,
      deletedAction: action,
      originalIndex,
      associatedFiles,
    };

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, operation]),
      redoStack: [],
      lastModified: now,
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  deleteBulkActions: async (startTime: string, endTime: string) => {
    const state = get();
    if (!state.sessionData || !state.editState) return;

    const editedActions = state.getEditedActions();
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    // Find all actions in the time range
    const deletedActions: Array<{
      action: AnyAction;
      originalIndex: number;
      associatedFiles: string[];
    }> = [];

    editedActions.forEach((action, index) => {
      const actionMs = new Date(action.timestamp).getTime();
      if (actionMs >= startMs && actionMs <= endMs) {
        deletedActions.push({
          action,
          originalIndex: index,
          associatedFiles: getActionAssociatedFiles(action),
        });
      }
    });

    if (deletedActions.length === 0) {
      console.warn('No actions found in the specified time range');
      return;
    }

    const now = new Date().toISOString();

    const operation: BulkDeleteOperation = {
      id: generateOperationId(),
      type: 'bulk_delete',
      timestamp: now,
      sessionId: state.sessionData.sessionId,
      startTime,
      endTime,
      deletedActions,
    };

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, operation]),
      redoStack: [],
      lastModified: now,
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  // ============== Undo/Redo (Task 2.3) ==============

  undo: async () => {
    const state = get();
    if (!state.editState || state.editState.operations.length === 0) return;

    const operations = [...state.editState.operations];
    const undoneOp = operations.pop()!;

    const newEditState: SessionEditState = {
      ...state.editState,
      operations,
      redoStack: [...state.editState.redoStack, undoneOp],
      lastModified: new Date().toISOString(),
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  redo: async () => {
    const state = get();
    if (!state.editState || state.editState.redoStack.length === 0) return;

    const redoStack = [...state.editState.redoStack];
    const redoneOp = redoStack.pop()!;

    const newEditState: SessionEditState = {
      ...state.editState,
      operations: trimOperations([...state.editState.operations, redoneOp]),
      redoStack,
      lastModified: new Date().toISOString(),
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);
  },

  canUndo: () => {
    const state = get();
    return state.editState !== null && state.editState.operations.length > 0;
  },

  canRedo: () => {
    const state = get();
    return state.editState !== null && state.editState.redoStack.length > 0;
  },

  // ============== Export Support (Task 2.4) ==============

  markAsExported: async () => {
    const state = get();
    if (!state.editState) return;

    const newEditState: SessionEditState = {
      ...state.editState,
      exportCount: state.editState.exportCount + 1,
      lastModified: new Date().toISOString(),
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);

    // Also update metadata
    const metadata = await indexedDBService.getSessionMetadata(state.editState.sessionId);
    if (metadata) {
      await indexedDBService.updateSessionMetadata({
        ...metadata,
        exportCount: newEditState.exportCount,
      });
    }
  },

  getDisplayName: () => {
    const state = get();
    if (state.editState?.displayName) {
      return state.editState.displayName;
    }
    if (state.sessionData) {
      return state.sessionData.sessionId.substring(0, 8);
    }
    return 'Untitled Session';
  },

  setDisplayName: async (name: string) => {
    const state = get();
    if (!state.editState) return;

    const newEditState: SessionEditState = {
      ...state.editState,
      displayName: name,
      lastModified: new Date().toISOString(),
    };

    set({ editState: newEditState });
    await persistEditState(newEditState);

    // Also update metadata
    const metadata = await indexedDBService.getSessionMetadata(state.editState.sessionId);
    if (metadata) {
      await indexedDBService.updateSessionMetadata({
        ...metadata,
        displayName: name,
      });
    }
  },

  getEditCount: () => {
    const state = get();
    return state.editState?.operations.length ?? 0;
  },
}));

// Helper function to persist edit state to IndexedDB
async function persistEditState(editState: SessionEditState): Promise<void> {
  try {
    await indexedDBService.saveSessionEditState(editState);

    // Also update metadata
    const metadata = await indexedDBService.getSessionMetadata(editState.sessionId);
    if (metadata) {
      await indexedDBService.updateSessionMetadata({
        ...metadata,
        editCount: editState.operations.length,
        exportCount: editState.exportCount,
      });
    }
  } catch (error) {
    console.error('Failed to persist edit state:', error);
  }
}

// Helper function to trim operations array to max size
function trimOperations(operations: EditOperation[]): EditOperation[] {
  if (operations.length <= MAX_OPERATIONS) {
    return operations;
  }
  // Remove oldest operations
  return operations.slice(operations.length - MAX_OPERATIONS);
}
