/**
 * Session Recorder Desktop - Renderer Process
 *
 * Handles UI interactions and communicates with main process via IPC.
 */

export {}; // Make this a module

// Recording stats from main process
interface RecordingStats {
  duration: number;
  actionCount: number;
  currentUrl: string;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// State
type RecordingMode = 'browser' | 'voice' | 'combined';
type BrowserType = 'chromium' | 'firefox' | 'webkit';

let selectedMode: RecordingMode = 'combined';
let selectedBrowser: BrowserType = 'chromium';
let isRecording = false;
let isPaused = false;

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
    disableControls(true);

    await window.electronAPI.startRecording({
      title: recordingTitleInput.value || `Recording ${new Date().toLocaleString()}`,
      mode: selectedMode,
      browserType: selectedBrowser
    });

    isRecording = true;
    isPaused = false;
    updateUI();
  } catch (error) {
    console.error('Failed to start recording:', error);
    setStatus('ready', 'Ready to record');
    disableControls(false);
    alert(`Failed to start recording: ${error}`);
  }
}

async function stopRecording(): Promise<void> {
  try {
    setStatus('processing', 'Processing recording...');
    disableControls(true);

    const outputPath = await window.electronAPI.stopRecording();

    isRecording = false;
    isPaused = false;
    setStatus('ready', 'Ready to record');
    updateUI();

    if (outputPath) {
      setStatus('ready', `Recording saved: ${outputPath.split(/[\\/]/).pop()}`);
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
    setStatus('ready', 'Ready to record');
    updateUI();
    alert(`Failed to stop recording: ${error}`);
  }
}

async function handlePauseResume(): Promise<void> {
  if (!isRecording) return;

  try {
    if (isPaused) {
      await window.electronAPI.resumeRecording();
      isPaused = false;
    } else {
      await window.electronAPI.pauseRecording();
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
  window.electronAPI.onStateChange((state: string) => {
    console.log('State changed:', state);

    switch (state) {
      case 'idle':
        isRecording = false;
        isPaused = false;
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
        setStatus('recording', 'Recording...');
        break;
      case 'paused':
        isPaused = true;
        setStatus('paused', 'Paused');
        break;
      case 'stopping':
      case 'processing':
        setStatus('processing', 'Processing recording...');
        break;
    }

    updateUI();
  });

  // Handle recording stats updates (timer, action count, URL)
  window.electronAPI.onStats((stats: RecordingStats) => {
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

  window.electronAPI.onError((error: string) => {
    console.error('Recording error:', error);
    alert(`Recording error: ${error}`);
    setStatus('ready', 'Ready to record');
    isRecording = false;
    isPaused = false;
    updateUI();
  });
}

// UI Updates
function updateUI(): void {
  // Update start/stop button
  if (isRecording) {
    startBtn.innerHTML = '<span class="btn-icon">&#9632;</span> Stop Recording';
    startBtn.classList.remove('btn-primary');
    startBtn.classList.add('btn-danger');
  } else {
    startBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Start Recording';
    startBtn.classList.add('btn-primary');
    startBtn.classList.remove('btn-danger');
  }

  // Update pause button
  pauseBtn.disabled = !isRecording;
  if (isPaused) {
    pauseBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Resume';
  } else {
    pauseBtn.innerHTML = '<span class="btn-icon">&#10074;&#10074;</span> Pause';
  }

  // Show/hide recording status section
  if (isRecording) {
    recordingStatusSection.classList.remove('hidden');
  } else {
    recordingStatusSection.classList.add('hidden');
  }

  // Disable mode and browser selection during recording
  const modeButtons = recordingModeGroup.querySelectorAll('.toggle-btn');
  const browserButtons = browserTypeGroup.querySelectorAll('.toggle-btn');

  modeButtons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = isRecording;
  });

  browserButtons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = isRecording;
  });

  recordingTitleInput.disabled = isRecording;
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

function disableControls(disabled: boolean): void {
  startBtn.disabled = disabled;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
