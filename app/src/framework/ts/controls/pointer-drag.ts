/**
 * Trascinamento con il puntatore (mouse, penna, tocco): cattura il
 * puntatore sull'elemento e segue i movimenti fino al rilascio.
 */

import { on } from '../dom/events.js';

/** Funzioni chiamate durante il trascinamento */
export interface DragHandlers {
    /** Chiamata a ogni movimento del puntatore */
    move(event: PointerEvent): void;
    /** Chiamata al rilascio o all'annullamento */
    end?(): void;
}

/**
 * Avvia il trascinamento a partire da un evento pointerdown.
 */
export function trackPointerDrag(target: HTMLElement, start: PointerEvent, handlers: DragHandlers): void {
    target.setPointerCapture(start.pointerId);

    const stopMove = on(target, 'pointermove', (event) => {
        if (event.pointerId === start.pointerId) {
            handlers.move(event);
        }
    });

    const finish = (event: PointerEvent): void => {
        if (event.pointerId !== start.pointerId) {
            return;
        }
        stopMove();
        stopUp();
        stopCancel();
        if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
        }
        handlers.end?.();
    };

    const stopUp = on(target, 'pointerup', finish);
    const stopCancel = on(target, 'pointercancel', finish);
}
