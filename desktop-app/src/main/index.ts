/**
 * Session Recorder Desktop App - Main Process
 *
 * Entry point for the Electron application.
 * Handles app lifecycle, main window, system tray, and recording orchestration.
 */

import { app, dialog, shell } from 'electron';
import * as path from 'path';
import { TrayManager } from './tray';
import { MainWindow } from './mainWindow';
import { RecordingOrchestrator } from './recorder';
import { getConfig, saveConfig, AppConfig } from './config';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: MainWindow | null = null;
  let trayManager: TrayManager | null = null;
  let orchestrator: RecordingOrchestrator | null = null;

  app.on('second-instance', () => {
    // Show main window when second instance is launched
    if (mainWindow) {
      mainWindow.show();
    } else if (trayManager) {
      trayManager.showNotification('Session Recorder', 'Already running');
    }
  });

  app.whenReady().then(async () => {
    console.log('Session Recorder starting...');

    // Load configuration
    const config = getConfig();

    // Create orchestrator
    orchestrator = new RecordingOrchestrator(config);

    // Create and show main window
    mainWindow = new MainWindow({
      orchestrator,
      config
    });
    await mainWindow.create();

    // Create tray manager (for quick access when window is minimized)
    trayManager = new TrayManager({
      onStartRecording: async (browserType) => {
        if (!orchestrator) return;

        try {
          await orchestrator.startRecording(browserType);
          trayManager?.setRecordingState(true);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          dialog.showErrorBox('Recording Error', message);
          trayManager?.setRecordingState(false);
        }
      },

      onStopRecording: async () => {
        if (!orchestrator) return;

        try {
          trayManager?.setProcessingState(true);
          const outputPath = await orchestrator.stopRecording();

          trayManager?.setRecordingState(false);
          trayManager?.setProcessingState(false);

          if (outputPath) {
            // Show notification with link to output
            trayManager?.showNotification(
              'Recording Complete',
              `Saved to ${path.basename(outputPath)}`
            );

            // Open folder in file explorer
            shell.showItemInFolder(outputPath);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          dialog.showErrorBox('Recording Error', message);
          trayManager?.setRecordingState(false);
          trayManager?.setProcessingState(false);
        }
      },

      onOpenOutputFolder: () => {
        const config = getConfig();
        shell.openPath(config.outputDir);
      },

      onShowWindow: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },

      onQuit: () => {
        // Stop recording if active
        if (orchestrator?.isRecording()) {
          orchestrator.stopRecording().finally(() => {
            app.quit();
          });
        } else {
          app.quit();
        }
      },

      onToggleVoice: (enabled) => {
        const config = getConfig();
        config.voiceEnabled = enabled;
        saveConfig(config);
        orchestrator?.setVoiceEnabled(enabled);
      },

      config
    });

    // Initialize tray
    await trayManager.initialize();

    // Listen for recording state changes from orchestrator
    orchestrator.on('stateChange', (state) => {
      console.log('Recording state:', state);

      // Sync tray state
      if (state === 'recording') {
        trayManager?.setRecordingState(true);
      } else if (state === 'idle') {
        trayManager?.setRecordingState(false);
        trayManager?.setProcessingState(false);
      } else if (state === 'processing' || state === 'stopping') {
        trayManager?.setProcessingState(true);
      }
    });

    orchestrator.on('error', (error) => {
      console.error('Recording error:', error);
      dialog.showErrorBox('Recording Error', error.message);
      trayManager?.setRecordingState(false);
      trayManager?.setProcessingState(false);
    });

    orchestrator.on('browserClosed', () => {
      // Browser was closed by user, stop recording
      if (orchestrator?.isRecording()) {
        orchestrator.stopRecording().catch(console.error);
      }
    });

    console.log('Session Recorder ready');
  });

  // On macOS, show dock icon since we now have a main window
  // (previously hidden for tray-only mode)

  // When all windows are closed
  app.on('window-all-closed', () => {
    // On macOS, apps typically stay in menu bar
    // On Windows/Linux, quit the app
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Re-create window on macOS when dock icon is clicked
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  app.on('before-quit', async () => {
    // Cleanup
    if (orchestrator?.isRecording()) {
      await orchestrator.stopRecording();
    }
    mainWindow?.destroy();
    trayManager?.destroy();
  });
}
