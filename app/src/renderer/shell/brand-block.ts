/**
 * Brand in the top bar: logo, application name and show name.
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
     * Shows the name of the open show, with an asterisk if there are unsaved
     * changes, or the default text if no show is open.
     */
    setShow(name: string | null, dirty: boolean): void {
        this.showName.setText(name === null ? t('shell.noShow') : `${name}${dirty ? ' *' : ''}`);
        this.showName.element.title = dirty ? t('start.unsaved') : '';
    }
}
