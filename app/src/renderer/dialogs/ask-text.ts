/**
 * Domanda all'utente uno o più testi (ad esempio nome e descrizione):
 * restituisce i valori inseriti, o null se annulla.
 */

import { Dialog, Key, TextField } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

/** Campo richiesto */
export interface TextQuestion {
    label: string;
    value: string;
    maxLength?: number;
}

/**
 * Mostra la finestra e attende i valori, nello stesso ordine dei campi.
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
