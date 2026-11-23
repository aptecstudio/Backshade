'use strict';

/**
 * Ponte sicuro tra processo main e interfaccia.
 * Espone solo le funzioni dichiarate qui, mai l'intero ipcRenderer.
 * Il livello di trasporto vero e proprio arriva con la fase 1.7.
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('backshadeHost', {
    platform: process.platform
});
