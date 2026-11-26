/**
 * Changes a scene: name, fade in and fade out, or deletes it. Deleting a
 * scene also removes it from the chasers that use it.
 */

import { Dialog, Key, Label, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import { MEMORY_NAME_MAX_LENGTH, type SceneSummary } from '../../../shared/console/memories.js';
import { FADE_LIMITS } from '../../../shared/show/show-settings.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { memoryCode } from './memory-text.js';

async function removeScene(scene: SceneSummary, usedBy: number): Promise<boolean> {
    const message = usedBy > 0
        ? t('memories.deleteSceneUsed', { name: scene.name, count: usedBy })
        : t('memories.deleteSceneConfirm', { name: scene.name });
    const choice = await askChoice(t('memories.deleteSceneTitle'), message, [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
    ]);
    if (choice !== 'delete') {
        return false;
    }
    try {
        await engine().request('memories.deleteScene', { id: scene.id });
        return true;
    } catch (error) {
        await showError(error);
        return false;
    }
}

/**
 * Opens the dialog of a scene.
 * @param usedBy - Number of chasers that use the scene
 */
export function openSceneDialog(scene: SceneSummary, usedBy: number): void {
    const dialog = new Dialog({ title: t('memories.sceneTitle', { code: memoryCode('scene', scene.slot) }) });
    const name = new TextField({ label: t('memories.name'), value: scene.name, maxLength: MEMORY_NAME_MAX_LENGTH });
    const fadeIn = new TimeField({ label: t('memories.fadeIn'), value: scene.fadeIn, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });
    const fadeOut = new TimeField({ label: t('memories.fadeOut'), value: scene.fadeOut, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });

    dialog.append(
        new Label({ text: t('memories.channelCount', { count: scene.channelCount }), tone: 'secondary', size: 'small' }),
        name,
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [fadeIn, fadeOut] })
    );

    const apply = async (): Promise<void> => {
        try {
            await engine().request('memories.updateScene', { id: scene.id, name: name.value.trim() || scene.name, fadeIn: fadeIn.value, fadeOut: fadeOut.value });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    remove.onPress(() => void removeScene(scene, usedBy).then((removed) => {
        if (removed) {
            dialog.close();
        }
    }));
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(remove, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
