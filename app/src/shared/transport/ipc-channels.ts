/**
 * Nomi dei canali IPC tra processo main e preload.
 * Il preload gira in sandbox e non può importare altri file: ripete questi
 * valori, che vanno tenuti uguali.
 */

/** Canale delle richieste (invoke) */
export const REQUEST_CHANNEL = 'backshade:request';

/** Canale degli eventi dal motore */
export const EVENT_CHANNEL = 'backshade:event';
