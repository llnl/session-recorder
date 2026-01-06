/**
 * Session Recorder - Public API
 */

export { SessionRecorder } from './node/SessionRecorder';
export type {
  SessionData,
  RecordedAction,
  NavigationAction,
  VoiceTranscriptAction,
  PageVisibilityAction,
  MediaAction,
  DownloadAction,
  FullscreenAction,
  PrintAction,
  AnyAction,
  SnapshotWithScreenshot,
  ActionDetails
} from './node/types';

// Tray Manager for visual recording indicator (FR-3.1)
export {
  createTrayManager,
  CLITrayManager,
  NoOpTrayManager,
  TrayManagerBase
} from './node/TrayManager';
export type {
  TrayState,
  TrayManagerOptions,
  TrayNotification
} from './node/TrayManager';
