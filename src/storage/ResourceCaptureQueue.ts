/**
 * ResourceCaptureQueue - Non-blocking resource capture with background processing (TR-4)
 *
 * Addresses performance issues from TASKS-session-recorder.md:
 * - Implements ResourceCaptureQueue for non-blocking capture
 * - Background SHA1 hashing
 * - Non-blocking response handler
 */

import { createHash } from 'crypto';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

export interface QueuedResource {
  url: string;
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

export interface ProcessedResource {
  url: string;
  sha1: string;
  size: number;
  contentType: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalBytes: number;
}

/**
 * ResourceCaptureQueue processes resource captures in the background
 * to avoid blocking the main event loop during page interactions
 */
export class ResourceCaptureQueue {
  private queue: QueuedResource[] = [];
  private processing: boolean = false;
  private urlToSha1: Map<string, string> = new Map();
  private sha1ToResource: Map<string, ProcessedResource> = new Map();
  private resourcesDir: string;
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalBytes: 0
  };

  // Configuration
  private maxConcurrent: number;
  private batchSize: number;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    resourcesDir: string,
    options: {
      maxConcurrent?: number;  // Max concurrent hash/write operations
      batchSize?: number;      // Items to process per tick
    } = {}
  ) {
    this.resourcesDir = resourcesDir;
    this.maxConcurrent = options.maxConcurrent || 5;
    this.batchSize = options.batchSize || 10;
  }

  /**
   * Add a resource to the capture queue (non-blocking)
   * Returns the SHA1 filename immediately for URL mapping, processing happens in background
   */
  enqueue(url: string, buffer: Buffer, contentType: string): string {
    // Skip if already processed or queued
    const existingSha1 = this.urlToSha1.get(url);
    if (existingSha1) {
      return existingSha1;
    }

    // Quick SHA1 check for deduplication (minimal blocking - SHA1 is fast)
    const sha1 = this._quickHash(buffer);
    const ext = this._getExtension(contentType);
    const filename = `${sha1}.${ext}`;

    // Map URL to filename immediately (needed for CSS rewriting)
    this.urlToSha1.set(url, filename);

    if (this.sha1ToResource.has(sha1)) {
      // Already have this content, no need to queue for disk write
      return filename;
    }

    // Add to queue for background disk write
    this.queue.push({
      url,
      buffer,
      contentType,
      timestamp: Date.now()
    });
    this.stats.pending++;

    // Start processing if not already running
    this._startProcessing();

    return filename;
  }

  /**
   * Quick SHA1 hash (synchronous but fast for deduplication check)
   */
  private _quickHash(buffer: Buffer): string {
    return createHash('sha1').update(buffer).digest('hex');
  }

  /**
   * Start background processing if not already running
   */
  private _startProcessing(): void {
    if (this.processing) return;

    this.processing = true;
    // Use setImmediate to avoid blocking
    setImmediate(() => this._processBatch());
  }

  /**
   * Process a batch of queued resources
   */
  private async _processBatch(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    // Get batch to process
    const batch = this.queue.splice(0, this.batchSize);
    this.stats.pending -= batch.length;
    this.stats.processing += batch.length;

    // Process batch concurrently (with limit)
    const chunks = this._chunkArray(batch, this.maxConcurrent);

    for (const chunk of chunks) {
      await Promise.all(chunk.map(item => this._processResource(item)));
    }

    // Continue processing if more items
    if (this.queue.length > 0) {
      // Use setImmediate to yield to event loop
      setImmediate(() => this._processBatch());
    } else {
      this.processing = false;
    }
  }

  /**
   * Process a single resource
   */
  private async _processResource(item: QueuedResource): Promise<void> {
    try {
      // Calculate SHA1 (already done in quick check, but we need the full result)
      const sha1 = this._quickHash(item.buffer);
      const ext = this._getExtension(item.contentType);
      const filename = `${sha1}.${ext}`;

      // Check if already exists (from another URL)
      if (!this.sha1ToResource.has(sha1)) {
        // Save to disk
        const filepath = path.join(this.resourcesDir, filename);
        await fsPromises.writeFile(filepath, item.buffer);

        // Store resource info
        this.sha1ToResource.set(sha1, {
          url: item.url,
          sha1: filename,
          size: item.buffer.length,
          contentType: item.contentType
        });

        this.stats.totalBytes += item.buffer.length;
      }

      // Map URL to SHA1
      this.urlToSha1.set(item.url, filename);

      this.stats.processing--;
      this.stats.completed++;
    } catch (error) {
      console.error(`[ResourceQueue] Failed to process ${item.url}:`, error);
      this.stats.processing--;
      this.stats.failed++;
    }
  }

  /**
   * Get file extension from content type
   */
  private _getExtension(contentType: string): string {
    const mimeMap: Record<string, string> = {
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
      'application/json': 'json',
      'text/html': 'html',
      'text/plain': 'txt',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
      'font/woff': 'woff',
      'font/woff2': 'woff2',
      'font/ttf': 'ttf',
      'font/otf': 'otf',
      'application/font-woff': 'woff',
      'application/font-woff2': 'woff2',
    };

    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return mimeMap[baseType] || 'dat';
  }

  /**
   * Split array into chunks
   */
  private _chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get SHA1 filename for a URL (if processed)
   */
  getSha1ForUrl(url: string): string | undefined {
    return this.urlToSha1.get(url);
  }

  /**
   * Check if URL has been processed
   */
  hasUrl(url: string): boolean {
    return this.urlToSha1.has(url);
  }

  /**
   * Get all URL to SHA1 mappings
   */
  getUrlMappings(): Map<string, string> {
    return new Map(this.urlToSha1);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats, pending: this.queue.length };
  }

  /**
   * Wait for all queued items to be processed
   * Use this before saving session to ensure all resources are captured
   */
  async flush(): Promise<void> {
    // Process remaining items immediately
    while (this.queue.length > 0 || this.stats.processing > 0) {
      if (this.queue.length > 0 && !this.processing) {
        this.processing = true;
        await this._processBatch();
      }
      // Small delay to allow processing to complete
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Clear the queue and reset stats
   */
  clear(): void {
    this.queue = [];
    this.urlToSha1.clear();
    this.sha1ToResource.clear();
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalBytes: 0
    };
    this.processing = false;
  }
}
