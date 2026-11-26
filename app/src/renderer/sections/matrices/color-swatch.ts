/**
 * Color of an effect parameter: a key showing the color, which opens the
 * color wheel in a dialog. The color changes live while the wheel moves;
 * Cancel brings back the color it had.
 */

import { ColorWheel, Component, Dialog, Emitter, Key, create, hexToRgb, rgbToHex, type Unsubscribe } from '../../../framework/ts/index.js';
import { colorWheelLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';

export class ColorSwatch extends Component<HTMLButtonElement> {
    private readonly label: string;
    private readonly changes = new Emitter<string>();
    private color: string;

    constructor(label: string, color: string) {
        super(create('button', {
            classes: ['color-swatch'],
            attributes: { type: 'button', 'aria-label': label, title: label },
            children: [create('span', { classes: ['color-swatch__chip'], attributes: { 'aria-hidden': 'true' } }), create('span', { classes: ['color-swatch__label'], text: label })]
        }));
        this.label = label;
        this.color = color;
        this.render();
        this.listen(this.element, 'click', () => this.open());
        this.track(() => this.changes.clear());
    }

    get value(): string {
        return this.color;
    }

    /** Color chosen by the user, "#rrggbb" */
    onChange(listener: (color: string) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private render(): void {
        this.element.style.setProperty('--swatch-color', this.color);
    }

    private set(color: string): void {
        this.color = color;
        this.render();
        this.changes.emit(color);
    }

    private open(): void {
        const before = this.color;
        const dialog = new Dialog({ title: this.label });
        const wheel = new ColorWheel({ value: hexToRgb(this.color) ?? { r: 0, g: 0, b: 0 }, labels: colorWheelLabels() });
        wheel.onChange((rgb) => this.set(rgbToHex(rgb)));
        dialog.append(wheel);
        const cancel = new Key({ label: t('common.cancel') });
        const ok = new Key({ label: t('common.ok'), state: 'active' });
        cancel.onPress(() => {
            this.set(before);
            dialog.close();
        });
        ok.onPress(() => dialog.close());
        dialog.addActions(cancel, ok);
        dialog.onCancel(() => {
            this.set(before);
            dialog.close();
        });
        dialog.open();
    }
}
