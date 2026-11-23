/**
 * Gestione degli eventi del DOM. Ogni registrazione restituisce la
 * funzione che la rimuove, così i componenti possono ripulire i listener.
 */

/** Funzione che rimuove un listener */
export type Unsubscribe = () => void;

/**
 * Registra un listener su un elemento.
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
 * Registra un listener delegato: scatta per gli elementi discendenti di root
 * che corrispondono al selettore, anche se aggiunti in seguito.
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
