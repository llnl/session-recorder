/**
 * Session Recorder Desktop - Main Window Manager
 *
 * Creates and manages the main application window.
 * Handles IPC communication between renderer and main process.
 */

import { BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { RecordingOrchestrator, RecordingState, RecordingStats } from './recorder';
import { AppConfig, BrowserType, getConfig, saveConfig } from './config';

export interface MainWindowOptions {
  orchestrator: RecordingOrchestrator;
  config: AppConfig;
}

export class MainWindow {
  private window: BrowserWindow | null = null;
  private orchestrator: RecordingOrchestrator;
  private config: AppConfig;
  private isQuitting = false;

  constructor(options: MainWindowOptions) {
    this.orchestrator = options.orchestrator;
    this.config = options.config;
  }

  async create(): Promise<BrowserWindow> {
    // Create the browser window
    this.window = new BrowserWindow({
      width: 420,
      height: 500,
      minWidth: 380,
      minHeight: 450,
      resizable: true,
      frame: true,
      title: 'Session Recorder',
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      },
      show: false
    });

    // Track if window has been shown
    let windowShown = false;

    // Show window when ready - MUST be registered BEFORE loadFile
    this.window.once('ready-to-show', () => {
      if (!windowShown) {
        windowShown = true;
        console.log('Main window ready to show');
        this.window?.show();
        this.window?.focus();
      }
    });

    // Fallback: show window after timeout if ready-to-show doesn't fire
    setTimeout(() => {
      if (!windowShown && this.window && !this.window.isDestroyed()) {
        windowShown = true;
        console.log('Main window fallback show (ready-to-show did not fire)');
        this.window.show();
        this.window.focus();
      }
    }, 3000);

    // Load the renderer HTML
    const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
    console.log('Loading renderer from:', htmlPath);

    try {
      await this.window.loadFile(htmlPath);
      console.log('Renderer loaded successfully');
    } catch (error) {
      console.error('Failed to load renderer HTML:', error);
      throw error;
    }

    // Setup IPC handlers
    this.setupIpcHandlers();

    // Listen for orchestrator events
    this.setupOrchestratorEvents();

    // Hide to tray instead of closing when X is clicked (unless app is quitting)
    this.window.on('close', (event) => {
      if (!this.isQuitting && this.window && !this.window.isDestroyed()) {
        // Prevent the window from closing, just hide it
        event.preventDefault();
        this.window.hide();
        console.log('Main window hidden to tray');
      }
      // If isQuitting is true, allow the window to close normally
    });

    // Handle when window is actually destroyed (app quit)
    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  private setupIpcHandlers(): void {
    // Start recording
    ipcMain.handle('recording:start', async (_event, options: {
      title: string;
      mode: 'browser' | 'voice' | 'combined';
      browserType: BrowserType;
    }) => {
      try {
        // Configure voice based on mode
        const voiceEnabled = options.mode === 'voice' || options.mode === 'combined';
        this.orchestrator.setVoiceEnabled(voiceEnabled);

        // Update config
        this.config.voiceEnabled = voiceEnabled;
        saveConfig(this.config);

        // For voice-only mode, we don't launch a browser
        if (options.mode === 'voice') {
          // TODO: Implement voice-only recording
          throw new Error('Voice-only mode not yet implemented');
        }

        // Start browser recording
        await this.orchestrator.startRecording(options.browserType);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.sendToRenderer('recording:error', message);
        throw error;
      }
    });

    // Stop recording
    ipcMain.handle('recording:stop', async () => {
      try {
        const outputPath = await this.orchestrator.stopRecording();

        if (outputPath) {
          // Show file in explorer
          shell.showItemInFolder(outputPath);
        }

        return outputPath;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.sendToRenderer('recording:error', message);
        throw error;
      }
    });

    // Pause recording
    ipcMain.handle('recording:pause', async () => {
      try {
        await this.orchestrator.pauseRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.sendToRenderer('recording:error', message);
        throw error;
      }
    });

    // Resume recording
    ipcMain.handle('recording:resume', async () => {
      try {
        await this.orchestrator.resumeRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.sendToRenderer('recording:error', message);
        throw error;
      }
    });

    // Get recording state
    ipcMain.handle('recording:getState', async () => {
      return {
        state: this.orchestrator.getState(),
        duration: this.orchestrator.getDuration(),
        isPaused: this.orchestrator.isPaused()
      };
    });
  }

  private setupOrchestratorEvents(): void {
    // State changes
    this.orchestrator.on('stateChange', (state: RecordingState) => {
      this.sendToRenderer('recording:stateChange', state);
    });

    // Recording stats (timer, action count, URL)
    this.orchestrator.on('stats', (stats: RecordingStats) => {
      this.sendToRenderer('recording:stats', stats);
    });

    // Errors
    this.orchestrator.on('error', (error: Error) => {
      this.sendToRenderer('recording:error', error.message);
    });

    // Browser closed
    this.orchestrator.on('browserClosed', () => {
      // Automatically stop recording when browser is closed
      this.orchestrator.stopRecording().catch(console.error);
    });
  }

  private sendToRenderer(channel: string, ...args: unknown[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  show(): void {
    if (this.window) {
      if (this.window.isMinimized()) {
        this.window.restore();
      }
      this.window.show();
      this.window.focus();
    }
  }

  hide(): void {
    this.window?.hide();
  }

  destroy(): void {
    // Remove IPC handlers
    ipcMain.removeHandler('recording:start');
    ipcMain.removeHandler('recording:stop');
    ipcMain.removeHandler('recording:pause');
    ipcMain.removeHandler('recording:resume');
    ipcMain.removeHandler('recording:getState');

    // Set quitting flag so close handler allows actual close
    this.isQuitting = true;

    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}
