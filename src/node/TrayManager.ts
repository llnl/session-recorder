/**
 * TrayManager - System Tray Recording Indicator
 *
 * Provides visual feedback during recording sessions via:
 * - System tray icon (when available)
 * - Desktop notifications
 *
 * Supports both CLI (via node-notifier/systray2) and Desktop (Electron) modes
 */

import { EventEmitter } from 'events';

export type TrayState = 'idle' | 'recording' | 'processing';

export interface TrayManagerOptions {
  /** Show desktop notifications (default: true) */
  notifications?: boolean;
  /** Show system tray icon (default: true) */
  trayIcon?: boolean;
  /** Application name for notifications */
  appName?: string;
}

export interface TrayNotification {
  title: string;
  message: string;
  icon?: 'recording' | 'success' | 'error' | 'info';
}

/**
 * Abstract base class for tray management
 * Concrete implementations for CLI and Electron extend this
 */
export abstract class TrayManagerBase extends EventEmitter {
  protected state: TrayState = 'idle';
  protected options: Required<TrayManagerOptions>;
  protected recordingStartTime: number | null = null;

  constructor(options: TrayManagerOptions = {}) {
    super();
    this.options = {
      notifications: options.notifications !== false,
      trayIcon: options.trayIcon !== false,
      appName: options.appName || 'Session Recorder',
    };
  }

  /**
   * Initialize the tray manager (create tray icon, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Clean up resources (remove tray icon, etc.)
   */
  abstract destroy(): Promise<void>;

  /**
   * Show a desktop notification
   */
  abstract notify(notification: TrayNotification): void;

  /**
   * Update tray icon and tooltip based on state
   */
  protected abstract updateTrayIcon(): void;

  /**
   * Called when recording starts
   */
  startRecording(): void {
    this.state = 'recording';
    this.recordingStartTime = Date.now();
    this.updateTrayIcon();

    if (this.options.notifications) {
      this.notify({
        title: '🔴 Recording Started',
        message: 'Session recording is now active',
        icon: 'recording',
      });
    }

    this.emit('recording-started');
  }

  /**
   * Called when recording stops
   */
  stopRecording(sessionPath?: string): void {
    const duration = this.recordingStartTime
      ? Math.round((Date.now() - this.recordingStartTime) / 1000)
      : 0;

    this.state = 'processing';
    this.updateTrayIcon();

    if (this.options.notifications) {
      const durationStr = this.formatDuration(duration);
      this.notify({
        title: '✅ Recording Complete',
        message: sessionPath
          ? `Session saved (${durationStr})\n${sessionPath}`
          : `Recording stopped after ${durationStr}`,
        icon: 'success',
      });
    }

    this.state = 'idle';
    this.recordingStartTime = null;
    this.updateTrayIcon();

    this.emit('recording-stopped', { duration, sessionPath });
  }

  /**
   * Get current recording state
   */
  getState(): TrayState {
    return this.state;
  }

  /**
   * Get recording duration in seconds (or null if not recording)
   */
  getRecordingDuration(): number | null {
    if (!this.recordingStartTime) return null;
    return Math.round((Date.now() - this.recordingStartTime) / 1000);
  }

  /**
   * Format duration as human-readable string
   */
  protected formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}

/**
 * CLI Tray Manager - Uses node-notifier for cross-platform notifications
 * and optionally systray2 for system tray icon
 */
export class CLITrayManager extends TrayManagerBase {
  private notifier: any = null;
  private systray: any = null;

  async initialize(): Promise<void> {
    // Try to load node-notifier for notifications
    // Use Function constructor to avoid TypeScript module resolution
    try {
      const loadModule = new Function('moduleName', 'return import(moduleName)');
      const notifierModule = await loadModule('node-notifier').catch(() => null);
      if (notifierModule) {
        this.notifier = notifierModule.default || notifierModule;
      }
    } catch {
      // node-notifier not available
      console.log('[TrayManager] node-notifier not available, notifications disabled');
    }

    // Try to load systray2 for system tray icon
    if (this.options.trayIcon) {
      try {
        const loadModule = new Function('moduleName', 'return import(moduleName)');
        const systrayModule = await loadModule('systray2').catch(() => null);
        if (systrayModule) {
          await this.initializeSystray(systrayModule.default || systrayModule);
        }
      } catch {
        // systray2 not available
        console.log('[TrayManager] systray2 not available, tray icon disabled');
      }
    }
  }

  private async initializeSystray(SysTray: any): Promise<void> {
    try {
      // Base64 encoded icons for different states
      const icons = this.getIconsBase64();

      this.systray = new SysTray({
        menu: {
          icon: icons.idle,
          title: this.options.appName,
          tooltip: 'Session Recorder - Idle',
          items: [
            {
              title: 'Status: Idle',
              tooltip: 'Current recording status',
              enabled: false,
            },
            SysTray.separator,
            {
              title: 'Exit',
              tooltip: 'Close tray icon',
              checked: false,
              enabled: true,
            },
          ],
        },
        debug: false,
        copyDir: true,
      });

      this.systray.onClick((action: any) => {
        if (action.seq_id === 2) {
          // Exit clicked
          this.destroy();
          this.emit('exit-requested');
        }
      });

      await new Promise<void>((resolve) => {
        this.systray.onReady(() => resolve());
      });
    } catch (error) {
      console.log('[TrayManager] Failed to initialize systray:', error);
      this.systray = null;
    }
  }

  async destroy(): Promise<void> {
    if (this.systray) {
      try {
        this.systray.kill(false);
      } catch {
        // Ignore cleanup errors
      }
      this.systray = null;
    }
  }

  notify(notification: TrayNotification): void {
    if (!this.options.notifications) return;

    if (this.notifier) {
      try {
        this.notifier.notify({
          title: notification.title,
          message: notification.message,
          appID: this.options.appName,
          sound: false,
          wait: false,
        });
      } catch (error) {
        // Fallback to console if notification fails
        console.log(`[${notification.title}] ${notification.message}`);
      }
    } else {
      // Fallback to console
      console.log(`[${notification.title}] ${notification.message}`);
    }
  }

  protected updateTrayIcon(): void {
    if (!this.systray) return;

    const icons = this.getIconsBase64();
    const tooltips = {
      idle: 'Session Recorder - Idle',
      recording: 'Session Recorder - 🔴 RECORDING',
      processing: 'Session Recorder - Processing...',
    };

    const statusText = {
      idle: 'Status: Idle',
      recording: '🔴 Recording...',
      processing: 'Processing...',
    };

    try {
      this.systray.sendAction({
        type: 'update-item',
        item: {
          title: statusText[this.state],
          tooltip: tooltips[this.state],
          enabled: false,
        },
        seq_id: 0,
      });

      this.systray.sendAction({
        type: 'update-menu',
        menu: {
          icon: icons[this.state],
          tooltip: tooltips[this.state],
        },
      });
    } catch {
      // Ignore update errors
    }
  }

  /**
   * Get base64-encoded icons for different states
   * Using simple colored circle icons
   */
  private getIconsBase64(): Record<TrayState, string> {
    // These are 16x16 PNG icons encoded as base64
    // Gray circle for idle, red circle for recording, yellow circle for processing
    return {
      idle: this.createSimpleIcon('#808080'),
      recording: this.createSimpleIcon('#FF0000'),
      processing: this.createSimpleIcon('#FFA500'),
    };
  }

  /**
   * Create a simple colored circle icon as base64
   * This is a minimal 16x16 PNG with a colored circle
   */
  private createSimpleIcon(color: string): string {
    // For simplicity, return a pre-generated base64 icon
    // In production, you might want to use a proper icon file
    // This is a placeholder that returns an empty base64 string
    // The systray2 library will use a default icon if this fails

    // Gray icon (idle) - 16x16 PNG
    if (color === '#808080') {
      return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA5klEQVR4nGNgGLRg////DBQBkgzgBrS1tf1nYGD4z8DA8B+bGnIMABn+H6p5QDYPygYGBgYGAQ0Njf+tLW3/tbW0/dfQ0MBqEEkGgDRD5YjygBIDGMlxHsk+YGBgYGhoaPgPVfufgYHhf0NDA1E+oNoLDAwMDCwsLP8bGhr+MzAw/GdhYSHOAErAfy0t7f8MDAz/sRlAjheYGRgYGBoaGv4zMDD8Z2ZmHlwGMDAwMDQ3N/9nYGD439zcPOgCcd++fQPmAAMDw38GBgaG/fv3/yc0Dsgu+A9U+5+BgeE/RJCsDlj8iQ8AAFzNZDX5YWmxAAAAAElFTkSuQmCC';
    }
    // Red icon (recording)
    if (color === '#FF0000') {
      return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA5klEQVR4nGNgGLTg////DBQBkgzgBrS1tf1nYGD4z8DA8B+bGnIMABn+H6p5QDYPygYGBgYGAQ0Njf+tLW3/tbW0/dfQ0MBqEEkGgDRD5YjygBIDGMlxHsk+YGBgYKhvaPgPVfufgYGhvqGBKB9Q7QUGBgYGFhaW//UNDP8ZGBj+s7CwEGcAJeC/lpb2fwYGhv/YDCDHCwwMDAwN9Q3/GRgY/jMzMw8uAxgYGBiampv/MzAw/G9qah50gbhv376BcoCBgeE/AwPDvn37/hMaB2QX/AeqBYowMDD8hwqS1QGLPwkBAMzmZDVzqb5hAAAAAElFTkSuQmCC';
    }
    // Orange icon (processing)
    return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA5klEQVR4nGNgGLTg////DBQBkgzgBrS1tf1nYGD4z8DA8B+bGnIMABn+H6p5QDYPygYGBgYGAQ0Njf+tLW3/tbW0/dfQ0MBqEEkGgDRD5YjygBIDGMlxHsk+YGBgYKitr/8PVfufgYGhtq6OKB9Q7QUGBgYGFhaW/7V1df8ZGBj+s7CwEGcAJeC/lpb2fwYGhv/YDCDHCwwMDAy1dfX/GRgY/jMzMw8uAxgYGBjqG5v+MzAw/K+vrx90gThw31+QA/8zMDD8Z2Bg2L93737CwwCLgv9AtUAR6IICBH+yOmDBJyEAAJqPZDWwOCWeAAAAAElFTkSuQmCC';
  }
}

/**
 * No-op Tray Manager - Does nothing, used when tray is disabled
 */
export class NoOpTrayManager extends TrayManagerBase {
  async initialize(): Promise<void> {
    // No-op
  }

  async destroy(): Promise<void> {
    // No-op
  }

  notify(_notification: TrayNotification): void {
    // No-op - just log to console
    console.log(`[${_notification.title}] ${_notification.message}`);
  }

  protected updateTrayIcon(): void {
    // No-op
  }
}

/**
 * Create the appropriate tray manager based on environment
 */
export function createTrayManager(options: TrayManagerOptions = {}): TrayManagerBase {
  // Check if we're in an Electron environment
  const isElectron = typeof process !== 'undefined' &&
    process.versions &&
    'electron' in process.versions;

  if (isElectron) {
    // Will be implemented when Desktop POC is done
    // For now, use CLI manager as fallback
    return new CLITrayManager(options);
  }

  // Check if running in a headless/non-interactive environment
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  if (isCI) {
    return new NoOpTrayManager(options);
  }

  return new CLITrayManager(options);
}

// Export default factory function
export default createTrayManager;
