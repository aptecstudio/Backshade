/**
 * Fixture editor: optional physical data, where a value of 0 means unknown
 * and is not saved, and the dimmer curve.
 */

import { CurveEditor, Label, NumberField, Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import {
    BEAM_ANGLE_LIMITS,
    FIXTURE_NAME_MAX_LENGTH,
    PHYSICAL_LIMITS,
    type FixturePhysical
} from '../../../shared/fixtures/fixture-definition.js';
import { applyDimmerCurve, DIMMER_CURVE_KINDS, MAX_CURVE_POINTS, type DimmerCurveKind } from '../../../shared/fixtures/dimmer-curve.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import type { FixtureDraft } from './fixture-draft.js';

type NumberKey = keyof typeof PHYSICAL_LIMITS;

// Fields in presentation order, with text and unit
const FIELDS: ReadonlyArray<{ key: NumberKey; label: TextKey; unit: TextKey; decimals?: number }> = [
    { key: 'width', label: 'fixtureEditor.width', unit: 'units.millimeters' },
    { key: 'height', label: 'fixtureEditor.height', unit: 'units.millimeters' },
    { key: 'depth', label: 'fixtureEditor.depth', unit: 'units.millimeters' },
    { key: 'weight', label: 'fixtureEditor.weight', unit: 'units.kilograms', decimals: 1 },
    { key: 'power', label: 'fixtureEditor.power', unit: 'units.watts' },
    { key: 'lumens', label: 'fixtureEditor.lumens', unit: 'units.lumens' },
    { key: 'colorTemperature', label: 'fixtureEditor.colorTemperature', unit: 'units.kelvin' },
    { key: 'panRange', label: 'fixtureEditor.panRange', unit: 'units.degreesShort' },
    { key: 'tiltRange', label: 'fixtureEditor.tiltRange', unit: 'units.degreesShort' }
];

export class PhysicalPanel extends Panel {
    constructor(draft: FixtureDraft) {
        super({ title: t('fixtureEditor.physical') });
        const definition = draft.definition;
        const physical = (): FixturePhysical => {
            definition.physical ??= {};
            return definition.physical;
        };
        // Removes the physical data when no field is set
        const tidy = (): void => {
            if (definition.physical !== undefined && Object.keys(definition.physical).length === 0) {
                delete definition.physical;
            }
        };

        const fields = FIELDS.map(({ key, label, unit, decimals }) => {
            const field = new NumberField({
                label: t(label),
                unit: t(unit),
                value: definition.physical?.[key] ?? 0,
                min: PHYSICAL_LIMITS[key].min,
                max: PHYSICAL_LIMITS[key].max,
                decimals
            });
            this.track(field.onChange((value) => {
                if (value === 0) {
                    delete physical()[key];
                } else {
                    physical()[key] = value;
                }
                tidy();
            }));
            return field;
        });

        const beam = definition.physical?.beamAngle;
        const beamMin = new NumberField({ label: t('fixtureEditor.beamMin'), unit: t('units.degreesShort'), value: beam?.min ?? 0, ...BEAM_ANGLE_LIMITS, decimals: 1 });
        const beamMax = new NumberField({ label: t('fixtureEditor.beamMax'), unit: t('units.degreesShort'), value: beam?.max ?? 0, ...BEAM_ANGLE_LIMITS, decimals: 1 });
        const updateBeam = (): void => {
            const max = Math.max(beamMin.value, beamMax.value);
            const min = beamMin.value === 0 ? max : Math.min(beamMin.value, max);
            if (max === 0) {
                delete physical().beamAngle;
            } else {
                physical().beamAngle = { min, max };
            }
            tidy();
        };
        this.track(beamMin.onChange(updateBeam));
        this.track(beamMax.onChange(updateBeam));

        const source = new TextField({ label: t('fixtureEditor.source'), value: definition.physical?.source ?? '', maxLength: FIXTURE_NAME_MAX_LENGTH });
        this.track(source.onInput((value) => {
            if (value.trim() === '') {
                delete physical().source;
            } else {
                physical().source = value;
            }
            tidy();
        }));

        const curve = new SelectField<DimmerCurveKind>({
            label: t('fixtureEditor.dimmerCurve'),
            options: DIMMER_CURVE_KINDS.map((value) => ({ value, label: t(`fixtureEditor.curveKinds.${value}`) })),
            value: definition.dimmerCurve?.kind ?? 'linear'
        });
        const graph = new CurveEditor({ label: t('fixtureEditor.dimmerCurve'), maxPoints: MAX_CURVE_POINTS });
        const hint = new Label({ text: t('fixtureEditor.curveHint'), tone: 'secondary', size: 'small' });
        const showCurve = (): void => {
            const current = definition.dimmerCurve;
            hint.element.hidden = current?.kind !== 'custom';
            if (current?.kind === 'custom') {
                graph.setPoints(current.points ?? []);
            } else {
                graph.setShape((value) => applyDimmerCurve(current, value));
            }
        };
        this.track(curve.onChange((kind) => {
            if (kind === 'linear') {
                delete definition.dimmerCurve;
            } else if (kind === 'custom') {
                // The drawing starts from the curve chosen before
                const before = definition.dimmerCurve;
                definition.dimmerCurve = { kind, points: [0, 0.25, 0.5, 0.75, 1].map((value) => [value, Math.round(applyDimmerCurve(before, value) * 100) / 100]) };
            } else {
                definition.dimmerCurve = { kind };
            }
            showCurve();
        }));
        this.track(graph.onChange((points) => {
            definition.dimmerCurve = { kind: 'custom', points };
        }));
        showCurve();

        this.append(
            new Label({ text: t('fixtureEditor.physicalHint'), tone: 'secondary', size: 'small' }),
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [...fields, beamMin, beamMax] }),
            source,
            new Stack({ gap: 8, align: 'start', children: [curve, graph, hint] })
        );
    }
}
