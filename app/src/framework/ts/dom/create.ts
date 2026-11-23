/**
 * Creation of DOM elements.
 */

/** Options for creating an element */
export interface CreateOptions {
    /** CSS classes to apply */
    classes?: string[];
    /** Attributes to set */
    attributes?: Record<string, string>;
    /** Text content, always inserted as text and never as HTML */
    text?: string;
    /** Children to append in order */
    children?: Node[];
}

/**
 * Creates an element with classes, attributes, text and children.
 */
export function create<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: CreateOptions = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (options.classes !== undefined) {
        element.classList.add(...options.classes);
    }
    if (options.attributes !== undefined) {
        for (const [name, value] of Object.entries(options.attributes)) {
            element.setAttribute(name, value);
        }
    }
    if (options.text !== undefined) {
        element.textContent = options.text;
    }
    if (options.children !== undefined) {
        element.append(...options.children);
    }

    return element;
}
