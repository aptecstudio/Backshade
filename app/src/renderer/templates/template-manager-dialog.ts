/**
 * Gestione dei modelli: elenco dei modelli inclusi (sola lettura) e di
 * quelli dell'utente, con modifica di nome e descrizione ed eliminazione.
 * L'elenco si aggiorna con l'evento templates.changed.
 */

import { Dialog, Key, Label, Panel, Spacer, Stack } from '../../framework/ts/index.js';
import type { TemplateInfo } from '../../shared/transport/engine-api.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { askText } from '../dialogs/ask-text.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { localized } from './template-text.js';

/**
 * Riga di un modello, con i tasti di modifica per i modelli dell'utente.
 */
function templateRow(template: TemplateInfo): Stack {
    const name = localized(template.name);
    const row = new Stack({ direction: 'row', gap: 2, align: 'center', classes: ['template-row'] });
    row.append(new Stack({
        gap: 1,
        classes: ['template-row__text'],
        children: [
            new Label({ text: name, weight: 'medium' }),
            new Label({ text: localized(template.description) || ' ', tone: 'secondary', size: 'small' })
        ]
    }), new Spacer());

    const exportKey = new Key({ label: t('templates.export'), icon: 'package', iconOnly: true });
    exportKey.onPress(() => void exportTemplate(template));
    row.append(exportKey);

    if (template.source === 'user') {
        const edit = new Key({ label: t('templates.edit'), icon: 'pencil', iconOnly: true });
        const remove = new Key({ label: t('templates.delete'), icon: 'trash-2', iconOnly: true });
        edit.onPress(() => void editTemplate(template));
        remove.onPress(() => void deleteTemplate(template));
        row.append(edit, remove);
    }
    return row;
}

async function exportTemplate(template: TemplateInfo): Promise<void> {
    try {
        const file = await engine().request('template.export', { id: template.id });
        if (file !== null) {
            await askChoice(t('templates.export'), t('templates.exported', { file }), [{ id: 'ok', label: t('common.ok'), primary: true }]);
        }
    } catch (error) {
        await showError(error);
    }
}

async function importTemplate(): Promise<void> {
    try {
        const template = await engine().request('template.import');
        if (template !== null) {
            await askChoice(t('templates.import'), t('templates.imported', { name: localized(template.name) }), [
                { id: 'ok', label: t('common.ok'), primary: true }
            ]);
        }
    } catch (error) {
        await showError(error);
    }
}

async function editTemplate(template: TemplateInfo): Promise<void> {
    const values = await askText(t('templates.editTitle'), [
        { label: t('templates.name'), value: localized(template.name), maxLength: 100 },
        { label: t('templates.description'), value: localized(template.description), maxLength: 200 }
    ], t('common.save'));
    if (values === null) {
        return;
    }
    try {
        await engine().request('template.update', { id: template.id, name: values[0], description: values[1] });
    } catch (error) {
        await showError(error);
    }
}

async function deleteTemplate(template: TemplateInfo): Promise<void> {
    const choice = await askChoice(t('templates.deleteTitle'), t('templates.deleteConfirm', { name: localized(template.name) }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('templates.delete'), destructive: true, primary: true }
    ]);
    if (choice !== 'delete') {
        return;
    }
    try {
        await engine().request('template.delete', { id: template.id });
    } catch (error) {
        await showError(error);
    }
}

/**
 * Pannello di un gruppo di modelli.
 */
function group(title: string, templates: readonly TemplateInfo[], emptyText: string): Panel {
    const panel = new Panel({ title, classes: ['template-group'] });
    if (templates.length === 0) {
        panel.append(new Label({ text: emptyText, tone: 'secondary', size: 'small' }));
    } else {
        panel.append(...templates.map(templateRow));
    }
    return panel;
}

/**
 * Apre la gestione dei modelli.
 */
export function openTemplateManager(): void {
    const dialog = new Dialog({ title: t('templates.title'), size: 'wide' });
    const content = new Stack({ gap: 2 });
    dialog.append(content);

    let groups: Panel[] = [];
    const render = async (): Promise<void> => {
        const templates = await engine().request('template.list');
        groups.forEach((panel) => panel.destroy());
        groups = [
            group(t('templates.included'), templates.filter((item) => item.source === 'bundled'), t('templates.readOnly')),
            group(t('templates.user'), templates.filter((item) => item.source === 'user'), t('templates.empty'))
        ];
        content.append(...groups);
    };

    const importKey = new Key({ label: t('templates.import'), icon: 'package-open' });
    importKey.onPress(() => void importTemplate());
    const close = new Key({ label: t('common.close') });
    close.onPress(() => dialog.close());
    dialog.addActions(importKey, close);
    dialog.onCancel(() => dialog.close());

    const stop = engine().on('templates.changed', () => void render());
    dialog.onCancel(stop);
    close.onPress(stop);

    void render().then(() => dialog.open());
}
