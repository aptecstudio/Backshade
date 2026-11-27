/**
 * Fields of the administrator of a show: name, PIN and PIN again, with the
 * message of what is wrong. Used by the new show dialog and by the request
 * of the administrator of a show without operators.
 */

import { Label, Stack, TextField } from '../../framework/ts/index.js';
import { isValidPin, OPERATOR_NAME_LENGTH, PIN_LENGTH } from '../../shared/show/operators.js';
import { t } from '../i18n/i18n.js';

/** Administrator typed in the fields */
export interface AdminChoice {
    name: string;
    pin: string;
}

export class AdminFields extends Stack {
    private readonly name: TextField;
    private readonly pin: TextField;
    private readonly confirm: TextField;
    private readonly message = new Label({ text: '', tone: 'accent', size: 'small' });

    constructor() {
        super({ gap: 1 });
        this.name = new TextField({ label: t('operators.adminName'), value: t('operators.adminDefaultName'), maxLength: OPERATOR_NAME_LENGTH });
        const digits = (label: string): TextField => new TextField({ label, maxLength: PIN_LENGTH, secret: true, inputMode: 'numeric' });
        this.pin = digits(t('operators.pin'));
        this.confirm = digits(t('operators.pinConfirm'));
        this.message.element.setAttribute('role', 'alert');
        this.append(
            new Label({ text: t('operators.adminRequired'), tone: 'secondary', size: 'small' }),
            new Stack({ direction: 'row', gap: 2, wrap: true, children: [this.name, this.pin, this.confirm] }),
            this.message
        );
    }

    /** The administrator typed; null when something is wrong, said under the fields */
    read(): AdminChoice | null {
        const name = this.name.value.trim();
        const pin = this.pin.value.trim();
        const problem = name === '' ? t('errors.invalidName')
            : !isValidPin(pin) ? t('errors.invalidPin')
                : pin !== this.confirm.value.trim() ? t('operators.pinMismatch')
                    : '';
        this.message.setText(problem);
        return problem === '' ? { name, pin } : null;
    }
}
