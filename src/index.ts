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
