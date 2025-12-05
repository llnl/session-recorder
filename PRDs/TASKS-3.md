# TASKS-3: Snapshot Architecture Implementation Tasks

**Related PRD:** [PRD-3.md](./PRD-3.md)
**Status:** 🚨 CRITICAL PRIORITY
**Total Estimated Time:** 35 hours (across 3 phases)

---

## Overview

This document breaks down the Playwright-inspired snapshot architecture improvements into actionable tasks with clear acceptance criteria, code examples, and testing requirements.

---

## Phase 1: Critical Snapshot Fixes (9 hours) 🚨 HIGH PRIORITY

**Goal:** Make snapshots accurately display captured state for debugging
**Deliverable:** Working restoration script that fixes form fields, checkboxes, and scroll positions

### Task 1.1: Create Snapshot Restoration Script (4 hours)

**Priority:** 🚨 CRITICAL
**File:** `session-recorder/src/browser/snapshotRestoration.ts`

#### Implementation Steps

1. **Create restoration script module** (1 hour)

```typescript
// session-recorder/src/browser/snapshotRestoration.ts
/**
 * Generates a self-executing restoration script that runs in the snapshot iframe.
 * Based on Playwright's snapshotRenderer.ts restoration logic.
 */

export interface RestorationConfig {
  restoreInputs?: boolean;
  restoreCheckboxes?: boolean;
  restoreScrollPositions?: boolean;
  restoreShadowDOM?: boolean;
  restorePopovers?: boolean;
  restoreDialogs?: boolean;
  verbose?: boolean;
}

const DEFAULT_CONFIG: RestorationConfig = {
  restoreInputs: true,
  restoreCheckboxes: true,
  restoreScrollPositions: true,
  restoreShadowDOM: true,
  restorePopovers: true,
  restoreDialogs: true,
  verbose: false,
};

export function generateRestorationScript(config: RestorationConfig = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return `
(function() {
  'use strict';

  const config = ${JSON.stringify(cfg)};

  function log(...args) {
    if (config.verbose) {
      console.log('[Snapshot Restoration]', ...args);
    }
  }

  function restoreSnapshotState() {
    log('Starting snapshot restoration...');

    const visit = (root) => {
      // 1. Restore input/textarea values
      if (config.restoreInputs) {
        const valueElements = root.querySelectorAll('[__playwright_value_]');
        log('Restoring', valueElements.length, 'input values');
        for (let i = 0; i < valueElements.length; i++) {
          const el = valueElements[i];
          if (el.type !== 'file') {
            const value = el.getAttribute('__playwright_value_');
            el.value = value;
            log('Restored input value:', el.id || el.name, '=', value);
          }
          el.removeAttribute('__playwright_value_');
        }
      }

      // 2. Restore checkbox/radio checked state
      if (config.restoreCheckboxes) {
        const checkedElements = root.querySelectorAll('[__playwright_checked_]');
        log('Restoring', checkedElements.length, 'checkbox/radio states');
        for (let i = 0; i < checkedElements.length; i++) {
          const el = checkedElements[i];
          const checked = el.getAttribute('__playwright_checked_') === 'true';
          el.checked = checked;
          log('Restored checked:', el.id || el.name, '=', checked);
          el.removeAttribute('__playwright_checked_');
        }
      }

      // 3. Restore select option selected state
      if (config.restoreInputs) {
        const selectedElements = root.querySelectorAll('[__playwright_selected_]');
        log('Restoring', selectedElements.length, 'select options');
        for (let i = 0; i < selectedElements.length; i++) {
          const el = selectedElements[i];
          const selected = el.getAttribute('__playwright_selected_') === 'true';
          el.selected = selected;
          log('Restored selected:', el.value, '=', selected);
          el.removeAttribute('__playwright_selected_');
        }
      }

      // 4. Restore popover state
      if (config.restorePopovers) {
        const popoverElements = root.querySelectorAll('[__playwright_popover_open_]');
        log('Restoring', popoverElements.length, 'popovers');
        for (let i = 0; i < popoverElements.length; i++) {
          const el = popoverElements[i];
          try {
            if (el.showPopover) {
              el.showPopover();
              log('Restored popover:', el.id);
            }
          } catch (e) {
            log('Failed to restore popover:', e.message);
          }
          el.removeAttribute('__playwright_popover_open_');
        }
      }

      // 5. Restore dialog state
      if (config.restoreDialogs) {
        const dialogElements = root.querySelectorAll('[__playwright_dialog_open_]');
        log('Restoring', dialogElements.length, 'dialogs');
        for (let i = 0; i < dialogElements.length; i++) {
          const el = dialogElements[i];
          const mode = el.getAttribute('__playwright_dialog_open_');
          try {
            if (mode === 'modal') {
              el.showModal();
            } else {
              el.show();
            }
            log('Restored dialog:', el.id, 'mode:', mode);
          } catch (e) {
            log('Failed to restore dialog:', e.message);
          }
          el.removeAttribute('__playwright_dialog_open_');
        }
      }

      // 6. Rebuild Shadow DOM
      if (config.restoreShadowDOM) {
        const shadowTemplates = root.querySelectorAll('template[shadowrootmode]');
        log('Rebuilding', shadowTemplates.length, 'shadow roots');
        for (let i = 0; i < shadowTemplates.length; i++) {
          const template = shadowTemplates[i];
          const mode = template.getAttribute('shadowrootmode');
          const parent = template.parentElement;

          if (parent && !parent.shadowRoot) {
            try {
              const shadowRoot = parent.attachShadow({ mode: mode });
              shadowRoot.appendChild(template.content.cloneNode(true));
              template.remove();
              log('Rebuilt shadow root for:', parent.tagName);
              visit(shadowRoot); // Recurse into Shadow DOM
            } catch (e) {
              log('Failed to attach shadow root:', e.message);
            }
          }
        }
      }
    };

    // Restore scroll positions on load (after layout)
    const restoreScrollPositions = () => {
      if (!config.restoreScrollPositions) return;

      const scrollTopElements = document.querySelectorAll('[__playwright_scroll_top_]');
      log('Restoring', scrollTopElements.length, 'vertical scroll positions');
      for (let i = 0; i < scrollTopElements.length; i++) {
        const el = scrollTopElements[i];
        const scrollTop = parseInt(el.getAttribute('__playwright_scroll_top_'), 10);
        el.scrollTop = scrollTop;
        log('Restored scrollTop:', el.id || el.className, '=', scrollTop);
        el.removeAttribute('__playwright_scroll_top_');
      }

      const scrollLeftElements = document.querySelectorAll('[__playwright_scroll_left_]');
      log('Restoring', scrollLeftElements.length, 'horizontal scroll positions');
      for (let i = 0; i < scrollLeftElements.length; i++) {
        const el = scrollLeftElements[i];
        const scrollLeft = parseInt(el.getAttribute('__playwright_scroll_left_'), 10);
        el.scrollLeft = scrollLeft;
        log('Restored scrollLeft:', el.id || el.className, '=', scrollLeft);
        el.removeAttribute('__playwright_scroll_left_');
      }
    };

    // Execute restoration
    log('Visiting document tree...');
    visit(document);

    // Restore scroll after load
    if (document.readyState === 'complete') {
      restoreScrollPositions();
    } else {
      window.addEventListener('load', restoreScrollPositions);
    }

    log('Snapshot restoration complete!');
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSnapshotState);
  } else {
    restoreSnapshotState();
  }
})();
`;
}

// Export minified version for production
export function generateRestorationScriptMinified(): string {
  const fullScript = generateRestorationScript({ verbose: false });
  // In production, use a minifier like terser
  return fullScript.replace(/\s+/g, ' ').trim();
}
```

2. **Write unit tests** (1 hour)

```typescript
// session-recorder/test/snapshotRestoration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateRestorationScript } from '../src/browser/snapshotRestoration';
import { JSDOM } from 'jsdom';

describe('Snapshot Restoration', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
      runScripts: 'dangerously',
      resources: 'usable',
    });
    document = dom.window.document;
    window = dom.window as any;
  });

  it('restores input values', () => {
    document.body.innerHTML = '<input id="test" __playwright_value_="hello world" />';

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    const input = document.getElementById('test') as HTMLInputElement;
    expect(input.value).toBe('hello world');
    expect(input.hasAttribute('__playwright_value_')).toBe(false);
  });

  it('restores textarea values', () => {
    document.body.innerHTML = '<textarea id="test" __playwright_value_="multi\nline" />';

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    const textarea = document.getElementById('test') as HTMLTextAreaElement;
    expect(textarea.value).toBe('multi\nline');
  });

  it('restores checkbox checked state', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="cb1" __playwright_checked_="true" />
      <input type="checkbox" id="cb2" __playwright_checked_="false" />
    `;

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    expect((document.getElementById('cb1') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('cb2') as HTMLInputElement).checked).toBe(false);
  });

  it('restores radio checked state', () => {
    document.body.innerHTML = `
      <input type="radio" name="opt" id="r1" __playwright_checked_="false" />
      <input type="radio" name="opt" id="r2" __playwright_checked_="true" />
    `;

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    expect((document.getElementById('r1') as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById('r2') as HTMLInputElement).checked).toBe(true);
  });

  it('restores select option selected state', () => {
    document.body.innerHTML = `
      <select id="sel">
        <option value="1" __playwright_selected_="false">One</option>
        <option value="2" __playwright_selected_="true">Two</option>
        <option value="3" __playwright_selected_="false">Three</option>
      </select>
    `;

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    const select = document.getElementById('sel') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });

  it('restores scroll positions on load', (done) => {
    document.body.innerHTML = `
      <div id="scroller" style="width:100px;height:100px;overflow:scroll;" __playwright_scroll_top_="50" __playwright_scroll_left_="25">
        <div style="width:500px;height:500px;"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    window.addEventListener('load', () => {
      const scroller = document.getElementById('scroller') as HTMLElement;
      expect(scroller.scrollTop).toBe(50);
      expect(scroller.scrollLeft).toBe(25);
      done();
    });

    window.dispatchEvent(new Event('load'));
  });

  it('rebuilds shadow DOM', () => {
    document.body.innerHTML = `
      <div id="host">
        <template shadowrootmode="open">
          <style>p { color: red; }</style>
          <p>Shadow content</p>
        </template>
      </div>
    `;

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();
    document.body.appendChild(script);

    const host = document.getElementById('host') as HTMLElement;
    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot!.querySelector('p')?.textContent).toBe('Shadow content');
    expect(document.querySelector('template[shadowrootmode]')).toBeNull(); // Template removed
  });

  it('handles missing elements gracefully', () => {
    document.body.innerHTML = '<div>No special attributes</div>';

    const script = document.createElement('script');
    script.textContent = generateRestorationScript();

    // Should not throw
    expect(() => document.body.appendChild(script)).not.toThrow();
  });

  it('respects config options', () => {
    document.body.innerHTML = '<input id="test" __playwright_value_="hello" />';

    const script = document.createElement('script');
    script.textContent = generateRestorationScript({ restoreInputs: false });
    document.body.appendChild(script);

    const input = document.getElementById('test') as HTMLInputElement;
    expect(input.value).toBe(''); // NOT restored because config disabled it
    expect(input.hasAttribute('__playwright_value_')).toBe(true); // Attribute still there
  });
});
```

3. **Integrate with SnapshotViewer** (1.5 hours)

```typescript
// session-recorder/viewer/src/components/SnapshotViewer/SnapshotViewer.tsx
import { generateRestorationScript } from '@/browser/snapshotRestoration';

// ... existing code ...

// Inject restoration script into HTML
function injectRestorationScript(html: string): string {
  const script = `<script type="text/javascript">${generateRestorationScript()}</script>`;

  // Try to inject before closing </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}\n</head>`);
  }

  // Fallback: inject at start of <body>
  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/, `<body$1>\n${script}`);
  }

  // Last resort: prepend to HTML
  return script + html;
}

// Update the useEffect that loads snapshots
useEffect(() => {
  if (!selectedAction || !iframeRef.current) return;

  const snapshot = currentView === 'before' ? selectedAction.before : selectedAction.after;
  const htmlPath = snapshot.html;

  const htmlBlob = resources.get(htmlPath);
  if (!htmlBlob) {
    setError(`Snapshot not found: ${htmlPath}`);
    return;
  }

  setIsLoading(true);
  setError(null);

  htmlBlob.text().then((htmlContent) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      setError('Failed to access iframe document');
      setIsLoading(false);
      return;
    }

    // ✅ NEW: Inject restoration script
    const htmlWithRestoration = injectRestorationScript(htmlContent);

    iframeDoc.open();
    iframeDoc.write(htmlWithRestoration);  // ✅ Write enhanced HTML
    iframeDoc.close();

    iframe.onload = () => {
      setIsLoading(false);

      if (currentView === 'before') {
        highlightElement(iframe);
      }
    };
  }).catch((err) => {
    setError(`Failed to load snapshot: ${err.message}`);
    setIsLoading(false);
  });
}, [selectedAction, currentView, resources]);
```

4. **Manual testing** (0.5 hours)

Test scenarios:
- [ ] Input fields show typed values
- [ ] Checkboxes show correct checked state
- [ ] Radio buttons show correct selection
- [ ] Select dropdowns show correct option
- [ ] Scroll positions are restored
- [ ] Shadow DOM components render
- [ ] No console errors in viewer

#### Acceptance Criteria

- ✅ Restoration script module created and exported
- ✅ All unit tests pass
- ✅ Script injected into snapshot HTML in viewer
- ✅ Input values display correctly in snapshots
- ✅ Checkbox/radio states are correct
- ✅ Scroll positions are restored
- ✅ Shadow DOM renders correctly
- ✅ No regression in existing functionality

#### Files Modified

- ✅ Create: `session-recorder/src/browser/snapshotRestoration.ts`
- ✅ Create: `session-recorder/test/snapshotRestoration.test.ts`
- ✅ Modify: `session-recorder/viewer/src/components/SnapshotViewer/SnapshotViewer.tsx`

---

### Task 1.2: Capture Additional Interactive State (3 hours)

**Priority:** 🔴 HIGH
**Files:** `session-recorder/src/browser/snapshotCapture.ts`

#### Implementation Steps

1. **Add canvas bounding rect capture** (1 hour)

```typescript
// In visitNode() function, add after line 114:

// Canvas bounding rect (for future screenshot extraction)
if (tagName === 'canvas') {
  const rect = (element as HTMLCanvasElement).getBoundingClientRect();
  const boundingRect = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
  html += ` __playwright_bounding_rect__="${escapeAttr(JSON.stringify(boundingRect))}"`;
}

// Iframe bounding rect
if (tagName === 'iframe' || tagName === 'frame') {
  const rect = (element as HTMLIFrameElement).getBoundingClientRect();
  const boundingRect = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
  html += ` __playwright_bounding_rect__="${escapeAttr(JSON.stringify(boundingRect))}"`;
}
```

2. **Add popover and dialog state** (1 hour)

```typescript
// In visitNode() function, add after line 114:

// Popover state (HTML Popover API)
if ((element as HTMLElement).popover) {
  const isOpen = (element as HTMLElement).matches &&
                 (element as HTMLElement).matches(':popover-open');
  if (isOpen) {
    html += ` __playwright_popover_open_="true"`;
  }
}

// Dialog state
if (tagName === 'dialog') {
  const dialog = element as HTMLDialogElement;
  if (dialog.open) {
    const isModal = dialog.matches && dialog.matches(':modal');
    const mode = isModal ? 'modal' : 'true';
    html += ` __playwright_dialog_open_="${mode}"`;
  }
}
```

3. **Add custom elements tracking** (1 hour)

```typescript
// At the top of captureSnapshot() function, before visitNode():

// Track defined custom elements
const definedCustomElements = new Set<string>();

// In visitNode() for element nodes, add after line 75:
if (nodeType === Node.ELEMENT_NODE) {
  const localName = element.localName;
  if (localName.includes('-') && window.customElements?.get(localName)) {
    definedCustomElements.add(localName);
  }
  // ... rest of element processing
}

// At the end of captureSnapshot(), before return, add to <body>:
function addCustomElementsToBody(html: string): string {
  if (definedCustomElements.size === 0) return html;

  const elementsList = Array.from(definedCustomElements).join(',');
  const attr = `__playwright_custom_elements__="${elementsList}"`;

  // Add to body tag
  return html.replace(
    /<body([^>]*)>/i,
    `<body$1 ${attr}>`
  );
}

// Before return:
html = addCustomElementsToBody(html);
```

#### Acceptance Criteria

- ✅ Canvas elements have `__playwright_bounding_rect__` attribute
- ✅ Iframe elements have bounding rect captured
- ✅ Popover state captured for open popovers
- ✅ Dialog state (modal/non-modal) captured
- ✅ Custom elements list attached to body
- ✅ All existing tests still pass
- ✅ No performance regression (capture time <100ms)

#### Files Modified

- ✅ Modify: `session-recorder/src/browser/snapshotCapture.ts`

---

### Task 1.3: Fix Shadow DOM Template Rendering (2 hours)

**Priority:** 🔴 HIGH
**Files:** `session-recorder/src/browser/snapshotCapture.ts`

#### Issue

Current Shadow DOM capture uses `<template shadowrootmode="open">` but this requires Declarative Shadow DOM support. Need to ensure proper serialization and that restoration script handles it correctly.

#### Implementation Steps

1. **Verify Shadow DOM serialization** (0.5 hours)

```typescript
// In visitNode() function, verify this logic (around line 124-131):

// Handle Shadow DOM children
if (nodeType === Node.ELEMENT_NODE && (element as HTMLElement).shadowRoot) {
  const shadowRoot = (element as HTMLElement).shadowRoot!;

  // Use declarative Shadow DOM template
  html += '<template shadowrootmode="open">';

  // Recurse into shadow root children
  const shadowChildren = Array.from(shadowRoot.childNodes);
  for (const child of shadowChildren) {
    html += visitNode(child);
  }

  // Include adopted stylesheets if present
  if ('adoptedStyleSheets' in shadowRoot && (shadowRoot as any).adoptedStyleSheets?.length > 0) {
    const sheets = (shadowRoot as any).adoptedStyleSheets as CSSStyleSheet[];
    for (const sheet of sheets) {
      try {
        const cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        html += `<template __playwright_style_sheet__="${escapeAttr(cssText)}"></template>`;
      } catch (e) {
        // CORS or other access issues
        console.warn('Could not access adopted stylesheet:', e);
      }
    }
  }

  html += '</template>';
}
```

2. **Update restoration script to handle adopted stylesheets** (1 hour)

Already included in Task 1.1's restoration script, but verify:

```typescript
// In snapshotRestoration.ts, add to visit() function:

// 7. Restore adopted stylesheets
if ('adoptedStyleSheets' in root) {
  const adoptedSheets = [];
  const sheetTemplates = root.querySelectorAll('template[__playwright_style_sheet__]');

  for (let i = 0; i < sheetTemplates.length; i++) {
    const template = sheetTemplates[i];
    const cssText = template.getAttribute('__playwright_style_sheet__');

    if (cssText && 'CSSStyleSheet' in window) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        adoptedSheets.push(sheet);
        log('Restored adopted stylesheet');
      } catch (e) {
        log('Failed to restore adopted stylesheet:', e.message);
      }
    }
  }

  if (adoptedSheets.length > 0) {
    root.adoptedStyleSheets = adoptedSheets;
  }
}
```

3. **Write integration tests** (0.5 hours)

```typescript
// session-recorder/test/shadowDOM.test.ts
describe('Shadow DOM Capture and Restore', () => {
  it('captures and restores shadow DOM content', async () => {
    const page = await createTestPage(`
      <div id="host"></div>
      <script>
        const host = document.getElementById('host');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<p>Shadow content</p>';
      </script>
    `);

    const snapshot = await captureSnapshot(page);
    expect(snapshot.html).toContain('<template shadowrootmode="open">');
    expect(snapshot.html).toContain('Shadow content');

    const restored = await loadSnapshotInViewer(snapshot);
    const shadowContent = await restored.evaluate(() => {
      const host = document.getElementById('host');
      return host?.shadowRoot?.querySelector('p')?.textContent;
    });

    expect(shadowContent).toBe('Shadow content');
  });

  it('captures and restores adopted stylesheets', async () => {
    const page = await createTestPage(`
      <div id="host"></div>
      <script>
        const host = document.getElementById('host');
        const shadow = host.attachShadow({ mode: 'open' });
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('p { color: red; }');
        shadow.adoptedStyleSheets = [sheet];
        shadow.innerHTML = '<p>Styled content</p>';
      </script>
    `);

    const snapshot = await captureSnapshot(page);
    expect(snapshot.html).toContain('__playwright_style_sheet__');

    const restored = await loadSnapshotInViewer(snapshot);
    const hasStyles = await restored.evaluate(() => {
      const host = document.getElementById('host');
      return host?.shadowRoot?.adoptedStyleSheets?.length > 0;
    });

    expect(hasStyles).toBe(true);
  });
});
```

#### Acceptance Criteria

- ✅ Shadow DOM serialized with `<template shadowrootmode="open">`
- ✅ Adopted stylesheets captured and restored
- ✅ Nested Shadow DOM works (shadow within shadow)
- ✅ Integration tests pass
- ✅ Shadow DOM components render correctly in viewer

#### Files Modified

- ✅ Modify: `session-recorder/src/browser/snapshotCapture.ts`
- ✅ Update: `session-recorder/src/browser/snapshotRestoration.ts`
- ✅ Create: `session-recorder/test/shadowDOM.test.ts`

---

## Phase 2: Resource Management (12 hours) 📦 MEDIUM PRIORITY

**Goal:** Proper resource capture, storage, and serving
**Deliverable:** External CSS, images, and fonts load correctly in snapshots

### Task 2.1: Resource Extraction During Capture (5 hours)

**Priority:** 🟡 MEDIUM
**Files:** `session-recorder/src/browser/snapshotCapture.ts`

#### Implementation Steps

1. **Add resource extraction** (3 hours)

```typescript
// Add to SnapshotData interface:
export interface ResourceOverride {
  url: string;
  content: string; // CSS text or data URL
  contentType: string;
}

export interface SnapshotData {
  // ... existing fields
  resourceOverrides: ResourceOverride[];
}

// Add to createSnapshotCapture():
const staleStyleSheets = new Set<CSSStyleSheet>();

// Track stylesheet changes
function markStyleSheetStale(sheet: CSSStyleSheet) {
  staleStyleSheets.add(sheet);
}

// Extract stylesheet content
function extractStyleSheet(sheet: CSSStyleSheet): string {
  try {
    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
  } catch (e) {
    // CORS or access issues
    return '';
  }
}

// Get stylesheet base URL
function getSheetBase(sheet: CSSStyleSheet): string {
  let rootSheet = sheet;
  while (rootSheet.parentStyleSheet) {
    rootSheet = rootSheet.parentStyleSheet;
  }
  if (rootSheet.ownerNode) {
    return (rootSheet.ownerNode as any).baseURI;
  }
  return document.baseURI;
}

// In captureSnapshot(), after html is built:
const resourceOverrides: ResourceOverride[] = [];

// Extract external stylesheets
for (const sheet of Array.from(document.styleSheets)) {
  if (sheet.href && sheet.href.startsWith('http')) {
    const content = extractStyleSheet(sheet);
    if (content) {
      const url = new URL(sheet.href, document.baseURI).href;
      resourceOverrides.push({
        url,
        content,
        contentType: 'text/css'
      });
    }
  }
}

// Extract images as data URLs (for small images)
const images = document.querySelectorAll('img[src^="http"]');
for (const img of Array.from(images)) {
  const imgEl = img as HTMLImageElement;
  if (imgEl.complete && imgEl.naturalWidth > 0) {
    try {
      // Convert to data URL
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgEl, 0, 0);
        const dataURL = canvas.toDataURL();
        if (dataURL && dataURL.length < 1024 * 100) { // Only <100KB images
          resourceOverrides.push({
            url: imgEl.src,
            content: dataURL,
            contentType: 'image/png'
          });
        }
      }
    } catch (e) {
      // CORS or other issues
      console.warn('Could not capture image:', imgEl.src, e);
    }
  }
}

// Return in snapshot data
return {
  // ... existing fields
  resourceOverrides
};
```

2. **Write tests** (1 hour)

```typescript
describe('Resource Extraction', () => {
  it('extracts external stylesheets', async () => {
    const page = await createTestPage(`
      <link rel="stylesheet" href="https://example.com/style.css">
    `);

    const snapshot = await captureSnapshot(page);
    expect(snapshot.resourceOverrides).toHaveLength(1);
    expect(snapshot.resourceOverrides[0].url).toBe('https://example.com/style.css');
    expect(snapshot.resourceOverrides[0].contentType).toBe('text/css');
  });

  it('extracts images as data URLs', async () => {
    const page = await createTestPage(`
      <img src="https://example.com/small.png" width="10" height="10">
    `);

    const snapshot = await captureSnapshot(page);
    const imgOverride = snapshot.resourceOverrides.find(r => r.contentType.startsWith('image/'));

    expect(imgOverride).toBeDefined();
    expect(imgOverride!.content).toMatch(/^data:image/);
  });
});
```

3. **Update snapshot file format** (1 hour)

Update storage to include resourceOverrides in JSON.

#### Acceptance Criteria

- ✅ External stylesheets extracted and included in resourceOverrides
- ✅ Small images (<100KB) converted to data URLs
- ✅ CORS issues handled gracefully
- ✅ Tests pass
- ✅ No significant performance impact (<200ms total capture time)

#### Files Modified

- ✅ Modify: `session-recorder/src/browser/snapshotCapture.ts`
- ✅ Modify: `session-recorder/src/types.ts` (add ResourceOverride interface)

---

### Task 2.2: SHA1-Based Resource Storage (4 hours)

**Priority:** 🟡 MEDIUM
**Files:** Create `session-recorder/src/storage/resourceStorage.ts`

#### Implementation Steps

1. **Create ResourceStorage class** (3 hours)

```typescript
// session-recorder/src/storage/resourceStorage.ts
import { createHash } from 'crypto';
import type { ResourceOverride } from '../types';

export interface StoredResource {
  sha1: string;
  content: string; // base64 for binary, raw for text
  contentType: string;
  size: number;
  timestamp: number;
}

export class ResourceStorage {
  private resources: Map<string, StoredResource> = new Map();
  private urlToSha1: Map<string, string> = new Map();

  constructor(private sessionId: string) {}

  /**
   * Store a resource and return its SHA1 hash
   */
  async storeResource(
    url: string,
    content: string | Buffer,
    contentType: string
  ): Promise<string> {
    // Calculate SHA1
    const hash = createHash('sha1');
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    hash.update(buffer);
    const sha1 = hash.digest('hex');

    // Add file extension based on content type
    const ext = this.getExtension(contentType);
    const sha1WithExt = `${sha1}.${ext}`;

    // Check if already stored
    if (this.resources.has(sha1WithExt)) {
      this.urlToSha1.set(url, sha1WithExt);
      return sha1WithExt;
    }

    // Store new resource
    const stored: StoredResource = {
      sha1: sha1WithExt,
      content: buffer.toString('base64'),
      contentType,
      size: buffer.length,
      timestamp: Date.now()
    };

    this.resources.set(sha1WithExt, stored);
    this.urlToSha1.set(url, sha1WithExt);

    return sha1WithExt;
  }

  /**
   * Get resource by SHA1 hash
   */
  getResource(sha1: string): StoredResource | null {
    return this.resources.get(sha1) || null;
  }

  /**
   * Get resource by original URL
   */
  getResourceByUrl(url: string): StoredResource | null {
    const sha1 = this.urlToSha1.get(url);
    return sha1 ? this.getResource(sha1) : null;
  }

  /**
   * Check if resource exists
   */
  hasResource(sha1: string): boolean {
    return this.resources.has(sha1);
  }

  /**
   * Get total storage size
   */
  getTotalSize(): number {
    let total = 0;
    for (const resource of this.resources.values()) {
      total += resource.size;
    }
    return total;
  }

  /**
   * Get resource count
   */
  getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Export to JSON
   */
  exportToJSON(): Record<string, StoredResource> {
    const result: Record<string, StoredResource> = {};
    for (const [sha1, resource] of this.resources.entries()) {
      result[sha1] = resource;
    }
    return result;
  }

  /**
   * Import from JSON
   */
  importFromJSON(data: Record<string, StoredResource>): void {
    for (const [sha1, resource] of Object.entries(data)) {
      this.resources.set(sha1, resource);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtension(contentType: string): string {
    const mimeMap: Record<string, string> = {
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'font/woff': 'woff',
      'font/woff2': 'woff2',
      'font/ttf': 'ttf',
    };

    return mimeMap[contentType.toLowerCase()] || 'dat';
  }
}
```

2. **Write tests** (1 hour)

```typescript
describe('ResourceStorage', () => {
  let storage: ResourceStorage;

  beforeEach(() => {
    storage = new ResourceStorage('test-session');
  });

  it('stores and retrieves resources', async () => {
    const content = 'body { color: red; }';
    const sha1 = await storage.storeResource(
      'https://example.com/style.css',
      content,
      'text/css'
    );

    expect(sha1).toMatch(/^[a-f0-9]{40}\.css$/);

    const retrieved = storage.getResource(sha1);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.contentType).toBe('text/css');
    expect(Buffer.from(retrieved!.content, 'base64').toString()).toBe(content);
  });

  it('deduplicates identical resources', async () => {
    const content = 'body { color: red; }';

    const sha1_1 = await storage.storeResource('a.css', content, 'text/css');
    const sha1_2 = await storage.storeResource('b.css', content, 'text/css');

    expect(sha1_1).toBe(sha1_2);
    expect(storage.getResourceCount()).toBe(1);
  });

  it('tracks storage size', async () => {
    const content = 'x'.repeat(1000);
    await storage.storeResource('test.txt', content, 'text/plain');

    expect(storage.getTotalSize()).toBe(1000);
  });

  it('exports and imports JSON', async () => {
    await storage.storeResource('test.css', 'body {}', 'text/css');

    const exported = storage.exportToJSON();
    const newStorage = new ResourceStorage('test-session');
    newStorage.importFromJSON(exported);

    expect(newStorage.getResourceCount()).toBe(1);
  });
});
```

#### Acceptance Criteria

- ✅ ResourceStorage class implemented with SHA1 hashing
- ✅ Deduplication works correctly
- ✅ Import/export to JSON
- ✅ All tests pass
- ✅ Size tracking works

#### Files Modified

- ✅ Create: `session-recorder/src/storage/resourceStorage.ts`
- ✅ Create: `session-recorder/test/resourceStorage.test.ts`

---

### Task 2.3: Resource Serving in Viewer (3 hours)

**Priority:** 🟡 MEDIUM
**Files:** `session-recorder/viewer/src/stores/sessionStore.ts`, `SnapshotViewer.tsx`

#### Implementation Steps

1. **Add resource map to store** (1 hour)

```typescript
// In sessionStore.ts, add:
interface SessionState {
  // ... existing fields
  resourceStorage: Map<string, StoredResource>; // SHA1 -> resource
}

// Add methods:
const loadResourceStorage = (data: Record<string, StoredResource>) => {
  set((state) => {
    const storage = new Map<string, StoredResource>();
    for (const [sha1, resource] of Object.entries(data)) {
      storage.set(sha1, resource);
    }
    return { ...state, resourceStorage: storage };
  });
};

const getResourceBySha1 = (sha1: string): StoredResource | null => {
  return get().resourceStorage.get(sha1) || null;
};
```

2. **Intercept resource requests in iframe** (2 hours)

```typescript
// In SnapshotViewer.tsx, add after writing HTML:

// Intercept resource requests
iframe.onload = () => {
  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) return;

  // Override fetch to serve from storage
  const originalFetch = iframeWindow.fetch;
  iframeWindow.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlString = url.toString();

    // Check if we have this resource in storage
    const override = selectedAction.before.resourceOverrides?.find(r => r.url === urlString);
    if (override) {
      const resource = getResourceBySha1(override.sha1);
      if (resource) {
        const content = Buffer.from(resource.content, 'base64');
        return new Response(content, {
          headers: {
            'Content-Type': resource.contentType
          }
        });
      }
    }

    // Fall back to original fetch
    return originalFetch(url, init);
  };

  setIsLoading(false);
};
```

#### Acceptance Criteria

- ✅ Resources loaded from storage map
- ✅ External CSS renders correctly
- ✅ Images display from storage
- ✅ Fallback to network if resource missing
- ✅ No CORS errors in console

#### Files Modified

- ✅ Modify: `session-recorder/viewer/src/stores/sessionStore.ts`
- ✅ Modify: `session-recorder/viewer/src/components/SnapshotViewer/SnapshotViewer.tsx`

---

## Phase 3: NodeSnapshot Optimization (14 hours) ⚡ LOW PRIORITY

**Goal:** Reduce file sizes through structured snapshots and reference caching
**Deliverable:** 40-60% file size reduction for subsequent snapshots

### Task 3.1: Implement NodeSnapshot Structure (8 hours)

**Priority:** 🟢 LOW (Optimization)
**Files:** `session-recorder/src/browser/snapshotCapture.ts`

This task involves significant refactoring to use Playwright's NodeSnapshot structure instead of string concatenation. Due to complexity, this should only be implemented after Phases 1 and 2 are stable.

**Reference:** See Playwright's [snapshotterInjected.ts:335-579](../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts#L335-L579) for implementation details.

---

## Summary

### Priority Order

1. **Phase 1 (9 hours)** - 🚨 CRITICAL - Fix broken snapshot rendering
   - Task 1.1: Restoration script (4h)
   - Task 1.2: Additional state (3h)
   - Task 1.3: Shadow DOM (2h)

2. **Phase 2 (12 hours)** - 📦 MEDIUM - Resource management
   - Task 2.1: Resource extraction (5h)
   - Task 2.2: SHA1 storage (4h)
   - Task 2.3: Resource serving (3h)

3. **Phase 3 (14 hours)** - ⚡ LOW - Optimization
   - Task 3.1: NodeSnapshot structure (8h)
   - Task 3.2: Reference caching (6h)

### Success Metrics

| Metric | Baseline | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|----------|----------------|----------------|----------------|
| Form fields render correctly | 0% | 95%+ | 95%+ | 95%+ |
| Resource loading works | 20% | 20% | 90%+ | 90%+ |
| File size (5 snapshots) | 750KB | 750KB | 600KB | 300KB |
| Capture time | 50ms | 60ms | 180ms | 40ms |

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-05 | Initial task breakdown | Claude |
