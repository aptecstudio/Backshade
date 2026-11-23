/**
 * Selection of DOM elements.
 */

/**
 * Returns the first element matching the selector, or null.
 */
export function query<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
    return root.querySelector<T>(selector);
}

/**
 * Returns all elements matching the selector, as an array.
 */
export function queryAll<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
}
