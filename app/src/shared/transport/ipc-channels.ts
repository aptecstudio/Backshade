/**
 * Names of the IPC channels between main process and preload.
 * The preload runs in a sandbox and cannot import other files: it repeats these
 * values, which must be kept equal.
 */

/** Request channel (invoke) */
export const REQUEST_CHANNEL = 'backshade:request';

/** Channel of the events from the engine */
export const EVENT_CHANNEL = 'backshade:event';
