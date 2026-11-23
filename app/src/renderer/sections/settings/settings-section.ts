/**
 * Sezione delle impostazioni: raccoglie i pannelli delle singole impostazioni.
 */

import { Stack } from '../../../framework/ts/index.js';
import { AboutSettings } from './about-settings.js';
import { LanguageSettings } from './language-settings.js';

export class SettingsSection extends Stack {
    constructor() {
        super({ gap: 3, classes: ['settings-section'] });
        this.append(new LanguageSettings(), new AboutSettings());
    }
}
