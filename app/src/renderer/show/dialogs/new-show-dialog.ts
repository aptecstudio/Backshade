/**
 * Finestra Nuovo show: nome, cartella e modello di partenza.
 * Restituisce i dati scelti, o null se l'utente annulla.
 */

import { Dialog, Key, Label, ListItem, Stack, TextField } from '../../../framework/ts/index.js';
import type { TemplateInfo } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';
import { localized } from '../../templates/template-text.js';
import { FolderPicker } from './folder-picker.js';

/** Dati del nuovo show */
export interface NewShowChoice {
    name: string;
    folder: string;
    templateId: string;
}

/**
 * Mostra la finestra e attende la scelta.
 */
export function askNewShow(templates: readonly TemplateInfo[], defaultFolder: string): Promise<NewShowChoice | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('newShow.title'), size: 'wide' });
        const name = new TextField({ label: t('newShow.name'), value: t('newShow.defaultName'), maxLength: 100 });
        const folder = new FolderPicker(t('newShow.folder'), defaultFolder);

        let selected = templates[0]?.id ?? '';
        const items = templates.map((template) => {
            const item = new ListItem({
                children: [new Stack({
                    gap: 1,
                    children: [
                        new Label({ text: localized(template.name), weight: 'medium' }),
                        new Label({ text: localized(template.description), tone: 'secondary', size: 'small' })
                    ]
                })]
            });
            item.setSelected(template.id === selected);
            item.onPress(() => {
                selected = template.id;
                items.forEach((other, index) => other.setSelected(templates[index].id === selected));
            });
            return item;
        });

        dialog.append(
            name,
            folder,
            new Stack({
                gap: 1,
                children: [
                    new Label({ text: t('newShow.template'), tone: 'secondary', size: 'small' }),
                    new Stack({ gap: 1, classes: ['template-choice'], children: items })
                ]
            })
        );

        const finish = (choice: NewShowChoice | null): void => {
            dialog.close();
            resolve(choice);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const create = new Key({ label: t('newShow.create'), icon: 'file-plus', state: 'active' });
        cancel.onPress(() => finish(null));
        create.onPress(() => finish({ name: name.value.trim(), folder: folder.folder, templateId: selected }));
        dialog.addActions(cancel, create);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
