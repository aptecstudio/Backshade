'use strict';

/**
 * Punto di ingresso del processo main: gestisce solo il ciclo di vita
 * dell'applicazione e delega ogni compito ai moduli dedicati.
 */

const { app, BrowserWindow } = require('electron');
const appProtocol = require('./protocol/app-protocol');
const navigationGuard = require('./security/navigation-guard');
const mainWindow = require('./window/main-window');

// Il protocollo interno va registrato prima che l'app sia pronta
appProtocol.registerScheme();

// Una sola istanza: un secondo avvio riporta in primo piano la finestra esistente
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        mainWindow.focus();
    });

    app.on('web-contents-created', (event, contents) => {
        navigationGuard.protect(contents);
    });

    app.whenReady().then(() => {
        appProtocol.handle();
        mainWindow.create();

        // macOS: riapre la finestra quando si clicca l'icona nel dock
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                mainWindow.create();
            }
        });
    });

    // Su macOS l'applicazione resta attiva finché l'utente non esce esplicitamente
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
