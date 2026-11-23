/**
 * Distribution of the engine events to all connected transports.
 */

import type { EngineEvent, EngineEvents } from '../../shared/transport/engine-api';
import type { EventMessage } from '../../shared/transport/protocol';

/** Event destination, for example a transport */
export type EventSink = (message: EventMessage) => void;

export class EventBus {
    private readonly sinks = new Set<EventSink>();

    /**
     * Adds a destination and returns the function that removes it.
     */
    addSink(sink: EventSink): () => void {
        this.sinks.add(sink);
        return () => {
            this.sinks.delete(sink);
        };
    }

    /**
     * Sends an event to all destinations.
     */
    emit<E extends EngineEvent>(event: E, payload: EngineEvents[E]): void {
        const message: EventMessage = { type: 'event', event, payload };
        for (const sink of this.sinks) {
            sink(message);
        }
    }
}
