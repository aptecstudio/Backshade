/**
 * Classe base di tutti i componenti dell'interfaccia.
 * Ogni componente possiede il proprio elemento radice, i componenti figli
 * e le funzioni di pulizia (listener), rilasciati tutti con destroy().
 */

import { on, type Unsubscribe } from '../dom/events.js';

export abstract class Component<E extends HTMLElement = HTMLElement> {
    /** Elemento radice del componente */
    readonly element: E;

    private readonly children: Component[] = [];
    private readonly cleanups: Unsubscribe[] = [];
    private destroyed = false;

    protected constructor(element: E) {
        this.element = element;
    }

    /**
     * Inserisce il componente in un elemento esistente della pagina.
     */
    mount(target: HTMLElement): this {
        target.append(this.element);
        return this;
    }

    /**
     * Aggiunge componenti figli al contenitore del componente.
     */
    append(...children: Component[]): this {
        for (const child of children) {
            this.children.push(child);
            this.contentElement.append(child.element);
        }
        return this;
    }

    /**
     * Registra come figlio un componente il cui elemento è già stato inserito
     * nel DOM dal componente stesso (ad esempio al posto di un altro), così
     * viene distrutto insieme al padre.
     */
    protected adopt(child: Component): void {
        this.children.push(child);
    }

    /**
     * Distrugge il componente: figli, listener ed elemento.
     */
    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        for (const child of this.children) {
            child.destroy();
        }
        for (const cleanup of this.cleanups) {
            cleanup();
        }
        this.children.length = 0;
        this.cleanups.length = 0;
        this.element.remove();
    }

    /**
     * Elemento che riceve i figli; i componenti con una struttura interna
     * possono restituire un elemento diverso dalla radice.
     */
    protected get contentElement(): HTMLElement {
        return this.element;
    }

    /**
     * Registra un listener che viene rimosso automaticamente con destroy().
     */
    protected listen<K extends keyof HTMLElementEventMap>(
        target: HTMLElement | Document | Window,
        type: K,
        listener: (event: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void {
        this.cleanups.push(on(target, type, listener, options));
    }

    /**
     * Registra una funzione di pulizia da eseguire con destroy().
     */
    protected track(cleanup: Unsubscribe): void {
        this.cleanups.push(cleanup);
    }
}
