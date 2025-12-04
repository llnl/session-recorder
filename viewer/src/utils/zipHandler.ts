/**
 * Zip file handling utilities
 * Handles import/export of session data as zip files
 */

import JSZip from 'jszip';
import type { LoadedSessionData, SessionData, NetworkEntry, ConsoleEntry } from '@/types/session';
import { parseJSONLines, validateSession } from './sessionLoader';

/**
 * Import session from zip file
 */
export async function importSessionFromZip(zipFile: File): Promise<LoadedSessionData> {
  const zip = new JSZip();

  try {
    // Load and parse zip
    const zipData = await zip.loadAsync(zipFile);

    // Load session.json
    const sessionFile = zipData.file('session.json');
    if (!sessionFile) {
      throw new Error('session.json not found in zip file');
    }
    const sessionText = await sessionFile.async('text');
    const sessionData: SessionData = JSON.parse(sessionText);

    // Validate session structure
    const validation = validateSession(sessionData);
    if (!validation.valid) {
      throw new Error(`Invalid session data: ${validation.errors.join(', ')}`);
    }

    // Load network entries
    let networkEntries: NetworkEntry[] = [];
    const networkFile = zipData.file('session.network');
    if (networkFile) {
      const networkText = await networkFile.async('text');
      networkEntries = parseJSONLines<NetworkEntry>(networkText);
    }

    // Load console entries
    let consoleEntries: ConsoleEntry[] = [];
    const consoleFile = zipData.file('session.console');
    if (consoleFile) {
      const consoleText = await consoleFile.async('text');
      consoleEntries = parseJSONLines<ConsoleEntry>(consoleText);
    }

    // Load all resources (snapshots, screenshots, etc.)
    const resources = new Map<string, Blob>();
    const filePromises: Promise<void>[] = [];

    zipData.forEach((relativePath, file) => {
      if (!file.dir && (
        relativePath.startsWith('snapshots/') ||
        relativePath.startsWith('screenshots/') ||
        relativePath.startsWith('resources/')
      )) {
        filePromises.push(
          file.async('blob').then((blob) => {
            resources.set(relativePath, blob);
          })
        );
      }
    });

    // Wait for all resources to load
    await Promise.all(filePromises);

    return {
      sessionData,
      networkEntries,
      consoleEntries,
      resources,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import session from zip: ${error.message}`);
    }
    throw new Error('Failed to import session from zip: Unknown error');
  }
}

/**
 * Export session to zip file
 * Note: This function expects the session to be loaded from a directory or previous import
 */
export async function exportSessionToZip(
  sessionData: SessionData,
  networkEntries: NetworkEntry[],
  consoleEntries: ConsoleEntry[],
  resources: Map<string, Blob>
): Promise<Blob> {
  const zip = new JSZip();

  try {
    // Add session.json
    zip.file('session.json', JSON.stringify(sessionData, null, 2));

    // Add network log (JSON Lines format)
    if (networkEntries.length > 0) {
      const networkLines = networkEntries.map(entry => JSON.stringify(entry)).join('\n');
      zip.file('session.network', networkLines);
    }

    // Add console log (JSON Lines format)
    if (consoleEntries.length > 0) {
      const consoleLines = consoleEntries.map(entry => JSON.stringify(entry)).join('\n');
      zip.file('session.console', consoleLines);
    }

    // Add all resources
    resources.forEach((blob, relativePath) => {
      zip.file(relativePath, blob);
    });

    // Generate zip file
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return zipBlob;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to export session to zip: ${error.message}`);
    }
    throw new Error('Failed to export session to zip: Unknown error');
  }
}

/**
 * Trigger browser download of zip file
 */
export function downloadZipFile(zipBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get suggested filename for session export
 */
export function getExportFilename(sessionData: SessionData): string {
  const timestamp = new Date(sessionData.startTime).toISOString().replace(/[:.]/g, '-');
  return `session-${sessionData.sessionId}-${timestamp}.zip`;
}
