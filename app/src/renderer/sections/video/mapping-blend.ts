/**
 * Edge blending of an output in the mapping editor: for each side the width
 * of its zone, the curve and the gamma, and the black level compensation.
 */

import { ChoiceKeys, Label, NumberField, Stack } from '../../../framework/ts/index.js';
import { BLEND_EDGES, BLEND_LIMITS, type BlendEdge, type BlendEdgeName, type OutputBlend } from '../../../shared/video/blend.js';
import { t } from '../../i18n/i18n.js';

export class MappingBlend {
    readonly element = new Stack({ gap: 8 });
    private fields = new Stack({ gap: 8 });
    private edge: BlendEdgeName = 'right';
    private changed: () => void = () => undefined;

    constructor(public blend: OutputBlend) {
        const side = new ChoiceKeys<BlendEdgeName>({
            ariaLabel: t('mapping.side'),
            options: BLEND_EDGES.map((value) => ({ value, label: t(`mapping.sides.${value}`) })),
            value: this.edge
        });
        side.onChange((value) => {
            this.edge = value;
            this.renderEdge();
        });
        const black = new NumberField({ label: t('mapping.black'), unit: '%', value: Math.round(blend.black * 1000) / 10, min: 0, max: BLEND_LIMITS.black.max * 100, decimals: 1 });
        black.onChange((value) => {
            this.blend = { ...this.blend, black: value / 100 };
            this.changed();
        });
        this.element.append(new Label({ text: t('mapping.blendHint'), size: 'small', tone: 'secondary' }), side, this.fields, black);
        this.renderEdge();
    }

    onChange(listener: () => void): void {
        this.changed = listener;
    }

    /** Puts back other values and shows them */
    set(blend: OutputBlend): void {
        this.blend = blend;
        this.renderEdge();
    }

    private renderEdge(): void {
        const field = (key: keyof BlendEdge, scale: number, unit?: string): NumberField => {
            const limits = BLEND_LIMITS[key];
            const result = new NumberField({
                label: t(`mapping.blendFields.${key}`),
                unit,
                value: Math.round(this.blend.edges[this.edge][key] * scale * 100) / 100,
                min: limits.min * scale,
                max: limits.max * scale,
                decimals: 1
            });
            result.onChange((value) => {
                const edges = { ...this.blend.edges, [this.edge]: { ...this.blend.edges[this.edge], [key]: value / scale } };
                this.blend = { ...this.blend, edges };
                this.changed();
            });
            return result;
        };
        this.fields.destroy();
        this.fields = new Stack({ gap: 8, children: [field('width', 100, '%'), field('curve', 1), field('gamma', 1)] });
        this.element.element.insertBefore(this.fields.element, this.element.element.lastElementChild);
    }
}
