/**
 * Session Recorder Desktop - Main Window Manager
 *
 * Creates and manages the main application window.
 * Handles IPC communication between renderer and main process.
 */

import { BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { RecordingOrchestrator, RecordingState } from './recorder';
import { AppConfig, BrowserType, getConfig, saveConfig } from './config';

export interface MainWindowOptions {
  orchestrator: RecordingOrchestrator;
  config: AppConfig;
}

export class MainWindow {
  private window: BrowserWindow | null = null;
  private orchestrator: RecordingOrchestrator;
  private config: AppConfig;

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

    // Load the renderer HTML
    const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
    await this.window.loadFile(htmlPath);

    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    // Setup IPC handlers
    this.setupIpcHandlers();

    // Listen for orchestrator events
    this.setupOrchestratorEvents();

    // Handle window close
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

    // Pause recording (placeholder - needs implementation in orchestrator)
    ipcMain.handle('recording:pause', async () => {
      // TODO: Implement pause functionality in RecordingOrchestrator
      console.log('Pause requested - not yet implemented');
    });

    // Resume recording (placeholder - needs implementation in orchestrator)
    ipcMain.handle('recording:resume', async () => {
      // TODO: Implement resume functionality in RecordingOrchestrator
      console.log('Resume requested - not yet implemented');
    });

    // Get recording state
    ipcMain.handle('recording:getState', async () => {
      return {
        state: this.orchestrator.getState(),
        // TODO: Add duration and action count
      };
    });
  }

  private setupOrchestratorEvents(): void {
    // State changes
    this.orchestrator.on('stateChange', (state: RecordingState) => {
      this.sendToRenderer('recording:stateChange', state);
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

    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}
