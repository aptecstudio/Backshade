'use strict';

/**
 * Protocollo interno app:// che serve i file dell'interfaccia.
 * Sostituisce file:// per avere un'origine stabile, necessaria agli
 * ES modules nativi e alla Content Security Policy.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { protocol, net } = require('electron');

const SCHEME = 'app';
const HOST = 'backshade';
const RENDERER_ROOT = path.join(__dirname, '..', '..', 'renderer');

/**
 * Registra lo schema come privilegiato. Va chiamata prima di app.whenReady().
 */
function registerScheme() {
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
 * Restituisce null se l'host non è valido o il percorso esce dalla cartella.
 * @param {string} requestUrl
 * @returns {string|null}
 */
function resolveFilePath(requestUrl) {
    const url = new URL(requestUrl);

    if (url.host !== HOST) {
        return null;
    }

    const relativePath = decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(RENDERER_ROOT, relativePath));

    if (filePath !== RENDERER_ROOT && !filePath.startsWith(RENDERER_ROOT + path.sep)) {
        return null;
    }

    return filePath;
}

/**
 * Attiva il gestore del protocollo. Va chiamata dopo app.whenReady().
 */
function handle() {
    protocol.handle(SCHEME, (request) => {
        const filePath = resolveFilePath(request.url);

        if (filePath === null) {
            return new Response(null, { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });
}

/**
 * Restituisce l'indirizzo di una pagina dell'interfaccia.
 * @param {string} page - Percorso relativo alla cartella renderer, ad esempio 'index.html'
 * @returns {string}
 */
function pageUrl(page) {
    return `${SCHEME}://${HOST}/${page}`;
}

/**
 * Indica se un indirizzo appartiene all'interfaccia interna.
 * @param {string} targetUrl
 * @returns {boolean}
 */
function isInternalUrl(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return url.protocol === `${SCHEME}:` && url.host === HOST;
    } catch (error) {
        return false;
    }
}

module.exports = {
    registerScheme,
    handle,
    pageUrl,
    isInternalUrl
};
