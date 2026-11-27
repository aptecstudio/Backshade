/**
 * Asks to enter when the open show has no operator entered: the PIN of an
 * operator, or the creation of the administrator for a show without
 * operators. The request closes as soon as an operator enters.
 */

import { AdminDialog } from '../dialogs/admin-dialog.js';
import { PinDialog } from '../dialogs/pin-dialog.js';
import { onOperatorChange, operatorState } from '../show/operator-store.js';
import { currentShow } from '../show/show-store.js';

/** Which request is open */
type Request = 'pin' | 'admin';

let open: { kind: Request; dialog: PinDialog | AdminDialog } | null = null;

function follow(): void {
    const state = operatorState();
    const show = currentShow();
    const locked = show !== null && state.showId === show.id && state.operator === null;
    const kind: Request | null = !locked ? null : state.required ? 'pin' : 'admin';
    if (open !== null && open.kind !== kind) {
        open.dialog.close();
        open = null;
    }
    if (open === null && kind !== null) {
        open = { kind, dialog: kind === 'pin' ? new PinDialog() : new AdminDialog() };
        open.dialog.open();
    }
}

/**
 * Starts the lock; called once by the shell.
 */
export function startOperatorLock(): void {
    onOperatorChange(follow);
    follow();
}
