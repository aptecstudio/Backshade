/**
 * Long press: the touch replacement of the right click and of the double
 * click. A press held still for a moment (any pointer: finger, pen or
 * mouse) calls the listener; moving the pointer or releasing it before
 * cancels. The click that ends a long press is swallowed.
 */

import { on, type Unsubscribe } from './events.js';

/** Time of a long press, in milliseconds */
export const LONG_PRESS_MS = 500;
// Movement in pixels that cancels a long press
const TOLERANCE = 8;

/**
 * Calls a listener on a long press of an element.
 * @returns the function that stops it
 */
export function onLongPress(element: HTMLElement, listener: (event: PointerEvent) => void, ms = LONG_PRESS_MS): Unsubscribe {
    let timer: number | null = null;
    let startX = 0;
    let startY = 0;
    let fired = false;
    const cancel = (): void => {
        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
    };
    const stops = [
        on(element, 'pointerdown', (event) => {
            if (event.button !== 0) {
                return;
            }
            cancel();
            fired = false;
            startX = event.clientX;
            startY = event.clientY;
            timer = window.setTimeout(() => {
                timer = null;
                fired = true;
                listener(event);
            }, ms);
        }),
        on(element, 'pointermove', (event) => {
            if (timer !== null && Math.hypot(event.clientX - startX, event.clientY - startY) > TOLERANCE) {
                cancel();
            }
        }),
        on(element, 'pointerup', cancel),
        on(element, 'pointercancel', cancel),
        on(element, 'click', (event) => {
            if (fired) {
                fired = false;
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, { capture: true }),
        // The system menu of a long press never opens on the controls
        on(element, 'contextmenu', (event) => event.preventDefault())
    ];
    return () => {
        cancel();
        stops.forEach((stop) => stop());
    };
}
