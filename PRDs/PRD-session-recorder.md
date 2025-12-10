# Session Recorder - Product Requirements Document

**Version:** 1.1
**Last Updated:** December 2025
**Status:** Approved

---

## Executive Summary

Session Recorder is an enterprise-grade browser recording solution that captures user interactions, DOM state, screenshots, and voice narration to enable documentation generation, test automation, bug reproduction, and knowledge transfer. The system prioritizes complete capture with aggressive compression to balance fidelity with storage efficiency.

---

## Problem Statement

Development teams waste significant time on repetitive documentation and communication tasks:

- Domain experts leave organizations without transferring knowledge of legacy systems
- Developers document features manually, often incompletely
- QA engineers write bug reproduction steps by hand, missing critical details
- Test automation requires manual coding of user flows
- Cross-team communication relies on screenshots and written descriptions that lack context

A comprehensive recording solution eliminates these inefficiencies by capturing exactly what happened, what was said, and what the application state was at every moment.

---

## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Domain Experts** | Record legacy application walkthroughs for knowledge transfer |
| **Developers** | Document new features, capture user flows, generate test cases |
| **QA Engineers** | Record bug reproductions, create regression tests via voice |
| **Business Analysts** | Capture requirements sessions, document current-state workflows |
| **Project Managers** | Review recorded sessions for acceptance, track feature completeness |
| **UI/UX Designers** | Document interaction patterns, review implemented flows |
| **Technical Writers** | Generate documentation from recorded sessions |

---

## Use Cases

### UC-1: Legacy Application Documentation

**Actor:** Domain Expert  
**Duration:** 30-120 minutes  
**Scenario:** An expert walks through a legacy system scheduled for replacement, narrating business rules, edge cases, and workflow variations.

**Requirements:**
- Full DOM capture for structural analysis
- Voice narration with transcription
- Screenshot at every interaction for visual reference
- Session must be reviewable months/years later

### UC-2: Feature Documentation

**Actor:** Developer  
**Duration:** 5-30 minutes  
**Scenario:** Developer records a walkthrough of a newly implemented feature, explaining the user flows and expected behaviors.

**Requirements:**
- Clear action sequence capture
- Voice explanation synced to actions
- Exportable to documentation format (Markdown, Confluence)

### UC-3: Bug Reproduction

**Actor:** QA Engineer  
**Duration:** 1-10 minutes  
**Scenario:** QA discovers a bug and records the exact steps to reproduce it, including the error state.

**Requirements:**
- Precise action capture with timestamps
- DOM state at failure point (for hidden state analysis)
- Screenshot evidence of the bug
- Export to bug ticket format (Jira, Linear, GitHub Issues)

### UC-4: Regression Test Generation

**Actor:** QA Engineer  
**Duration:** 5-60 minutes  
**Scenario:** QA records a user flow while narrating test assertions via voice commands.

**Requirements:**
- All user actions with exact values (for replay)
- Voice commands interpreted as test annotations
- Export to test framework code (Playwright, Cypress)
- Element selectors captured for assertion generation

### UC-5: Full Application Documentation

**Actor:** Technical Writer / Developer  
**Duration:** 1-4 hours (multiple sessions)  
**Scenario:** Comprehensive documentation of an entire application's functionality.

**Requirements:**
- Session organization (multiple recordings per project)
- Navigation structure capture (sitemap generation)
- Searchable transcripts across sessions
- Batch export to documentation

---

## Functional Requirements

### FR-1: Event Capture

The system shall capture the following user interaction events:

#### FR-1.1: Mouse Events

| Event | Data Captured | Priority |
|-------|---------------|----------|
| `click` | x, y, button (left/middle/right), modifiers (ctrl/shift/alt/meta), target element | Required |
| `dblclick` | x, y, target element | Required |
| `contextmenu` | x, y, target element | Required |

#### FR-1.2: Keyboard Events

| Event | Data Captured | Priority |
|-------|---------------|----------|
| `keydown` (filtered) | key, code, modifiers | Required |

**Keydown Filter Rules:**
- Always capture: Enter, Tab, Escape, Delete, Backspace
- Always capture: Arrow keys (Up, Down, Left, Right)
- Always capture: Any key with Ctrl, Meta, or Alt modifier (shortcuts)
- Never capture: Bare modifier keys (Shift, Control, Alt, Meta alone)
- Never capture: Regular character keys (captured via `input` event instead)

#### FR-1.3: Form Events

| Event | Data Captured | Priority |
|-------|---------------|----------|
| `input` | value, inputType, target element | Required |
| `change` | value (see value capture rules), inputType, target element | Required |
| `submit` | form target, action URL | Required |

**Change Value Capture Rules:**
| Input Type | Value Captured |
|------------|----------------|
| `checkbox` | boolean (checked state) |
| `radio` | string (value) if checked, null if unchecked |
| `select-one` | string (selected value) |
| `select-multiple` | string[] (all selected values) |
| `file` | string[] (file names only, not contents) |
| `text`, `textarea`, `email`, `password`, etc. | string (current value) |

#### FR-1.4: Clipboard Events

| Event | Data Captured | Priority |
|-------|---------------|----------|
| `copy` | target element, selected text (if accessible) | Required |
| `cut` | target element, selected text (if accessible) | Required |
| `paste` | target element | Required |

**Note:** Clipboard content may not be accessible due to browser security restrictions. Capture what is available.

#### FR-1.5: Browser Events

| Event | Data Captured | Priority |
|-------|---------------|----------|
| `navigation` | fromUrl, toUrl, navigationType (push/pop/replace), title | Required |
| `page_visibility` | state (visible/hidden) | Required |
| `media` | event type (play/pause/ended/seeked/volumechange), mediaType, currentTime, duration, volume | Optional |
| `download` | url, suggestedFilename, state, totalBytes, receivedBytes | Optional |
| `fullscreen` | state (entered/exited), target element | Optional |
| `print` | event (beforeprint/afterprint) | Optional |

### FR-2: Snapshot Capture

#### FR-2.1: DOM Snapshot

The system shall capture a full HTML snapshot of the document on every recorded action.

**Requirements:**
- Include complete DOM structure
- Include inline styles and computed styles for key elements
- Include form field values at time of snapshot
- Mark the acted-upon element with `data-selected-el="true"` attribute
- Compress using gzip before storage

#### FR-2.2: Screenshot Capture

The system shall capture a screenshot on every recorded action.

**Requirements:**
- Format: JPEG
- Quality: 75% (configurable)
- Capture visible viewport
- Sync with DOM snapshot timestamp

### FR-3: Audio Capture

#### FR-3.1: Recording

The system shall capture audio narration throughout the session.

**Requirements:**
- Continuous recording during active session
- Handle microphone permissions gracefully
- Visual indicator when recording is active

#### FR-3.2: Storage

Audio shall be converted to MP3 format for storage.

**Requirements:**
- Bitrate: 64 kbps (sufficient for voice)
- Sample rate: 22050 Hz (sufficient for speech)
- Conversion may occur client-side or server-side

#### FR-3.3: Transcription

Audio shall be transcribed to searchable text.

**Requirements:**
- Use Whisper or equivalent speech-to-text
- Sync transcript timestamps with session timeline
- Store transcript alongside session data

### FR-4: Session Viewer

The system shall provide a playback interface for recorded sessions.

**Requirements:**
- Display screenshot for each action
- Show action details (type, target, value)
- Playback audio synced to timeline
- Display transcript synced to timeline
- Navigate between actions (previous/next)
- Scrub through timeline
- View DOM snapshot (expandable/inspectable)

### FR-5: Data Export

The system shall export session data to various formats.

| Export Type | Format | Use Case |
|-------------|--------|----------|
| Bug Report | Markdown, Jira, Linear, GitHub | UC-3 |
| Test Code | Playwright, Cypress | UC-4 |
| Documentation | Markdown, HTML, Confluence | UC-1, UC-2, UC-5 |
| Video | MP4 (screenshots + audio) | Sharing, presentations |

---

## Technical Requirements

### TR-1: Compression

#### TR-1.1: HTML Compression

All DOM snapshots shall be compressed using gzip.

**Expected compression ratio:** 5-10x (150 KB → 15-25 KB)

```typescript
// Implementation reference
import pako from 'pako';

function compressDOM(html: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  return pako.gzip(data);
}

function decompressDOM(compressed: Uint8Array): string {
  const decompressed = pako.ungzip(compressed);
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}
```

#### TR-1.2: Screenshot Compression

Screenshots shall be captured as JPEG with configurable quality.

**Default quality:** 75%  
**Expected size:** 60-80 KB per screenshot (vs 200-500 KB for PNG)

```typescript
// Implementation reference
async function captureScreenshot(
  element: HTMLElement = document.body,
  quality: number = 0.75
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    logging: false,
    scale: window.devicePixelRatio
  });
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/jpeg',
      quality
    );
  });
}
```

#### TR-1.3: Audio Compression

Audio shall be stored as MP3 64kbps.

**Expected size:** ~480 KB per minute (vs ~10 MB for WAV)

```typescript
// Implementation reference (server-side with ffmpeg)
// Client uploads raw audio, server converts

import ffmpeg from 'fluent-ffmpeg';

async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate(64)
      .audioFrequency(22050)
      .audioChannels(1) // Mono for voice
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}
```

### TR-2: Event Listeners

All event listeners shall use capture phase to ensure events are recorded before application code can stop propagation.

```typescript
// Implementation reference
document.addEventListener('click', handleClick, { capture: true });
document.addEventListener('keydown', handleKeydown, { capture: true });
// etc.
```

### TR-3: Element Identification

The system shall generate stable selectors for target elements.

**Selector priority (in order):**
1. `data-testid` attribute
2. `id` attribute (if unique and not auto-generated)
3. `name` attribute (for form elements)
4. Unique class combination
5. CSS path from nearest identifiable ancestor
6. XPath as fallback

### TR-4: Storage Estimates

| Session Duration | Actions (est.) | DOM (gzip) | Screenshots (JPEG) | Audio (MP3) | Total |
|------------------|----------------|------------|--------------------|--------------| ------|
| 30 seconds | 5-10 | 100-200 KB | 400-800 KB | 240 KB | ~1 MB |
| 10 minutes | 50-100 | 1-2 MB | 4-8 MB | 4.8 MB | ~12 MB |
| 30 minutes | 150-250 | 3-5 MB | 12-20 MB | 14 MB | ~35 MB |
| 1 hour | 300-500 | 6-10 MB | 24-40 MB | 29 MB | ~70 MB |
| 2 hours | 600-1000 | 12-20 MB | 48-80 MB | 58 MB | ~140 MB |

---

## Implementation Specifications

### IS-1: Action Listener Module

```typescript
// actionListener.ts

interface RecordedAction {
  type: string;
  timestamp: number;
  target: string; // CSS selector
  data: Record<string, unknown>;
}

type ActionCallback = (action: RecordedAction) => void;

export class ActionListener {
  private callback: ActionCallback;
  private abortController: AbortController;

  constructor(callback: ActionCallback) {
    this.callback = callback;
    this.abortController = new AbortController();
  }

  start(): void {
    const opts = { capture: true, signal: this.abortController.signal };
    const passiveOpts = { ...opts, passive: true };

    // Mouse events
    document.addEventListener('click', this.handleClick, opts);
    document.addEventListener('dblclick', this.handleDblClick, opts);
    document.addEventListener('contextmenu', this.handleContextMenu, opts);

    // Keyboard events
    document.addEventListener('keydown', this.handleKeydown, opts);

    // Form events
    document.addEventListener('input', this.handleInput, opts);
    document.addEventListener('change', this.handleChange, opts);
    document.addEventListener('submit', this.handleSubmit, opts);

    // Clipboard events
    document.addEventListener('copy', this.handleCopy, opts);
    document.addEventListener('cut', this.handleCut, opts);
    document.addEventListener('paste', this.handlePaste, opts);
  }

  stop(): void {
    this.abortController.abort();
  }

  private record(type: string, target: EventTarget | null, data: Record<string, unknown> = {}): void {
    this.callback({
      type,
      timestamp: Date.now(),
      target: target instanceof Element ? this.getSelector(target) : '',
      data
    });
  }

  private getSelector(element: Element): string {
    // Implementation: generate stable CSS selector
    // Priority: data-testid > id > name > class > path
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }
    if (element.id && !element.id.match(/^[0-9]/) && document.querySelectorAll(`#${element.id}`).length === 1) {
      return `#${element.id}`;
    }
    // ... additional selector logic
    return this.getCssPath(element);
  }

  private getCssPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        selector += '.' + current.className.trim().split(/\s+/).join('.');
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  // Event Handlers

  private handleClick = (e: MouseEvent): void => {
    this.record('click', e.target, {
      x: e.clientX,
      y: e.clientY,
      button: e.button, // 0=left, 1=middle, 2=right
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      }
    });
  };

  private handleDblClick = (e: MouseEvent): void => {
    this.record('dblclick', e.target, {
      x: e.clientX,
      y: e.clientY
    });
  };

  private handleContextMenu = (e: MouseEvent): void => {
    this.record('contextmenu', e.target, {
      x: e.clientX,
      y: e.clientY
    });
  };

  private handleKeydown = (e: KeyboardEvent): void => {
    if (!this.shouldRecordKeydown(e)) return;

    this.record('keydown', e.target, {
      key: e.key,
      code: e.code,
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      }
    });
  };

  private shouldRecordKeydown(e: KeyboardEvent): boolean {
    // Special navigation/action keys
    const specialKeys = ['Enter', 'Tab', 'Escape', 'Delete', 'Backspace'];
    if (specialKeys.includes(e.key)) return true;

    // Arrow keys
    if (e.key.startsWith('Arrow')) return true;

    // Any modifier combo (Ctrl+X, Cmd+X, Alt+X)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Skip bare modifier key press
      const modifierKeys = ['Control', 'Meta', 'Alt', 'Shift'];
      if (modifierKeys.includes(e.key)) return false;
      return true;
    }

    return false;
  }

  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    this.record('input', e.target, {
      value: target.value,
      inputType: (e as InputEvent).inputType || 'unknown'
    });
  };

  private handleChange = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.record('change', e.target, {
      value: this.getChangeValue(target),
      inputType: target.type
    });
  };

  private getChangeValue(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): unknown {
    if (target instanceof HTMLSelectElement) {
      if (target.multiple) {
        return Array.from(target.selectedOptions).map(o => o.value);
      }
      return target.value;
    }

    if (target instanceof HTMLInputElement) {
      switch (target.type) {
        case 'checkbox':
          return target.checked;
        case 'radio':
          return target.checked ? target.value : null;
        case 'file':
          return Array.from(target.files || []).map(f => f.name);
        default:
          return target.value;
      }
    }

    return target.value;
  }

  private handleSubmit = (e: Event): void => {
    const form = e.target as HTMLFormElement;
    this.record('submit', e.target, {
      action: form.action,
      method: form.method
    });
  };

  private handleCopy = (e: ClipboardEvent): void => {
    this.record('copy', e.target, {
      selectedText: window.getSelection()?.toString() || null
    });
  };

  private handleCut = (e: ClipboardEvent): void => {
    this.record('cut', e.target, {
      selectedText: window.getSelection()?.toString() || null
    });
  };

  private handlePaste = (e: ClipboardEvent): void => {
    this.record('paste', e.target, {
      // Note: clipboard content may not be accessible
      // due to browser security restrictions
    });
  };
}
```

### IS-2: Snapshot Module

```typescript
// snapshotCapture.ts

import pako from 'pako';
import html2canvas from 'html2canvas';

export interface Snapshot {
  timestamp: number;
  dom: Uint8Array; // gzipped HTML
  screenshot: Blob; // JPEG
}

export interface SnapshotOptions {
  screenshotQuality?: number; // 0-1, default 0.75
  markElement?: Element | null; // Element to mark with data-selected-el
}

export async function captureSnapshot(options: SnapshotOptions = {}): Promise<Snapshot> {
  const { screenshotQuality = 0.75, markElement = null } = options;
  const timestamp = Date.now();

  // Mark the selected element
  if (markElement) {
    markElement.setAttribute('data-selected-el', 'true');
  }

  // Capture DOM
  const html = document.documentElement.outerHTML;
  const dom = compressDOM(html);

  // Capture screenshot
  const screenshot = await captureScreenshot(screenshotQuality);

  // Remove marker
  if (markElement) {
    markElement.removeAttribute('data-selected-el');
  }

  return { timestamp, dom, screenshot };
}

function compressDOM(html: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  return pako.gzip(data);
}

export function decompressDOM(compressed: Uint8Array): string {
  const decompressed = pako.ungzip(compressed);
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}

async function captureScreenshot(quality: number): Promise<Blob> {
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    logging: false,
    scale: Math.min(window.devicePixelRatio, 2), // Cap at 2x for performance
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create screenshot blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
```

### IS-3: Session Recorder (Orchestrator)

```typescript
// sessionRecorder.ts

import { ActionListener, RecordedAction } from './actionListener';
import { captureSnapshot, Snapshot } from './snapshotCapture';

export interface RecordedEvent {
  action: RecordedAction;
  snapshot: Snapshot;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  events: RecordedEvent[];
  audio?: Blob; // MP3
  transcript?: TranscriptSegment[];
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export class SessionRecorder {
  private session: SessionData;
  private actionListener: ActionListener;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  constructor() {
    this.session = this.createSession();
    this.actionListener = new ActionListener(this.handleAction);
  }

  private createSession(): SessionData {
    return {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      events: []
    };
  }

  async start(): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;

    // Start action listener
    this.actionListener.start();

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(1000); // Capture in 1-second chunks
    } catch (err) {
      console.warn('Audio recording not available:', err);
    }

    // Capture initial snapshot
    await this.captureNavigationSnapshot('session_start');
  }

  async stop(): Promise<SessionData> {
    if (!this.isRecording) return this.session;
    this.isRecording = false;

    // Stop action listener
    this.actionListener.stop();

    // Stop audio recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Wait for final data
      await new Promise(resolve => {
        this.mediaRecorder!.onstop = resolve;
      });

      // Combine audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.session.audio = audioBlob; // Will be converted to MP3 server-side
    }

    this.session.endTime = Date.now();
    return this.session;
  }

  private handleAction = async (action: RecordedAction): Promise<void> => {
    if (!this.isRecording) return;

    // Find the target element for marking
    let targetElement: Element | null = null;
    if (action.target) {
      try {
        targetElement = document.querySelector(action.target);
      } catch {
        // Invalid selector, skip marking
      }
    }

    // Capture snapshot with element marked
    const snapshot = await captureSnapshot({
      markElement: targetElement
    });

    this.session.events.push({ action, snapshot });
  };

  private async captureNavigationSnapshot(navigationType: string): Promise<void> {
    const action: RecordedAction = {
      type: 'navigation',
      timestamp: Date.now(),
      target: '',
      data: {
        url: window.location.href,
        title: document.title,
        navigationType
      }
    };

    const snapshot = await captureSnapshot();
    this.session.events.push({ action, snapshot });
  }

  // Call this when navigation occurs (popstate, pushState, etc.)
  async onNavigation(fromUrl: string, toUrl: string, navigationType: string): Promise<void> {
    const action: RecordedAction = {
      type: 'navigation',
      timestamp: Date.now(),
      target: '',
      data: { fromUrl, toUrl, navigationType }
    };

    const snapshot = await captureSnapshot();
    this.session.events.push({ action, snapshot });
  }

  // Call this for visibility changes
  async onVisibilityChange(state: 'visible' | 'hidden'): Promise<void> {
    const action: RecordedAction = {
      type: 'page_visibility',
      timestamp: Date.now(),
      target: '',
      data: { state }
    };

    const snapshot = await captureSnapshot();
    this.session.events.push({ action, snapshot });
  }
}
```

---

## Data Schema

### Session Record

```typescript
interface Session {
  id: string;
  projectId?: string;
  userId: string;
  
  // Timing
  startTime: number; // Unix timestamp ms
  endTime: number;
  duration: number; // ms
  
  // Metadata
  title?: string;
  description?: string;
  tags?: string[];
  
  // Browser context
  userAgent: string;
  viewport: { width: number; height: number };
  url: string; // Starting URL
  
  // Storage references
  eventsRef: string; // Path to events JSON (compressed)
  audioRef?: string; // Path to MP3 file
  transcriptRef?: string; // Path to transcript JSON
  
  // Computed
  eventCount: number;
  totalSize: number; // bytes
}
```

### Event Record

```typescript
interface StoredEvent {
  action: {
    type: string;
    timestamp: number;
    target: string;
    data: Record<string, unknown>;
  };
  domRef: string; // Path to gzipped HTML file
  screenshotRef: string; // Path to JPEG file
}
```

---

## Quality Attributes

### QA-1: Performance

- Recording shall not degrade page performance by more than 5%
- Snapshot capture shall complete within 500ms
- Memory usage shall not exceed 100MB during recording

### QA-2: Reliability

- No user action shall be missed during active recording
- Recording shall gracefully handle page crashes (auto-save)
- Partial sessions shall be recoverable

### QA-3: Storage Efficiency

- Target compression ratios:
  - DOM: 5-10x (gzip)
  - Screenshots: 3-5x (JPEG vs PNG)
  - Audio: 20x (MP3 vs WAV)
- Target session size: < 1 MB per minute of recording

### QA-4: Privacy & Security

- Audio recording shall require explicit user consent
- File contents shall not be captured (only filenames)
- Password fields shall have values redacted in snapshots
- Sessions shall be encrypted at rest

---

## Future Considerations

### Not In Scope (v1)

| Feature | Rationale |
|---------|-----------|
| DOM mutations (incremental) | Complexity vs. benefit for current use cases |
| Scroll position tracking | Derivable from `data-selected-el` marking |
| Focus tracking (`focusin`) | Derivable from subsequent input/change events |
| Network request capture | Separate concern, could be added later |
| Console log capture | Separate concern, could be added later |
| Video recording (screen) | Screenshots sufficient, video adds complexity |

### Potential v2 Features

- Real-time collaboration (multiple viewers)
- AI-powered action summarization
- Automatic test generation without voice
- Integration with CI/CD pipelines
- Session comparison (diff two recordings)
- Heatmap generation from multiple sessions

---

## Appendix A: Event Reference

### Complete Event List

| Event | Category | Data Captured | Triggers Snapshot |
|-------|----------|---------------|-------------------|
| `click` | Mouse | x, y, button, modifiers, target | Yes |
| `dblclick` | Mouse | x, y, target | Yes |
| `contextmenu` | Mouse | x, y, target | Yes |
| `keydown` | Keyboard | key, code, modifiers, target | Yes (filtered) |
| `input` | Form | value, inputType, target | Yes |
| `change` | Form | value, inputType, target | Yes |
| `submit` | Form | action, method, target | Yes |
| `copy` | Clipboard | selectedText, target | Yes |
| `cut` | Clipboard | selectedText, target | Yes |
| `paste` | Clipboard | target | Yes |
| `navigation` | Browser | fromUrl, toUrl, navigationType | Yes |
| `page_visibility` | Browser | state | Yes |
| `media` | Browser | event, mediaType, currentTime, volume | Optional |
| `download` | Browser | url, filename, state, bytes | Optional |
| `fullscreen` | Browser | state, element | Optional |
| `print` | Browser | event | Optional |

### Excluded Events (with rationale)

| Event | Rationale |
|-------|-----------|
| `mousemove` | High frequency, no user intent signal |
| `mouseover/out/enter/leave` | Hover state not actionable |
| `keyup` | Redundant with keydown |
| `keypress` | Deprecated |
| `scroll` | Position derivable from element marking |
| `focusin/focusout` | Derivable from form events |
| `drag` (continuous) | Only need start/drop/end |
| `wheel` | No user intent signal |
| `resize` | Rarely needed |

---

## Appendix B: Size Calculation Reference

### Per-Component Sizes

| Component | Raw Size | Compressed Size | Notes |
|-----------|----------|-----------------|-------|
| DOM snapshot | 100-200 KB | 15-25 KB | gzip |
| Screenshot | 200-500 KB | 60-80 KB | JPEG 75% |
| Action metadata | 100-500 B | - | JSON |
| Audio (per minute) | 10 MB | 480 KB | MP3 64kbps |

### Session Size Formula

```
Total Size = 
  (Action Count × 100 KB) +  // DOM + screenshot per action
  (Duration in minutes × 0.5 MB) +  // Audio
  (Overhead ~5%)
```

### Example Calculations

| Scenario | Actions | Duration | Estimated Size |
|----------|---------|----------|----------------|
| Quick bug repro | 20 | 2 min | ~3 MB |
| Feature walkthrough | 100 | 15 min | ~18 MB |
| Full app documentation | 400 | 60 min | ~70 MB |
| Legacy system capture | 800 | 120 min | ~140 MB |
