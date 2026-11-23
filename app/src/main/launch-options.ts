/**
 * Opzioni di avvio lette dalla riga di comando.
 * --catalog apre il catalogo dei componenti, solo durante lo sviluppo.
 */

import { app } from 'electron';

const MAIN_PAGE = 'renderer/index.html';
const CATALOG_PAGE = 'renderer/catalog.html';

/**
 * Restituisce la pagina da aprire nella finestra principale.
 */
export function startPage(): string {
    if (!app.isPackaged && process.argv.includes('--catalog')) {
        return CATALOG_PAGE;
    }
    return MAIN_PAGE;
}
