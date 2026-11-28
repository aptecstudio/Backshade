/**
 * Changes a scene: name, fade in and fade out, the scene of an external
 * mixer and the mapping presets recalled with it, or deletes it. Deleting a scene also removes it
 * from the chasers and cues that use it.
 */

import { Dialog, Key, Label, NumberField, SelectField, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import { MIXER_PROFILES, type ShowMixer } from '../../../shared/mixers/mixers.js';
import { MEMORY_NAME_MAX_LENGTH, type SceneSummary } from '../../../shared/console/memories.js';
import { FADE_LIMITS } from '../../../shared/show/show-settings.js';
import type { VideoOutputConfig } from '../../../shared/video/video.js';
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
 * @param usedBy - Number of chasers and cues that use the scene
 */
export function openSceneDialog(scene: SceneSummary, usedBy: number): void {
    void Promise.all([engine().request('mixers.get'), engine().request('video.get')])
        .then(([{ mixers }, video]) => buildSceneDialog(scene, usedBy, mixers, video.outputs))
        .catch(showError);
}

function buildSceneDialog(scene: SceneSummary, usedBy: number, mixers: ShowMixer[], outputs: VideoOutputConfig[]): void {
    const dialog = new Dialog({ title: t('memories.sceneTitle', { code: memoryCode('scene', scene.slot) }) });
    const name = new TextField({ label: t('memories.name'), value: scene.name, maxLength: MEMORY_NAME_MAX_LENGTH });
    const fadeIn = new TimeField({ label: t('memories.fadeIn'), value: scene.fadeIn, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });
    const fadeOut = new TimeField({ label: t('memories.fadeOut'), value: scene.fadeOut, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });

    // Scene of an external mixer recalled when the scene goes on
    const mixer = new SelectField<string>({
        label: t('mixers.recallWith'),
        options: [{ value: '', label: t('mixers.none') }, ...mixers.map((item) => ({ value: item.id, label: item.name }))],
        value: mixers.some((item) => item.id === scene.mixer?.mixer) ? scene.mixer?.mixer ?? '' : ''
    });
    const profile = (): { first: number; last: number } => MIXER_PROFILES[mixers.find((item) => item.id === mixer.value)?.model ?? 'osc'];
    const number = new NumberField({ label: t('mixers.scene'), value: scene.mixer?.number ?? profile().first, min: 0, max: 9999 });
    const showNumber = (): void => {
        number.element.hidden = mixer.value === '';
    };
    mixer.onChange(showNumber);
    showNumber();

    // Mapping preset recalled on each output that has some
    const mappings = outputs.filter((output) => output.presets.length > 0).map((output) => ({
        id: output.id,
        field: new SelectField<string>({
            label: t('mapping.recallOn', { name: output.name }),
            options: [{ value: '', label: t('mapping.noPreset') }, ...output.presets.map((preset) => ({ value: preset.id, label: preset.name }))],
            value: output.presets.some((preset) => preset.id === scene.mapping[output.id]) ? scene.mapping[output.id] : ''
        })
    }));

    dialog.append(
        new Label({ text: t('memories.channelCount', { count: scene.channelCount }), tone: 'secondary', size: 'small' }),
        name,
        new Stack({ direction: 'row', gap: 8, wrap: true, children: [fadeIn, fadeOut] }),
        ...(mixers.length > 0 ? [new Stack({ direction: 'row', gap: 8, wrap: true, children: [mixer, number] })] : []),
        ...(mappings.length > 0 ? [new Stack({ direction: 'row', gap: 8, wrap: true, children: mappings.map((item) => item.field) })] : [])
    );

    const apply = async (): Promise<void> => {
        try {
            const range = profile();
            const recall = mixer.value === '' ? null : { mixer: mixer.value, number: Math.min(range.last, Math.max(range.first, Math.round(number.value))) };
            await engine().request('memories.updateScene', { id: scene.id, name: name.value.trim() || scene.name, fadeIn: fadeIn.value, fadeOut: fadeOut.value, mixer: recall, mapping: Object.fromEntries(mappings.map((item) => [item.id, item.field.value])) });
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
