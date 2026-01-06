/**
 * Browser-side snapshot capture - Simplified from Playwright's snapshotterInjected.ts
 * Captures interactive HTML snapshots with form state, Shadow DOM, and scroll positions
 */

export interface ResourceOverride {
  url: string;
  content: string; // CSS text or data URL
  contentType: string;
  size: number;
}

export interface SnapshotData {
  doctype?: string;
  html: string;
  viewport: { width: number; height: number };
  url: string;
  timestamp: string; // ISO 8601 UTC
  resourceOverrides: ResourceOverride[];
  fontUrls?: string[]; // Font URLs found in CSS (for verification/debugging)
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

    // Extract external resources for offline viewing
    const resourceOverrides = extractResources();

    return {
      doctype,
      html,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: location.href,
      timestamp: new Date().toISOString(),
      resourceOverrides
    };
  }

  /**
   * Extract font URLs from CSS content
   * Returns array of absolute font URLs found in @font-face declarations
   */
  function extractFontUrlsFromCSS(cssContent: string, baseUrl: string): string[] {
    const fontUrls: string[] = [];
    // Match url() in CSS, handling various quote styles
    const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    // Font file extensions
    const fontExtensions = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i;

    let match;
    while ((match = urlPattern.exec(cssContent)) !== null) {
      const url = match[2].trim();

      // Skip data URLs
      if (url.startsWith('data:')) continue;

      // Check if it's a font file
      if (fontExtensions.test(url)) {
        try {
          const absoluteUrl = new URL(url, baseUrl).href;
          fontUrls.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    return fontUrls;
  }

  /**
   * Extract external resources (stylesheets, images, fonts) for offline viewing
   * Based on Playwright's resource extraction approach
   */
  function extractResources(): ResourceOverride[] {
    const resources: ResourceOverride[] = [];
    const processedUrls = new Set<string>();
    const fontUrls: string[] = [];

    // 1. Extract external stylesheets and collect font URLs
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        // Only process external stylesheets (with href)
        if (sheet.href && sheet.href.startsWith('http')) {
          const url = new URL(sheet.href, document.baseURI).href;

          // Skip if already processed
          if (processedUrls.has(url)) continue;
          processedUrls.add(url);

          try {
            // Extract CSS rules
            const cssRules = Array.from(sheet.cssRules || []);
            const content = cssRules.map(rule => rule.cssText).join('\n');

            if (content) {
              resources.push({
                url,
                content,
                contentType: 'text/css',
                size: content.length
              });

              // Extract font URLs from this stylesheet
              const fonts = extractFontUrlsFromCSS(content, url);
              fontUrls.push(...fonts);
            }
          } catch (e) {
            // CORS or access issues - stylesheet will fall back to network
            console.warn(`[Snapshot] Could not capture stylesheet: ${url}`, e);
          }
        }
      }
    } catch (e) {
      console.warn('[Snapshot] Error extracting stylesheets:', e);
    }

    // 2. Extract font URLs from inline <style> tags
    try {
      const styleTags = document.querySelectorAll('style');
      for (const styleTag of Array.from(styleTags)) {
        const cssContent = styleTag.textContent || '';
        if (cssContent) {
          const fonts = extractFontUrlsFromCSS(cssContent, document.baseURI);
          fontUrls.push(...fonts);
        }
      }
    } catch (e) {
      console.warn('[Snapshot] Error extracting fonts from inline styles:', e);
    }

    // 3. Extract small images (<100KB) as data URLs
    try {
      const images = document.querySelectorAll('img[src^="http"]');
      for (const img of Array.from(images)) {
        const imgEl = img as HTMLImageElement;
        const url = imgEl.src;

        // Skip if already processed
        if (processedUrls.has(url)) continue;

        // Only process loaded images
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          try {
            // Convert to data URL using canvas
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(imgEl, 0, 0);
              const dataURL = canvas.toDataURL('image/png');

              // Only include images smaller than 100KB
              if (dataURL && dataURL.length < 1024 * 100) {
                processedUrls.add(url);
                resources.push({
                  url,
                  content: dataURL,
                  contentType: 'image/png',
                  size: dataURL.length
                });
              }
            }
          } catch (e) {
            // CORS, tainted canvas, or other issues - image will fall back to network
            console.warn(`[Snapshot] Could not capture image: ${url}`, e);
          }
        }
      }
    } catch (e) {
      console.warn('[Snapshot] Error extracting images:', e);
    }

    // Log font URLs found (for debugging)
    if (fontUrls.length > 0) {
      console.log(`[Snapshot] Found ${fontUrls.length} font URLs in CSS`);
    }

    // Return resources with font URLs as metadata
    (resources as any).__fontUrls = [...new Set(fontUrls)]; // Deduplicated
    return resources;
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
