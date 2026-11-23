/**
 * Finestra principale dell'applicazione: creazione, opzioni di sicurezza
 * e riferimento all'istanza aperta.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

// Colore della superficie (vedi docs/design): evita il lampo bianco all'apertura
const SURFACE_COLOR = '#16171a';

let instance: BrowserWindow | null = null;
// Decide se la finestra può chiudersi; false la tiene aperta
let closeGuard: () => boolean = () => true;
// La chiusura è stata confermata dall'utente
let closeAllowed = false;

/**
 * Crea la finestra principale, se non è già aperta.
 * @param page - Pagina dell'interfaccia, relativa alla cartella web
 */
export function create(page: string): BrowserWindow {
    if (instance !== null) {
        return instance;
    }

    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        show: false,
        backgroundColor: SURFACE_COLOR,
        icon: ICON_FILE,
        title: 'Backshade',
        webPreferences: {
            preload: PRELOAD_FILE,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    window.once('ready-to-show', () => {
        window.show();
    });

    window.on('close', (event) => {
        if (!closeAllowed && !closeGuard()) {
            event.preventDefault();
        }
    });

    window.on('closed', () => {
        instance = null;
        closeAllowed = false;
    });

    void window.loadURL(appProtocol.pageUrl(page));

    instance = window;
    return window;
}

/**
 * Porta in primo piano la finestra principale, ripristinandola se ridotta a icona.
 */
export function focus(): void {
    if (instance === null) {
        return;
    }
    if (instance.isMinimized()) {
        instance.restore();
    }
    instance.focus();
}

/**
 * Imposta la funzione che decide se la finestra principale può chiudersi.
 */
export function setCloseGuard(guard: () => boolean): void {
    closeGuard = guard;
}

/**
 * Chiude la finestra principale dopo la conferma dell'utente, senza
 * chiedere di nuovo.
 */
export function closeConfirmed(): void {
    if (instance === null) {
        return;
    }
    closeAllowed = true;
    instance.close();
}
