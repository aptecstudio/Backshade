/**
 * DOM event handling. Every registration returns the function
 * that removes it, so components can clean up their listeners.
 */

/** Function that removes a listener */
export type Unsubscribe = () => void;

/**
 * Registers a listener on an element.
 */
export function on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Document | Window,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
): Unsubscribe {
    const handler = listener as EventListener;
    target.addEventListener(type, handler, options);
    return () => target.removeEventListener(type, handler, options);
}

/**
 * Registers a delegated listener: it fires for the descendants of root
 * that match the selector, even when added later.
 */
export function delegate<K extends keyof HTMLElementEventMap>(
    root: HTMLElement | Document,
    type: K,
    selector: string,
    listener: (event: HTMLElementEventMap[K], match: HTMLElement) => void
): Unsubscribe {
    return on(root, type, (event) => {
        const origin = event.target;
        if (!(origin instanceof Element)) {
            return;
        }
        const match = origin.closest<HTMLElement>(selector);
        if (match !== null && (root === document || (root as HTMLElement).contains(match))) {
            listener(event, match);
        }
    });
}
