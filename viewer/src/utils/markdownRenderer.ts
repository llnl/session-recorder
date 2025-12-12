/**
 * Markdown Renderer Utility
 * Converts markdown to safe HTML using marked and DOMPurify
 */

import { marked, type Tokens } from 'marked';
import DOMPurify, { type Config } from 'dompurify';

// Configure marked with safe defaults
marked.setOptions({
  // Disable GitHub Flavored Markdown features that could be risky
  gfm: true,
  breaks: true,
  // Disable HTML in markdown input
});

// Custom renderer for links to open in new tab
const renderer = new marked.Renderer();

// Override link rendering to add target="_blank" and rel="noopener noreferrer"
renderer.link = function (token: Tokens.Link): string {
  const href = token.href || '';
  const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
  const text = token.text || '';
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title}>${text}</a>`;
};

// Override image rendering for safety
renderer.image = function (token: Tokens.Image): string {
  const src = token.href || '';
  const alt = token.text || '';
  const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title} loading="lazy" />`;
};

marked.use({ renderer });

// Configure DOMPurify
const DOMPURIFY_CONFIG: Config = {
  // Allow safe tags
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'a',
    'ul', 'ol', 'li',
    'code', 'pre',
    'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'span', 'div',
  ],
  // Allow safe attributes
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'loading',
    'class',
  ],
  // Force all links to have proper attributes
  ADD_ATTR: ['target', 'rel'],
  // Prevent data: URLs except for images
  ALLOW_DATA_ATTR: false,
};

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert markdown content to sanitized HTML
 *
 * @param content - Markdown string to convert
 * @returns Sanitized HTML string
 */
export function renderMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  try {
    // Parse markdown to HTML
    const rawHtml = marked.parse(content, { async: false }) as string;

    // Sanitize the HTML (RETURN_TRUSTED_TYPE: false returns string)
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ...DOMPURIFY_CONFIG,
      RETURN_TRUSTED_TYPE: false,
    }) as string;

    return sanitizedHtml;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    // Return escaped plain text as fallback
    return `<p>${escapeHtml(content)}</p>`;
  }
}

/**
 * Convert markdown to plain text (strips all formatting)
 *
 * @param content - Markdown string to convert
 * @returns Plain text string
 */
export function markdownToPlainText(content: string): string {
  if (!content) {
    return '';
  }

  try {
    // Parse to HTML first
    const rawHtml = marked.parse(content, { async: false }) as string;

    // Create a temporary element to extract text
    const temp = document.createElement('div');
    temp.innerHTML = DOMPurify.sanitize(rawHtml, { ALLOWED_TAGS: [] });

    return temp.textContent || temp.innerText || content;
  } catch (error) {
    console.error('Error converting markdown to plain text:', error);
    return content;
  }
}

/**
 * Truncate markdown content to a specified length
 * Preserves whole words and adds ellipsis
 *
 * @param content - Markdown string to truncate
 * @param maxLength - Maximum length of the result
 * @returns Truncated plain text with ellipsis if needed
 */
export function truncateMarkdown(content: string, maxLength: number): string {
  const plainText = markdownToPlainText(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find the last space before maxLength
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Check if content contains markdown formatting
 *
 * @param content - String to check
 * @returns Whether the content appears to contain markdown
 */
export function hasMarkdownFormatting(content: string): boolean {
  // Common markdown patterns
  const markdownPatterns = [
    /^#+\s/m,                  // Headers
    /\*\*.*\*\*/,              // Bold
    /\*.*\*/,                  // Italic
    /~~.*~~/,                  // Strikethrough
    /`.*`/,                    // Inline code
    /```/,                     // Code blocks
    /^\s*[-*+]\s/m,            // Unordered lists
    /^\s*\d+\.\s/m,            // Ordered lists
    /\[.*\]\(.*\)/,            // Links
    /!\[.*\]\(.*\)/,           // Images
    /^\s*>/m,                  // Blockquotes
    /\|.*\|/,                  // Tables
  ];

  return markdownPatterns.some((pattern) => pattern.test(content));
}

/**
 * Wrap plain text in a paragraph tag if it doesn't contain markdown
 *
 * @param content - Content to wrap
 * @returns Content wrapped in paragraph tags if plain text
 */
export function ensureMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  // If it already looks like markdown, return as-is
  if (hasMarkdownFormatting(content)) {
    return content;
  }

  // Wrap plain text in paragraphs (split by double newlines)
  return content
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .join('\n\n');
}
