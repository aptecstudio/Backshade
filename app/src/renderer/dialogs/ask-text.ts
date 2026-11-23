/**
 * Asks the user for one or more texts (for example name and description):
 * returns the entered values, or null if cancelled.
 */

import { Dialog, Key, TextField } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

/** Requested field */
export interface TextQuestion {
    label: string;
    value: string;
    maxLength?: number;
}

/**
 * Shows the dialog and waits for the values, in the same order as the fields.
 */
export function askText(title: string, fields: readonly TextQuestion[], confirmLabel: string): Promise<string[] | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title });
        const inputs = fields.map((field) => new TextField({ label: field.label, value: field.value, maxLength: field.maxLength }));
        dialog.append(...inputs);

        const finish = (values: string[] | null): void => {
            dialog.close();
            resolve(values);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const confirm = new Key({ label: confirmLabel, state: 'active' });
        cancel.onPress(() => finish(null));
        confirm.onPress(() => finish(inputs.map((input) => input.value.trim())));
        dialog.addActions(cancel, confirm);
        dialog.onCancel(() => finish(null));
        dialog.open();
        inputs[0]?.focus();
    });
}
