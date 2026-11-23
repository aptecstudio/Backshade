/**
 * Copia di una cartella con esclusione di alcuni elementi di primo livello
 * (ad esempio copie di recupero e cronologia quando si copia uno show).
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Copia source in target, che non deve esistere.
 * @param exclude - Nomi di file o cartelle di primo livello da non copiare
 */
export function copyFolder(source: string, target: string, exclude: readonly string[] = []): void {
    fs.cpSync(source, target, {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: (file) => {
            const relative = path.relative(source, file);
            const topLevel = relative.split(path.sep)[0];
            return relative === '' || !exclude.includes(topLevel);
        }
    });
}
