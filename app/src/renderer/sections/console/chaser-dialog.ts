/**
 * Creates or changes a chaser: name, steps chosen among the scenes,
 * speed, crossfade between steps and direction; an existing chaser can be
 * deleted. Steps reference the scenes, so recording a scene again
 * changes the chasers that use it; steps are reordered by dragging them.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, Panel, SelectField, Spacer, Stack, TextField, makeSortable } from '../../../framework/ts/index.js';
import {
    BPM_LIMITS,
    DEFAULT_BPM,
    MAX_CHASER_STEPS,
    MEMORY_NAME_MAX_LENGTH,
    type Chaser,
    type SceneSummary
} from '../../../shared/console/memories.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { directionOptions, memoryCode } from './memory-text.js';

async function removeChaser(chaser: Chaser): Promise<boolean> {
    const choice = await askChoice(t('memories.deleteChaserTitle'), t('memories.deleteChaserConfirm', { name: chaser.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
    ]);
    if (choice !== 'delete') {
        return false;
    }
    try {
        await engine().request('memories.deleteChaser', { id: chaser.id });
        return true;
    } catch (error) {
        await showError(error);
        return false;
    }
}

/**
 * Opens the dialog of a chaser.
 * @param slot - Place of the chaser
 * @param chaser - Chaser to change, or null to create one
 * @param scenes - Scenes of the show, the possible steps
 */
export function openChaserDialog(slot: number, chaser: Chaser | null, scenes: readonly SceneSummary[]): void {
    const dialog = new Dialog({ title: t('memories.chaserTitle', { code: memoryCode('chaser', slot) }), size: 'wide' });
    const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
    const steps = (chaser?.steps ?? []).filter((id) => sceneById.has(id));

    const name = new TextField({ label: t('memories.name'), value: chaser?.name ?? t('memories.defaultChaserName', { slot }), maxLength: MEMORY_NAME_MAX_LENGTH });
    const bpm = new NumberField({ label: t('memories.bpm'), value: chaser?.bpm ?? DEFAULT_BPM, min: BPM_LIMITS.min, max: BPM_LIMITS.max, decimals: 1 });
    const fade = new NumberField({ label: t('memories.stepFade'), value: Math.round((chaser?.fade ?? 0) * 100), min: 0, max: 100, unit: '%' });
    const direction = new SelectField({ label: t('memories.directionLabel'), options: directionOptions(), value: chaser?.direction ?? 'loop' });
    // Shared tempo: while a timeline plays the chaser steps on its beats
    const followTempo = new ChoiceKeys<'own' | 'shared'>({
        label: t('memories.tempoSource'),
        options: [{ value: 'own', label: t('memories.tempoOwn') }, { value: 'shared', label: t('memories.tempoShared') }],
        value: chaser?.followTempo === true ? 'shared' : 'own'
    });

    const list = new Panel({ title: t('memories.steps'), classes: ['chaser-steps'] });
    const empty = new Label({ text: t('memories.noSteps'), tone: 'secondary', size: 'small' });
    list.append(empty);
    let rows: Stack[] = [];
    const render = (): void => {
        rows.forEach((row) => row.destroy());
        rows = steps.map((id, index) => {
            const scene = sceneById.get(id) as SceneSummary;
            const remove = new Key({ label: t('memories.removeStep'), icon: 'x', iconOnly: true });
            remove.onPress(() => {
                steps.splice(index, 1);
                render();
            });
            return new Stack({
                direction: 'row',
                gap: 8,
                align: 'center',
                classes: ['chaser-steps__row'],
                children: [
                    new Label({ text: String(index + 1), tone: 'secondary', size: 'small' }),
                    new Label({ text: `${memoryCode('scene', scene.slot)} ${scene.name}` }),
                    new Spacer(),
                    remove
                ]
            });
        });
        list.append(...rows);
        empty.element.hidden = steps.length > 0;
        add.setDisabled(steps.length >= MAX_CHASER_STEPS || scenes.length === 0);
    };

    const sceneChoice = new SelectField<string>({
        ariaLabel: t('memories.addStep'),
        options: scenes.map((scene) => ({ value: scene.id, label: `${memoryCode('scene', scene.slot)} ${scene.name}` })),
        value: scenes[0]?.id ?? ''
    });
    sceneChoice.setDisabled(scenes.length === 0);
    const add = new Key({ label: t('memories.addStep'), icon: 'plus' });
    add.onPress(() => {
        if (sceneById.has(sceneChoice.value)) {
            steps.push(sceneChoice.value);
            render();
        }
    });

    dialog.append(
        name,
        new Stack({ direction: 'row', gap: 8, wrap: true, children: [bpm, fade, direction] }),
        new Stack({ gap: 8, children: [followTempo, new Label({ text: t('memories.tempoSharedHint'), tone: 'secondary', size: 'small' })] }),
        list,
        new Stack({ direction: 'row', gap: 8, align: 'center', children: [sceneChoice, add] }),
        new Label({ text: scenes.length === 0 ? t('memories.noScenes') : t('memories.stepsHint'), tone: 'secondary', size: 'small' })
    );
    render();
    // The listener lives on the list, removed with the dialog
    makeSortable({
        container: list.element,
        items: () => rows.map((row) => row.element),
        onDrop: ({ from, to }) => {
            const [moved] = steps.splice(from, 1);
            steps.splice(to, 0, moved);
            render();
        }
    });

    const apply = async (): Promise<void> => {
        try {
            await engine().request('memories.saveChaser', {
                ...(chaser === null ? {} : { id: chaser.id }),
                slot,
                name: name.value.trim() || t('memories.defaultChaserName', { slot }),
                steps: [...steps],
                bpm: bpm.value,
                fade: fade.value / 100,
                direction: direction.value,
                followTempo: followTempo.value === 'shared'
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    if (chaser !== null) {
        const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
        remove.onPress(() => void removeChaser(chaser).then((removed) => {
            if (removed) {
                dialog.close();
            }
        }));
        dialog.addActions(remove);
    }
    dialog.addActions(cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
