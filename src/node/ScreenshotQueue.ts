/**
 * ScreenshotQueue - Non-blocking screenshot capture with background processing (UX-02)
 *
 * Addresses UX issues from epic-recorder-ux.md:
 * - Screenshots are captured asynchronously to avoid blocking browser callbacks
 * - Queue ensures screenshots are processed in order
 * - Graceful handling of closed pages
 */

import { Page } from 'playwright';

export interface QueuedScreenshot {
  actionId: string;
  type: 'before' | 'after';
  page: Page;
  path: string;
  options: {
    type?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
  };
  timestamp: number;
}

export interface ScreenshotQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;  // Pages that were closed
}

/**
 * ScreenshotQueue processes screenshots in the background
 * to avoid blocking the browser event loop during page interactions
 */
export class ScreenshotQueue {
  private queue: QueuedScreenshot[] = [];
  private processing: boolean = false;
  private stats: ScreenshotQueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0
  };

  /**
   * Add a screenshot to the capture queue (non-blocking)
   * Returns immediately - screenshot is taken asynchronously
   */
  enqueue(item: QueuedScreenshot): void {
    this.queue.push(item);
    this.stats.pending++;

    // Start processing if not already running
    this._startProcessing();
  }

  /**
   * Start background processing if not already running
   */
  private _startProcessing(): void {
    if (this.processing) return;

    this.processing = true;
    // Use setImmediate to avoid blocking
    setImmediate(() => this._processQueue());
  }

  /**
   * Process screenshots in the queue serially to maintain order
   */
  private async _processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.stats.pending--;
      this.stats.processing++;

      await this._takeScreenshot(item);

      this.stats.processing--;
    }

    this.processing = false;
  }

  /**
   * Take a single screenshot
   */
  private async _takeScreenshot(item: QueuedScreenshot): Promise<void> {
    try {
      // Check if page is still open
      if (item.page.isClosed()) {
        console.log(`📸 [Screenshot] Page closed, skipping ${item.actionId}-${item.type}`);
        this.stats.skipped++;
        return;
      }

      // Take the screenshot
      await item.page.screenshot({
        path: item.path,
        ...item.options
      });

      this.stats.completed++;
    } catch (err: any) {
      // Handle page closed during screenshot
      if (err.message?.includes('closed') || err.message?.includes('Target')) {
        console.log(`📸 [Screenshot] Page closed during capture, skipping ${item.actionId}-${item.type}`);
        this.stats.skipped++;
      } else {
        console.error(`📸 [Screenshot] Failed ${item.actionId}-${item.type}:`, err.message);
        this.stats.failed++;
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): ScreenshotQueueStats {
    return { ...this.stats, pending: this.queue.length };
  }

  /**
   * Wait for all queued screenshots to be processed
   * Use this before stopping session to ensure all screenshots are saved
   */
  async flush(): Promise<void> {
    // If there are items and processing hasn't started, start it
    if (this.queue.length > 0 && !this.processing) {
      this._startProcessing();
    }

    // Wait for processing to complete
    while (this.queue.length > 0 || this.processing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Clear the queue and reset stats
   */
  clear(): void {
    this.queue = [];
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      skipped: 0
    };
    this.processing = false;
  }
}
