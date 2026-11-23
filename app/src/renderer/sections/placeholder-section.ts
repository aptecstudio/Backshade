/**
 * Contenuto provvisorio di una sezione non ancora sviluppata.
 */

import { Label, Panel } from '../../framework/ts/index.js';
import { t, type TextKey } from '../i18n/i18n.js';

export class PlaceholderSection extends Panel {
    constructor(titleKey: TextKey) {
        super({ title: t(titleKey), classes: ['placeholder-section'] });
        this.append(new Label({ text: t('sections.placeholder'), tone: 'secondary' }));
    }
}
