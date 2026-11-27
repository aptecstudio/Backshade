/**
 * Operator key of the top bar, shown when an operator entered: it shows
 * who and leaves, so that another operator can enter with the PIN.
 */

import { Key } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { onOperatorChange, operatorState } from '../show/operator-store.js';
import { currentShow } from '../show/show-store.js';
import { engine } from '../transport/engine.js';

export class OperatorKey extends Key {
    constructor() {
        super({ label: '', icon: 'user-round' });
        this.element.classList.add('operator-key');
        this.onPress(() => void engine().request('operators.logout').catch(showError));
        this.track(onOperatorChange(() => this.render()));
        this.render();
    }

    private render(): void {
        const state = operatorState();
        const operator = currentShow() === null ? null : state.operator;
        this.element.hidden = operator === null;
        if (operator !== null) {
            this.setLabel(operator.name);
            this.element.setAttribute('aria-label', t('operators.switch', { name: operator.name }));
        }
    }
}
