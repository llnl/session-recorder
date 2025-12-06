/**
 * Snapshot Restoration Script
 *
 * Generates a self-executing restoration script that runs in the snapshot iframe.
 * Based on Playwright's snapshotRenderer.ts restoration logic.
 *
 * This script restores:
 * - Input/textarea values from __playwright_value_ attributes
 * - Checkbox/radio checked state from __playwright_checked_ attributes
 * - Select option selected state from __playwright_selected_ attributes
 * - Scroll positions from __playwright_scroll_top_/_left_ attributes
 * - Popover open state from __playwright_popover_open_ attributes
 * - Dialog open state from __playwright_dialog_open_ attributes
 * - Shadow DOM from <template shadowrootmode> elements
 * - Adopted stylesheets from __playwright_style_sheet__ templates
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

/**
 * Generates the restoration script that will be injected into snapshot HTML.
 * Returns a self-executing function as a string.
 */
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

      // 7. Restore adopted stylesheets (for Shadow DOM)
      if (config.restoreShadowDOM && 'adoptedStyleSheets' in root) {
        const adoptedSheets = [];
        const sheetTemplates = root.querySelectorAll('template[__playwright_style_sheet__]');
        log('Restoring', sheetTemplates.length, 'adopted stylesheets');

        for (let i = 0; i < sheetTemplates.length; i++) {
          const template = sheetTemplates[i];
          const cssText = template.getAttribute('__playwright_style_sheet__');

          if (cssText && 'CSSStyleSheet' in window) {
            try {
              const sheet = new CSSStyleSheet();
              sheet.replaceSync(cssText);
              adoptedSheets.push(sheet);
              template.remove();
              log('Restored adopted stylesheet');
            } catch (e) {
              log('Failed to restore adopted stylesheet:', e.message);
            }
          }
        }

        if (adoptedSheets.length > 0) {
          try {
            root.adoptedStyleSheets = adoptedSheets;
          } catch (e) {
            log('Failed to assign adopted stylesheets:', e.message);
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

/**
 * Generates a minified version of the restoration script for production use.
 * Basic minification by removing extra whitespace.
 */
export function generateRestorationScriptMinified(): string {
  const fullScript = generateRestorationScript({ verbose: false });
  // Basic minification: collapse whitespace
  return fullScript
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:])\s*/g, '$1')
    .trim();
}
