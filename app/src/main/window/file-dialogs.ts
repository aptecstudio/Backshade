/**
 * Finestre di sistema per scegliere file e cartelle, aperte sopra la
 * finestra attiva. Restituiscono null se l'utente annulla.
 */

import { BrowserWindow, dialog } from 'electron';

/** Filtro dei tipi di file */
export interface FileFilter {
    name: string;
    extensions: string[];
}

async function showOpen(options: Electron.OpenDialogOptions): Promise<string[]> {
    const window = BrowserWindow.getFocusedWindow();
    const choice = window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options);
    return choice.canceled ? [] : choice.filePaths;
}

/**
 * Fa scegliere una cartella.
 */
export async function chooseFolder(defaultPath?: string): Promise<string | null> {
    const [folder] = await showOpen({ properties: ['openDirectory', 'createDirectory'], defaultPath });
    return folder ?? null;
}

/**
 * Fa scegliere un file da aprire.
 */
export async function chooseFile(filters: FileFilter[], defaultPath?: string): Promise<string | null> {
    const [file] = await showOpen({ properties: ['openFile'], filters, defaultPath });
    return file ?? null;
}

/**
 * Fa scegliere più file da aprire.
 */
export function chooseFiles(filters: FileFilter[]): Promise<string[]> {
    return showOpen({ properties: ['openFile', 'multiSelections'], filters });
}

/**
 * Fa scegliere dove salvare un file.
 */
export async function chooseSaveFile(filters: FileFilter[], defaultPath: string): Promise<string | null> {
    const window = BrowserWindow.getFocusedWindow();
    const options: Electron.SaveDialogOptions = { filters, defaultPath };
    const choice = window === null ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(window, options);
    return choice.canceled || choice.filePath === undefined || choice.filePath === '' ? null : choice.filePath;
}
