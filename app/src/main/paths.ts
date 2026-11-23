/**
 * Percorsi dell'applicazione, calcolati dalla cartella radice dell'app
 * (quella che contiene package.json), così non dipendono dalla posizione
 * dei file compilati.
 */

import path from 'node:path';
import { app } from 'electron';

const appRoot = app.getAppPath();

/** Cartella con l'interfaccia compilata, servita dal protocollo app:// */
export const WEB_ROOT = path.join(appRoot, 'dist', 'web');

/** Script di preload compilato */
export const PRELOAD_FILE = path.join(appRoot, 'dist', 'node', 'preload', 'preload.js');

/** Icona della finestra */
export const ICON_FILE = path.join(appRoot, 'build', 'icon.png');

/** Pacchetti di lingua inclusi nell'applicazione */
export const BUNDLED_LOCALES_DIR = path.join(WEB_ROOT, 'locales');

/** Pacchetti di lingua installati dall'utente, nella cartella dati dell'utente */
export const USER_LOCALES_DIR = path.join(app.getPath('userData'), 'locales');

/** Modelli di show inclusi nell'applicazione */
export const BUNDLED_TEMPLATES_DIR = path.join(appRoot, 'templates');

/** Modelli di show creati dall'utente */
export const USER_TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');
