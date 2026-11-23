/**
 * Operazioni sullo show richieste dall'utente: nuovo, apri, salva, salva
 * come, salva come modello, rinomina, chiudi. Ogni operazione che
 * sostituisce lo show aperto chiede prima di salvare le modifiche, e
 * all'apertura propone il recupero delle modifiche non salvate.
 */

import type { OpenShowResult } from '../../shared/transport/engine-api.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { askText } from '../dialogs/ask-text.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { localized } from '../templates/template-text.js';
import { engine } from '../transport/engine.js';
import { askNewShow } from './dialogs/new-show-dialog.js';
import { askSaveAs } from './dialogs/save-as-dialog.js';
import { currentShow, update } from './show-store.js';

/**
 * Esegue un'operazione mostrando all'utente l'eventuale errore.
 */
async function guarded(operation: () => Promise<void>): Promise<void> {
    try {
        await operation();
    } catch (error) {
        await showError(error);
    }
}

/**
 * Se lo show aperto ha modifiche non salvate chiede se salvarle.
 * Restituisce false se l'utente annulla; dopo "Non salvare" lo show viene
 * chiuso scartando le modifiche.
 */
async function resolveUnsaved(): Promise<boolean> {
    const show = currentShow();
    if (show === null || !show.dirty) {
        return true;
    }
    const choice = await askChoice(t('unsaved.title'), t('unsaved.message', { name: show.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'discard', label: t('unsaved.discard'), destructive: true },
        { id: 'save', label: t('unsaved.save'), primary: true }
    ]);
    if (choice === 'save') {
        update(await engine().request('show.save'));
        return true;
    }
    if (choice === 'discard') {
        await engine().request('show.close', { discard: true });
        return true;
    }
    return false;
}

/**
 * Dopo l'apertura propone il recupero delle modifiche non salvate.
 */
async function afterOpen(result: OpenShowResult): Promise<void> {
    update(result.show);
    if (!result.recoveryAvailable) {
        return;
    }
    const choice = await askChoice(t('recovery.title'), t('recovery.message'), [
        { id: 'discard', label: t('recovery.discard'), destructive: true },
        { id: 'recover', label: t('recovery.recover'), primary: true }
    ]);
    if (choice === 'recover') {
        update(await engine().request('show.recover'));
    } else if (choice === 'discard') {
        await engine().request('show.discardRecovery');
    }
}

/** Crea un nuovo show da un modello */
export function newShow(): Promise<void> {
    return guarded(async () => {
        if (!await resolveUnsaved()) {
            return;
        }
        const [templates, settings] = await Promise.all([engine().request('template.list'), engine().request('settings.get')]);
        const choice = await askNewShow(templates, settings.defaultShowsFolder);
        if (choice !== null) {
            await afterOpen(await engine().request('show.create', choice));
        }
    });
}

/** Apre uno show scegliendo la cartella */
export function openShow(): Promise<void> {
    return guarded(async () => {
        if (!await resolveUnsaved()) {
            return;
        }
        const result = await engine().request('show.chooseAndOpen');
        if (result !== null) {
            await afterOpen(result);
        }
    });
}

/** Apre uno show recente */
export function openRecent(folder: string): Promise<void> {
    return guarded(async () => {
        if (currentShow()?.folder === folder) {
            return;
        }
        if (!await resolveUnsaved()) {
            return;
        }
        await afterOpen(await engine().request('show.open', { folder }));
    });
}

/** Importa uno show da un archivio .bshow e lo apre */
export function importShow(): Promise<void> {
    return guarded(async () => {
        if (!await resolveUnsaved()) {
            return;
        }
        const result = await engine().request('show.import');
        if (result !== null) {
            await afterOpen(result);
        }
    });
}

/** Esporta lo show aperto in un archivio .bshow; prima lo salva se serve */
export function exportShow(): Promise<void> {
    return guarded(async () => {
        if (currentShow() === null) {
            return;
        }
        if (currentShow()?.dirty === true) {
            update(await engine().request('show.save'));
        }
        const file = await engine().request('show.export');
        if (file !== null) {
            await askChoice(t('start.exportShow'), t('start.exported', { file }), [{ id: 'ok', label: t('common.ok'), primary: true }]);
        }
    });
}

/** Salva lo show aperto */
export function saveShow(): Promise<void> {
    return guarded(async () => {
        if (currentShow() !== null) {
            update(await engine().request('show.save'));
        }
    });
}

/** Salva lo show aperto con un altro nome */
export function saveShowAs(): Promise<void> {
    return guarded(async () => {
        const show = currentShow();
        if (show === null) {
            return;
        }
        const settings = await engine().request('settings.get');
        const choice = await askSaveAs(show.name, settings.defaultShowsFolder);
        if (choice !== null) {
            update(await engine().request('show.saveAs', choice));
        }
    });
}

/** Rinomina lo show aperto */
export function renameShow(): Promise<void> {
    return guarded(async () => {
        const show = currentShow();
        if (show === null) {
            return;
        }
        const values = await askText(t('renameShow.title'), [{ label: t('newShow.name'), value: show.name, maxLength: 100 }], t('renameShow.apply'));
        if (values !== null) {
            update(await engine().request('show.rename', { name: values[0] }));
        }
    });
}

/** Salva lo show aperto come modello dell'utente; prima lo salva se serve */
export function saveAsTemplate(): Promise<void> {
    return guarded(async () => {
        const show = currentShow();
        if (show === null) {
            return;
        }
        const values = await askText(t('templates.saveTitle'), [
            { label: t('templates.name'), value: show.name, maxLength: 100 },
            { label: t('templates.description'), value: '', maxLength: 200 }
        ], t('common.save'));
        if (values === null) {
            return;
        }
        if (currentShow()?.dirty === true) {
            update(await engine().request('show.save'));
        }
        const template = await engine().request('template.saveCurrent', { name: values[0], description: values[1] });
        await askChoice(t('templates.saveTitle'), t('templates.saved', { name: localized(template.name) }), [
            { id: 'ok', label: t('common.ok'), primary: true }
        ]);
    });
}

/** Chiude lo show aperto */
export function closeShow(): Promise<void> {
    return guarded(async () => {
        const show = currentShow();
        if (show === null) {
            return;
        }
        if (show.dirty) {
            if (!await resolveUnsaved()) {
                return;
            }
            if (currentShow() === null) {
                return;
            }
        }
        await engine().request('show.close', {});
        update(null);
    });
}

/**
 * Risponde alla chiusura della finestra con modifiche non salvate.
 */
export function confirmWindowClose(): Promise<void> {
    return guarded(async () => {
        if (await resolveUnsaved()) {
            await engine().request('app.confirmClose');
        }
    });
}
