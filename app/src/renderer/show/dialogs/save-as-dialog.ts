/**
 * Finestra Salva come: nuovo nome e cartella dello show.
 */

import { Dialog, Key, TextField } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { FolderPicker } from './folder-picker.js';

/** Dati per salvare con un altro nome */
export interface SaveAsChoice {
    name: string;
    folder: string;
}

/**
 * Mostra la finestra e attende la scelta.
 */
export function askSaveAs(currentName: string, defaultFolder: string): Promise<SaveAsChoice | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('saveAs.title'), size: 'wide' });
        const name = new TextField({ label: t('newShow.name'), value: currentName, maxLength: 100 });
        const folder = new FolderPicker(t('newShow.folder'), defaultFolder);
        dialog.append(name, folder);

        const finish = (choice: SaveAsChoice | null): void => {
            dialog.close();
            resolve(choice);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const save = new Key({ label: t('saveAs.save'), icon: 'save', state: 'active' });
        cancel.onPress(() => finish(null));
        save.onPress(() => finish({ name: name.value.trim(), folder: folder.folder }));
        dialog.addActions(cancel, save);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
