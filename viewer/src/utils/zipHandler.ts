/**
 * Zip file handling utilities
 * Handles import/export of session data as zip files
 * Supports exporting with edit operations applied
 */

import JSZip from 'jszip';
import type { LoadedSessionData, SessionData, NetworkEntry, ConsoleEntry } from '@/types/session';
import type { EditOperation } from '@/types/editOperations';
import { parseJSONLines, validateSession } from './sessionLoader';
import { getLazyResourceLoader, resetLazyResourceLoader } from './lazyResourceLoader';
import { applyOperations, getExcludedFilesFromOperations } from './editOperationsProcessor';

export interface ImportOptions {
  /** Enable lazy loading of resources (default: true for large sessions) */
  lazyLoad?: boolean;
  /** Threshold for auto-enabling lazy loading (default: 100 actions) */
  lazyLoadThreshold?: number;
}

/**
 * Import session from zip file
 * @param zipFile The zip file to import
 * @param options Import options including lazy loading settings
 */
export async function importSessionFromZip(
  zipFile: File,
  options: ImportOptions = {}
): Promise<LoadedSessionData> {
  const zip = new JSZip();
  const { lazyLoadThreshold = 100 } = options;

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

    // Determine if we should use lazy loading
    // Auto-enable for large sessions unless explicitly disabled
    const shouldLazyLoad =
      options.lazyLoad ?? sessionData.actions.length >= lazyLoadThreshold;

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

    // Load voice audio file (always load immediately - needed for playback)
    let audioBlob: Blob | undefined;
    const voiceAudioFiles = ['audio/recording.wav', 'audio/recording.mp3'];
    for (const audioPath of voiceAudioFiles) {
      const audioFile = zipData.file(audioPath);
      if (audioFile) {
        audioBlob = await audioFile.async('blob');
        break;
      }
    }

    // Load system audio file (for dual-stream playback)
    let systemAudioBlob: Blob | undefined;
    const systemAudioFiles = ['audio/system.webm', 'audio/system.wav', 'audio/system.mp3'];
    for (const audioPath of systemAudioFiles) {
      const audioFile = zipData.file(audioPath);
      if (audioFile) {
        systemAudioBlob = await audioFile.async('blob');
        break;
      }
    }

    // Handle resources based on lazy loading setting
    const resources = new Map<string, Blob>();

    if (shouldLazyLoad) {
      // Initialize lazy resource loader with the zip
      resetLazyResourceLoader();
      const loader = getLazyResourceLoader();
      await loader.initialize(zipData);

      console.log(
        `[LazyLoader] Initialized for ${sessionData.actions.length} actions. ` +
        `Resources will be loaded on demand.`
      );
    } else {
      // Load all resources immediately (existing behavior)
      const filePromises: Promise<void>[] = [];

      zipData.forEach((relativePath, file) => {
        if (!file.dir) {
          if (
            relativePath.startsWith('snapshots/') ||
            relativePath.startsWith('screenshots/') ||
            relativePath.startsWith('resources/')
          ) {
            filePromises.push(
              file.async('blob').then((blob) => {
                resources.set(relativePath, blob);
              })
            );
          }
        }
      });

      // Wait for all resources to load
      await Promise.all(filePromises);
    }

    return {
      sessionData,
      networkEntries,
      consoleEntries,
      resources,
      audioBlob,
      systemAudioBlob,
      lazyLoadEnabled: shouldLazyLoad,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import session from zip: ${error.message}`);
    }
    throw new Error('Failed to import session from zip: Unknown error');
  }
}

export interface ExportOptions {
  /** Edit operations to apply before export */
  editOperations?: EditOperation[];
  /** Audio blob if available */
  audioBlob?: Blob;
}

/**
 * Export session to zip file
 * Supports applying edit operations (notes, field edits, deletions) before export
 *
 * @param sessionData - Original session data
 * @param networkEntries - Network log entries
 * @param consoleEntries - Console log entries
 * @param resources - Map of resource paths to blobs
 * @param options - Export options including edit operations
 */
export async function exportSessionToZip(
  sessionData: SessionData,
  networkEntries: NetworkEntry[],
  consoleEntries: ConsoleEntry[],
  resources: Map<string, Blob>,
  options: ExportOptions = {}
): Promise<Blob> {
  const zip = new JSZip();
  const { editOperations = [], audioBlob } = options;

  try {
    // Apply edit operations to create modified session data
    let modifiedSessionData = { ...sessionData };

    if (editOperations.length > 0) {
      // Apply all edit operations to the actions array
      const modifiedActions = applyOperations(sessionData.actions, editOperations);
      modifiedSessionData = {
        ...sessionData,
        actions: modifiedActions,
      };
    }

    // Get files to exclude (from deleted actions)
    const excludedFiles = getExcludedFilesFromOperations(editOperations);

    // Add session.json with modified data
    zip.file('session.json', JSON.stringify(modifiedSessionData, null, 2));

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

    // Add resources (excluding files from deleted actions)
    resources.forEach((blob, relativePath) => {
      if (!excludedFiles.has(relativePath)) {
        zip.file(relativePath, blob);
      }
    });

    // Add audio file if available
    if (audioBlob) {
      // Determine audio format from blob type
      const extension = audioBlob.type.includes('mp3') ? 'mp3' : 'wav';
      zip.file(`audio/recording.${extension}`, audioBlob);
    }

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
