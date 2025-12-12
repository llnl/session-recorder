/**
 * Configuration management for Session Recorder Desktop
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface AppConfig {
  // Recording settings
  voiceEnabled: boolean;
  browserType: BrowserType;

  // Voice settings
  whisperModel: WhisperModel;
  audioDevice?: string;

  // Output settings
  outputDir: string;
  compressSnapshots: boolean;
  screenshotFormat: 'png' | 'jpeg';
  screenshotQuality: number;
  audioFormat: 'wav' | 'mp3';
  audioBitrate: string;

  // UI settings
  showNotifications: boolean;
  openFolderOnComplete: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  voiceEnabled: true,
  browserType: 'chromium',
  whisperModel: 'base',
  outputDir: '',  // Will be set to Documents/SessionRecordings
  compressSnapshots: true,
  screenshotFormat: 'jpeg',
  screenshotQuality: 75,
  audioFormat: 'mp3',
  audioBitrate: '64k',
  showNotifications: true,
  openFolderOnComplete: true
};

let cachedConfig: AppConfig | null = null;

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}

function getDefaultOutputDir(): string {
  const documentsPath = app.getPath('documents');
  return path.join(documentsPath, 'SessionRecordings');
}

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  let config: AppConfig;

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const loadedConfig = JSON.parse(data);
      config = { ...DEFAULT_CONFIG, ...loadedConfig };
    } else {
      config = { ...DEFAULT_CONFIG };
    }
  } catch (error) {
    console.error('Error loading config:', error);
    config = { ...DEFAULT_CONFIG };
  }

  // Set default output directory if not set
  if (!config.outputDir) {
    config.outputDir = getDefaultOutputDir();
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  cachedConfig = config;
  return config;
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath();

  try {
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    cachedConfig = config;
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

export function resetConfig(): void {
  cachedConfig = null;
  const configPath = getConfigPath();

  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  } catch (error) {
    console.error('Error resetting config:', error);
  }
}

/**
 * Get the path to the voice-recorder executable
 */
export function getVoiceRecorderPath(): string {
  const isPackaged = app.isPackaged;
  const platform = process.platform;
  const exeName = platform === 'win32' ? 'voice-recorder.exe' : 'voice-recorder';

  if (isPackaged) {
    // In packaged app, voice-recorder is in resources
    return path.join(process.resourcesPath, 'voice-recorder', exeName);
  } else {
    // In development, look in resources folder relative to project
    const devPath = path.join(__dirname, '..', '..', 'resources', getPlatformDir(), 'voice-recorder', exeName);

    // Also check the parent session-recorder project
    const parentPath = path.join(__dirname, '..', '..', '..', 'src', 'voice', 'dist', 'voice-recorder', exeName);

    if (fs.existsSync(devPath)) {
      return devPath;
    } else if (fs.existsSync(parentPath)) {
      return parentPath;
    }

    // Fallback to Python script in development
    return '';
  }
}

function getPlatformDir(): string {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'macos';
    default: return 'linux';
  }
}

/**
 * Check if voice recorder is available
 */
export function isVoiceRecorderAvailable(): boolean {
  const voicePath = getVoiceRecorderPath();

  if (!voicePath) {
    // Check for Python fallback
    return hasPythonVoiceRecorder();
  }

  return fs.existsSync(voicePath);
}

/**
 * Check if Python voice recorder is available (development mode)
 */
export function hasPythonVoiceRecorder(): boolean {
  // Check for Python script in parent project
  const scriptPath = path.join(__dirname, '..', '..', '..', 'src', 'voice', 'voice_recorder_main.py');
  return fs.existsSync(scriptPath);
}

/**
 * Get Python voice recorder script path
 */
export function getPythonVoiceRecorderPath(): string {
  return path.join(__dirname, '..', '..', '..', 'src', 'voice', 'voice_recorder_main.py');
}
