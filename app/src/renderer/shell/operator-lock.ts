/**
 * Asks for the PIN when the open show has operators and nobody entered,
 * and closes the request as soon as an operator enters.
 */

import { PinDialog } from '../dialogs/pin-dialog.js';
import { onOperatorChange, operatorState } from '../show/operator-store.js';
import { currentShow } from '../show/show-store.js';

let dialog: PinDialog | null = null;

function follow(): void {
    const state = operatorState();
    const show = currentShow();
    const locked = show !== null && state.showId === show.id && state.required && state.operator === null;
    if (locked && dialog === null) {
        dialog = new PinDialog();
        dialog.open();
    } else if (!locked && dialog !== null) {
        dialog.close();
        dialog = null;
    }
}

/**
 * Starts the lock; called once by the shell.
 */
export function startOperatorLock(): void {
    onOperatorChange(follow);
    follow();
}
