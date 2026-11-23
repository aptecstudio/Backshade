/**
 * Marchio nella barra in alto: logo, nome dell'applicazione e nome dello show.
 */

import { ImageView, Label, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

const LOGO_SRC = '/assets/images/backshade-icon.png';

export class BrandBlock extends Stack {
    private readonly showName: Label;

    constructor() {
        super({ direction: 'row', gap: 2, align: 'center', classes: ['brand-block'] });

        this.showName = new Label({ text: t('shell.noShow'), size: 'large', weight: 'medium' });
        this.append(
            new ImageView({ src: LOGO_SRC, alt: '', classes: ['brand-block__logo'] }),
            new Stack({
                gap: 1,
                classes: ['brand-block__names'],
                children: [
                    new Label({ text: t('app.name'), tone: 'accent', size: 'small', weight: 'medium' }),
                    this.showName
                ]
            })
        );
    }

    /**
     * Mostra il nome dello show aperto, o il testo predefinito se nessuno è aperto.
     */
    setShowName(name: string | null): void {
        this.showName.setText(name ?? t('shell.noShow'));
    }
}
