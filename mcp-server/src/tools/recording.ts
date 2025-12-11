/**
 * Recording Control Tools - Start, stop, and monitor recording sessions
 *
 * Phase 1 MCP tools for controlling live browser and voice recording.
 */

import {
  RecordingManager,
  StartBrowserOptions,
  StartVoiceOptions,
  StartCombinedOptions,
  StartResult,
  StopResult,
  StatusResult,
} from '../RecordingManager';

/**
 * Start browser-only recording
 *
 * Opens a new browser window and begins recording all user interactions.
 * The browser can be controlled manually or via Playwright automation.
 */
export async function startBrowserRecording(
  manager: RecordingManager,
  params: StartBrowserOptions
): Promise<StartResult> {
  return manager.startBrowserRecording(params);
}

/**
 * Start voice-only recording
 *
 * Begins recording audio from the microphone with automatic
 * transcription using Whisper.
 */
export async function startVoiceRecording(
  manager: RecordingManager,
  params: StartVoiceOptions
): Promise<StartResult> {
  return manager.startVoiceRecording(params);
}

/**
 * Start combined browser + voice recording
 *
 * Opens a browser window and starts voice recording simultaneously.
 * This is the recommended mode for capturing complete session context.
 */
export async function startCombinedRecording(
  manager: RecordingManager,
  params: StartCombinedOptions
): Promise<StartResult> {
  return manager.startCombinedRecording(params);
}

/**
 * Stop the current recording
 *
 * Stops all active recording (browser and/or voice), creates a
 * session.zip file, and returns the path to the archive.
 */
export async function stopRecording(
  manager: RecordingManager
): Promise<StopResult> {
  return manager.stopRecording();
}

/**
 * Get current recording status
 *
 * Returns information about the current recording session including
 * duration, action count, and mode. Also returns info about the
 * last completed session if available.
 */
export function getRecordingStatus(
  manager: RecordingManager
): StatusResult {
  return manager.getStatus();
}
