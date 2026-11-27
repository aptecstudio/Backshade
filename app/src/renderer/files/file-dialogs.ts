/**
 * Windows of the internal file manager, which replace the system dialogs:
 * choose a folder, a show, files to import or the name of a file to write,
 * and browse the files. They return null (or nothing) when cancelled.
 */

import { Dialog, Key, TextField } from '../../framework/ts/index.js';
import type { FileEntry } from '../../shared/files/file-entry.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { FileBrowser, type BrowserOptions } from './file-browser.js';

/** Where the manager starts: the folder given, or the default shows folder */
async function startFolder(folder: string | undefined): Promise<string> {
    return folder !== undefined && folder !== '' ? folder : (await engine().request('settings.get')).defaultShowsFolder;
}

/** Path of a name in a folder, with the separator of the computer */
function join(folder: string, name: string): string {
    const separator = folder.includes('\\') ? '\\' : '/';
    return folder.endsWith(separator) ? `${folder}${name}` : `${folder}${separator}${name}`;
}

/** Opens a window with the manager; finish closes it */
function managerDialog<T>(title: string, options: BrowserOptions, start: string | undefined,
    build: (dialog: Dialog, browser: FileBrowser, finish: (result: T) => void) => void, cancelled: T): Promise<T> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title, size: 'large' });
        dialog.element.classList.add('file-dialog');
        const browser = new FileBrowser(options);
        dialog.append(browser);
        const finish = (result: T): void => {
            dialog.close();
            resolve(result);
        };
        build(dialog, browser, finish);
        dialog.onCancel(() => finish(cancelled));
        dialog.open();
        void startFolder(start).then((folder) => browser.open(folder));
    });
}

/** Chooses a folder: the selected one, or the folder shown */
export function pickFolder(title: string, start?: string): Promise<string | null> {
    const isFolder = (entry: FileEntry): boolean => entry.kind === 'folder';
    return managerDialog<string | null>(title, { accepts: isFolder, multiple: false }, start, (dialog, browser, finish) => {
        const cancel = new Key({ label: t('common.cancel') });
        const choose = new Key({ label: t('files.chooseFolder'), icon: 'folder-open', state: 'active' });
        cancel.onPress(() => finish(null));
        choose.onPress(() => finish(browser.chosen[0]?.path ?? browser.folder));
        dialog.addActions(cancel, choose);
    }, null);
}

/** Chooses the folder of a show */
export function pickShow(title: string, start?: string): Promise<string | null> {
    const isShow = (entry: FileEntry): boolean => entry.kind === 'show';
    return managerDialog<string | null>(title, { accepts: isShow, multiple: false, picksFolder: isShow }, start, (dialog, browser, finish) => {
        const cancel = new Key({ label: t('common.cancel') });
        const choose = new Key({ label: t('files.openShow'), icon: 'folder-open', state: 'active' });
        cancel.onPress(() => finish(null));
        // Browsing inside a show folder chooses that show
        const current = (): string | null => browser.chosen[0]?.path ?? (browser.folder?.toLowerCase().endsWith('.backshade') === true ? browser.folder : null);
        choose.onPress(() => finish(current()));
        browser.onChange(() => choose.setDisabled(current() === null));
        choose.setDisabled(true);
        dialog.addActions(cancel, choose);
    }, null);
}

/** Chooses files to import */
export function pickFiles(title: string, accepts: (entry: FileEntry) => boolean, multiple = true): Promise<string[]> {
    return managerDialog<string[]>(title, { accepts, multiple }, undefined, (dialog, browser, finish) => {
        const cancel = new Key({ label: t('common.cancel') });
        const choose = new Key({ label: t('files.choose'), icon: 'folder-open', state: 'active' });
        cancel.onPress(() => finish([]));
        choose.onPress(() => finish(browser.chosen.map((entry) => entry.path)));
        browser.onChange(() => choose.setDisabled(browser.chosen.length === 0));
        choose.setDisabled(true);
        dialog.addActions(cancel, choose);
    }, []);
}

/**
 * Chooses where to write a file; an existing one is replaced only after a
 * confirmation.
 * @param extension - Extension of the file, without the dot
 */
export function pickSaveFile(title: string, name: string, extension: string, start?: string): Promise<string | null> {
    const accepts = (entry: FileEntry): boolean => entry.name.toLowerCase().endsWith(`.${extension}`);
    return managerDialog<string | null>(title, { accepts, multiple: false }, start, (dialog, browser, finish) => {
        const field = new TextField({ label: t('files.name'), value: `${name}.${extension}`, maxLength: 255 });
        dialog.append(field);
        const cancel = new Key({ label: t('common.cancel') });
        const save = new Key({ label: t('common.save'), icon: 'save', state: 'active' });
        // Choosing an existing file proposes its name
        browser.onChange(() => {
            const entry = browser.chosen[0];
            if (entry !== undefined) {
                field.setValue(entry.name);
            }
        });
        cancel.onPress(() => finish(null));
        save.onPress(() => void (async () => {
            const typed = field.value.trim();
            if (typed === '' || browser.folder === null) {
                return;
            }
            const file = typed.toLowerCase().endsWith(`.${extension}`) ? typed : `${typed}.${extension}`;
            const existing = browser.entries.some((entry) => entry.name.toLowerCase() === file.toLowerCase());
            if (existing && await askChoice(title, t('files.overwrite', { name: file }), [
                { id: 'cancel', label: t('common.cancel') },
                { id: 'replace', label: t('files.replace'), destructive: true, primary: true }
            ]) !== 'replace') {
                return;
            }
            finish(join(browser.folder, file));
        })());
        dialog.addActions(cancel, save);
    }, null);
}

/** Browses the files, without choosing */
export function browseFiles(title: string, start: string): Promise<void> {
    return managerDialog<void>(title, { accepts: () => false, multiple: true }, start, (dialog, _browser, finish) => {
        const close = new Key({ label: t('common.close') });
        close.onPress(() => finish());
        dialog.addActions(close);
    }, undefined);
}
