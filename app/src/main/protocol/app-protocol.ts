/**
 * Protocollo interno app:// che serve i file dell'interfaccia.
 * Sostituisce file:// per avere un'origine stabile, necessaria agli
 * ES modules nativi e alla Content Security Policy.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';
import { WEB_ROOT } from '../paths';
import { handleLocaleRequest } from './locale-routes';

const SCHEME = 'app';
const HOST = 'backshade';

/**
 * Registra lo schema come privilegiato. Va chiamata prima di app.whenReady().
 */
export function registerScheme(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true
            }
        }
    ]);
}

/**
 * Converte una richiesta in un percorso dentro la cartella dell'interfaccia.
 * Restituisce null se il percorso esce dalla cartella.
 */
function resolveFilePath(url: URL): string | null {
    const relativePath = decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(WEB_ROOT, relativePath));

    if (filePath !== WEB_ROOT && !filePath.startsWith(WEB_ROOT + path.sep)) {
        return null;
    }

    return filePath;
}

/**
 * Attiva il gestore del protocollo. Va chiamata dopo app.whenReady().
 */
export function handle(): void {
    protocol.handle(SCHEME, (request) => {
        const url = new URL(request.url);

        if (url.host !== HOST) {
            return new Response(null, { status: 404 });
        }

        const localeResponse = handleLocaleRequest(url.pathname);
        if (localeResponse !== null) {
            return localeResponse;
        }

        const filePath = resolveFilePath(url);

        if (filePath === null) {
            return new Response(null, { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });
}

/**
 * Restituisce l'indirizzo di una pagina dell'interfaccia.
 * @param page - Percorso relativo alla cartella web, ad esempio 'renderer/index.html'
 */
export function pageUrl(page: string): string {
    return `${SCHEME}://${HOST}/${page}`;
}

/**
 * Indica se un indirizzo appartiene all'interfaccia interna.
 */
export function isInternalUrl(targetUrl: string): boolean {
    try {
        const url = new URL(targetUrl);
        return url.protocol === `${SCHEME}:` && url.host === HOST;
    } catch {
        return false;
    }
}
