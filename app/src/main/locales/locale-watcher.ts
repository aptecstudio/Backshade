/**
 * Watcher of the user language pack folder.
 * Several close changes (for example copying a file) produce
 * a single notification.
 */

import fs from 'node:fs';
import { USER_LOCALES_DIR } from '../paths';

// Wait after the last change before notifying
const DEBOUNCE_MS = 300;

/**
 * Calls onChange when the folder changes; returns the function that
 * stops watching. If the folder cannot be watched, it does nothing.
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
        console.warn('The user language folder cannot be watched', error);
        return () => undefined;
    }

    return () => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        watcher.close();
    };
}
