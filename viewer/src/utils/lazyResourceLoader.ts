/**
 * Lazy Resource Loader
 *
 * Provides on-demand loading of screenshots and snapshots from a zip file.
 * Resources are loaded when they come into view, reducing initial load time
 * and memory usage for large sessions.
 */

import JSZip from 'jszip';

export type ResourceLoadStatus = 'pending' | 'loading' | 'loaded' | 'error';

export interface ResourceState {
  status: ResourceLoadStatus;
  blob?: Blob;
  error?: string;
}

export interface LazyLoaderOptions {
  /** Preload resources within N items of the current view (default: 5) */
  preloadRadius?: number;
  /** Maximum number of resources to keep in memory (default: 100) */
  maxCachedResources?: number;
  /** Callback when a resource is loaded */
  onResourceLoaded?: (path: string, blob: Blob) => void;
  /** Callback when a resource fails to load */
  onResourceError?: (path: string, error: string) => void;
}

/**
 * Manages lazy loading of resources from a zip file
 */
export class LazyResourceLoader {
  private zip: JSZip | null = null;
  private resources: Map<string, ResourceState> = new Map();
  private loadingPromises: Map<string, Promise<Blob | null>> = new Map();
  private options: Required<LazyLoaderOptions>;
  private accessOrder: string[] = []; // LRU tracking

  constructor(options: LazyLoaderOptions = {}) {
    this.options = {
      preloadRadius: options.preloadRadius ?? 5,
      maxCachedResources: options.maxCachedResources ?? 100,
      onResourceLoaded: options.onResourceLoaded || (() => {}),
      onResourceError: options.onResourceError || (() => {}),
    };
  }

  /**
   * Initialize the loader with a zip file
   */
  async initialize(zipFile: File | JSZip): Promise<void> {
    if (zipFile instanceof File) {
      this.zip = new JSZip();
      await this.zip.loadAsync(zipFile);
    } else {
      this.zip = zipFile;
    }

    // Index all available resources
    this.zip.forEach((relativePath, file) => {
      if (!file.dir && this.isLazyLoadable(relativePath)) {
        this.resources.set(relativePath, { status: 'pending' });
      }
    });
  }

  /**
   * Check if a path should be lazy loaded
   */
  private isLazyLoadable(path: string): boolean {
    return (
      path.startsWith('screenshots/') ||
      path.startsWith('snapshots/') ||
      path.startsWith('resources/')
    );
  }

  /**
   * Get a resource, loading it if necessary
   * Returns the blob if loaded, null if not yet loaded
   */
  async getResource(path: string): Promise<Blob | null> {
    if (!this.zip) {
      throw new Error('LazyResourceLoader not initialized');
    }

    const state = this.resources.get(path);

    // If already loaded, return from cache
    if (state?.status === 'loaded' && state.blob) {
      this.updateAccessOrder(path);
      return state.blob;
    }

    // If currently loading, wait for the existing promise
    const existingPromise = this.loadingPromises.get(path);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const loadPromise = this.loadResource(path);
    this.loadingPromises.set(path, loadPromise);

    try {
      const blob = await loadPromise;
      return blob;
    } finally {
      this.loadingPromises.delete(path);
    }
  }

  /**
   * Load a single resource from the zip
   */
  private async loadResource(path: string): Promise<Blob | null> {
    if (!this.zip) return null;

    const file = this.zip.file(path);
    if (!file) {
      this.resources.set(path, { status: 'error', error: 'File not found' });
      this.options.onResourceError(path, 'File not found');
      return null;
    }

    this.resources.set(path, { status: 'loading' });

    try {
      const blob = await file.async('blob');
      this.resources.set(path, { status: 'loaded', blob });
      this.updateAccessOrder(path);
      this.enforceCacheLimit();
      this.options.onResourceLoaded(path, blob);
      return blob;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.resources.set(path, { status: 'error', error: errorMsg });
      this.options.onResourceError(path, errorMsg);
      return null;
    }
  }

  /**
   * Preload resources around a given index
   */
  async preloadAround(paths: string[], centerIndex: number): Promise<void> {
    const { preloadRadius } = this.options;
    const start = Math.max(0, centerIndex - preloadRadius);
    const end = Math.min(paths.length - 1, centerIndex + preloadRadius);

    const preloadPromises: Promise<Blob | null>[] = [];

    for (let i = start; i <= end; i++) {
      const path = paths[i];
      if (path) {
        const state = this.resources.get(path);
        if (state?.status === 'pending') {
          preloadPromises.push(this.getResource(path));
        }
      }
    }

    await Promise.all(preloadPromises);
  }

  /**
   * Get the current status of a resource
   */
  getResourceStatus(path: string): ResourceLoadStatus {
    return this.resources.get(path)?.status || 'pending';
  }

  /**
   * Check if a resource is currently loading or loaded
   */
  isResourceAvailable(path: string): boolean {
    const status = this.getResourceStatus(path);
    return status === 'loaded';
  }

  /**
   * Get a cached resource synchronously (returns null if not loaded)
   */
  getCachedResource(path: string): Blob | null {
    const state = this.resources.get(path);
    if (state?.status === 'loaded' && state.blob) {
      this.updateAccessOrder(path);
      return state.blob;
    }
    return null;
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(path: string): void {
    const index = this.accessOrder.indexOf(path);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(path);
  }

  /**
   * Enforce cache size limit using LRU eviction
   */
  private enforceCacheLimit(): void {
    const { maxCachedResources } = this.options;

    while (this.accessOrder.length > maxCachedResources) {
      const oldestPath = this.accessOrder.shift();
      if (oldestPath) {
        const state = this.resources.get(oldestPath);
        if (state?.blob) {
          // Clear the blob but keep the state as 'pending' so it can be reloaded
          this.resources.set(oldestPath, { status: 'pending' });
        }
      }
    }
  }

  /**
   * Get all indexed resource paths
   */
  getAllPaths(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Get paths matching a pattern
   */
  getPathsMatching(pattern: RegExp): string[] {
    return this.getAllPaths().filter((path) => pattern.test(path));
  }

  /**
   * Get screenshot paths for all actions
   */
  getScreenshotPaths(): string[] {
    return this.getPathsMatching(/^screenshots\//);
  }

  /**
   * Get snapshot paths for all actions
   */
  getSnapshotPaths(): string[] {
    return this.getPathsMatching(/^snapshots\//);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.resources.clear();
    this.loadingPromises.clear();
    this.accessOrder = [];
    this.zip = null;
  }

  /**
   * Get statistics about loaded resources
   */
  getStats(): { total: number; loaded: number; pending: number; loading: number; errors: number } {
    let loaded = 0;
    let pending = 0;
    let loading = 0;
    let errors = 0;

    this.resources.forEach((state) => {
      switch (state.status) {
        case 'loaded':
          loaded++;
          break;
        case 'pending':
          pending++;
          break;
        case 'loading':
          loading++;
          break;
        case 'error':
          errors++;
          break;
      }
    });

    return {
      total: this.resources.size,
      loaded,
      pending,
      loading,
      errors,
    };
  }
}

// Singleton instance for the application
let globalLoader: LazyResourceLoader | null = null;

/**
 * Get or create the global lazy resource loader
 */
export function getLazyResourceLoader(): LazyResourceLoader {
  if (!globalLoader) {
    globalLoader = new LazyResourceLoader();
  }
  return globalLoader;
}

/**
 * Reset the global lazy resource loader
 */
export function resetLazyResourceLoader(): void {
  if (globalLoader) {
    globalLoader.destroy();
    globalLoader = null;
  }
}

export default LazyResourceLoader;
