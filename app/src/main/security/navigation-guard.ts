'use strict';

/**
 * Protezione della navigazione: le finestre restano sull'interfaccia
 * interna, i collegamenti esterni si aprono nel browser di sistema.
 */

const { shell } = require('electron');
const appProtocol = require('../protocol/app-protocol');

/**
 * Indica se un indirizzo esterno può essere aperto nel browser di sistema.
 * @param {string} targetUrl
 * @returns {boolean}
 */
function isSafeExternalUrl(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (error) {
        return false;
    }
}

/**
 * Applica le regole di navigazione a un webContents.
 * @param {Electron.WebContents} contents
 */
function protect(contents) {
    contents.on('will-navigate', (event, targetUrl) => {
        if (!appProtocol.isInternalUrl(targetUrl)) {
            event.preventDefault();
        }
    });

    contents.setWindowOpenHandler(({ url }) => {
        if (isSafeExternalUrl(url)) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}

module.exports = {
    protect
};
