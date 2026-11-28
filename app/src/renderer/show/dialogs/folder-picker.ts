/**
 * Folder choice: field with the path and key to choose another one
 * with the file manager.
 */

import { Key, Stack, TextField } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { pickFolder } from '../../files/file-dialogs.js';

export class FolderPicker extends Stack {
    private readonly field: TextField;

    constructor(label: string, folder: string) {
        super({ direction: 'row', gap: 8, align: 'end', classes: ['folder-picker'] });

        this.field = new TextField({ label, value: folder });
        const choose = new Key({ label: t('newShow.chooseFolder'), icon: 'folder-open' });
        choose.onPress(() => {
            void pickFolder(label, this.field.value).then((chosen) => {
                if (chosen !== null) {
                    this.field.setValue(chosen);
                }
            });
        });

        this.append(this.field, choose);
    }

    /** Chosen folder */
    get folder(): string {
        return this.field.value.trim();
    }
}
