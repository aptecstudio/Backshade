/**
 * Touch panel of the application settings: touch mode automatic, on or
 * off, saved on this device.
 */

import { ChoiceKeys, Label, Panel } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { setTouchMode, touchModeChoice, type TouchModeChoice } from '../../preferences/touch-mode.js';

export class TouchSettings extends Panel {
    constructor() {
        super({ title: t('settings.touch') });
        const choice = new ChoiceKeys<TouchModeChoice>({
            label: t('settings.touchMode'),
            options: [
                { value: 'auto', label: t('settings.touchAuto') },
                { value: 'on', label: t('settings.touchOn') },
                { value: 'off', label: t('settings.touchOff') }
            ],
            value: touchModeChoice()
        });
        choice.onChange((value) => setTouchMode(value));
        this.append(choice, new Label({ text: t('settings.touchHint'), tone: 'secondary', size: 'small' }));
    }
}
