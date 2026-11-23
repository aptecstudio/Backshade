/**
 * Pagina del catalogo: mostra tutti i componenti del framework con i loro
 * stati, per svilupparli e confrontarli con docs/design.
 */

import { Label, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { ControlsSection } from './controls-section.js';
import { DisplaysSection } from './displays-section.js';
import { KeysSection } from './keys-section.js';

export class CatalogPage extends Stack {
    constructor() {
        super({ gap: 3, classes: ['catalog-page'] });

        this.append(
            new Label({ text: t('catalog.title'), size: 'large', weight: 'medium' }),
            new KeysSection(),
            new DisplaysSection(),
            new ControlsSection()
        );
    }
}
