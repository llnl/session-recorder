/**
 * System Tray Manager for Session Recorder Desktop
 *
 * Handles the system tray icon, context menu, and notifications.
 */

import { Tray, Menu, nativeImage, Notification, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import { AppConfig, BrowserType } from './config';

/**
 * Create a tray icon programmatically for better Windows compatibility.
 * Windows system tray requires proper icon sizing (16x16 recommended).
 */
function createTrayIcon(color: string): Electron.NativeImage {
  // Create a larger image and resize for better quality
  const size = 32; // Create at 32x32 for better quality
  const displaySize = 16; // Tray icon display size

  // Create an empty image buffer
  const canvas = Buffer.alloc(size * size * 4); // RGBA

  // Draw a filled circle
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2; // Leave small margin

  // Parse color (hex to RGB)
  let r = 128, g = 128, b = 128;
  if (color === 'gray') {
    r = 128; g = 128; b = 128;
  } else if (color === 'red') {
    r = 220; g = 53; b = 69;
  } else if (color === 'orange') {
    r = 255; g = 165; b = 0;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const idx = (y * size + x) * 4;

      if (distance <= radius) {
        // Inside circle
        canvas[idx] = r;     // R
        canvas[idx + 1] = g; // G
        canvas[idx + 2] = b; // B
        canvas[idx + 3] = 255; // A (fully opaque)
      } else if (distance <= radius + 1) {
        // Anti-aliased edge
        const alpha = Math.max(0, 1 - (distance - radius));
        canvas[idx] = r;
        canvas[idx + 1] = g;
        canvas[idx + 2] = b;
        canvas[idx + 3] = Math.round(alpha * 255);
      } else {
        // Outside circle (transparent)
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }

  const image = nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size
  });

  // Resize to tray icon size
  return image.resize({ width: displaySize, height: displaySize });
}

// Pre-create icons for each state
let ICONS: { idle: Electron.NativeImage | null; recording: Electron.NativeImage | null; processing: Electron.NativeImage | null } = {
  idle: null,
  recording: null,
  processing: null
};

function getIcon(state: 'idle' | 'recording' | 'processing'): Electron.NativeImage {
  // Lazy-initialize icons
  if (!ICONS.idle) {
    ICONS.idle = createTrayIcon('gray');
    ICONS.recording = createTrayIcon('red');
    ICONS.processing = createTrayIcon('orange');
  }
  return ICONS[state]!;
}

export interface TrayManagerOptions {
  onStartRecording: (browserType: BrowserType) => Promise<void>;
  onStopRecording: () => Promise<void>;
  onOpenOutputFolder: () => void;
  onShowWindow: () => void;
  onQuit: () => void;
  onToggleVoice: (enabled: boolean) => void;
  config: AppConfig;
}

export class TrayManager {
  private tray: Tray | null = null;
  private options: TrayManagerOptions;
  private isRecording = false;
  private isProcessing = false;
  private recordingStartTime: number | null = null;
  private recordingTimer: NodeJS.Timeout | null = null;
  private voiceEnabled: boolean;

  constructor(options: TrayManagerOptions) {
    this.options = options;
    this.voiceEnabled = options.config.voiceEnabled;
  }

  async initialize(): Promise<void> {
    // Create tray icon using programmatically generated icon
    const iconImage = getIcon('idle');
    this.tray = new Tray(iconImage);

    this.tray.setToolTip('Session Recorder - Ready');
    this.updateMenu();

    // Double-click to show main window
    this.tray.on('double-click', () => {
      this.options.onShowWindow();
    });

    console.log('Tray initialized');
  }

  private updateMenu(): void {
    if (!this.tray) return;

    const menuTemplate: MenuItemConstructorOptions[] = [];

    // Show window option at the top
    menuTemplate.push({
      label: 'Show Window',
      click: () => this.options.onShowWindow()
    });
    menuTemplate.push({ type: 'separator' });

    if (this.isRecording) {
      // Recording active - show stop option
      const duration = this.getRecordingDuration();
      menuTemplate.push({
        label: `Recording... (${this.formatDuration(duration)})`,
        enabled: false
      });
      menuTemplate.push({ type: 'separator' });
      menuTemplate.push({
        label: 'Stop Recording',
        click: () => this.options.onStopRecording()
      });
    } else if (this.isProcessing) {
      // Processing - show status
      menuTemplate.push({
        label: 'Processing recording...',
        enabled: false
      });
    } else {
      // Ready to record - show browser options
      menuTemplate.push({
        label: 'Start Recording',
        submenu: [
          {
            label: 'Chromium',
            click: () => this.options.onStartRecording('chromium')
          },
          {
            label: 'Firefox',
            click: () => this.options.onStartRecording('firefox')
          },
          {
            label: 'WebKit (Safari)',
            click: () => this.options.onStartRecording('webkit')
          }
        ]
      });
    }

    menuTemplate.push({ type: 'separator' });

    // Voice recording toggle
    menuTemplate.push({
      label: 'Voice Recording',
      type: 'checkbox',
      checked: this.voiceEnabled,
      enabled: !this.isRecording && !this.isProcessing,
      click: (menuItem) => {
        this.voiceEnabled = menuItem.checked;
        this.options.onToggleVoice(this.voiceEnabled);
        this.updateMenu();
      }
    });

    menuTemplate.push({ type: 'separator' });

    // Output folder
    menuTemplate.push({
      label: 'Open Output Folder',
      click: () => this.options.onOpenOutputFolder()
    });

    menuTemplate.push({ type: 'separator' });

    // Quit
    menuTemplate.push({
      label: 'Quit Session Recorder',
      click: () => this.options.onQuit()
    });

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  setRecordingState(recording: boolean): void {
    this.isRecording = recording;

    if (recording) {
      this.recordingStartTime = Date.now();
      this.startRecordingTimer();
      this.setIcon('recording');
      this.tray?.setToolTip('Session Recorder - Recording...');
    } else {
      this.recordingStartTime = null;
      this.stopRecordingTimer();
      this.setIcon('idle');
      this.tray?.setToolTip('Session Recorder - Ready');
    }

    this.updateMenu();
  }

  setProcessingState(processing: boolean): void {
    this.isProcessing = processing;

    if (processing) {
      this.setIcon('processing');
      this.tray?.setToolTip('Session Recorder - Processing...');
    } else {
      this.setIcon('idle');
      this.tray?.setToolTip('Session Recorder - Ready');
    }

    this.updateMenu();
  }

  private setIcon(state: 'idle' | 'recording' | 'processing'): void {
    if (!this.tray) return;

    const iconImage = getIcon(state);
    this.tray.setImage(iconImage);
  }

  private startRecordingTimer(): void {
    this.stopRecordingTimer();

    this.recordingTimer = setInterval(() => {
      this.updateMenu();
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private getRecordingDuration(): number {
    if (!this.recordingStartTime) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  showNotification(title: string, body: string): void {
    if (!this.options.config.showNotifications) return;

    const notification = new Notification({
      title,
      body,
      icon: getIcon('idle')
    });

    notification.show();
  }

  destroy(): void {
    this.stopRecordingTimer();

    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
