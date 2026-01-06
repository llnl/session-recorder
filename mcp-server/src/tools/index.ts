/**
 * Tools Index - Export all MCP tools
 */

// Phase 1: Recording Control (5 tools)
export {
  startBrowserRecording,
  startVoiceRecording,
  startCombinedRecording,
  stopRecording,
  getRecordingStatus,
} from './recording';

// Phase 2: Session Query (15 tools)
export { sessionLoad, sessionUnload, sessionGetSummary, sessionGetMarkdown, sessionRegenerateMarkdown } from './session';
export {
  sessionSearch,
  sessionSearchNetwork,
  sessionSearchConsole,
} from './search';
export {
  sessionGetActions,
  sessionGetAction,
  sessionGetRange,
  sessionGetUrls,
  sessionGetContext,
} from './navigation';
export { sessionGetTimeline, sessionGetErrors } from './context';
