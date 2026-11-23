/**
 * Startup options read from the command line.
 * --catalog opens the component catalog, during development only.
 */

import { app } from 'electron';

const MAIN_PAGE = 'renderer/index.html';
const CATALOG_PAGE = 'renderer/catalog.html';

/**
 * Returns the page to open in the main window.
 */
export function startPage(): string {
    if (!app.isPackaged && process.argv.includes('--catalog')) {
        return CATALOG_PAGE;
    }
    return MAIN_PAGE;
}
