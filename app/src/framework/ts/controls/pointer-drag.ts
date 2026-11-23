/**
 * Pointer drag (mouse, pen, touch): captures the pointer on the
 * element and follows its movements until release.
 */

import { on } from '../dom/events.js';

/** Functions called during the drag */
export interface DragHandlers {
    /** Called on every pointer movement */
    move(event: PointerEvent): void;
    /** Called on release or cancellation */
    end?(): void;
}

/**
 * Starts the drag from a pointerdown event.
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
