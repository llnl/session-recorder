/**
 * Element Context Extraction - FR-1
 *
 * Extracts human-readable descriptions from HTML snapshots using DOM parsing.
 * Locates elements marked with `data-recorded-el="true"` and builds context
 * by walking up the ancestor tree.
 */
/**
 * Element context information extracted from DOM
 */
export interface ElementContext {
    /** The element description (e.g., "'Submit' button") */
    element: string;
    /** Array of ancestor contexts from innermost to outermost */
    ancestors: string[];
    /** Full description combining element and ancestors */
    fullDescription: string;
    /** The tag name of the element */
    tagName: string;
    /** Whether the element was found */
    found: boolean;
}
/**
 * Find the recorded element in HTML and extract its context
 */
export declare function findRecordedElement(html: string): ElementContext;
/**
 * Extract element context from HTML snapshot file content
 * This is the main entry point for FR-1
 *
 * @param htmlContent - The HTML content to parse
 * @returns ElementContext with human-readable description
 */
export declare function extractElementContext(htmlContent: string): ElementContext;
/**
 * Format element context for markdown output
 *
 * @param context - The element context
 * @returns Formatted string for markdown
 */
export declare function formatElementContext(context: ElementContext): string;
//# sourceMappingURL=elementContext.d.ts.map