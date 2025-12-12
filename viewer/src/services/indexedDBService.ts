/**
 * IndexedDB Service for Session Editor
 * Manages persistence of edit operations and session metadata
 */

import type {
  SessionEditState,
  LocalSessionMetadata,
} from '@/types/editOperations';
import { createInitialEditState } from '@/types/editOperations';

const DB_NAME = 'session-editor-db';
const DB_VERSION = 1;

// Object store names
const STORE_SESSION_EDITS = 'sessionEdits';
const STORE_SESSION_METADATA = 'sessionMetadata';

/**
 * IndexedDB Service singleton
 * Manages all IndexedDB operations for the session editor
 */
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isAvailable: boolean = true;

  /**
   * Initialize the IndexedDB database
   * Creates object stores on first run or version upgrade
   */
  async init(): Promise<void> {
    // Return existing init promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = this.initializeDatabase();
    return this.initPromise;
  }

  private async initializeDatabase(): Promise<void> {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.warn('IndexedDB not available. Edit state will not persist across sessions.');
      this.isAvailable = false;
      return;
    }

    return new Promise((resolve, _reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        this.isAvailable = false;
        // Resolve anyway to allow app to continue without persistence
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isAvailable = true;

        // Handle connection errors
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessionEdits store (keyPath: sessionId)
        if (!db.objectStoreNames.contains(STORE_SESSION_EDITS)) {
          db.createObjectStore(STORE_SESSION_EDITS, { keyPath: 'sessionId' });
        }

        // Create sessionMetadata store (keyPath: sessionId)
        if (!db.objectStoreNames.contains(STORE_SESSION_METADATA)) {
          const metadataStore = db.createObjectStore(STORE_SESSION_METADATA, { keyPath: 'sessionId' });
          // Create index for sorting by lastModified
          metadataStore.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked. Please close other tabs using this app.');
      };
    });
  }

  /**
   * Check if IndexedDB is available and initialized
   */
  isReady(): boolean {
    return this.isAvailable && this.db !== null;
  }

  /**
   * Get the edit state for a session
   * Returns null if not found or on error
   */
  async getSessionEditState(sessionId: string): Promise<SessionEditState | null> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_EDITS, 'readonly');
        const store = transaction.objectStore(STORE_SESSION_EDITS);
        const request = store.get(sessionId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('Failed to get session edit state:', request.error);
          resolve(null);
        };
      } catch (error) {
        console.error('Error getting session edit state:', error);
        resolve(null);
      }
    });
  }

  /**
   * Save the edit state for a session
   * Creates or updates the state
   */
  async saveSessionEditState(state: SessionEditState): Promise<boolean> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available. Changes will not persist.');
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_EDITS, 'readwrite');
        const store = transaction.objectStore(STORE_SESSION_EDITS);

        // Update lastModified timestamp
        const updatedState: SessionEditState = {
          ...state,
          lastModified: new Date().toISOString(),
        };

        const request = store.put(updatedState);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('Failed to save session edit state:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error saving session edit state:', error);
        resolve(false);
      }
    });
  }

  /**
   * Delete the edit state for a session
   */
  async deleteSessionEditState(sessionId: string): Promise<boolean> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_EDITS, 'readwrite');
        const store = transaction.objectStore(STORE_SESSION_EDITS);
        const request = store.delete(sessionId);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('Failed to delete session edit state:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error deleting session edit state:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get all session metadata entries
   * Returns sessions sorted by lastModified (newest first)
   */
  async getAllSessionMetadata(): Promise<LocalSessionMetadata[]> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_METADATA, 'readonly');
        const store = transaction.objectStore(STORE_SESSION_METADATA);
        const index = store.index('lastModified');
        const request = index.getAll();

        request.onsuccess = () => {
          // Sort by lastModified descending (newest first)
          const results = (request.result || []) as LocalSessionMetadata[];
          results.sort((a, b) =>
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
          );
          resolve(results);
        };

        request.onerror = () => {
          console.error('Failed to get all session metadata:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('Error getting all session metadata:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get metadata for a specific session
   */
  async getSessionMetadata(sessionId: string): Promise<LocalSessionMetadata | null> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_METADATA, 'readonly');
        const store = transaction.objectStore(STORE_SESSION_METADATA);
        const request = store.get(sessionId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('Failed to get session metadata:', request.error);
          resolve(null);
        };
      } catch (error) {
        console.error('Error getting session metadata:', error);
        resolve(null);
      }
    });
  }

  /**
   * Update metadata for a session
   * Creates new entry if it doesn't exist
   */
  async updateSessionMetadata(metadata: LocalSessionMetadata): Promise<boolean> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_METADATA, 'readwrite');
        const store = transaction.objectStore(STORE_SESSION_METADATA);

        // Update lastModified timestamp
        const updatedMetadata: LocalSessionMetadata = {
          ...metadata,
          lastModified: new Date().toISOString(),
        };

        const request = store.put(updatedMetadata);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('Failed to update session metadata:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error updating session metadata:', error);
        resolve(false);
      }
    });
  }

  /**
   * Delete metadata for a session
   */
  async deleteSessionMetadata(sessionId: string): Promise<boolean> {
    if (!this.isReady()) {
      await this.init();
    }

    if (!this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORE_SESSION_METADATA, 'readwrite');
        const store = transaction.objectStore(STORE_SESSION_METADATA);
        const request = store.delete(sessionId);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('Failed to delete session metadata:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error deleting session metadata:', error);
        resolve(false);
      }
    });
  }

  /**
   * Delete all data for a session (both edit state and metadata)
   */
  async deleteAllSessionData(sessionId: string): Promise<boolean> {
    const [editDeleted, metadataDeleted] = await Promise.all([
      this.deleteSessionEditState(sessionId),
      this.deleteSessionMetadata(sessionId),
    ]);
    return editDeleted && metadataDeleted;
  }

  /**
   * Get or create edit state for a session
   * Returns existing state or creates a new one
   */
  async getOrCreateEditState(sessionId: string, displayName?: string): Promise<SessionEditState> {
    const existing = await this.getSessionEditState(sessionId);
    if (existing) {
      return existing;
    }

    const newState = createInitialEditState(sessionId, displayName);
    await this.saveSessionEditState(newState);
    return newState;
  }

  /**
   * Close the database connection
   * Useful for cleanup or testing
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();

// Export for testing or custom instances
export { IndexedDBService };
