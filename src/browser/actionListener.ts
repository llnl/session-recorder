/**
 * Browser-side action listener - Detects user interactions
 * Listens for click, input, change, submit, and keydown events in capture phase
 */

export interface UserAction {
  type: 'click' | 'input' | 'change' | 'submit' | 'keydown';
  target: Element;
  timestamp: string; // ISO 8601 UTC
  x?: number; // For click events
  y?: number;
  button?: number; // Mouse button: 0=left, 1=middle, 2=right
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean; // Cmd on Mac, Win on Windows
  };
  value?: string; // For input events
  key?: string; // For keydown events
}

export function setupActionListeners(
  onAction: (action: UserAction) => Promise<void>
) {
  // Click events - capture phase to intercept before execution
  document.addEventListener('click', async (e) => {
    const target = e.target as Element;
    if (!target) return;

    await onAction({
      type: 'click',
      target: target,
      timestamp: new Date().toISOString(),
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      }
    });
  }, { capture: true });

  // Input events (typing in text fields)
  document.addEventListener('input', async (e) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target) return;

    await onAction({
      type: 'input',
      target: target,
      timestamp: new Date().toISOString(),
      value: target.value
    });
  }, { capture: true });

  // Change events (select, checkbox, radio)
  document.addEventListener('change', async (e) => {
    const target = e.target as Element;
    if (!target) return;

    await onAction({
      type: 'change',
      target: target,
      timestamp: new Date().toISOString()
    });
  }, { capture: true });

  // Form submit
  document.addEventListener('submit', async (e) => {
    const target = e.target as Element;
    if (!target) return;

    await onAction({
      type: 'submit',
      target: target,
      timestamp: new Date().toISOString()
    });
  }, { capture: true });

  // Key events (Enter, Tab, Escape, Delete, Backspace)
  document.addEventListener('keydown', async (e) => {
    if (!['Enter', 'Tab', 'Escape', 'Delete', 'Backspace'].includes(e.key)) return;

    const target = e.target as Element;
    if (!target) return;

    await onAction({
      type: 'keydown',
      target: target,
      timestamp: new Date().toISOString(),
      key: e.key
    });
  }, { capture: true });

  console.log('✅ User action listeners installed');
}
