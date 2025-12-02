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

  function captureSnapshot(): SnapshotData {
    const doctype = document.doctype
      ? `<!DOCTYPE ${document.doctype.name}>`
      : '';

    const html = visitNode(document.documentElement);

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

  function visitNode(node: Node): string {
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
    }

    // Handle Shadow DOM (document fragment)
    if (nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      html += ' shadowrootmode="open"';
    }

    html += '>';

    // Handle Shadow DOM children
    if (nodeType === Node.ELEMENT_NODE && (element as HTMLElement).shadowRoot) {
      html += '<template shadowrootmode="open">';
      const shadowChildren = Array.from((element as HTMLElement).shadowRoot!.childNodes);
      for (const child of shadowChildren) {
        html += visitNode(child);
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
        html += visitNode(child);
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
