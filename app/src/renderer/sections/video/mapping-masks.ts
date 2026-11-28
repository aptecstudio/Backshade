/**
 * Masks of an output in the mapping editor: their list and settings, the
 * points and curve handles of the chosen one, and the changes made by
 * dragging them.
 */

import { Checkbox, Key, Label, LinearSlider, ListItem, Stack, TextField } from '../../../framework/ts/index.js';
import { CORNER_MARGIN, type MappingPoint } from '../../../shared/video/mapping.js';
import { MASK_POINTS, MAX_FEATHER, MAX_MASKS, maskPath, newMaskPoints, splitCurve, type MaskPoint, type MaskShape, type OutputMask } from '../../../shared/video/mask.js';
import { t } from '../../i18n/i18n.js';
import type { StageOverlay } from './mapping-stage.js';

/** What a handle of the chosen mask moves */
interface Target {
    point: number;
    part: 'at' | 'in' | 'out';
}

const limit = (value: number, low: number, high: number): number => Math.round(Math.max(low, Math.min(high, value)) * 100000) / 100000;

export class MappingMasks {
    readonly element = new Stack({ gap: 8 });
    private content = new Stack({ gap: 8 });
    private selected: string | null;
    /** Chosen point of the chosen mask */
    private point = 0;
    private targets: Target[] = [];
    private changed: () => void = () => undefined;

    constructor(public masks: OutputMask[]) {
        this.selected = masks[0]?.id ?? null;
        this.render();
    }

    /** Called after every change of the masks or of the choice */
    onChange(listener: () => void): void {
        this.changed = listener;
    }

    get selectedId(): string | null {
        return this.selected;
    }

    /** Puts other masks and shows them */
    set(masks: OutputMask[]): void {
        this.masks = masks;
        this.selected = masks[0]?.id ?? null;
        this.point = 0;
        this.render();
    }

    overlay(): StageOverlay {
        const overlay: StageOverlay = { shapes: [], grid: [], guides: [], handles: [] };
        this.targets = [];
        for (const mask of this.masks) {
            const chosen = mask.id === this.selected;
            overlay.shapes.push({ id: mask.id, selected: chosen, path: maskPath(mask.points, 1, 1) });
            if (!chosen) {
                continue;
            }
            mask.points.forEach((point, index) => {
                this.targets.push({ point: index, part: 'at' });
                overlay.handles.push({ point: point.at, style: 'point', chosen: index === this.point, label: t('mapping.maskPoint', { number: index + 1 }) });
            });
            // Curve handles of the chosen point only, so the others stay clear
            const point = mask.points[this.point];
            for (const part of ['in', 'out'] as const) {
                if (point !== undefined) {
                    const end: MappingPoint = [point.at[0] + point[part][0], point.at[1] + point[part][1]];
                    // A handle on its point would hide it: it is shown a little aside
                    const hidden = point[part][0] === 0 && point[part][1] === 0;
                    const shown: MappingPoint = hidden ? [point.at[0] + (part === 'in' ? -0.04 : 0.04), point.at[1]] : end;
                    this.targets.push({ point: this.point, part });
                    overlay.guides.push([point.at, shown]);
                    overlay.handles.push({ point: shown, style: 'tangent', label: t(part === 'in' ? 'mapping.handleIn' : 'mapping.handleOut') });
                }
            }
        }
        return overlay;
    }

    /** A press on a point chooses it */
    press(handle: number): void {
        const target = this.targets[handle];
        if (target?.part === 'at' && target.point !== this.point) {
            this.point = target.point;
            this.refresh();
        }
    }

    pick(id: string): void {
        if (id !== this.selected) {
            this.selected = id;
            this.point = 0;
            this.refresh();
        }
    }

    move(handle: number, [x, y]: MappingPoint): void {
        const target = this.targets[handle];
        const mask = this.chosen();
        if (target === undefined || mask === undefined) {
            return;
        }
        const points = mask.points.map((point, index): MaskPoint => {
            if (index !== target.point) {
                return point;
            }
            if (target.part === 'at') {
                return { ...point, at: [limit(x, -CORNER_MARGIN, 1 + CORNER_MARGIN), limit(y, -CORNER_MARGIN, 1 + CORNER_MARGIN)] };
            }
            const handleAt: MappingPoint = [limit(x - point.at[0], -1, 1), limit(y - point.at[1], -1, 1)];
            const other = target.part === 'in' ? 'out' : 'in';
            const next = { ...point, [target.part]: handleAt };
            // On a smooth point the other handle stays in line, keeping its length
            const length = Math.hypot(...handleAt);
            if (point.smooth && length > 0) {
                const kept = Math.hypot(...point[other]) || length;
                next[other] = [limit(-handleAt[0] / length * kept, -1, 1), limit(-handleAt[1] / length * kept, -1, 1)];
            }
            return next;
        });
        this.update({ points }, false);
    }

    private chosen(): OutputMask | undefined {
        return this.masks.find((mask) => mask.id === this.selected);
    }

    private update(part: Partial<OutputMask>, rebuild = true): void {
        this.masks = this.masks.map((mask) => mask.id === this.selected ? { ...mask, ...part } : mask);
        if (rebuild) {
            this.render();
        }
        this.changed();
    }

    private refresh(): void {
        this.render();
        this.changed();
    }

    private add(shape: MaskShape): void {
        const mask: OutputMask = { id: crypto.randomUUID(), name: t('mapping.mask', { number: this.masks.length + 1 }), points: newMaskPoints(shape), feather: 0, inverted: false, enabled: true };
        this.masks = [...this.masks, mask];
        this.selected = mask.id;
        this.point = 0;
        this.refresh();
    }

    private render(): void {
        this.content.destroy();
        this.content = new Stack({ gap: 8 });
        this.element.append(this.content);
        const adds = (['rectangle', 'ellipse'] as const).map((shape) => {
            const key = new Key({ label: t(`mapping.add${shape === 'ellipse' ? 'Ellipse' : 'Rectangle'}`), icon: 'plus' });
            key.setDisabled(this.masks.length >= MAX_MASKS);
            key.onPress(() => this.add(shape));
            return key;
        });
        const rows = this.masks.map((mask, index) => {
            const item = new ListItem({ children: [new Label({ text: `${index + 1}. ${mask.name}`, size: 'small' })] });
            item.setSelected(mask.id === this.selected);
            item.onPress(() => this.pick(mask.id));
            return item;
        });
        this.content.append(new Stack({ direction: 'row', gap: 8, wrap: true, children: adds }), new Stack({ gap: 4, children: rows }));
        const mask = this.chosen();
        if (mask === undefined) {
            this.content.append(new Label({ text: t('mapping.noMask'), size: 'small', tone: 'secondary' }));
            return;
        }
        const name = new TextField({ label: t('mapping.name'), value: mask.name, maxLength: 60 });
        name.onInput((value) => this.update({ name: value }, false));
        const enabled = new Checkbox({ label: t('mapping.maskEnabled'), checked: mask.enabled });
        enabled.onChange((on) => this.update({ enabled: on }, false));
        const inverted = new Checkbox({ label: t('mapping.inverted'), checked: mask.inverted });
        inverted.onChange((on) => this.update({ inverted: on }, false));
        const feather = new LinearSlider({ label: t('mapping.feather'), value: mask.feather / MAX_FEATHER });
        feather.onChange((value) => this.update({ feather: limit(value * MAX_FEATHER, 0, MAX_FEATHER) }, false));
        const point = mask.points[this.point];
        const smooth = new Checkbox({ label: t('mapping.smooth'), checked: point?.smooth === true });
        smooth.onChange((on) => this.update({ points: mask.points.map((item, index) => index === this.point ? { ...item, smooth: on } : item) }, false));
        const addPoint = new Key({ label: t('mapping.addPoint'), icon: 'plus' });
        addPoint.setDisabled(mask.points.length >= MASK_POINTS.max);
        addPoint.onPress(() => {
            const points = splitCurve(this.chosen()?.points ?? [], this.point);
            this.point += 1;
            this.update({ points });
        });
        const removePoint = new Key({ label: t('mapping.removePoint') });
        removePoint.setDisabled(mask.points.length <= MASK_POINTS.min);
        removePoint.onPress(() => {
            const points = (this.chosen()?.points ?? []).filter((_, index) => index !== this.point);
            this.point = Math.max(0, this.point - 1);
            this.update({ points });
        });
        const remove = new Key({ label: t('mapping.removeMask'), icon: 'trash-2' });
        remove.onPress(() => {
            this.masks = this.masks.filter((item) => item.id !== this.selected);
            this.selected = this.masks[0]?.id ?? null;
            this.point = 0;
            this.refresh();
        });
        this.content.append(
            name,
            enabled,
            inverted,
            new Stack({ gap: 4, children: [new Label({ text: t('mapping.feather'), size: 'small' }), feather] }),
            new Label({ text: t('mapping.pointTitle', { number: this.point + 1 }), size: 'small' }),
            smooth,
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [addPoint, removePoint] }),
            remove
        );
    }
}
