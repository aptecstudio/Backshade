/**
 * Barra in alto: marchio e show, navigazione tra le sezioni, display di
 * timecode e tempo, tasti Start e Impostazioni.
 *
 * I display mostrano valori neutri finché il motore non li fornisce
 * (fasi 1.7 e 8). Il tasto blackout arriverà con il motore di uscita (fase 3.5):
 * un tasto di sicurezza senza effetto sarebbe fuorviante in uno spettacolo dal vivo.
 */

import { Panel, ReadoutDisplay, Spacer, Stack } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { MAIN_SECTIONS, SETTINGS_SECTION, START_SECTION } from '../sections/section-definitions.js';
import { BrandBlock } from './brand-block.js';
import type { SectionNavigation } from './section-navigation.js';
import { SectionTabs } from './section-tabs.js';

const EMPTY_TIMECODE = '00:00:00:00';
const EMPTY_TEMPO = '---.-';

export class TopBar extends Panel {
    readonly brand: BrandBlock;
    readonly timecode: ReadoutDisplay;
    readonly tempo: ReadoutDisplay;
    private readonly mainTabs: SectionTabs;

    constructor(navigation: SectionNavigation) {
        super({ classes: ['top-bar'] });

        this.brand = new BrandBlock();
        this.timecode = new ReadoutDisplay({ text: EMPTY_TIMECODE, label: t('console.timecode') });
        this.timecode.element.classList.add('top-bar__timecode');
        this.tempo = new ReadoutDisplay({ text: EMPTY_TEMPO, label: t('console.tempo') });
        this.tempo.element.classList.add('top-bar__tempo');
        this.mainTabs = new SectionTabs(MAIN_SECTIONS, navigation, t('shell.navigation'));

        this.append(new Stack({
            direction: 'row',
            gap: 2,
            align: 'center',
            children: [
                this.brand,
                this.mainTabs,
                new Spacer(),
                this.timecode,
                this.tempo,
                new SectionTabs([START_SECTION, SETTINGS_SECTION], navigation)
            ]
        }));
    }

    /**
     * Aggiorna nome dello show e navigazione: senza show le sezioni di lavoro
     * non sono disponibili.
     */
    setShow(show: ShowSummary | null): void {
        this.brand.setShow(show?.name ?? null, show?.dirty === true);
        this.mainTabs.setDisabled(show === null);
    }
}
