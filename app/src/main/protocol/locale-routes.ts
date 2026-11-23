/**
 * Addresses of the language packs served to the interface:
 * - /locales/index.json: list of the available languages (code and name);
 * - /locales/<code>.json: pack of a language, included or from the user.
 * The same addresses will be used by the remote web server.
 */

import { pathToFileURL } from 'node:url';
import { net } from 'electron';
import { findLocale, listLocales } from '../locales/locale-registry';

const INDEX_PATH = '/locales/index.json';
const PACK_PATTERN = /^\/locales\/([A-Za-z-]+)\.json$/;
const NO_CACHE = { 'cache-control': 'no-store' };

/**
 * Answers the requests for language packs.
 * Returns null if the path is not about languages.
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
