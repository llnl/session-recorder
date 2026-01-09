/**
 * Session Recorder Desktop - Renderer Process
 *
 * Handles UI interactions and communicates with main process via IPC.
 */

// Note: This file runs in browser context, not as a Node.js module

// Recording stats from main process
interface RecordingStats {
  duration: number;
  actionCount: number;
  currentUrl: string;
}

// Recording complete data from main process
interface RecordingCompleteData {
  outputPath: string;
  duration: number;
  actionCount: number;
  voiceSegments: number;
  voiceEnabled: boolean;
}

// Type definitions for the exposed API
interface ElectronAPI {
  // Recording control
  startRecording: (options: {
    title: string;
    mode: 'browser' | 'voice' | 'combined';
    browserType: 'chromium' | 'firefox' | 'webkit';
  }) => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;

  // State queries
  getRecordingState: () => Promise<{
    state: 'idle' | 'starting' | 'recording' | 'paused' | 'stopping' | 'processing';
    duration?: number;
    isPaused?: boolean;
  }>;

  // Event listeners
  onStateChange: (callback: (state: string) => void) => void;
  onStats: (callback: (stats: RecordingStats) => void) => void;
  onError: (callback: (error: string) => void) => void;
  onRecordingComplete: (callback: (data: RecordingCompleteData) => void) => void;

  // Session actions
  openInViewer: (sessionPath: string) => Promise<void>;
  showInFolder: (sessionPath: string) => Promise<void>;
}

// electronAPI is exposed globally by preload script via contextBridge
declare const electronAPI: ElectronAPI;

// State
type RecordingMode = 'browser' | 'voice' | 'combined';
type BrowserType = 'chromium' | 'firefox' | 'webkit';

let selectedMode: RecordingMode = 'combined';
let selectedBrowser: BrowserType = 'chromium';
let isRecording = false;
let isPaused = false;
let isProcessing = false;
let isComplete = false;
let lastOutputPath: string | null = null;

// DOM Elements
const recordingTitleInput = document.getElementById('recording-title') as HTMLInputElement;
const recordingModeGroup = document.getElementById('recording-mode') as HTMLDivElement;
const browserTypeGroup = document.getElementById('browser-type') as HTMLDivElement;
const browserSection = document.getElementById('browser-section') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const statusIndicator = document.getElementById('status-indicator') as HTMLSpanElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;

// Recording status elements
const recordingStatusSection = document.getElementById('recording-status') as HTMLElement;
const timerDisplay = document.getElementById('timer') as HTMLSpanElement;
const actionCountDisplay = document.getElementById('action-count') as HTMLSpanElement;
const currentUrlDisplay = document.getElementById('current-url') as HTMLSpanElement;

// FEAT-03: New status elements
const recordingDot = document.getElementById('recording-dot') as HTMLSpanElement;
const recordingStateText = document.getElementById('recording-state-text') as HTMLSpanElement;
const pausedBadge = document.getElementById('paused-badge') as HTMLSpanElement;
const voiceIndicator = document.getElementById('voice-indicator') as HTMLElement;

// FEAT-04: Recording complete elements
const recordingCompleteSection = document.getElementById('recording-complete') as HTMLElement;
const completeDurationDisplay = document.getElementById('complete-duration') as HTMLSpanElement;
const completeActionsDisplay = document.getElementById('complete-actions') as HTMLSpanElement;
const voiceSummaryItem = document.getElementById('voice-summary') as HTMLElement;
const completeVoiceDisplay = document.getElementById('complete-voice') as HTMLSpanElement;
const completePathDisplay = document.getElementById('complete-path') as HTMLSpanElement;
const openViewerBtn = document.getElementById('open-viewer-btn') as HTMLButtonElement;
const showFolderBtn = document.getElementById('show-folder-btn') as HTMLButtonElement;
const newRecordingBtn = document.getElementById('new-recording-btn') as HTMLButtonElement;
const controlsSection = document.querySelector('.controls-section') as HTMLElement;

// Original window title
const originalTitle = document.title;

// Format milliseconds as HH:MM:SS
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

// Format milliseconds as human-readable string (e.g., "5 minutes, 23 seconds")
function formatDurationHuman(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(', ');
}

// Truncate URL for display
function truncateUrl(url: string, maxLength: number = 50): string {
  if (!url || url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

// Initialize
function init(): void {
  setupModeToggle();
  setupBrowserToggle();
  setupControlButtons();
  setupCompleteViewButtons();
  setupIPCListeners();
  updateUI();
}

// Mode toggle handling
function setupModeToggle(): void {
  const buttons = recordingModeGroup.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isRecording) return;

      const mode = btn.getAttribute('data-mode') as RecordingMode;
      selectedMode = mode;

      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide browser section based on mode
      if (mode === 'voice') {
        browserSection.classList.add('hidden');
      } else {
        browserSection.classList.remove('hidden');
      }
    });
  });
}

// Browser toggle handling
function setupBrowserToggle(): void {
  const buttons = browserTypeGroup.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isRecording) return;

      const browser = btn.getAttribute('data-browser') as BrowserType;
      selectedBrowser = browser;

      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Control buttons
function setupControlButtons(): void {
  startBtn.addEventListener('click', handleStartStop);
  pauseBtn.addEventListener('click', handlePauseResume);
}

// Complete view buttons
function setupCompleteViewButtons(): void {
  openViewerBtn.addEventListener('click', handleOpenInViewer);
  showFolderBtn.addEventListener('click', handleShowInFolder);
  newRecordingBtn.addEventListener('click', handleNewRecording);
}

async function handleOpenInViewer(): Promise<void> {
  if (lastOutputPath) {
    try {
      await electronAPI.openInViewer(lastOutputPath);
    } catch (error) {
      console.error('Failed to open in viewer:', error);
      alert(`Failed to open in viewer: ${error}`);
    }
  }
}

async function handleShowInFolder(): Promise<void> {
  if (lastOutputPath) {
    try {
      await electronAPI.showInFolder(lastOutputPath);
    } catch (error) {
      console.error('Failed to show in folder:', error);
      alert(`Failed to show in folder: ${error}`);
    }
  }
}

function handleNewRecording(): void {
  // Reset to idle state
  isComplete = false;
  lastOutputPath = null;
  recordingTitleInput.value = '';
  updateUI();
}

async function handleStartStop(): Promise<void> {
  if (isRecording) {
    // Stop recording
    await stopRecording();
  } else {
    // Start recording
    await startRecording();
  }
}

async function startRecording(): Promise<void> {
  try {
    setStatus('starting', 'Starting recording...');
    startBtn.disabled = true;  // Temporarily disable while starting

    await electronAPI.startRecording({
      title: recordingTitleInput.value || `Recording ${new Date().toLocaleString()}`,
      mode: selectedMode,
      browserType: selectedBrowser
    });

    isRecording = true;
    isPaused = false;
    updateUI();  // This will re-enable the button as "Stop Recording"
  } catch (error) {
    console.error('Failed to start recording:', error);
    setStatus('ready', 'Ready to record');
    startBtn.disabled = false;  // Re-enable on error
    alert(`Failed to start recording: ${error}`);
  }
}

async function stopRecording(): Promise<void> {
  try {
    isProcessing = true;
    setStatus('processing', 'Processing recording...');
    updateUI();

    // Stop recording - the onRecordingComplete event handler
    // will update the UI to show the complete view
    await electronAPI.stopRecording();

    // Note: State is updated by onRecordingComplete event handler
    // Don't reset state here to avoid race condition with event

  } catch (error) {
    console.error('Failed to stop recording:', error);
    isProcessing = false;
    isRecording = false;
    isPaused = false;
    setStatus('ready', 'Ready to record');
    updateUI();
    alert(`Failed to stop recording: ${error}`);
  }
}

async function handlePauseResume(): Promise<void> {
  if (!isRecording) return;

  try {
    if (isPaused) {
      await electronAPI.resumeRecording();
      isPaused = false;
    } else {
      await electronAPI.pauseRecording();
      isPaused = true;
    }
    updateUI();
  } catch (error) {
    console.error('Failed to pause/resume:', error);
    alert(`Failed to pause/resume: ${error}`);
  }
}

// IPC event listeners
function setupIPCListeners(): void {
  electronAPI.onStateChange((state: string) => {
    console.log('State changed:', state);

    switch (state) {
      case 'idle':
        isRecording = false;
        isPaused = false;
        isProcessing = false;
        setStatus('ready', 'Ready to record');
        // Reset stats display
        timerDisplay.textContent = '00:00:00';
        actionCountDisplay.textContent = '0';
        currentUrlDisplay.textContent = '—';
        currentUrlDisplay.title = '';
        break;
      case 'starting':
        setStatus('starting', 'Starting recording...');
        break;
      case 'recording':
        isRecording = true;
        isPaused = false;
        isProcessing = false;
        setStatus('recording', 'Recording...');
        break;
      case 'paused':
        isPaused = true;
        setStatus('paused', 'Paused');
        break;
      case 'stopping':
      case 'processing':
        isProcessing = true;
        setStatus('processing', 'Processing recording...');
        break;
    }

    updateUI();
  });

  // Handle recording stats updates (timer, action count, URL)
  electronAPI.onStats((stats: RecordingStats) => {
    // Update timer display
    timerDisplay.textContent = formatDuration(stats.duration);

    // Update action count
    actionCountDisplay.textContent = stats.actionCount.toString();

    // Update current URL
    if (stats.currentUrl) {
      currentUrlDisplay.textContent = truncateUrl(stats.currentUrl);
      currentUrlDisplay.title = stats.currentUrl;  // Full URL on hover
    } else {
      currentUrlDisplay.textContent = '—';
      currentUrlDisplay.title = '';
    }
  });

  electronAPI.onError((error: string) => {
    console.error('Recording error:', error);
    alert(`Recording error: ${error}`);
    setStatus('ready', 'Ready to record');
    isRecording = false;
    isPaused = false;
    updateUI();
  });

  // Handle recording complete with session summary
  electronAPI.onRecordingComplete((data: RecordingCompleteData) => {
    console.log('Recording complete:', data);

    // Store the output path for button actions
    lastOutputPath = data.outputPath;

    // Update the complete view with session summary
    completeDurationDisplay.textContent = formatDurationHuman(data.duration);
    completeActionsDisplay.textContent = `${data.actionCount} browser actions`;

    // Show voice segments if voice was enabled
    if (data.voiceEnabled) {
      voiceSummaryItem.classList.remove('hidden');
      completeVoiceDisplay.textContent = `${data.voiceSegments} segments`;
    } else {
      voiceSummaryItem.classList.add('hidden');
    }

    // Display the file path
    const fileName = data.outputPath.split(/[\\/]/).pop() || data.outputPath;
    completePathDisplay.textContent = fileName;
    completePathDisplay.title = data.outputPath;

    // Set state to complete
    isComplete = true;
    isProcessing = false;
    isRecording = false;
    isPaused = false;

    setStatus('ready', 'Recording saved');
    updateUI();
  });
}

// UI Updates
function updateUI(): void {
  // FEAT-04: Handle complete view visibility
  if (isComplete) {
    // Show complete view, hide everything else
    recordingCompleteSection.classList.remove('hidden');
    recordingStatusSection.classList.add('hidden');
    controlsSection.classList.add('hidden');

    // Hide setup sections (title, mode, browser selection)
    document.querySelectorAll('.section').forEach(section => {
      if (section !== recordingCompleteSection) {
        section.classList.add('setup-hidden');
      }
    });

    // Reset window title
    document.title = `✓ Complete - ${originalTitle}`;
    return;
  }

  // Not complete - show normal UI
  recordingCompleteSection.classList.add('hidden');
  controlsSection.classList.remove('hidden');

  // Show setup sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('setup-hidden');
  });

  // Update start/stop button text and style
  if (isRecording) {
    startBtn.innerHTML = '<span class="btn-icon">&#9632;</span> Stop Recording';
    startBtn.classList.remove('btn-primary');
    startBtn.classList.add('btn-danger');
  } else {
    startBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Start Recording';
    startBtn.classList.add('btn-primary');
    startBtn.classList.remove('btn-danger');
  }

  // Enable/disable start button based on processing state
  // Button should be enabled when recording (to stop) or idle (to start)
  // Button should be disabled only when processing
  startBtn.disabled = isProcessing;

  // Update pause button
  pauseBtn.disabled = !isRecording || isProcessing;
  if (isPaused) {
    pauseBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Resume';
  } else {
    pauseBtn.innerHTML = '<span class="btn-icon">&#10074;&#10074;</span> Pause';
  }

  // Show/hide recording status section (also show during processing)
  if (isRecording || isProcessing) {
    recordingStatusSection.classList.remove('hidden');
  } else {
    recordingStatusSection.classList.add('hidden');
  }

  // FEAT-03: Update recording dot and state text
  if (isProcessing) {
    recordingDot.classList.add('paused');  // Use orange color for processing
    recordingStateText.textContent = 'Processing...';
    pausedBadge.classList.add('hidden');
  } else if (isRecording) {
    if (isPaused) {
      recordingDot.classList.add('paused');
      recordingStateText.textContent = 'Paused';
      pausedBadge.classList.remove('hidden');
    } else {
      recordingDot.classList.remove('paused');
      recordingStateText.textContent = 'Recording';
      pausedBadge.classList.add('hidden');
    }
  }

  // FEAT-03: Update window title based on recording state
  if (isProcessing) {
    document.title = `⏳ Processing - ${originalTitle}`;
  } else if (isRecording) {
    if (isPaused) {
      document.title = `⏸ Paused - ${originalTitle}`;
    } else {
      document.title = `🔴 Recording - ${originalTitle}`;
    }
  } else {
    document.title = originalTitle;
  }

  // FEAT-03: Show/hide voice indicator based on selected mode
  if (isRecording && !isProcessing && (selectedMode === 'voice' || selectedMode === 'combined')) {
    voiceIndicator.classList.remove('hidden');
  } else {
    voiceIndicator.classList.add('hidden');
  }

  // Disable mode and browser selection during recording or processing
  const modeButtons = recordingModeGroup.querySelectorAll('.toggle-btn');
  const browserButtons = browserTypeGroup.querySelectorAll('.toggle-btn');

  modeButtons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = isRecording || isProcessing;
  });

  browserButtons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = isRecording || isProcessing;
  });

  recordingTitleInput.disabled = isRecording || isProcessing;
}

function setStatus(state: 'ready' | 'starting' | 'recording' | 'paused' | 'processing', text: string): void {
  statusIndicator.className = 'status-indicator';

  switch (state) {
    case 'ready':
    case 'starting':
      statusIndicator.classList.add('ready');
      break;
    case 'recording':
      statusIndicator.classList.add('recording');
      break;
    case 'paused':
      statusIndicator.classList.add('paused');
      break;
    case 'processing':
      statusIndicator.classList.add('processing');
      break;
  }

  statusText.textContent = text;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
