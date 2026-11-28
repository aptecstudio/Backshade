/**
 * Console section: the simple console, a two-preset desk with the preset
 * surface on the left and the masters on the right, then the memories
 * (scenes and chasers), the live cues and the attributes panel.
 */

import { Stack } from '../../../framework/ts/index.js';
import { AttributesPanel } from './attributes-panel.js';
import { CuePanel } from './cue-panel.js';
import { DeskControls } from './desk-controls.js';
import { MemoryPanel } from './memory-panel.js';
import { PresetSurface } from './preset-surface.js';

export class ConsoleSection extends Stack {
    constructor() {
        super({ gap: 12, align: 'stretch', classes: ['console-section'] });
        this.append(
            new Stack({ direction: 'row', gap: 8, align: 'stretch', classes: ['console-section__desk'], children: [new PresetSurface(), new DeskControls()] }),
            new MemoryPanel(),
            new CuePanel(),
            new AttributesPanel()
        );
    }
}
