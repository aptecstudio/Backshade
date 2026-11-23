/**
 * About page: logo, name, version, license, credits and component
 * versions, with the key to close the window.
 */

import { ExternalLink, ImageView, Key, Label, Stack } from '../../framework/ts/index.js';
import type { AppInfo } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { CreditLink } from '../shell/credit-link.js';

const LOGO_SRC = '/assets/images/backshade-icon.png';
const LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';

export class AboutPage extends Stack {
    constructor(info: AppInfo) {
        super({ gap: 3, align: 'center', classes: ['about-page'] });

        const close = new Key({ label: t('common.close') });
        close.onPress(() => window.close());

        this.append(
            new ImageView({ src: LOGO_SRC, alt: '', classes: ['about-page__logo'] }),
            new Stack({
                gap: 1,
                align: 'center',
                children: [
                    new Label({ text: info.name, size: 'large', weight: 'medium' }),
                    new Label({ text: t('about.version', { version: info.version }), tone: 'accent' })
                ]
            }),
            new Label({ text: t('about.description'), tone: 'secondary', size: 'small' }),
            new Stack({
                gap: 1,
                align: 'center',
                children: [
                    new Label({ text: t('about.license'), size: 'small' }),
                    new ExternalLink({
                        href: LICENSE_URL,
                        classes: ['about-page__link'],
                        children: [new Label({ text: t('about.licenseLink'), tone: 'accent', size: 'small' })]
                    }),
                    new Label({ text: t('app.copyright'), tone: 'secondary', size: 'small' })
                ]
            }),
            new CreditLink(),
            new Label({
                text: t('about.runtime', { electron: info.electron, chrome: info.chrome, node: info.node }),
                tone: 'secondary',
                size: 'small'
            }),
            close
        );
    }
}
