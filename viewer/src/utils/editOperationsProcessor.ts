/**
 * Edit Operations Processor
 * Pure functions for applying edit operations to session data
 */

import type { AnyAction, NoteAction, RecordedAction, NavigationAction } from '@/types/session';
import type {
  EditOperation,
  AddNoteOperation,
  EditNoteOperation,
  EditFieldOperation,
  DeleteActionOperation,
  BulkDeleteOperation,
} from '@/types/editOperations';
import {
  isAddNoteOperation,
  isEditNoteOperation,
  isEditFieldOperation,
  isDeleteActionOperation,
  isBulkDeleteOperation,
  generateNoteId,
} from '@/types/editOperations';

/**
 * Apply all edit operations to an actions array
 * Returns a new array with all operations applied
 *
 * @param actions - Original actions array from session data
 * @param operations - Array of edit operations to apply (in order)
 * @returns New array with all operations applied
 */
export function applyOperations(actions: AnyAction[], operations: EditOperation[]): AnyAction[] {
  let result = [...actions];

  for (const op of operations) {
    result = applyOperation(result, op);
  }

  return result;
}

/**
 * Apply a single edit operation to an actions array
 * Returns a new array with the operation applied
 *
 * @param actions - Current actions array
 * @param operation - Operation to apply
 * @returns New array with operation applied
 */
export function applyOperation(actions: AnyAction[], operation: EditOperation): AnyAction[] {
  if (isAddNoteOperation(operation)) {
    return applyAddNote(actions, operation);
  }

  if (isEditNoteOperation(operation)) {
    return applyEditNote(actions, operation);
  }

  if (isEditFieldOperation(operation)) {
    return applyEditField(actions, operation);
  }

  if (isDeleteActionOperation(operation)) {
    return applyDeleteAction(actions, operation);
  }

  if (isBulkDeleteOperation(operation)) {
    return applyBulkDelete(actions, operation);
  }

  // Unknown operation type - return unchanged
  console.warn('Unknown operation type:', (operation as EditOperation).type);
  return actions;
}

/**
 * Apply an AddNoteOperation
 */
function applyAddNote(actions: AnyAction[], operation: AddNoteOperation): AnyAction[] {
  const noteAction: NoteAction = {
    id: operation.noteId,
    type: 'note',
    timestamp: operation.timestamp,
    note: {
      content: operation.content,
      createdAt: operation.timestamp,
      updatedAt: operation.timestamp,
      insertAfterActionId: operation.insertAfterActionId,
    },
  };

  return insertNote(actions, noteAction);
}

/**
 * Apply an EditNoteOperation
 */
function applyEditNote(actions: AnyAction[], operation: EditNoteOperation): AnyAction[] {
  return actions.map((action) => {
    if (action.id === operation.noteId && action.type === 'note') {
      const noteAction = action as NoteAction;
      return {
        ...noteAction,
        timestamp: operation.timestamp,
        note: {
          ...noteAction.note,
          content: operation.newContent,
          updatedAt: operation.timestamp,
        },
      };
    }
    return action;
  });
}

/**
 * Apply an EditFieldOperation
 */
function applyEditField(actions: AnyAction[], operation: EditFieldOperation): AnyAction[] {
  return actions.map((action) => {
    if (action.id === operation.actionId) {
      return setNestedValue(action, operation.fieldPath, operation.newValue);
    }
    return action;
  });
}

/**
 * Apply a DeleteActionOperation
 */
function applyDeleteAction(actions: AnyAction[], operation: DeleteActionOperation): AnyAction[] {
  return actions.filter((action) => action.id !== operation.actionId);
}

/**
 * Apply a BulkDeleteOperation
 */
function applyBulkDelete(actions: AnyAction[], operation: BulkDeleteOperation): AnyAction[] {
  const startMs = new Date(operation.startTime).getTime();
  const endMs = new Date(operation.endTime).getTime();

  return actions.filter((action) => {
    const actionMs = new Date(action.timestamp).getTime();
    return actionMs < startMs || actionMs > endMs;
  });
}

/**
 * Insert a note at the correct position in the actions array
 * Notes are inserted after the action specified by insertAfterActionId
 * If insertAfterActionId is null, insert at the beginning
 *
 * @param actions - Current actions array
 * @param noteAction - Note to insert
 * @returns New array with note inserted
 */
export function insertNote(actions: AnyAction[], noteAction: NoteAction): AnyAction[] {
  const result = [...actions];
  const insertAfterActionId = noteAction.note.insertAfterActionId;

  if (insertAfterActionId === null) {
    // Insert at the beginning
    result.unshift(noteAction);
  } else {
    // Find the index of the action to insert after
    const insertAfterIndex = result.findIndex((a) => a.id === insertAfterActionId);

    if (insertAfterIndex === -1) {
      // Action not found - append at the end
      console.warn(`Action ${insertAfterActionId} not found, appending note at end`);
      result.push(noteAction);
    } else {
      // Insert after the found action
      result.splice(insertAfterIndex + 1, 0, noteAction);
    }
  }

  return result;
}

/**
 * Create a NoteAction object
 *
 * @param content - Markdown content
 * @param insertAfterActionId - ID of action to insert after (null for beginning)
 * @returns New NoteAction
 */
export function createNoteAction(content: string, insertAfterActionId: string | null): NoteAction {
  const now = new Date().toISOString();
  return {
    id: generateNoteId(),
    type: 'note',
    timestamp: now,
    note: {
      content,
      createdAt: now,
      updatedAt: now,
      insertAfterActionId,
    },
  };
}

/**
 * Get associated files for an action (screenshots, HTML files)
 * Used to determine which files to exclude from export when action is deleted
 *
 * @param action - Action to get files for
 * @returns Array of file paths associated with this action
 */
export function getActionAssociatedFiles(action: AnyAction): string[] {
  const files: string[] = [];

  // RecordedAction has before/after snapshots
  if (action.type === 'click' || action.type === 'input' || action.type === 'change' ||
      action.type === 'submit' || action.type === 'keydown') {
    const recordedAction = action as RecordedAction;

    if (recordedAction.before) {
      if (recordedAction.before.screenshot) files.push(recordedAction.before.screenshot);
      if (recordedAction.before.html) files.push(recordedAction.before.html);
    }

    if (recordedAction.after) {
      if (recordedAction.after.screenshot) files.push(recordedAction.after.screenshot);
      if (recordedAction.after.html) files.push(recordedAction.after.html);
    }
  }

  // NavigationAction has snapshot
  if (action.type === 'navigation') {
    const navAction = action as NavigationAction;
    if (navAction.snapshot) {
      if (navAction.snapshot.screenshot) files.push(navAction.snapshot.screenshot);
      if (navAction.snapshot.html) files.push(navAction.snapshot.html);
    }
  }

  // Other action types with optional snapshot
  if ('snapshot' in action && action.snapshot) {
    const snapshot = action.snapshot as { screenshot?: string; html?: string };
    if (snapshot.screenshot) files.push(snapshot.screenshot);
    if (snapshot.html) files.push(snapshot.html);
  }

  return files;
}

/**
 * Get all files that should be excluded from export based on delete operations
 *
 * @param operations - Array of edit operations
 * @returns Set of file paths to exclude
 */
export function getExcludedFilesFromOperations(operations: EditOperation[]): Set<string> {
  const excluded = new Set<string>();

  for (const op of operations) {
    if (isDeleteActionOperation(op)) {
      for (const file of op.associatedFiles) {
        excluded.add(file);
      }
    }

    if (isBulkDeleteOperation(op)) {
      for (const deleted of op.deletedActions) {
        for (const file of deleted.associatedFiles) {
          excluded.add(file);
        }
      }
    }
  }

  return excluded;
}

/**
 * Set a value at a nested path in an object
 * Returns a new object with the value set (does not mutate original)
 *
 * @param obj - Object to modify
 * @param path - Dot-notation path (e.g., 'action.value', 'transcript.text')
 * @param value - Value to set
 * @returns New object with value set
 */
export function setNestedValue<T extends object>(obj: T, path: string, value: unknown): T {
  const parts = path.split('.');
  const result = { ...obj } as Record<string, unknown>;
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] && typeof current[key] === 'object') {
      current[key] = { ...(current[key] as object) };
      current = current[key] as Record<string, unknown>;
    } else {
      // Path doesn't exist - create it
      current[key] = {};
      current = current[key] as Record<string, unknown>;
    }
  }

  const lastKey = parts[parts.length - 1];
  current[lastKey] = value;

  return result as T;
}

/**
 * Get a value at a nested path in an object
 *
 * @param obj - Object to read from
 * @param path - Dot-notation path (e.g., 'action.value', 'transcript.text')
 * @returns Value at path, or undefined if not found
 */
export function getNestedValue<T = unknown>(obj: object, path: string): T | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const key of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * Check if an action is a deletable type
 * Notes are always deletable, other actions may have restrictions
 *
 * @param action - Action to check
 * @returns Whether the action can be deleted
 */
export function isActionDeletable(_action: AnyAction): boolean {
  // All action types are currently deletable
  return true;
}

/**
 * Check if a field on an action is editable
 *
 * @param action - Action to check
 * @param fieldPath - Path to the field
 * @returns Whether the field can be edited
 */
export function isFieldEditable(action: AnyAction, fieldPath: string): boolean {
  // Note content is editable
  if (action.type === 'note' && fieldPath === 'note.content') {
    return true;
  }

  // Voice transcript text is editable
  if (action.type === 'voice_transcript' && fieldPath === 'transcript.text') {
    return true;
  }

  // Input action value is editable
  if (action.type === 'input' && fieldPath === 'action.value') {
    return true;
  }

  // Change action value is editable
  if (action.type === 'change' && fieldPath === 'action.value') {
    return true;
  }

  // By default, fields are not editable
  return false;
}
