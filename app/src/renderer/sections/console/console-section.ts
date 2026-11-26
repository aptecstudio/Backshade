/**
 * Console section: the simple console, a two-preset desk with the preset
 * surface on the left and the masters on the right, the memories (scenes
 * and chasers) and the attributes panel below. Live cues are added in the
 * next step of Phase 4.
 */

import { Stack } from '../../../framework/ts/index.js';
import { AttributesPanel } from './attributes-panel.js';
import { DeskControls } from './desk-controls.js';
import { MemoryPanel } from './memory-panel.js';
import { PresetSurface } from './preset-surface.js';

export class ConsoleSection extends Stack {
    constructor() {
        super({ gap: 2, align: 'stretch', classes: ['console-section'] });
        this.append(
            new Stack({ direction: 'row', gap: 2, align: 'stretch', classes: ['console-section__desk'], children: [new PresetSurface(), new DeskControls()] }),
            new MemoryPanel(),
            new AttributesPanel()
        );
    }
}
