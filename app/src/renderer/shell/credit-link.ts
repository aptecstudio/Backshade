/**
 * Credito Aptec Studio: "A product by" seguito dal wordmark, collegato al sito.
 */

import { ExternalLink, ImageView, Label } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

const WEBSITE_URL = 'https://www.aptecstudio.com';
const WORDMARK_SRC = '/assets/images/aptecstudio-wordmark.png';

export class CreditLink extends ExternalLink {
    constructor() {
        super({
            href: WEBSITE_URL,
            label: t('app.websiteLabel'),
            classes: ['credit-link'],
            children: [
                new Label({ text: t('app.creditPrefix'), tone: 'secondary', size: 'small' }),
                new ImageView({ src: WORDMARK_SRC, alt: 'Aptec Studio', classes: ['credit-link__wordmark'] })
            ]
        });
    }
}
