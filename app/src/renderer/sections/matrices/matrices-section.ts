/**
 * Matrices section: the LED matrices of the patch, one key each, the live
 * preview of the chosen one with its size, pixel type and universes, and
 * its live effect. Matrices are added and changed in the Patch section.
 */

import { Key, Label, Panel, Stack } from '../../../framework/ts/index.js';
import type { MatrixEffect } from '../../../shared/patch/matrix-effect.js';
import type { MatrixEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { EffectPanel } from './effect-panel.js';
import { MatrixPreview } from './matrix-preview.js';

export class MatricesSection extends Panel {
    private readonly keysRow = new Stack({ direction: 'row', gap: 8, wrap: true });
    private readonly info = new Label({ text: '', tone: 'secondary', size: 'small' });
    private readonly empty = new Label({ text: '', tone: 'secondary' });
    private readonly holder = new Stack({ classes: ['matrices-section__preview'] });
    private readonly layout = new Stack({ direction: 'row', gap: 12, align: 'start', classes: ['matrices-section__body'] });
    private effectPanel: EffectPanel | null = null;
    private live: Record<string, MatrixEffect> = {};
    private keys: Key[] = [];
    private preview: MatrixPreview | null = null;
    private matrices: MatrixEntry[] = [];
    private selected: string | null = null;

    constructor() {
        super({ title: t('sections.matrices'), classes: ['matrices-section'] });
        this.empty.setText(t('matrices.empty'));
        this.layout.append(this.holder);
        this.append(this.keysRow, this.empty, this.info, this.layout);
        this.track(engine().on('patch.changed', () => void this.load()));
        this.track(engine().on('matrices.liveChanged', ({ effects }) => {
            this.live = effects;
            if (this.selected !== null) {
                this.effectPanel?.follow(effects[this.selected] ?? null);
            }
        }));
        void this.load();
    }

    private async load(): Promise<void> {
        try {
            [this.matrices, this.live] = await Promise.all([engine().request('patch.getMatrices'), engine().request('matrices.getLive')]);
        } catch (error) {
            await showError(error);
            return;
        }
        const current = this.matrices.find((matrix) => matrix.id === this.selected) ?? this.matrices[0] ?? null;
        this.select(current);
    }

    private select(matrix: MatrixEntry | null): void {
        this.selected = matrix?.id ?? null;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.matrices.map((item) => {
            const key = new Key({ label: `${item.number} ${item.name}`, icon: 'grid-3x3', state: item.id === this.selected ? 'active' : 'normal' });
            key.onPress(() => this.select(item));
            return key;
        });
        this.keysRow.append(...this.keys);
        this.empty.element.hidden = matrix !== null;

        this.preview?.destroy();
        this.preview = null;
        this.effectPanel?.destroy();
        this.effectPanel = null;
        if (matrix === null) {
            this.info.setText('');
            return;
        }
        const segments = matrix.segments;
        this.info.setText(t('matrices.info', {
            width: matrix.width,
            height: matrix.height,
            type: matrix.pixelType.toUpperCase(),
            first: segments[0]?.universe ?? matrix.universe,
            last: segments[segments.length - 1]?.universe ?? matrix.universe
        }));
        this.preview = new MatrixPreview(matrix);
        this.holder.append(this.preview);
        this.effectPanel = new EffectPanel(matrix, this.live[matrix.id] ?? null);
        this.layout.append(this.effectPanel);
    }
}
