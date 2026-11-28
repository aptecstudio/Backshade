/**
 * Adds or changes a video output: name, on or off, display, fullscreen or
 * a window at a position and size, order of stacking and number of layers;
 * an existing output can be removed.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { MAX_VIDEO_LAYERS, type VideoOutputConfig } from '../../../shared/video/video.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export async function openOutputDialog(output: VideoOutputConfig): Promise<void> {
    let displays;
    try {
        displays = await engine().request('video.listDisplays');
    } catch (error) {
        await showError(error);
        return;
    }
    const dialog = new Dialog({ title: t('video.outputTitle'), size: 'wide' });
    const name = new TextField({ label: t('patch.name'), value: output.name, maxLength: 60 });
    const yesNo = (label: string, value: boolean): ChoiceKeys<'no' | 'yes'> => new ChoiceKeys<'no' | 'yes'>({
        label,
        options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
        value: value ? 'yes' : 'no'
    });
    const enabled = yesNo(t('video.enabled'), output.enabled);
    const display = new SelectField<string>({
        label: t('video.display'),
        options: [{ value: '', label: t('video.mainDisplay') }, ...displays.map((item) => ({ value: item.id, label: `${item.label} (${item.width} x ${item.height})` }))],
        value: displays.some((item) => item.id === output.display) ? output.display : ''
    });
    const fullscreen = yesNo(t('video.fullscreen'), output.fullscreen);
    const x = new NumberField({ label: 'X', value: output.x, min: 0, max: 16384 });
    const y = new NumberField({ label: 'Y', value: output.y, min: 0, max: 16384 });
    const width = new NumberField({ label: t('video.width'), value: output.width, min: 64, max: 16384 });
    const height = new NumberField({ label: t('video.height'), value: output.height, min: 64, max: 16384 });
    const stack = new NumberField({ label: t('video.stack'), value: output.stack, min: 0, max: 99 });
    const layers = new NumberField({ label: t('video.layers'), value: output.layers, min: 1, max: MAX_VIDEO_LAYERS });
    const windowRow = new Stack({ direction: 'row', gap: 8, wrap: true, children: [x, y, width, height] });
    windowRow.element.hidden = output.fullscreen;
    fullscreen.onChange((value) => {
        windowRow.element.hidden = value === 'yes';
    });

    dialog.append(
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [name, enabled] }),
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [display, fullscreen] }),
        windowRow,
        new Stack({ direction: 'row', gap: 8, wrap: true, children: [stack, layers] }),
        new Label({ text: t('video.outputHint'), tone: 'secondary', size: 'small' })
    );

    const apply = async (): Promise<void> => {
        try {
            await engine().request('video.updateOutput', {
                id: output.id,
                name: name.value,
                enabled: enabled.value === 'yes',
                display: display.value,
                fullscreen: fullscreen.value === 'yes',
                x: x.value,
                y: y.value,
                width: width.value,
                height: height.value,
                stack: stack.value,
                layers: layers.value
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const remove = new Key({ label: t('video.removeOutput'), icon: 'trash-2', armed: true });
    remove.onPress(() => void askChoice(t('video.removeOutput'), t('video.removeConfirm', { name: output.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'remove', label: t('patch.remove'), destructive: true, primary: true }
    ]).then((choice) => {
        if (choice === 'remove') {
            void engine().request('video.removeOutput', { id: output.id }).then(() => dialog.close()).catch(showError);
        }
    }));
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(remove, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
