/**
 * Edit Operation Types for Session Editor
 * Defines all operation types that can be stored in IndexedDB for undo/redo functionality
 */

/**
 * Base interface for all edit operations
 */
export interface BaseEditOperation {
  /** Unique identifier for this operation */
  id: string;
  /** ISO 8601 UTC timestamp when this operation was performed */
  timestamp: string;
  /** Session ID this operation belongs to */
  sessionId: string;
}

/**
 * Operation to add a new note to the session
 */
export interface AddNoteOperation extends BaseEditOperation {
  type: 'add_note';
  /** The generated ID for the new note action */
  noteId: string;
  /** Content of the note (markdown) */
  content: string;
  /** ID of the action this note should be inserted after */
  insertAfterActionId: string | null;
}

/**
 * Operation to edit a note's content
 */
export interface EditNoteOperation extends BaseEditOperation {
  type: 'edit_note';
  /** ID of the note being edited */
  noteId: string;
  /** Previous content for undo */
  previousContent: string;
  /** New content */
  newContent: string;
}

/**
 * Operation to edit a field on any action
 */
export interface EditFieldOperation extends BaseEditOperation {
  type: 'edit_field';
  /** ID of the action being edited */
  actionId: string;
  /** Dot-notation path to the field being edited (e.g., 'action.value', 'transcript.text') */
  fieldPath: string;
  /** Previous value for undo */
  previousValue: unknown;
  /** New value */
  newValue: unknown;
}

/**
 * Operation to delete a single action
 */
export interface DeleteActionOperation extends BaseEditOperation {
  type: 'delete_action';
  /** ID of the deleted action */
  actionId: string;
  /** Full copy of the deleted action for undo */
  deletedAction: unknown;
  /** Original index in the actions array */
  originalIndex: number;
  /** Associated files that should be excluded from export (screenshots, HTML files) */
  associatedFiles: string[];
}

/**
 * Operation to delete multiple actions in a time range
 */
export interface BulkDeleteOperation extends BaseEditOperation {
  type: 'bulk_delete';
  /** Start time of the deletion range (ISO 8601 UTC) */
  startTime: string;
  /** End time of the deletion range (ISO 8601 UTC) */
  endTime: string;
  /** Array of deleted actions with their original indices for undo */
  deletedActions: Array<{
    action: unknown;
    originalIndex: number;
    associatedFiles: string[];
  }>;
}

/**
 * Union type of all edit operations
 */
export type EditOperation =
  | AddNoteOperation
  | EditNoteOperation
  | EditFieldOperation
  | DeleteActionOperation
  | BulkDeleteOperation;

/**
 * Type guard for AddNoteOperation
 */
export function isAddNoteOperation(op: EditOperation): op is AddNoteOperation {
  return op.type === 'add_note';
}

/**
 * Type guard for EditNoteOperation
 */
export function isEditNoteOperation(op: EditOperation): op is EditNoteOperation {
  return op.type === 'edit_note';
}

/**
 * Type guard for EditFieldOperation
 */
export function isEditFieldOperation(op: EditOperation): op is EditFieldOperation {
  return op.type === 'edit_field';
}

/**
 * Type guard for DeleteActionOperation
 */
export function isDeleteActionOperation(op: EditOperation): op is DeleteActionOperation {
  return op.type === 'delete_action';
}

/**
 * Type guard for BulkDeleteOperation
 */
export function isBulkDeleteOperation(op: EditOperation): op is BulkDeleteOperation {
  return op.type === 'bulk_delete';
}

/**
 * State of edit operations for a session
 * Stored in IndexedDB
 */
export interface SessionEditState {
  /** Session ID this state belongs to */
  sessionId: string;
  /** Ordered list of applied operations (newest last) */
  operations: EditOperation[];
  /** Stack of operations that were undone (for redo) */
  redoStack: EditOperation[];
  /** Display name for the session (user-editable) */
  displayName?: string;
  /** Number of times this session has been exported */
  exportCount: number;
  /** ISO 8601 UTC timestamp of last modification */
  lastModified: string;
}

/**
 * Metadata for a session stored locally
 * Used in the local sessions list
 */
export interface LocalSessionMetadata {
  /** Session ID */
  sessionId: string;
  /** User-friendly display name */
  displayName: string;
  /** Number of edit operations applied */
  editCount: number;
  /** Number of times exported */
  exportCount: number;
  /** ISO 8601 UTC timestamp of last modification */
  lastModified: string;
  /** ISO 8601 UTC timestamp when first loaded */
  createdAt: string;
  /** Original session start time */
  originalStartTime: string;
  /** Number of actions in the session */
  actionCount?: number;
  /** Whether the session zip blob is stored for reload */
  hasStoredBlob?: boolean;
}

/**
 * Create a new SessionEditState for a session
 */
export function createInitialEditState(sessionId: string, displayName?: string): SessionEditState {
  return {
    sessionId,
    operations: [],
    redoStack: [],
    displayName,
    exportCount: 0,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Create a new LocalSessionMetadata entry
 */
export function createLocalSessionMetadata(
  sessionId: string,
  displayName: string,
  originalStartTime: string
): LocalSessionMetadata {
  const now = new Date().toISOString();
  return {
    sessionId,
    displayName,
    editCount: 0,
    exportCount: 0,
    lastModified: now,
    createdAt: now,
    originalStartTime,
  };
}

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique note ID
 */
export function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
