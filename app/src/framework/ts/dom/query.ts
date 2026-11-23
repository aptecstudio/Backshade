/**
 * Selezione degli elementi del DOM.
 */

/**
 * Restituisce il primo elemento che corrisponde al selettore, o null.
 */
export function query<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
    return root.querySelector<T>(selector);
}

/**
 * Restituisce tutti gli elementi che corrispondono al selettore, come array.
 */
export function queryAll<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
}
