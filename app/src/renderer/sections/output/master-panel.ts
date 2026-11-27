/**
 * Output section: grand master fader with its typed value and the
 * blackout key. The fader follows the engine, so every window shows the
 * same level.
 */

import { Fader, Label, LIGHT_SCALE, Panel, RangeInput, Stack } from '../../../framework/ts/index.js';
import { markMidi } from '../../midi/midi-target.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { applyOutputState, onOutputState } from '../../output/output-store.js';
import { bindControlValue } from '../../preferences/control-values.js';
import { BlackoutKey } from '../../shell/blackout-key.js';
import { engine } from '../../transport/engine.js';

export class MasterPanel extends Panel {
    constructor() {
        super({ title: t('output.master'), classes: ['master-panel'] });

        const level = new Label({ text: '', size: 'small' });
        const fader = new Fader({ label: t('output.grandMaster'), value: 1, scale: LIGHT_SCALE });
        markMidi(fader, { kind: 'master', master: 'grand' }, 'level');
        const input = new RangeInput(fader, { label: t('output.grandMaster') });
        this.track(bindControlValue('fader', fader, { input, text: (text) => level.setText(text) }));
        this.track(fader.onChange((value) => {
            void engine().request('output.setGrandMaster', { level: value }).then(applyOutputState).catch(showError);
        }));
        this.track(onOutputState((state) => {
            if (Math.abs(state.grandMaster - fader.value) > 0.001) {
                fader.setValue(state.grandMaster);
            }
        }));

        this.append(new Stack({
            gap: 2,
            align: 'center',
            children: [new Label({ text: t('output.grandMaster'), tone: 'secondary', size: 'small' }), fader, input, level, new BlackoutKey()]
        }));
    }
}
