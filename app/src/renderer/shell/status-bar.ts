/**
 * Status bar at the bottom: application status on the left, Aptec Studio
 * credit on the right.
 */

import { Component, Label, Spacer, create } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { CreditLink } from './credit-link.js';

export class StatusBar extends Component<HTMLElement> {
    private readonly status: Label;

    constructor() {
        super(create('footer', { classes: ['status-bar'] }));

        this.status = new Label({ text: t('status.ready'), tone: 'secondary', size: 'small' });
        this.element.setAttribute('role', 'contentinfo');

        this.append(this.status, new Spacer(), new CreditLink());
    }

    /**
     * Changes the status text.
     */
    setStatus(text: string): void {
        this.status.setText(text);
    }
}
