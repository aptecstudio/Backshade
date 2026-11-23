'use strict';

/**
 * Finestra principale dell'applicazione: creazione, opzioni di sicurezza
 * e riferimento all'istanza aperta.
 */

const path = require('path');
const { BrowserWindow } = require('electron');
const appProtocol = require('../protocol/app-protocol');

// Colore della superficie (vedi docs/design): evita il lampo bianco all'apertura
const SURFACE_COLOR = '#16171a';
const ICON_PATH = path.join(__dirname, '..', '..', '..', 'build', 'icon.png');
const PRELOAD_PATH = path.join(__dirname, '..', '..', 'preload', 'preload.js');

let instance = null;

/**
 * Crea la finestra principale, se non è già aperta.
 * @returns {BrowserWindow}
 */
function create() {
    if (instance !== null) {
        return instance;
    }

    instance = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        show: false,
        backgroundColor: SURFACE_COLOR,
        icon: ICON_PATH,
        title: 'Backshade',
        webPreferences: {
            preload: PRELOAD_PATH,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    instance.once('ready-to-show', () => {
        instance.show();
    });

    instance.on('closed', () => {
        instance = null;
    });

    instance.loadURL(appProtocol.pageUrl('index.html'));

    return instance;
}

/**
 * Porta in primo piano la finestra principale, ripristinandola se ridotta a icona.
 */
function focus() {
    if (instance === null) {
        return;
    }
    if (instance.isMinimized()) {
        instance.restore();
    }
    instance.focus();
}

module.exports = {
    create,
    focus
};
