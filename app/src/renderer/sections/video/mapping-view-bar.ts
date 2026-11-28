/**
 * Controls under the picture of the mapping editor: zoom keys and the snap
 * of the dragged points.
 */

import { Checkbox, Key, SelectField, Stack } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { GRID_STEPS, saveSnap } from './mapping-snap.js';
import type { MappingStage } from './mapping-stage.js';
import { ZOOM_STEP } from './mapping-zoom.js';

export function mappingViewBar(stage: MappingStage): Stack {
    const key = (label: string, press: () => void): Key => {
        const result = new Key({ label });
        result.onPress(press);
        return result;
    };
    const step = new SelectField<string>({
        label: t('mapping.gridStep'),
        options: GRID_STEPS.map((value) => ({ value: String(value), label: `${value} px` })),
        value: String(stage.snap.step)
    });
    const change = (part: Partial<MappingStage['snap']>): void => {
        stage.setSnap({ ...stage.snap, ...part });
        saveSnap(stage.snap);
        step.element.hidden = !stage.snap.grid;
    };
    const points = new Checkbox({ label: t('mapping.snapPoints'), checked: stage.snap.points });
    points.onChange((on) => change({ points: on }));
    const grid = new Checkbox({ label: t('mapping.snapGrid'), checked: stage.snap.grid });
    grid.onChange((on) => change({ grid: on }));
    step.onChange((value) => change({ step: Number(value) }));
    step.element.hidden = !stage.snap.grid;
    return new Stack({
        direction: 'row',
        gap: 8,
        wrap: true,
        align: 'center',
        children: [
            key(t('timeline.zoomOut'), () => stage.zoom.zoomAt(1 / ZOOM_STEP)),
            key(t('timeline.zoomIn'), () => stage.zoom.zoomAt(ZOOM_STEP)),
            key(t('mapping.fit'), () => stage.zoom.fit()),
            points,
            grid,
            step
        ]
    });
}
