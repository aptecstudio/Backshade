/**
 * Base class of all interface components.
 * Each component owns its root element, its child components
 * and its cleanup functions (listeners), all released by destroy().
 */

import { on, type Unsubscribe } from '../dom/events.js';

export abstract class Component<E extends HTMLElement = HTMLElement> {
    /** Root element of the component */
    readonly element: E;

    private readonly children: Component[] = [];
    private readonly cleanups: Unsubscribe[] = [];
    private destroyed = false;

    protected constructor(element: E) {
        this.element = element;
    }

    /**
     * Inserts the component into an existing element of the page.
     */
    mount(target: HTMLElement): this {
        target.append(this.element);
        return this;
    }

    /**
     * Adds child components to the container of the component.
     */
    append(...children: Component[]): this {
        for (const child of children) {
            this.children.push(child);
            this.contentElement.append(child.element);
        }
        return this;
    }

    /**
     * Registers as a child a component whose element has already been inserted
     * in the DOM by the component itself (for example in place of another one), so
     * it is destroyed together with its parent.
     */
    protected adopt(child: Component): void {
        this.children.push(child);
    }

    /**
     * Destroys the component: children, listeners and element.
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
     * Element that receives the children; components with an inner structure
     * can return an element other than the root.
     */
    protected get contentElement(): HTMLElement {
        return this.element;
    }

    /**
     * Registers a listener that is removed automatically by destroy().
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
     * Registers a cleanup function to run on destroy().
     */
    protected track(cleanup: Unsubscribe): void {
        this.cleanups.push(cleanup);
    }
}
