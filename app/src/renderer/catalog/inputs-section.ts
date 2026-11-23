/**
 * Catalog section with the time field (time picker with jog wheel) and the
 * color wheel, connected to displays to show the chosen values.
 */

import { ColorWheel, formatDuration, Label, Panel, rgbToHex, Stack, TimeField } from '../../framework/ts/index.js';
import { colorWheelLabels, timePickerLabels } from '../i18n/control-labels.js';
import { t } from '../i18n/i18n.js';

export class InputsSection extends Panel {
    constructor() {
        super({ title: t('catalog.inputs') });

        const timeValue = new Label({ text: formatDuration(2.5), tone: 'secondary', size: 'small' });
        const time = new TimeField({ label: t('settings.fadeIn'), value: 2.5, min: 0, max: 600, labels: timePickerLabels() });
        time.onChange((seconds) => timeValue.setText(formatDuration(seconds)));

        const colorValue = new Label({ text: '#e8b420', tone: 'secondary', size: 'small' });
        const wheel = new ColorWheel({ value: { r: 232, g: 180, b: 32 }, labels: colorWheelLabels() });
        wheel.onChange((rgb) => colorValue.setText(`${rgbToHex(rgb)}  R ${rgb.r}  G ${rgb.g}  B ${rgb.b}`));

        this.append(
            new Stack({ direction: 'row', gap: 2, align: 'end', children: [time, timeValue] }),
            wheel,
            colorValue
        );
    }
}
