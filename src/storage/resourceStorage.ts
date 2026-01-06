/**
 * Resource storage with SHA1-based deduplication
 * Based on Playwright's resource storage approach
 */

import { createHash } from 'crypto';
import type { ResourceOverride } from '../browser/snapshotCapture';

export interface StoredResource {
  sha1: string;
  content: string; // base64 for binary, raw for text
  contentType: string;
  size: number;
  timestamp: number;
}

/**
 * ResourceStorage class manages resource deduplication using SHA1 hashing
 * Same content = same SHA1 hash = stored only once
 */
export class ResourceStorage {
  private resources: Map<string, StoredResource> = new Map();
  private urlToSha1: Map<string, string> = new Map();

  constructor(private sessionId: string) {}

  /**
   * Store a resource and return its SHA1 hash
   * Automatically deduplicates identical resources
   */
  async storeResource(
    url: string,
    content: string | Buffer,
    contentType: string
  ): Promise<string> {
    // Calculate SHA1
    const hash = createHash('sha1');
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    hash.update(buffer);
    const sha1 = hash.digest('hex');

    // Add file extension based on content type
    const ext = this.getExtension(contentType);
    const sha1WithExt = `${sha1}.${ext}`;

    // Check if already stored (deduplication)
    if (this.resources.has(sha1WithExt)) {
      // Resource already exists, just map URL to existing SHA1
      this.urlToSha1.set(url, sha1WithExt);
      return sha1WithExt;
    }

    // Store new resource
    const stored: StoredResource = {
      sha1: sha1WithExt,
      content: this.isTextContent(contentType)
        ? buffer.toString('utf8')
        : buffer.toString('base64'),
      contentType,
      size: buffer.length,
      timestamp: Date.now()
    };

    this.resources.set(sha1WithExt, stored);
    this.urlToSha1.set(url, sha1WithExt);

    return sha1WithExt;
  }

  /**
   * Store multiple resources from ResourceOverride array
   * Returns map of URL to SHA1
   */
  async storeResources(overrides: ResourceOverride[]): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();

    for (const override of overrides) {
      try {
        const sha1 = await this.storeResource(
          override.url,
          override.content,
          override.contentType
        );
        urlMap.set(override.url, sha1);
      } catch (error) {
        console.error(`[ResourceStorage] Failed to store resource ${override.url}:`, error);
      }
    }

    return urlMap;
  }

  /**
   * Get resource by SHA1 hash
   */
  getResource(sha1: string): StoredResource | null {
    return this.resources.get(sha1) || null;
  }

  /**
   * Get resource by original URL
   */
  getResourceByUrl(url: string): StoredResource | null {
    const sha1 = this.urlToSha1.get(url);
    return sha1 ? this.getResource(sha1) : null;
  }

  /**
   * Get SHA1 for a given URL
   */
  getSha1ForUrl(url: string): string | null {
    return this.urlToSha1.get(url) || null;
  }

  /**
   * Check if resource exists
   */
  hasResource(sha1: string): boolean {
    return this.resources.has(sha1);
  }

  /**
   * Get total storage size in bytes
   */
  getTotalSize(): number {
    let total = 0;
    for (const resource of this.resources.values()) {
      total += resource.size;
    }
    return total;
  }

  /**
   * Get resource count
   */
  getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalSize: this.getTotalSize(),
      resourceCount: this.getResourceCount(),
      urlCount: this.urlToSha1.size,
      deduplicationRatio: this.urlToSha1.size > 0
        ? (1 - this.resources.size / this.urlToSha1.size) * 100
        : 0,
      byType: new Map<string, { count: number; size: number }>()
    };

    // Group by content type
    for (const resource of this.resources.values()) {
      const type = resource.contentType;
      if (!stats.byType.has(type)) {
        stats.byType.set(type, { count: 0, size: 0 });
      }
      const typeStats = stats.byType.get(type)!;
      typeStats.count++;
      typeStats.size += resource.size;
    }

    return stats;
  }

  /**
   * Export to JSON (for saving to session.json)
   */
  exportToJSON(): Record<string, StoredResource> {
    const result: Record<string, StoredResource> = {};
    for (const [sha1, resource] of this.resources.entries()) {
      result[sha1] = resource;
    }
    return result;
  }

  /**
   * Export URL mappings (for snapshot metadata)
   */
  exportUrlMappings(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [url, sha1] of this.urlToSha1.entries()) {
      result[url] = sha1;
    }
    return result;
  }

  /**
   * Import from JSON (when loading session)
   */
  importFromJSON(data: Record<string, StoredResource>): void {
    for (const [sha1, resource] of Object.entries(data)) {
      this.resources.set(sha1, resource);
    }
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
    this.urlToSha1.clear();
  }

  /**
   * Get file extension from content type
   */
  private getExtension(contentType: string): string {
    const mimeMap: Record<string, string> = {
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
      'application/json': 'json',
      'text/html': 'html',
      'text/plain': 'txt',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
      'font/woff': 'woff',
      'font/woff2': 'woff2',
      'font/ttf': 'ttf',
      'font/otf': 'otf',
      'font/eot': 'eot',
      'application/font-woff': 'woff',
      'application/font-woff2': 'woff2',
      'application/x-font-ttf': 'ttf',
      'application/x-font-otf': 'otf',
      'application/vnd.ms-fontobject': 'eot',
      'application/octet-stream': 'dat', // Generic binary, often used for fonts
    };

    // Extract base content type (remove charset, etc.)
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return mimeMap[baseType] || 'dat';
  }

  /**
   * Determine if content should be stored as text or base64
   */
  private isTextContent(contentType: string): boolean {
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return baseType.startsWith('text/') ||
           baseType === 'application/javascript' ||
           baseType === 'application/json' ||
           baseType === 'image/svg+xml';
  }
}
