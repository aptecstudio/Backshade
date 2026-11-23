/**
 * System dialogs to choose files and folders, opened over the
 * active window. They return null if the user cancels.
 */

import { BrowserWindow, dialog } from 'electron';

/** File type filter */
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
 * Lets the user choose a folder.
 */
export async function chooseFolder(defaultPath?: string): Promise<string | null> {
    const [folder] = await showOpen({ properties: ['openDirectory', 'createDirectory'], defaultPath });
    return folder ?? null;
}

/**
 * Lets the user choose a file to open.
 */
export async function chooseFile(filters: FileFilter[], defaultPath?: string): Promise<string | null> {
    const [file] = await showOpen({ properties: ['openFile'], filters, defaultPath });
    return file ?? null;
}

/**
 * Lets the user choose several files to open.
 */
export function chooseFiles(filters: FileFilter[]): Promise<string[]> {
    return showOpen({ properties: ['openFile', 'multiSelections'], filters });
}

/**
 * Lets the user choose where to save a file.
 */
export async function chooseSaveFile(filters: FileFilter[], defaultPath: string): Promise<string | null> {
    const window = BrowserWindow.getFocusedWindow();
    const options: Electron.SaveDialogOptions = { filters, defaultPath };
    const choice = window === null ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(window, options);
    return choice.canceled || choice.filePath === undefined || choice.filePath === '' ? null : choice.filePath;
}
