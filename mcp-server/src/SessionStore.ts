/**
 * SessionStore - Manages loading and caching of session.zip files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';
import {
  SessionData,
  TranscriptData,
  NetworkEntry,
  ConsoleEntry,
  LoadedSession,
} from './types';

export class SessionStore {
  private sessions: Map<string, LoadedSession> = new Map();
  private maxSessions: number;

  constructor(maxSessions = 5) {
    this.maxSessions = maxSessions;
  }

  /**
   * Load a session from a zip file or directory
   */
  async load(sessionPath: string): Promise<LoadedSession> {
    // Normalize path
    const normalizedPath = path.resolve(sessionPath);

    // Check if already loaded
    const existing = this.getByPath(normalizedPath);
    if (existing) {
      existing.loadedAt = new Date();
      return existing;
    }

    // Determine if it's a zip file or directory
    const stats = await fs.stat(normalizedPath);
    let session: SessionData;
    let transcript: TranscriptData | undefined;
    let networkEntries: NetworkEntry[] = [];
    let consoleEntries: ConsoleEntry[] = [];

    if (stats.isDirectory()) {
      // Load from directory (unzipped session)
      session = await this.loadSessionFromDirectory(normalizedPath);
      transcript = await this.loadTranscriptFromDirectory(normalizedPath);
      networkEntries = await this.loadNetworkFromDirectory(normalizedPath);
      consoleEntries = await this.loadConsoleFromDirectory(normalizedPath);
    } else if (normalizedPath.endsWith('.zip')) {
      // Load from zip file
      const zipData = await fs.readFile(normalizedPath);
      const zip = await JSZip.loadAsync(zipData);

      session = await this.loadSessionFromZip(zip);
      transcript = await this.loadTranscriptFromZip(zip);
      networkEntries = await this.loadNetworkFromZip(zip);
      consoleEntries = await this.loadConsoleFromZip(zip);
    } else {
      throw new Error(`Invalid session path: ${normalizedPath}. Must be a .zip file or directory.`);
    }

    // Evict oldest if at capacity
    if (this.sessions.size >= this.maxSessions) {
      this.evictOldest();
    }

    const loaded: LoadedSession = {
      sessionId: session.sessionId,
      session,
      transcript,
      networkEntries,
      consoleEntries,
      zipPath: normalizedPath,
      loadedAt: new Date(),
    };

    this.sessions.set(normalizedPath, loaded);
    return loaded;
  }

  /**
   * Get a loaded session by session ID
   */
  get(sessionId: string): LoadedSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.sessionId === sessionId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Get a loaded session by path
   */
  getByPath(sessionPath: string): LoadedSession | undefined {
    const normalizedPath = path.resolve(sessionPath);
    return this.sessions.get(normalizedPath);
  }

  /**
   * Unload a session
   */
  unload(sessionId: string): boolean {
    for (const [path, session] of this.sessions) {
      if (session.sessionId === sessionId) {
        this.sessions.delete(path);
        return true;
      }
    }
    return false;
  }

  /**
   * List all loaded sessions
   */
  list(): Array<{ sessionId: string; path: string; loadedAt: Date }> {
    return Array.from(this.sessions.entries()).map(([path, session]) => ({
      sessionId: session.sessionId,
      path,
      loadedAt: session.loadedAt,
    }));
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private evictOldest(): void {
    let oldest: [string, LoadedSession] | null = null;
    for (const entry of this.sessions.entries()) {
      if (!oldest || entry[1].loadedAt < oldest[1].loadedAt) {
        oldest = entry;
      }
    }
    if (oldest) {
      this.sessions.delete(oldest[0]);
    }
  }

  private async loadSessionFromDirectory(dir: string): Promise<SessionData> {
    const sessionPath = path.join(dir, 'session.json');
    const content = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(content);
  }

  private async loadSessionFromZip(zip: JSZip): Promise<SessionData> {
    const sessionFile = zip.file('session.json');
    if (!sessionFile) {
      throw new Error('Invalid session.zip: missing session.json');
    }
    const content = await sessionFile.async('string');
    return JSON.parse(content);
  }

  private async loadTranscriptFromDirectory(dir: string): Promise<TranscriptData | undefined> {
    const transcriptPath = path.join(dir, 'transcript.json');
    try {
      const content = await fs.readFile(transcriptPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  private async loadTranscriptFromZip(zip: JSZip): Promise<TranscriptData | undefined> {
    const transcriptFile = zip.file('transcript.json');
    if (!transcriptFile) {
      return undefined;
    }
    try {
      const content = await transcriptFile.async('string');
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  private async loadNetworkFromDirectory(dir: string): Promise<NetworkEntry[]> {
    const networkPath = path.join(dir, 'session.network');
    try {
      const content = await fs.readFile(networkPath, 'utf-8');
      return this.parseJsonLines<NetworkEntry>(content);
    } catch {
      return [];
    }
  }

  private async loadNetworkFromZip(zip: JSZip): Promise<NetworkEntry[]> {
    const networkFile = zip.file('session.network');
    if (!networkFile) {
      return [];
    }
    try {
      const content = await networkFile.async('string');
      return this.parseJsonLines<NetworkEntry>(content);
    } catch {
      return [];
    }
  }

  private async loadConsoleFromDirectory(dir: string): Promise<ConsoleEntry[]> {
    const consolePath = path.join(dir, 'session.console');
    try {
      const content = await fs.readFile(consolePath, 'utf-8');
      return this.parseJsonLines<ConsoleEntry>(content);
    } catch {
      return [];
    }
  }

  private async loadConsoleFromZip(zip: JSZip): Promise<ConsoleEntry[]> {
    const consoleFile = zip.file('session.console');
    if (!consoleFile) {
      return [];
    }
    try {
      const content = await consoleFile.async('string');
      return this.parseJsonLines<ConsoleEntry>(content);
    } catch {
      return [];
    }
  }

  /**
   * Parse JSON Lines format (one JSON object per line)
   */
  private parseJsonLines<T>(content: string): T[] {
    const lines = content.trim().split('\n');
    const entries: T[] = [];

    for (const line of lines) {
      if (line.trim()) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return entries;
  }
}
