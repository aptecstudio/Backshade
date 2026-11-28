/**
 * Importing an .obj into the show (and the personal library when asked) and
 * changing or removing an imported model.
 */

import type { CustomModel } from '../../shared/stage/custom-model.js';
import { showError } from '../dialogs/show-error.js';
import { pickFiles } from '../files/file-dialogs.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { askCustomModel, likelyUnit } from './custom-model-dialog.js';

export async function importCustomModel(): Promise<void> {
    const [file] = await pickFiles(t('stage.importModel'), (entry) => entry.name.toLowerCase().endsWith('.obj'), false);
    if (file === undefined) {
        return;
    }
    try {
        const found = await engine().request('stage.inspectModel', { file });
        const choice = await askCustomModel({
            size: found.size,
            name: found.name,
            unit: likelyUnit(found.size),
            up: 'y',
            note: t(found.materials ? 'stage.withColors' : 'stage.withoutColors'),
            where: 'new'
        });
        if (choice !== null && choice !== 'remove') {
            await engine().request('stage.importModel', { file, ...choice });
        }
    } catch (error) {
        await showError(error);
    }
}

/** Changes a model of the show or, when only there, of the personal library */
export async function editCustomModel(model: CustomModel, where: 'show' | 'library'): Promise<void> {
    const choice = await askCustomModel({ size: model.size, name: model.name, unit: model.unit, up: model.up, where });
    try {
        if (choice === 'remove') {
            await engine().request(where === 'show' ? 'stage.removeModel' : 'stage.removeLibraryModel', { id: model.id });
        } else if (choice !== null) {
            await engine().request('stage.updateModel', { id: model.id, ...choice });
        }
    } catch (error) {
        await showError(error);
    }
}
