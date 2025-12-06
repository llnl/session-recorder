/**
 * Session data loader utilities
 * Handles loading session.json and parsing JSON Lines files
 */

import type { SessionData, NetworkEntry, ConsoleEntry, LoadedSessionData } from '@/types/session';

/**
 * Parse JSON Lines format (newline-delimited JSON)
 * Each line is a separate JSON object
 */
export function parseJSONLines<T>(content: string): T[] {
  const lines = content.trim().split('\n');
  const results: T[] = [];

  for (const line of lines) {
    if (line.trim()) {
      try {
        results.push(JSON.parse(line));
      } catch (error) {
        console.error('Failed to parse JSON line:', line, error);
      }
    }
  }

  return results;
}

/**
 * Load session.json file
 */
export async function loadSessionJSON(file: File): Promise<SessionData> {
  const text = await file.text();
  return JSON.parse(text) as SessionData;
}

/**
 * Load network entries from session.network file
 */
export async function loadNetworkEntries(file: File): Promise<NetworkEntry[]> {
  const text = await file.text();
  return parseJSONLines<NetworkEntry>(text);
}

/**
 * Load console entries from session.console file
 */
export async function loadConsoleEntries(file: File): Promise<ConsoleEntry[]> {
  const text = await file.text();
  return parseJSONLines<ConsoleEntry>(text);
}

/**
 * Load session data from directory (via File API)
 * User selects multiple files from the session directory
 */
export async function loadSessionFromFiles(files: FileList): Promise<LoadedSessionData> {
  const fileMap = new Map<string, File>();

  // Organize files by name
  Array.from(files).forEach(file => {
    fileMap.set(file.name, file);
  });

  // Load session.json
  const sessionFile = fileMap.get('session.json');
  if (!sessionFile) {
    throw new Error('session.json not found in selected files');
  }
  const sessionData = await loadSessionJSON(sessionFile);

  // Load network entries
  let networkEntries: NetworkEntry[] = [];
  const networkFile = fileMap.get('session.network');
  if (networkFile) {
    networkEntries = await loadNetworkEntries(networkFile);
  }

  // Load console entries
  let consoleEntries: ConsoleEntry[] = [];
  const consoleFile = fileMap.get('session.console');
  if (consoleFile) {
    consoleEntries = await loadConsoleEntries(consoleFile);
  }

  // Load resources (snapshot HTML, screenshots, etc.)
  const resources = new Map<string, Blob>();
  let audioBlob: Blob | undefined;

  Array.from(files).forEach(file => {
    // Store snapshots, screenshots, and resources by relative path
    if (file.name.startsWith('snapshots/') ||
        file.name.startsWith('screenshots/') ||
        file.name.startsWith('resources/')) {
      resources.set(file.name, file);
    } else if (file.name.startsWith('audio/') && file.name.endsWith('.wav')) {
      audioBlob = file;
    }
  });

  return {
    sessionData,
    networkEntries,
    consoleEntries,
    resources,
    audioBlob,
  };
}

/**
 * Validate session structure
 */
export function validateSession(data: SessionData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.sessionId) {
    errors.push('Missing sessionId');
  }

  if (!data.startTime) {
    errors.push('Missing startTime');
  }

  if (!Array.isArray(data.actions)) {
    errors.push('actions must be an array');
  } else if (data.actions.length === 0) {
    errors.push('No actions recorded');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
