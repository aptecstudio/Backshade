/**
 * MIDI key of the top bar: a long press (the ring fills) turns MIDI learn
 * on, so it is never turned on by mistake; a short press turns it off. It
 * is shown to who may change the show (administrators, or everyone in a
 * show without operators), and only with a show open.
 */

import { HoldKey } from '../../framework/ts/index.js';
import type { MidiState } from '../../shared/midi/midi.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { currentShow, onShowChange } from '../show/show-store.js';
import { canManageShow, onOperatorChange } from '../show/operator-store.js';
import { engine } from '../transport/engine.js';

export class MidiKey extends HoldKey {
    constructor() {
        super({ label: t('midi.learnHold'), icon: 'piano', iconOnly: true });
        this.onHold(() => void engine().request('midi.setLearn', { on: true }).then((state) => this.show(state)).catch(showError));
        this.onPress(() => void engine().request('midi.setLearn', { on: false }).then((state) => this.show(state)).catch(showError));
        this.track(engine().on('midi.stateChanged', ({ state }) => this.show(state)));
        this.track(onShowChange(() => this.visibility()));
        this.track(onOperatorChange(() => this.visibility()));
        this.visibility();
        this.setHoldRequired(true);
        void engine().request('midi.getState').then((state) => this.show(state)).catch(() => undefined);
    }

    private visibility(): void {
        this.element.hidden = currentShow() === null || !canManageShow();
    }

    private show(state: MidiState): void {
        this.setState(state.learn ? 'active' : 'normal');
        this.setArmed(state.learn);
        this.setHoldRequired(!state.learn);
        this.setLabel(state.learn ? t('midi.learnStop') : t('midi.learnHold'));
    }
}
