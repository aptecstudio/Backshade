/**
 * Display of fader and knob values (percentage or 0 to 255), chosen
 * separately for faders and knobs and saved on this device.
 */

import { ChoiceKeys, Label, Panel, Stack } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { displayMode, setDisplayMode, type ControlKind, type ValueDisplayMode } from '../../preferences/control-display.js';

export class ControlValuesSettings extends Panel {
    constructor() {
        super({ title: t('settings.controlValues') });

        const choice = (kind: ControlKind, label: string): ChoiceKeys<ValueDisplayMode> => {
            const keys = new ChoiceKeys<ValueDisplayMode>({
                label,
                value: displayMode(kind),
                options: [
                    { value: 'percent', label: t('settings.valuesPercent') },
                    { value: 'dmx', label: t('settings.valuesDmx') }
                ]
            });
            keys.onChange((mode) => setDisplayMode(kind, mode));
            return keys;
        };

        this.append(
            new Stack({
                direction: 'row',
                gap: 16,
                wrap: true,
                children: [choice('fader', t('settings.faderValues')), choice('knob', t('settings.knobValues'))]
            }),
            new Label({ text: t('settings.controlValuesHint'), tone: 'secondary', size: 'small' })
        );
    }
}
