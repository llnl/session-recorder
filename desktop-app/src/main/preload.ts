/**
 * Session Recorder Desktop - Preload Script
 *
 * Exposes a safe, limited API to the renderer process via contextBridge.
 * This script runs in a privileged context with access to Node.js APIs,
 * but only exposes specific methods to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Recording control
  startRecording: (options: {
    title: string;
    mode: 'browser' | 'voice' | 'combined';
    browserType: 'chromium' | 'firefox' | 'webkit';
  }) => ipcRenderer.invoke('recording:start', options),

  stopRecording: () => ipcRenderer.invoke('recording:stop'),

  pauseRecording: () => ipcRenderer.invoke('recording:pause'),

  resumeRecording: () => ipcRenderer.invoke('recording:resume'),

  // State queries
  getRecordingState: () => ipcRenderer.invoke('recording:getState'),

  // Event listeners
  onStateChange: (callback: (state: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, state: string) => callback(state);
    ipcRenderer.on('recording:stateChange', subscription);
    return () => ipcRenderer.removeListener('recording:stateChange', subscription);
  },

  onStats: (callback: (stats: { duration: number; actionCount: number; currentUrl: string }) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, stats: { duration: number; actionCount: number; currentUrl: string }) => callback(stats);
    ipcRenderer.on('recording:stats', subscription);
    return () => ipcRenderer.removeListener('recording:stats', subscription);
  },

  onError: (callback: (error: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on('recording:error', subscription);
    return () => ipcRenderer.removeListener('recording:error', subscription);
  }
});
