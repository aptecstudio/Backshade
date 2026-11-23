/**
 * Sorveglianza della cartella dei pacchetti di lingua dell'utente.
 * Più modifiche ravvicinate (ad esempio la copia di un file) producono
 * una sola notifica.
 */

import fs from 'node:fs';
import { USER_LOCALES_DIR } from '../paths';

// Attesa dopo l'ultima modifica prima di notificare
const DEBOUNCE_MS = 300;

/**
 * Chiama onChange quando la cartella cambia; restituisce la funzione che
 * ferma la sorveglianza. Se la cartella non è sorvegliabile, non fa nulla.
 */
export function watchUserLocales(onChange: () => void): () => void {
    let timer: NodeJS.Timeout | null = null;
    let watcher: fs.FSWatcher;

    try {
        watcher = fs.watch(USER_LOCALES_DIR, () => {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                timer = null;
                onChange();
            }, DEBOUNCE_MS);
        });
    } catch (error) {
        console.warn('Cartella delle lingue dell\'utente non sorvegliabile', error);
        return () => undefined;
    }

    return () => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        watcher.close();
    };
}
