/**
 * Changes a cue: number, scene, note, fade times (empty to use the times
 * of the scene) and follow time (empty for a manual Go), or deletes it.
 */

import { Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { CUE_NOTE_MAX_LENGTH, CUE_NUMBER_LIMITS, type Cue, type SceneSummary } from '../../../shared/console/memories.js';
import { FADE_LIMITS } from '../../../shared/show/show-settings.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { formatCue } from './cue-text.js';
import { memoryCode } from './memory-text.js';

/**
 * Optional time: a choice between "from the scene" (or "manual") and a typed value.
 */
class OptionalTime extends Stack {
    private readonly mode: SelectField<'none' | 'set'>;
    private readonly field: NumberField;

    constructor(label: string, noneLabel: string, value: number | null, fallback: number) {
        super({ gap: 8, classes: ['cue-dialog__time'] });
        this.mode = new SelectField<'none' | 'set'>({
            label,
            options: [{ value: 'none', label: noneLabel }, { value: 'set', label: t('cues.setTime') }],
            value: value === null ? 'none' : 'set'
        });
        this.field = new NumberField({ ariaLabel: label, value: value ?? fallback, min: FADE_LIMITS.min, max: FADE_LIMITS.max, decimals: 1, unit: 's' });
        this.field.element.hidden = value === null;
        this.mode.onChange((mode) => {
            this.field.element.hidden = mode === 'none';
        });
        this.append(this.mode, this.field);
    }

    get value(): number | null {
        return this.mode.value === 'none' ? null : this.field.value;
    }
}

/**
 * Opens the dialog of a cue.
 */
export function openCueDialog(cue: Cue, scenes: readonly SceneSummary[]): void {
    const scene = scenes.find((item) => item.id === cue.scene);
    const dialog = new Dialog({ title: t('cues.cueTitle', { number: formatCue(cue.number) }) });
    const number = new NumberField({ label: t('cues.number'), value: cue.number, min: CUE_NUMBER_LIMITS.min, max: CUE_NUMBER_LIMITS.max, decimals: 1 });
    const sceneField = new SelectField<string>({
        label: t('cues.scene'),
        options: scenes.map((item) => ({ value: item.id, label: `${memoryCode('scene', item.slot)} ${item.name}` })),
        value: cue.scene
    });
    const note = new TextField({ label: t('cues.note'), value: cue.note, maxLength: CUE_NOTE_MAX_LENGTH });
    const fadeIn = new OptionalTime(t('cues.fadeIn'), t('cues.fromScene'), cue.fadeIn, scene?.fadeIn ?? 0);
    const fadeOut = new OptionalTime(t('cues.fadeOut'), t('cues.fromScene'), cue.fadeOut, scene?.fadeOut ?? 0);
    const follow = new OptionalTime(t('cues.follow'), t('cues.manual'), cue.follow, 0);

    dialog.append(
        new Stack({ direction: 'row', gap: 8, wrap: true, children: [number, sceneField] }),
        note,
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'start', children: [fadeIn, fadeOut, follow] }),
        new Label({ text: t('cues.followHint'), tone: 'secondary', size: 'small' })
    );

    const apply = async (): Promise<void> => {
        try {
            await engine().request('cues.update', {
                id: cue.id,
                number: number.value,
                scene: sceneField.value,
                note: note.value.trim(),
                fadeIn: fadeIn.value,
                fadeOut: fadeOut.value,
                follow: follow.value
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    remove.onPress(() => void engine().request('cues.delete', { id: cue.id }).then(() => dialog.close()).catch(showError));
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(remove, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    note.focus();
}
