/**
 * Keeps the computer awake while Backshade is open: the screen does not
 * turn off and the system does not go to sleep, so a show is never
 * interrupted. The block ends when the application quits.
 */

import { app, powerSaveBlocker } from 'electron';

let blocker: number | null = null;

/**
 * Starts the block; called once when the application is ready.
 */
export function start(): void {
    if (blocker !== null && powerSaveBlocker.isStarted(blocker)) {
        return;
    }
    // "prevent-display-sleep" also prevents the sleep of the system
    blocker = powerSaveBlocker.start('prevent-display-sleep');
    app.on('will-quit', stop);
}

/**
 * Ends the block.
 */
export function stop(): void {
    if (blocker !== null && powerSaveBlocker.isStarted(blocker)) {
        powerSaveBlocker.stop(blocker);
    }
    blocker = null;
}

/** The block is active */
export function isActive(): boolean {
    return blocker !== null && powerSaveBlocker.isStarted(blocker);
}
