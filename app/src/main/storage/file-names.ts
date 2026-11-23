/**
 * Nomi di file e cartelle ricavati da nomi scelti dall'utente.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EngineError } from '../transport/engine-error';

// Caratteri non ammessi nei nomi di file su almeno uno dei sistemi supportati
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/g;
const MAX_LENGTH = 100;

/**
 * Pulisce un nome scelto dall'utente perché possa essere usato come nome di cartella.
 * @throws EngineError "invalid-name" se il nome è vuoto
 */
export function toFileName(name: string): string {
    const cleaned = name.replace(FORBIDDEN, '-').trim().replace(/[. ]+$/, '').slice(0, MAX_LENGTH).trim();
    if (cleaned === '') {
        throw new EngineError('invalid-name', 'Nome vuoto o non valido');
    }
    return cleaned;
}

/**
 * Restituisce un percorso libero nella cartella indicata, aggiungendo un
 * numero al nome se esiste già (ad esempio "Nome 2.backshade").
 */
export function uniquePath(folder: string, baseName: string, extension: string): string {
    let candidate = path.join(folder, `${baseName}${extension}`);
    for (let index = 2; fs.existsSync(candidate); index++) {
        candidate = path.join(folder, `${baseName} ${index}${extension}`);
    }
    return candidate;
}
