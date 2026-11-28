/**
 * Catalog page: shows all the framework components with their
 * states, to develop them and compare them with docs/design.
 */

import { Label, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { ControlsSection } from './controls-section.js';
import { DisplaysSection } from './displays-section.js';
import { InputsSection } from './inputs-section.js';
import { KeysSection } from './keys-section.js';

export class CatalogPage extends Stack {
    constructor() {
        super({ gap: 24, classes: ['catalog-page'] });

        this.append(
            new Label({ text: t('catalog.title'), size: 'large', weight: 'medium' }),
            new KeysSection(),
            new DisplaysSection(),
            new ControlsSection(),
            new InputsSection()
        );
    }
}
