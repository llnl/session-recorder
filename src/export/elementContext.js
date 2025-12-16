"use strict";
/**
 * Element Context Extraction - FR-1
 *
 * Extracts human-readable descriptions from HTML snapshots using DOM parsing.
 * Locates elements marked with `data-recorded-el="true"` and builds context
 * by walking up the ancestor tree.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRecordedElement = findRecordedElement;
exports.extractElementContext = extractElementContext;
exports.formatElementContext = formatElementContext;
const cheerio = __importStar(require("cheerio"));
/**
 * Ancestor detection rules for extracting context
 * These are evaluated in order from innermost to outermost
 */
const ANCESTOR_RULES = [
    // Table: "in 'Name' column, row X of 'Users' table"
    {
        selector: 'table',
        extract: (el, $) => {
            const tableCaption = el.find('caption').first().text().trim();
            const tableId = el.attr('id') || el.attr('aria-label') || '';
            const tableName = tableCaption || tableId || 'table';
            return tableName ? `'${tableName}' table` : 'table';
        }
    },
    // Form: "in login form" / "in search form"
    {
        selector: 'form',
        extract: (el, $) => {
            const formName = el.attr('name') || el.attr('id') || el.attr('aria-label') || '';
            const formRole = el.attr('role') || '';
            if (formName)
                return `${formName} form`;
            if (formRole === 'search')
                return 'search form';
            return 'form';
        }
    },
    // Dialog/Modal: "in 'Settings' modal"
    {
        selector: 'dialog, [role="dialog"], [role="alertdialog"]',
        extract: (el, $) => {
            const title = el.find('[role="heading"], h1, h2, h3, .modal-title, .dialog-title').first().text().trim();
            const ariaLabel = el.attr('aria-label') || el.attr('aria-labelledby') || '';
            const name = title || ariaLabel;
            return name ? `'${name}' modal` : 'modal';
        }
    },
    // Navigation: "in main navigation" / "in sidebar navigation"
    {
        selector: 'nav, [role="navigation"]',
        extract: (el, $) => {
            const ariaLabel = el.attr('aria-label') || '';
            if (ariaLabel.toLowerCase().includes('main'))
                return 'main navigation';
            if (ariaLabel.toLowerCase().includes('sidebar'))
                return 'sidebar navigation';
            if (ariaLabel)
                return `${ariaLabel} navigation`;
            return 'navigation';
        }
    },
    // List: "item X in task list"
    {
        selector: 'ul, ol, [role="list"]',
        extract: (el, $) => {
            const listName = el.attr('aria-label') || el.attr('id') || '';
            return listName ? `${listName} list` : 'list';
        }
    },
    // Section/Article: "in 'Account' section"
    {
        selector: 'section, article',
        extract: (el, $) => {
            const heading = el.find('h1, h2, h3, h4, h5, h6, [role="heading"]').first().text().trim();
            const ariaLabel = el.attr('aria-label') || '';
            const name = heading || ariaLabel;
            const type = el.prop('tagName')?.toLowerCase() === 'article' ? 'article' : 'section';
            return name ? `'${name}' ${type}` : type;
        }
    },
    // Header: "in page header"
    {
        selector: 'header, [role="banner"]',
        extract: () => 'page header'
    },
    // Footer: "in page footer"
    {
        selector: 'footer, [role="contentinfo"]',
        extract: () => 'page footer'
    },
    // Aside/Sidebar: "in sidebar"
    {
        selector: 'aside, [role="complementary"]',
        extract: (el, $) => {
            const ariaLabel = el.attr('aria-label') || '';
            return ariaLabel ? `${ariaLabel} sidebar` : 'sidebar';
        }
    },
    // Main content: "in main content"
    {
        selector: 'main, [role="main"]',
        extract: () => 'main content'
    },
    // Menu: "in dropdown menu"
    {
        selector: '[role="menu"], [role="menubar"]',
        extract: (el, $) => {
            const ariaLabel = el.attr('aria-label') || '';
            return ariaLabel ? `'${ariaLabel}' menu` : 'dropdown menu';
        }
    },
    // Tab panel: "in 'Settings' tab"
    {
        selector: '[role="tabpanel"]',
        extract: (el, $) => {
            const ariaLabel = el.attr('aria-label') || '';
            const labelledBy = el.attr('aria-labelledby');
            if (ariaLabel)
                return `'${ariaLabel}' tab`;
            if (labelledBy) {
                const tab = $(`#${labelledBy}`);
                const tabText = tab.text().trim();
                if (tabText)
                    return `'${tabText}' tab`;
            }
            return 'tab panel';
        }
    },
    // Toolbar: "in toolbar"
    {
        selector: '[role="toolbar"]',
        extract: (el, $) => {
            const ariaLabel = el.attr('aria-label') || '';
            return ariaLabel ? `'${ariaLabel}' toolbar` : 'toolbar';
        }
    }
];
/**
 * Get element description based on element type (FR-1.2)
 */
function getElementDescription(el, $) {
    const tagName = el.prop('tagName')?.toLowerCase() || 'element';
    const type = el.attr('type')?.toLowerCase() || '';
    const role = el.attr('role')?.toLowerCase() || '';
    // Get text content (for labels)
    const text = el.text().trim().slice(0, 50);
    const ariaLabel = el.attr('aria-label') || '';
    const placeholder = el.attr('placeholder') || '';
    const title = el.attr('title') || '';
    const value = el.attr('value') || '';
    // Get display name (prefer short, meaningful text)
    const displayName = ariaLabel || text || placeholder || title || value;
    const shortName = displayName.slice(0, 30);
    // Button
    if (tagName === 'button' || type === 'button' || type === 'submit' || type === 'reset' || role === 'button') {
        return shortName ? `'${shortName}' button` : 'button';
    }
    // Link
    if (tagName === 'a' || role === 'link') {
        return shortName ? `'${shortName}' link` : 'link';
    }
    // Input types
    if (tagName === 'input') {
        switch (type) {
            case 'email': return 'email input';
            case 'password': return 'password input';
            case 'search': return 'search input';
            case 'tel': return 'phone input';
            case 'url': return 'URL input';
            case 'number': return 'number input';
            case 'date': return 'date input';
            case 'time': return 'time input';
            case 'checkbox':
                return shortName ? `'${shortName}' checkbox` : 'checkbox';
            case 'radio':
                return shortName ? `'${shortName}' radio button` : 'radio button';
            case 'file': return 'file upload';
            case 'range': return 'slider';
            case 'color': return 'color picker';
            default:
                return shortName ? `'${shortName}' input` : 'text input';
        }
    }
    // Textarea
    if (tagName === 'textarea') {
        return shortName ? `'${shortName}' text area` : 'text area';
    }
    // Select/dropdown
    if (tagName === 'select' || role === 'combobox' || role === 'listbox') {
        return shortName ? `'${shortName}' dropdown` : 'dropdown';
    }
    // Images and icons
    if (tagName === 'img') {
        const alt = el.attr('alt') || '';
        return alt ? `'${alt}' image` : 'image';
    }
    if (tagName === 'svg' || el.find('svg').length > 0) {
        return 'icon';
    }
    // Generic elements with text
    if (shortName) {
        return `'${shortName}' ${tagName}`;
    }
    return tagName;
}
/**
 * Get table context for an element (column header, row number)
 */
function getTableContext(el, $) {
    // Find the closest td/th
    const cell = el.closest('td, th');
    if (cell.length === 0)
        return null;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (table.length === 0)
        return null;
    // Get row number
    const rowIndex = row.index() + 1;
    // Get column header
    const cellIndex = cell.index();
    const headerRow = table.find('thead tr').first();
    const headerCell = headerRow.find('th, td').eq(cellIndex);
    const columnHeader = headerCell.text().trim();
    // Get table name
    const tableCaption = table.find('caption').first().text().trim();
    const tableAriaLabel = table.attr('aria-label') || '';
    const tableId = table.attr('id') || '';
    const tableName = tableCaption || tableAriaLabel || tableId || '';
    let context = '';
    if (columnHeader) {
        context = `in '${columnHeader}' column`;
    }
    if (rowIndex > 0) {
        context += context ? `, row ${rowIndex}` : `row ${rowIndex}`;
    }
    if (tableName) {
        context += ` of '${tableName}' table`;
    }
    else {
        context += ' of table';
    }
    return context || null;
}
/**
 * Get list item context
 */
function getListItemContext(el, $) {
    const listItem = el.closest('li, [role="listitem"]');
    if (listItem.length === 0)
        return null;
    const list = listItem.closest('ul, ol, [role="list"]');
    if (list.length === 0)
        return null;
    const itemIndex = listItem.index() + 1;
    const listName = list.attr('aria-label') || list.attr('id') || '';
    if (listName) {
        return `item ${itemIndex} in ${listName}`;
    }
    return `item ${itemIndex}`;
}
/**
 * Walk up the ancestor tree collecting context (FR-1.1)
 */
function walkAncestors(el, $, maxDepth = 10) {
    const ancestors = [];
    let current = el.parent();
    let depth = 0;
    // First, check for special contexts (table, list)
    const tableContext = getTableContext(el, $);
    if (tableContext) {
        ancestors.push(tableContext);
    }
    const listContext = getListItemContext(el, $);
    if (listContext && !tableContext) {
        ancestors.push(listContext);
    }
    while (current.length > 0 && depth < maxDepth) {
        // Check each ancestor rule
        for (const rule of ANCESTOR_RULES) {
            if (current.is(rule.selector)) {
                const context = rule.extract(current, $);
                if (context && !ancestors.includes(context)) {
                    ancestors.push(`in ${context}`);
                }
                break; // Only one rule per ancestor
            }
        }
        current = current.parent();
        depth++;
    }
    return ancestors;
}
/**
 * Find the recorded element in HTML and extract its context
 */
function findRecordedElement(html) {
    const $ = cheerio.load(html);
    // Find element with data-recorded-el="true"
    const recordedEl = $('[data-recorded-el="true"]').first();
    if (recordedEl.length === 0) {
        return {
            element: 'element',
            ancestors: [],
            fullDescription: 'element',
            tagName: 'unknown',
            found: false
        };
    }
    const tagName = recordedEl.prop('tagName')?.toLowerCase() || 'element';
    const elementDesc = getElementDescription(recordedEl, $);
    const ancestors = walkAncestors(recordedEl, $);
    // Build full description: element in ancestor1 in ancestor2...
    let fullDescription = elementDesc;
    if (ancestors.length > 0) {
        fullDescription = `${elementDesc} ${ancestors.join(' ')}`;
    }
    return {
        element: elementDesc,
        ancestors,
        fullDescription,
        tagName,
        found: true
    };
}
/**
 * Extract element context from HTML snapshot file content
 * This is the main entry point for FR-1
 *
 * @param htmlContent - The HTML content to parse
 * @returns ElementContext with human-readable description
 */
function extractElementContext(htmlContent) {
    return findRecordedElement(htmlContent);
}
/**
 * Format element context for markdown output
 *
 * @param context - The element context
 * @returns Formatted string for markdown
 */
function formatElementContext(context) {
    if (!context.found) {
        return 'element';
    }
    return context.fullDescription;
}
//# sourceMappingURL=elementContext.js.map