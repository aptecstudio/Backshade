/**
 * Entering a show with operators: the PIN keypad sends the PIN when its 4
 * digits are typed; when several operators have the PIN, their names are
 * offered. The dialog cannot be cancelled: the only other way out is
 * closing the show.
 */

import { Dialog, Key, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { closeShow } from '../show/show-commands.js';
import { engine } from '../transport/engine.js';
import { PinPad } from './pin-pad.js';
import { errorMessage } from './show-error.js';

export class PinDialog {
    private readonly dialog: Dialog;
    private readonly pad: PinPad;
    private readonly choices: Stack;
    private choiceKeys: Key[] = [];

    constructor() {
        this.dialog = new Dialog({ title: t('operators.enterTitle') });
        this.dialog.element.classList.add('pin-dialog');
        this.pad = new PinPad(t('operators.enterHint'), this.dialog.element);
        this.pad.onComplete((pin) => void this.send(pin));
        this.choices = new Stack({ direction: 'row', gap: 8, wrap: true });
        this.dialog.append(this.pad, this.choices);
        const close = new Key({ label: t('operators.closeShow') });
        close.onPress(() => void closeShow());
        this.dialog.addActions(close);
    }

    open(): void {
        this.dialog.open();
    }

    close(): void {
        this.dialog.close();
    }

    private async send(pin: string, id?: string): Promise<void> {
        this.pad.setBusy(true);
        let message = t('operators.enterHint');
        try {
            // On success the operator state changes and the lock closes the dialog
            const result = await engine().request('operators.login', id === undefined ? { pin } : { pin, id });
            this.showChoices(pin, result.choices);
            if (result.choices.length > 0) {
                message = t('operators.chooseOperator');
            }
        } catch (error) {
            message = errorMessage(error);
        } finally {
            this.pad.setBusy(false);
            this.pad.reset(message);
        }
    }

    private showChoices(pin: string, choices: ReadonlyArray<{ id: string; name: string }>): void {
        this.choiceKeys.forEach((key) => key.destroy());
        this.choiceKeys = choices.map((choice) => {
            const key = new Key({ label: choice.name, icon: 'user-round' });
            key.onPress(() => void this.send(pin, choice.id));
            return key;
        });
        this.choices.append(...this.choiceKeys);
    }
}
