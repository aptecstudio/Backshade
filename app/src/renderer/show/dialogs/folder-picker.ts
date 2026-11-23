/**
 * Scelta di una cartella: campo con il percorso e tasto per sceglierne
 * un'altra con la finestra del sistema.
 */

import { Key, Stack, TextField } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class FolderPicker extends Stack {
    private readonly field: TextField;

    constructor(label: string, folder: string) {
        super({ direction: 'row', gap: 1, align: 'end', classes: ['folder-picker'] });

        this.field = new TextField({ label, value: folder });
        const choose = new Key({ label: t('newShow.chooseFolder'), icon: 'folder-open' });
        choose.onPress(() => {
            void engine().request('dialog.chooseFolder', { defaultPath: this.field.value }).then((chosen) => {
                if (chosen !== null) {
                    this.field.setValue(chosen);
                }
            });
        });

        this.append(this.field, choose);
    }

    /** Cartella scelta */
    get folder(): string {
        return this.field.value.trim();
    }
}
