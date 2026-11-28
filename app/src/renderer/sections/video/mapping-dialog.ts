/**
 * Videomapping editor of an output: its surfaces, the corners of the chosen
 * one, what it shows and the part of the picture it takes, and the test
 * image. Every change is sent at once, so it is seen on the output; Cancel
 * puts back the surfaces of before.
 */

import { Checkbox, Dialog, Key, Label, ListItem, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { FULL_CORNERS, FULL_CROP, MAX_SURFACES, normalizeSurfaces, type Crop, type MappingSurface } from '../../../shared/video/mapping.js';
import type { OutputComposition, ShowVideo, VideoOutputConfig } from '../../../shared/video/video.js';
import type { TimerState } from '../../../shared/video/show-timer.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { CompositionView } from '../../video/composition-view.js';
import { MappedComposition } from '../../video/mapped-composition.js';
import { MappingStage } from './mapping-stage.js';

/** Corners of a new surface: smaller than the output and a little aside of the one before */
function newCorners(index: number): MappingSurface['corners'] {
    const shift = 0.05 * (index % 5);
    return FULL_CORNERS.map(([x, y]) => [0.2 + x * 0.5 + shift, 0.2 + y * 0.5 + shift]) as MappingSurface['corners'];
}

export async function openMappingDialog(output: VideoOutputConfig): Promise<void> {
    const [video, compositions, timers, tests] = await Promise.all([
        engine().request('video.get'),
        engine().request('video.getState'),
        engine().request('video.getTimers'),
        engine().request('video.getTestPatterns')
    ]);
    show(output, video, compositions[output.id], timers, tests.includes(output.id));
}

function show(output: VideoOutputConfig, video: ShowVideo, composition: OutputComposition | undefined, timers: Record<string, TimerState>, testing: boolean): void {
    const dialog = new Dialog({ title: t('mapping.title', { name: output.name }), size: 'large' });
    const before = structuredClone(output.surfaces);
    let surfaces = structuredClone(output.surfaces);
    let selected: string | null = surfaces[0]?.id ?? null;
    let testPattern = testing;

    const stage = new MappingStage(output.width, output.height);
    const view = new CompositionView();
    view.setGobos(video.gobos, { cue: '', song: '' });
    view.setTimers(video.timers, timers);
    stage.output.append(view.element);
    view.show(composition?.program ?? [], 0);
    const mapping = new MappedComposition(view, stage.output);

    const list = new Stack({ gap: 4 });
    let rows = new Stack({ gap: 4 });
    let details = new Stack({ gap: 8 });
    const detailArea = new Stack();
    list.append(rows);

    // One request at a time while dragging; the last change is never lost
    let sending = false;
    let waiting = false;
    const send = (): void => {
        if (sending) {
            waiting = true;
            return;
        }
        sending = true;
        void engine().request('video.setSurfaces', { id: output.id, surfaces }).catch(showError).finally(() => {
            sending = false;
            if (waiting) {
                waiting = false;
                send();
            }
        });
    };

    const draw = (): void => {
        stage.show(surfaces, selected);
        mapping.apply({ surfaces, testPattern, name: output.name });
    };

    const change = (part: Partial<MappingSurface>): void => {
        surfaces = surfaces.map((surface) => surface.id === selected ? { ...surface, ...part } : surface);
        draw();
        send();
    };

    const renderList = (): void => {
        rows.destroy();
        rows = new Stack({
            gap: 4,
            children: surfaces.map((surface, index) => {
                const item = new ListItem({ children: [new Label({ text: `${index + 1}. ${surface.name}`, size: 'small' })] });
                item.setSelected(surface.id === selected);
                item.onPress(() => choose(surface.id));
                return item;
            })
        });
        list.append(rows);
        add.setDisabled(surfaces.length >= MAX_SURFACES);
    };

    const renderDetails = (): void => {
        details.destroy();
        details = new Stack({ gap: 8 });
        detailArea.append(details);
        const surface = surfaces.find((item) => item.id === selected);
        if (surface === undefined) {
            details.append(new Label({ text: t('mapping.none'), size: 'small', tone: 'secondary' }));
            return;
        }
        const name = new TextField({ label: t('mapping.name'), value: surface.name, maxLength: 60 });
        name.onInput((value) => {
            change({ name: value });
            renderList();
        });
        const source = new SelectField<string>({
            label: t('mapping.source'),
            options: [{ value: 'program', label: t('mapping.program') }, ...Array.from({ length: output.layers }, (_, index) => ({ value: String(index), label: t('mapping.layer', { number: index + 1 }) }))],
            value: String(surface.source)
        });
        source.onChange((value) => change({ source: value === 'program' ? 'program' : Number(value) }));
        const crop = (key: keyof Crop): NumberField => {
            const current = surfaces.find((item) => item.id === selected)?.crop ?? FULL_CROP;
            const field = new NumberField({ label: t(`mapping.crop.${key}`), unit: '%', value: Math.round(current[key] * 1000) / 10, min: 0, max: 100, decimals: 1 });
            field.onChange((value) => {
                const now = surfaces.find((item) => item.id === selected);
                if (now !== undefined) {
                    change({ crop: normalizeSurfaces([{ ...now, crop: { ...now.crop, [key]: value / 100 } }])[0].crop });
                }
            });
            return field;
        };
        const reset = new Key({ label: t('mapping.resetCorners') });
        reset.onPress(() => change({ corners: structuredClone(FULL_CORNERS) }));
        const remove = new Key({ label: t('mapping.remove'), icon: 'trash-2' });
        remove.onPress(() => {
            surfaces = surfaces.filter((item) => item.id !== selected);
            selected = surfaces[0]?.id ?? null;
            refresh();
            send();
        });
        details.append(
            name,
            source,
            new Label({ text: t('mapping.cropTitle'), size: 'small' }),
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [crop('x'), crop('y'), crop('width'), crop('height')] }),
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [reset, remove] })
        );
    };

    const refresh = (): void => {
        renderList();
        renderDetails();
        draw();
    };

    const choose = (id: string): void => {
        selected = id;
        refresh();
    };

    const add = new Key({ label: t('mapping.add'), icon: 'plus' });
    add.onPress(() => {
        // The first surface covers the output, as it was
        const surface: MappingSurface = {
            id: crypto.randomUUID(),
            name: t('mapping.surface', { number: surfaces.length + 1 }),
            source: 'program',
            corners: surfaces.length === 0 ? structuredClone(FULL_CORNERS) : newCorners(surfaces.length),
            crop: { ...FULL_CROP }
        };
        surfaces = [...surfaces, surface];
        selected = surface.id;
        refresh();
        send();
    });
    const test = new Checkbox({ label: t('mapping.testPattern'), checked: testPattern });
    test.onChange((on) => {
        testPattern = on;
        draw();
        void engine().request('video.setTestPattern', { id: output.id, on }).catch(showError);
    });
    stage.onPick(choose);
    stage.onMove((corners) => change({ corners }));

    dialog.append(new Stack({
        direction: 'row',
        gap: 12,
        align: 'start',
        classes: ['mapping-editor'],
        children: [
            new Stack({ gap: 8, classes: ['mapping-editor__picture'], children: [stage, new Label({ text: t('mapping.hint'), size: 'small', tone: 'secondary' })] }),
            new Stack({ gap: 8, classes: ['mapping-editor__side'], children: [test, add, list, detailArea] })
        ]
    }));

    const finish = (restore: boolean): void => {
        if (restore) {
            surfaces = before;
            send();
        }
        // The test image is a help of the editor only
        if (testPattern) {
            void engine().request('video.setTestPattern', { id: output.id, on: false }).catch(showError);
        }
        mapping.destroy();
        view.destroy();
        dialog.close();
    };
    const cancel = new Key({ label: t('common.cancel') });
    const close = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => finish(true));
    close.onPress(() => finish(false));
    dialog.addActions(cancel, close);
    dialog.onCancel(() => finish(false));
    refresh();
    dialog.open();
    // The size of the picture is known once the dialog is shown
    view.show(composition?.program ?? [], 0);
}
