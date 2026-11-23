/**
 * Creazione degli elementi del DOM.
 */

/** Opzioni per la creazione di un elemento */
export interface CreateOptions {
    /** Classi CSS da applicare */
    classes?: string[];
    /** Attributi da impostare */
    attributes?: Record<string, string>;
    /** Testo contenuto, inserito come testo e mai come HTML */
    text?: string;
    /** Figli da aggiungere in ordine */
    children?: Node[];
}

/**
 * Crea un elemento con classi, attributi, testo e figli.
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
