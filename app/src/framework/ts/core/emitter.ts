/**
 * Typed event emitter, used by components to notify
 * presses and value changes.
 */

import type { Unsubscribe } from '../dom/events.js';

/** Function that receives an event */
export type Listener<T> = (value: T) => void;

export class Emitter<T> {
    private readonly listeners = new Set<Listener<T>>();

    /**
     * Registers a listener and returns the function that removes it.
     */
    subscribe(listener: Listener<T>): Unsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notifies all registered listeners.
     */
    emit(value: T): void {
        for (const listener of [...this.listeners]) {
            listener(value);
        }
    }

    /**
     * Removes all listeners.
     */
    clear(): void {
        this.listeners.clear();
    }
}
