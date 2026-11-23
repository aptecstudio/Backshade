/**
 * Indirizzi dei pacchetti di lingua serviti all'interfaccia:
 * - /locales/index.json: elenco delle lingue disponibili (codice e nome);
 * - /locales/<codice>.json: pacchetto di una lingua, incluso o dell'utente.
 * Gli stessi indirizzi serviranno al web server remoto.
 */

import { pathToFileURL } from 'node:url';
import { net } from 'electron';
import { findLocale, listLocales } from '../locales/locale-registry';

const INDEX_PATH = '/locales/index.json';
const PACK_PATTERN = /^\/locales\/([A-Za-z-]+)\.json$/;
const NO_CACHE = { 'cache-control': 'no-store' };

/**
 * Risponde alle richieste dei pacchetti di lingua.
 * Restituisce null se il percorso non riguarda le lingue.
 */
export function handleLocaleRequest(pathname: string): Response | Promise<Response> | null {
    if (pathname === INDEX_PATH) {
        const locales = listLocales().map(({ code, name }) => ({ code, name }));
        return Response.json(locales, { headers: NO_CACHE });
    }

    const match = PACK_PATTERN.exec(pathname);
    if (match === null) {
        return null;
    }

    const entry = findLocale(match[1]);
    if (entry === undefined) {
        return new Response(null, { status: 404 });
    }
    return net.fetch(pathToFileURL(entry.file).toString(), { cache: 'no-store' });
}
