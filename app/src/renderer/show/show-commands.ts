/**
 * Show operations requested by the user: new, open, save, save
 * as, save as template, rename, close. Every operation that
 * replaces the open show first asks to save the changes; on opening
 * the missing fixture definitions are reported and the recovery of the
 * unsaved changes is offered.
 */

import type { OpenShowResult } from '../../shared/transport/engine-api.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { askText } from '../dialogs/ask-text.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { localized } from '../templates/template-text.js';
import { engine } from '../transport/engine.js';
import { showMissingFixtures } from './dialogs/missing-fixtures-dialog.js';
import { askNewShow } from './dialogs/new-show-dialog.js';
import { askSaveAs } from './dialogs/save-as-dialog.js';
import { currentShow, update } from './show-store.js';

/**
 * Runs an operation, showing any error to the user.
 */
async function guarded(operation: () => Promise<void>): Promise<void> {
    try {
        await operation();
    } catch (error) {
        await showError(error);
    }
}

/**
 * If the open show has unsaved changes, asks whether to save them.
 * Returns false if the user cancels; after "Do not save" the show is
 * closed discarding the changes.
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
 * After opening, reports the missing fixture definitions and offers to
 * recover the unsaved changes.
 */
async function afterOpen(result: OpenShowResult): Promise<void> {
    update(result.show);
    if (result.missingFixtures.length > 0) {
        await showMissingFixtures(result.missingFixtures);
    }
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

/** Creates a new show from a template */
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

/** Opens a show by choosing its folder */
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

/** Opens a recent show */
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

/** Imports a show from a .bshow archive and opens it */
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

/** Exports the open show to a .bshow archive; saves it first if needed */
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

/** Saves the open show */
export function saveShow(): Promise<void> {
    return guarded(async () => {
        if (currentShow() !== null) {
            update(await engine().request('show.save'));
        }
    });
}

/** Saves the open show under another name */
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

/** Renames the open show */
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

/** Saves the open show as a user template; saves it first if needed */
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

/** Closes the open show */
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
 * Answers the window close with unsaved changes.
 */
export function confirmWindowClose(): Promise<void> {
    return guarded(async () => {
        if (await resolveUnsaved()) {
            await engine().request('app.confirmClose');
        }
    });
}
