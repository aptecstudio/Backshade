/**
 * Blackout key of the top bar: it puts the intensity of all the fixtures
 * at 0 and back. When the blackout is on the key is active with the red
 * bar of the armed state, so it is visible from anywhere.
 */

import { Key } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { applyOutputState, onOutputState, outputState } from '../output/output-store.js';
import { engine } from '../transport/engine.js';

export class BlackoutKey extends Key {
    constructor() {
        super({ label: t('output.blackout') });
        this.onPress(() => void this.toggle());
        this.track(onOutputState((state) => {
            this.setState(state.blackout ? 'active' : 'normal');
            this.setArmed(state.blackout);
            this.element.title = state.blackout ? t('output.blackoutOn') : t('output.blackout');
        }));
    }

    private async toggle(): Promise<void> {
        try {
            applyOutputState(await engine().request('output.setBlackout', { on: outputState()?.blackout !== true }));
        } catch (error) {
            await showError(error);
        }
    }
}
