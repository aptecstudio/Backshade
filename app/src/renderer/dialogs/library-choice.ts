/**
 * The box asking whether something imported or saved also goes into the
 * personal library, for all the shows; it starts unchecked.
 */

import { Checkbox, Dialog, Key, Label, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

export function libraryCheckbox(): Checkbox {
    return new Checkbox({ label: t('library.alsoPersonal') });
}

/**
 * Asks to confirm an import into the show.
 * @returns Whether it also goes into the library, or null if cancelled
 */
export function askImportToLibrary(title: string, message: string): Promise<boolean | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title });
        const keep = libraryCheckbox();
        dialog.append(new Stack({ gap: 12, children: [new Label({ text: message }), keep] }));
        const finish = (result: boolean | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const confirm = new Key({ label: t('library.import'), state: 'active' });
        cancel.onPress(() => finish(null));
        confirm.onPress(() => finish(keep.checked));
        dialog.addActions(cancel, confirm);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
