/**
 * Browser-side snapshot capture - Simplified from Playwright's snapshotterInjected.ts
 * Captures interactive HTML snapshots with form state, Shadow DOM, and scroll positions
 */

export interface SnapshotData {
  doctype?: string;
  html: string;
  viewport: { width: number; height: number };
  url: string;
  timestamp: string; // ISO 8601 UTC
}

export function createSnapshotCapture() {
  // Special attributes for preserving state (from Playwright)
  const kValueAttribute = '__playwright_value_';
  const kCheckedAttribute = '__playwright_checked_';
  const kSelectedAttribute = '__playwright_selected_';
  const kScrollTopAttribute = '__playwright_scroll_top_';
  const kScrollLeftAttribute = '__playwright_scroll_left_';
  const kCurrentSrcAttribute = '__playwright_current_src__';
  const kBoundingRectAttribute = '__playwright_bounding_rect__';
  const kPopoverOpenAttribute = '__playwright_popover_open_';
  const kDialogOpenAttribute = '__playwright_dialog_open_';
  const kStyleSheetAttribute = '__playwright_style_sheet__';

  function captureSnapshot(): SnapshotData {
    const doctype = document.doctype
      ? `<!DOCTYPE ${document.doctype.name}>`
      : '';

    // Track defined custom elements
    const definedCustomElements = new Set<string>();

    let html = visitNode(document.documentElement, definedCustomElements);

    // Inject custom elements list into body tag if any were found
    if (definedCustomElements.size > 0) {
      const elementsList = Array.from(definedCustomElements).join(',');
      const attr = `__playwright_custom_elements__="${elementsList}"`;
      html = html.replace(
        /<body([^>]*)>/i,
        `<body$1 ${attr}>`
      );
    }

    return {
      doctype,
      html,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: location.href,
      timestamp: new Date().toISOString()
    };
  }

  function visitNode(node: Node, definedCustomElements?: Set<string>): string {
    const nodeType = node.nodeType;

    // Handle text nodes
    if (nodeType === Node.TEXT_NODE) {
      return escapeText(node.nodeValue || '');
    }

    // Only process element nodes and document fragments (shadow roots)
    if (nodeType !== Node.ELEMENT_NODE && nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return '';
    }

    const element = node as Element;
    const tagName = nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? 'template'
      : element.tagName.toLowerCase();

    // Track custom elements (elements with hyphens in name that are defined)
    if (nodeType === Node.ELEMENT_NODE && definedCustomElements) {
      const localName = element.localName;
      if (localName.includes('-') && window.customElements?.get(localName)) {
        definedCustomElements.add(localName);
      }
    }

    // Skip script tags
    if (tagName === 'script') return '';

    // Skip noscript tags
    if (tagName === 'noscript') return '';

    // Skip CSP meta tags
    if (tagName === 'meta' && (element as HTMLMetaElement).httpEquiv?.toLowerCase() === 'content-security-policy') {
      return '';
    }

    // Build opening tag
    let html = `<${tagName}`;

    // Add existing attributes
    if (nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        html += ` ${attr.name}="${escapeAttr(attr.value)}"`;
      }
    }

    // Add special state attributes for form elements
    if (nodeType === Node.ELEMENT_NODE) {
      // Form value state (INPUT, TEXTAREA)
      if (tagName === 'input' || tagName === 'textarea') {
        const value = (element as HTMLInputElement | HTMLTextAreaElement).value;
        html += ` ${kValueAttribute}="${escapeAttr(value)}"`;
      }

      // Checkbox/radio checked state
      if (tagName === 'input' && ['checkbox', 'radio'].includes((element as HTMLInputElement).type)) {
        const checked = (element as HTMLInputElement).checked ? 'true' : 'false';
        html += ` ${kCheckedAttribute}="${checked}"`;
      }

      // Select option selected state
      if (tagName === 'option') {
        const selected = (element as HTMLOptionElement).selected ? 'true' : 'false';
        html += ` ${kSelectedAttribute}="${selected}"`;
      }

      // Scroll position
      if (element.scrollTop > 0) {
        html += ` ${kScrollTopAttribute}="${element.scrollTop}"`;
      }
      if (element.scrollLeft > 0) {
        html += ` ${kScrollLeftAttribute}="${element.scrollLeft}"`;
      }

      // Image current src
      if (tagName === 'img' && (element as HTMLImageElement).currentSrc) {
        html += ` ${kCurrentSrcAttribute}="${escapeAttr((element as HTMLImageElement).currentSrc)}"`;
      }

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
        html += ` ${kBoundingRectAttribute}="${escapeAttr(JSON.stringify(boundingRect))}"`;
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
        html += ` ${kBoundingRectAttribute}="${escapeAttr(JSON.stringify(boundingRect))}"`;
      }

      // Popover state (HTML Popover API)
      if ((element as HTMLElement).popover) {
        const isOpen = (element as HTMLElement).matches &&
                       (element as HTMLElement).matches(':popover-open');
        if (isOpen) {
          html += ` ${kPopoverOpenAttribute}="true"`;
        }
      }

      // Dialog state
      if (tagName === 'dialog') {
        const dialog = element as HTMLDialogElement;
        if (dialog.open) {
          const isModal = dialog.matches && dialog.matches(':modal');
          const mode = isModal ? 'modal' : 'true';
          html += ` ${kDialogOpenAttribute}="${mode}"`;
        }
      }
    }

    // Handle Shadow DOM (document fragment)
    if (nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      html += ' shadowrootmode="open"';
    }

    html += '>';

    // Handle Shadow DOM children
    if (nodeType === Node.ELEMENT_NODE && (element as HTMLElement).shadowRoot) {
      const shadowRoot = (element as HTMLElement).shadowRoot!;
      html += '<template shadowrootmode="open">';

      // Include adopted stylesheets if present
      if ('adoptedStyleSheets' in shadowRoot && (shadowRoot as any).adoptedStyleSheets?.length > 0) {
        const sheets = (shadowRoot as any).adoptedStyleSheets as CSSStyleSheet[];
        for (const sheet of sheets) {
          try {
            const cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            html += `<template ${kStyleSheetAttribute}="${escapeAttr(cssText)}"></template>`;
          } catch (e) {
            // CORS or other access issues
            console.warn('Could not access adopted stylesheet:', e);
          }
        }
      }

      const shadowChildren = Array.from(shadowRoot.childNodes);
      for (const child of shadowChildren) {
        html += visitNode(child, definedCustomElements);
      }
      html += '</template>';
    }

    // Handle STYLE element - capture stylesheet content
    if (tagName === 'style') {
      const sheet = (element as HTMLStyleElement).sheet;
      let cssText = '';
      if (sheet) {
        try {
          cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch (e) {
          // CORS issues with external stylesheets
          cssText = element.textContent || '';
        }
      } else {
        cssText = element.textContent || '';
      }
      html += escapeText(cssText);
    } else {
      // Handle regular children
      const children = Array.from(node.childNodes);
      for (const child of children) {
        html += visitNode(child, definedCustomElements);
      }
    }

    // Closing tag (skip for void elements)
    const voidElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    if (!voidElements.includes(tagName)) {
      html += `</${tagName}>`;
    }

    return html;
  }

  function escapeText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { captureSnapshot };
}
