/**
 * System dialogs to choose files and folders, opened over the
 * active window. They return null if the user cancels.
 */

import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';

/** File type filter */
export interface FileFilter {
    name: string;
    extensions: string[];
}

/**
 * Nearest existing folder of a path. System dialogs warn when their
 * start folder does not exist, for example the default shows folder
 * before the first show is created.
 */
function existingFolder(target: string | undefined): string | undefined {
    if (target === undefined || target.trim() === '') {
        return undefined;
    }
    let folder = path.resolve(target);
    while (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
        const parent = path.dirname(folder);
        if (parent === folder) {
            return undefined;
        }
        folder = parent;
    }
    return folder;
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
    const [folder] = await showOpen({ properties: ['openDirectory', 'createDirectory'], defaultPath: existingFolder(defaultPath) });
    return folder ?? null;
}

/**
 * Lets the user choose a file to open.
 */
export async function chooseFile(filters: FileFilter[], defaultPath?: string): Promise<string | null> {
    const [file] = await showOpen({ properties: ['openFile'], filters, defaultPath: existingFolder(defaultPath) });
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
    // The proposed file name is kept, in the nearest existing folder
    const folder = existingFolder(path.dirname(defaultPath));
    const options: Electron.SaveDialogOptions = {
        filters,
        defaultPath: folder === undefined ? path.basename(defaultPath) : path.join(folder, path.basename(defaultPath))
    };
    const choice = window === null ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(window, options);
    return choice.canceled || choice.filePath === undefined || choice.filePath === '' ? null : choice.filePath;
}
