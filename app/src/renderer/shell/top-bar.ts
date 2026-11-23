/**
 * Barra in alto: marchio e show, navigazione tra le sezioni, display di
 * timecode e tempo, accesso alle impostazioni.
 *
 * I display mostrano valori neutri finché il motore non li fornisce
 * (fasi 1.7 e 8). Il tasto blackout arriverà con il motore di uscita (fase 3.5):
 * un tasto di sicurezza senza effetto sarebbe fuorviante in uno spettacolo dal vivo.
 */

import { Panel, ReadoutDisplay, Spacer, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { MAIN_SECTIONS, SETTINGS_SECTION } from '../sections/section-definitions.js';
import { BrandBlock } from './brand-block.js';
import type { SectionNavigation } from './section-navigation.js';
import { SectionTabs } from './section-tabs.js';

const EMPTY_TIMECODE = '00:00:00:00';
const EMPTY_TEMPO = '---.-';

export class TopBar extends Panel {
    readonly brand: BrandBlock;
    readonly timecode: ReadoutDisplay;
    readonly tempo: ReadoutDisplay;

    constructor(navigation: SectionNavigation) {
        super({ classes: ['top-bar'] });

        this.brand = new BrandBlock();
        this.timecode = new ReadoutDisplay({ text: EMPTY_TIMECODE, label: t('console.timecode') });
        this.tempo = new ReadoutDisplay({ text: EMPTY_TEMPO, label: t('console.tempo') });
        this.timecode.element.classList.add('top-bar__timecode');
        this.tempo.element.classList.add('top-bar__tempo');

        this.append(new Stack({
            direction: 'row',
            gap: 2,
            align: 'center',
            children: [
                this.brand,
                new SectionTabs(MAIN_SECTIONS, navigation, t('shell.navigation')),
                new Spacer(),
                this.timecode,
                this.tempo,
                new SectionTabs([SETTINGS_SECTION], navigation)
            ]
        }));
    }
}
