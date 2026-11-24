/**
 * Console section: the simple console, a two-preset desk with the preset
 * surface on the left and the masters on the right. Scenes, chasers and
 * live cues are added in the next steps of Phase 4.
 */

import { Stack } from '../../../framework/ts/index.js';
import { DeskControls } from './desk-controls.js';
import { PresetSurface } from './preset-surface.js';

export class ConsoleSection extends Stack {
    constructor() {
        super({ direction: 'row', gap: 2, align: 'stretch', classes: ['console-section'] });
        this.append(new PresetSurface(), new DeskControls());
    }
}
