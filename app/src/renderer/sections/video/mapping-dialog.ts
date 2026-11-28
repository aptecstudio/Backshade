/**
 * Videomapping editor of an output: its surfaces (corners, grid, what they
 * show and the part of the picture they take), its masks, its edge blending
 * and the test image. Every change is sent at once, so it is seen on the output; Cancel
 * puts back the surfaces of before.
 */

import { Checkbox, ChoiceKeys, Dialog, Key, Label, ListItem, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { CORNER_MARGIN, FULL_CORNERS, FULL_CROP, MAX_SURFACES, MESH_POINTS, homography, meshPoint, normalizeSurfaces, regularMesh, unproject, type Crop, type MappingPoint, type MappingSurface, type Mesh } from '../../../shared/video/mapping.js';
import type { OutputComposition, ShowVideo, VideoOutputConfig } from '../../../shared/video/video.js';
import type { TimerState } from '../../../shared/video/show-timer.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { CompositionView } from '../../video/composition-view.js';
import { MappedComposition } from '../../video/mapped-composition.js';
import { MappingBlend } from './mapping-blend.js';
import { MappingMasks } from './mapping-masks.js';
import { EMPTY_OVERLAY, MappingStage } from './mapping-stage.js';
import { surfaceOverlay, type MappingHandles } from './mapping-surface-overlay.js';

/** Grid of a new number of points, keeping the shape of the one before */
function resample(mesh: Mesh | undefined, columns: number, rows: number): Mesh {
    const grid = regularMesh(columns, rows);
    return { ...grid, points: grid.points.map(([u, v]) => meshPoint(mesh, u, v)) };
}

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
    const masks = new MappingMasks(structuredClone(output.masks));
    const masksBefore = structuredClone(output.masks);
    const blending = new MappingBlend(structuredClone(output.blend));
    /** What is edited */
    let editing: 'surfaces' | 'masks' | 'blend' = 'surfaces';
    let surfaces = structuredClone(output.surfaces);
    let selected: string | null = surfaces[0]?.id ?? null;
    let testPattern = testing;
    let handles: MappingHandles = 'corners';

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
        void Promise.all([
            engine().request('video.setSurfaces', { id: output.id, surfaces }),
            engine().request('video.setMasks', { id: output.id, masks: masks.masks }),
            engine().request('video.setBlend', { id: output.id, blend: blending.blend })
        ]).catch(showError).finally(() => {
            sending = false;
            if (waiting) {
                waiting = false;
                send();
            }
        });
    };

    const draw = (): void => {
        stage.show(editing === 'masks' ? masks.overlay() : editing === 'surfaces' ? surfaceOverlay(surfaces, selected, handles) : EMPTY_OVERLAY);
        mapping.apply({ surfaces, masks: masks.masks, blend: blending.blend, testPattern, name: output.name });
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
        const reset = new Key({ label: t(handles === 'mesh' ? 'mapping.resetMesh' : 'mapping.resetCorners') });
        reset.onPress(() => {
            const mesh = surfaces.find((item) => item.id === selected)?.mesh;
            change(handles === 'mesh' && mesh !== undefined ? { mesh: regularMesh(mesh.columns, mesh.rows) } : { corners: structuredClone(FULL_CORNERS) });
        });
        const grid = new Checkbox({ label: t('mapping.mesh'), checked: surface.mesh !== undefined });
        grid.onChange((on) => {
            handles = on ? 'mesh' : 'corners';
            change({ mesh: on ? resample(undefined, 4, 4) : undefined });
            renderDetails();
        });
        const meshControls = (mesh: Mesh): Stack => {
            const side = (key: 'columns' | 'rows'): SelectField<string> => {
                const field = new SelectField<string>({
                    label: t(`mapping.${key}`),
                    options: Array.from({ length: MESH_POINTS.max - MESH_POINTS.min + 1 }, (_, index) => ({ value: String(MESH_POINTS.min + index), label: String(MESH_POINTS.min + index) })),
                    value: String(mesh[key])
                });
                field.onChange((value) => {
                    const now = surfaces.find((item) => item.id === selected)?.mesh;
                    if (now !== undefined) {
                        change({ mesh: resample(now, key === 'columns' ? Number(value) : now.columns, key === 'rows' ? Number(value) : now.rows) });
                    }
                });
                return field;
            };
            const moving = new ChoiceKeys<MappingHandles>({
                ariaLabel: t('mapping.handles'),
                options: [{ value: 'corners', label: t('mapping.corners') }, { value: 'mesh', label: t('mapping.points') }],
                value: handles
            });
            moving.onChange((value) => {
                handles = value;
                refresh();
            });
            return new Stack({ gap: 8, children: [moving, new Stack({ direction: 'row', gap: 8, children: [side('columns'), side('rows')] })] });
        };
        const remove = new Key({ label: t('mapping.remove'), icon: 'trash-2' });
        remove.onPress(() => {
            surfaces = surfaces.filter((item) => item.id !== selected);
            selected = surfaces[0]?.id ?? null;
            handles = 'corners';
            refresh();
            send();
        });
        details.append(
            name,
            source,
            grid,
            ...(surface.mesh === undefined ? [] : [meshControls(surface.mesh)]),
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
        if (surfaces.find((item) => item.id === id)?.mesh === undefined) {
            handles = 'corners';
        }
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
        handles = 'corners';
        refresh();
        send();
    });
    const test = new Checkbox({ label: t('mapping.testPattern'), checked: testPattern });
    test.onChange((on) => {
        testPattern = on;
        draw();
        void engine().request('video.setTestPattern', { id: output.id, on }).catch(showError);
    });
    masks.onChange(() => {
        draw();
        send();
    });
    blending.onChange(() => {
        draw();
        send();
    });
    stage.onPick((id) => editing === 'masks' ? masks.pick(id) : choose(id));
    stage.onPress((index) => {
        if (editing === 'masks') {
            masks.press(index);
        }
    });
    // A corner stays near the output; a point of the grid is kept in the surface it bends
    const limit = ([x, y]: MappingPoint): MappingPoint =>
        [x, y].map((value) => Math.round(Math.max(-CORNER_MARGIN, Math.min(1 + CORNER_MARGIN, value)) * 100000) / 100000) as MappingPoint;
    stage.onMove((index, point) => {
        if (editing === 'masks') {
            masks.move(index, point);
            return;
        }
        const surface = surfaces.find((item) => item.id === selected);
        if (surface === undefined) {
            return;
        }
        if (handles === 'corners') {
            change({ corners: surface.corners.map((corner, at) => at === index ? limit(point) : corner) as MappingSurface['corners'] });
            return;
        }
        const matrix = homography(surface.corners);
        const { mesh } = surface;
        if (matrix !== null && mesh !== undefined) {
            change({ mesh: { ...mesh, points: mesh.points.map((old, at) => at === index ? limit(unproject(matrix, point)) : old) } });
        }
    });

    const surfacePanel = new Stack({ gap: 8, children: [add, list, detailArea] });
    masks.element.element.hidden = true;
    blending.element.element.hidden = true;
    const sections = new ChoiceKeys<'surfaces' | 'masks' | 'blend'>({
        ariaLabel: t('mapping.editing'),
        options: [{ value: 'surfaces', label: t('mapping.surfaces') }, { value: 'masks', label: t('mapping.masks') }, { value: 'blend', label: t('mapping.blend') }],
        value: editing
    });
    const hint = new Label({ text: t('mapping.hint'), size: 'small', tone: 'secondary' });
    sections.onChange((value) => {
        editing = value;
        // The blending has no handles to drag
        hint.element.hidden = value === 'blend';
        surfacePanel.element.hidden = value !== 'surfaces';
        masks.element.element.hidden = value !== 'masks';
        blending.element.element.hidden = value !== 'blend';
        draw();
    });

    dialog.append(new Stack({
        direction: 'row',
        gap: 12,
        align: 'start',
        classes: ['mapping-editor'],
        children: [
            new Stack({ gap: 8, classes: ['mapping-editor__picture'], children: [stage, hint] }),
            new Stack({ gap: 8, classes: ['mapping-editor__side'], children: [sections, test, surfacePanel, masks.element, blending.element] })
        ]
    }));

    const finish = (restore: boolean): void => {
        if (restore) {
            surfaces = before;
            masks.masks = masksBefore;
            blending.set(structuredClone(output.blend));
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
