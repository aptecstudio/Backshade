/**
 * Top bar: brand and show, timecode and tempo displays, blackout key,
 * MIDI learn key, operator key, Start and Settings keys. The tabs of the working sections are in the
 * status bar.
 *
 * The displays show neutral values until the engine provides them
 * (Phase 8).
 */

import { Panel, ReadoutDisplay, Spacer, Stack } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { SETTINGS_SECTION, START_SECTION } from '../sections/section-definitions.js';
import { BlackoutKey } from './blackout-key.js';
import { BrandBlock } from './brand-block.js';
import { FullScreenKey } from './fullscreen-key.js';
import { MidiKey } from './midi-key.js';
import { OperatorKey } from './operator-key.js';
import type { SectionNavigation } from './section-navigation.js';
import { SectionTabs } from './section-tabs.js';
import { followTempo } from './tempo-readout.js';
import { followTimecode } from './timecode-readout.js';

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
        this.timecode.element.classList.add('top-bar__timecode');
        this.track(followTimecode(this.timecode));
        this.tempo = new ReadoutDisplay({ text: EMPTY_TEMPO, label: t('console.tempo') });
        this.tempo.element.classList.add('top-bar__tempo');
        this.track(followTempo(this.tempo, EMPTY_TEMPO));

        this.append(new Stack({
            direction: 'row',
            gap: 2,
            align: 'center',
            children: [
                this.brand,
                new Spacer(),
                this.timecode,
                this.tempo,
                new BlackoutKey(),
                new MidiKey(),
                new OperatorKey(),
                new SectionTabs([START_SECTION, SETTINGS_SECTION], navigation),
                new FullScreenKey()
            ]
        }));
    }

    /**
     * Updates the show name.
     */
    setShow(show: ShowSummary | null): void {
        this.brand.setShow(show?.name ?? null, show?.dirty === true);
    }
}
