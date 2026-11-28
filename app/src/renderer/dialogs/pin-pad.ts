/**
 * Keypad of a 4 digit PIN: display, message, digits and delete key, also
 * usable with the keyboard. It tells the PIN when its 4 digits are typed.
 */

import { Emitter, Key, Label, ReadoutDisplay, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import { PIN_LENGTH } from '../../shared/show/operators.js';
import { t } from '../i18n/i18n.js';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export class PinPad extends Stack {
    private readonly display: ReadoutDisplay;
    private readonly message: Label;
    private readonly completes = new Emitter<string>();
    private pin = '';
    private busy = false;

    /**
     * @param keyboardTarget - Element whose keys type the digits, usually the dialog
     */
    constructor(hint: string, keyboardTarget: HTMLElement) {
        super({ gap: 12, classes: ['pin-pad'] });
        this.display = new ReadoutDisplay({ text: '', label: t('operators.pin') });
        this.display.element.classList.add('pin-pad__display');
        this.message = new Label({ text: hint, tone: 'secondary', size: 'small' });

        const digit = (value: string): Key => {
            const key = new Key({ label: value, size: 'large' });
            key.element.setAttribute('aria-label', t('operators.digit', { digit: value }));
            key.onPress(() => this.type(value));
            return key;
        };
        const backspace = new Key({ label: t('operators.backspace'), icon: 'delete', iconOnly: true, size: 'large' });
        backspace.onPress(() => this.erase());
        const rows = [0, 3, 6].map((start) => new Stack({ direction: 'row', gap: 8, children: DIGITS.slice(start, start + 3).map(digit) }));
        // The 0 sits under the 8, as on a phone keypad
        rows.push(new Stack({ direction: 'row', gap: 8, children: [new Stack({ classes: ['pin-pad__gap'] }), digit('0'), backspace] }));
        this.append(this.message, this.display, new Stack({ gap: 8, classes: ['pin-pad__keys'], children: rows }));

        this.listen(keyboardTarget, 'keydown', (event) => {
            if (/^[0-9]$/.test(event.key)) {
                event.preventDefault();
                this.type(event.key);
            } else if (event.key === 'Backspace') {
                event.preventDefault();
                this.erase();
            }
        });
        this.track(() => this.completes.clear());
        this.render();
    }

    /** Registers a listener for the complete PIN */
    onComplete(listener: (pin: string) => void): Unsubscribe {
        return this.completes.subscribe(listener);
    }

    /** Blocks the keys while the PIN is checked */
    setBusy(busy: boolean): void {
        this.busy = busy;
    }

    /** Empties the PIN and shows a message */
    reset(message: string): void {
        this.pin = '';
        this.message.setText(message);
        this.render();
    }

    private type(value: string): void {
        if (this.busy || this.pin.length >= PIN_LENGTH) {
            return;
        }
        this.pin += value;
        this.render();
        if (this.pin.length === PIN_LENGTH) {
            this.completes.emit(this.pin);
        }
    }

    private erase(): void {
        if (!this.busy) {
            this.pin = this.pin.slice(0, -1);
            this.render();
        }
    }

    private render(): void {
        this.display.setText(Array.from({ length: PIN_LENGTH }, (_, index) => index < this.pin.length ? '*' : '-').join(' '));
    }
}
