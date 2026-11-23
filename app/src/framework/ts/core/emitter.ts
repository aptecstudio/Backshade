/**
 * Emettitore di eventi tipizzato, usato dai componenti per notificare
 * pressioni e cambi di valore.
 */

import type { Unsubscribe } from '../dom/events.js';

/** Funzione che riceve un evento */
export type Listener<T> = (value: T) => void;

export class Emitter<T> {
    private readonly listeners = new Set<Listener<T>>();

    /**
     * Registra un listener e restituisce la funzione che lo rimuove.
     */
    subscribe(listener: Listener<T>): Unsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notifica tutti i listener registrati.
     */
    emit(value: T): void {
        for (const listener of [...this.listeners]) {
            listener(value);
        }
    }

    /**
     * Rimuove tutti i listener.
     */
    clear(): void {
        this.listeners.clear();
    }
}
