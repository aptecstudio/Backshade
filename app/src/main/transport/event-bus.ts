/**
 * Distribuzione degli eventi del motore a tutti i trasporti collegati.
 */

import type { EngineEvent, EngineEvents } from '../../shared/transport/engine-api';
import type { EventMessage } from '../../shared/transport/protocol';

/** Destinazione degli eventi, ad esempio un trasporto */
export type EventSink = (message: EventMessage) => void;

export class EventBus {
    private readonly sinks = new Set<EventSink>();

    /**
     * Aggiunge una destinazione e restituisce la funzione che la rimuove.
     */
    addSink(sink: EventSink): () => void {
        this.sinks.add(sink);
        return () => {
            this.sinks.delete(sink);
        };
    }

    /**
     * Invia un evento a tutte le destinazioni.
     */
    emit<E extends EngineEvent>(event: E, payload: EngineEvents[E]): void {
        const message: EventMessage = { type: 'event', event, payload };
        for (const sink of this.sinks) {
            sink(message);
        }
    }
}
