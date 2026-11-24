/**
 * Status bar at the bottom: application status on the left, tabs of the
 * working sections in the middle, Aptec Studio credit on the right.
 */

import { Component, Label, create } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { CreditLink } from './credit-link.js';
import { SectionTabBar } from './section-tab-bar.js';
import type { SectionNavigation } from './section-navigation.js';

export class StatusBar extends Component<HTMLElement> {
    private readonly status: Label;
    private readonly tabs: SectionTabBar;

    constructor(navigation: SectionNavigation) {
        super(create('footer', { classes: ['status-bar'] }));

        this.status = new Label({ text: t('status.ready'), tone: 'secondary', size: 'small' });
        this.tabs = new SectionTabBar(navigation);
        this.element.setAttribute('role', 'contentinfo');

        this.append(this.status, this.tabs, new CreditLink());
    }

    /**
     * Changes the status text.
     */
    setStatus(text: string): void {
        this.status.setText(text);
    }

    /**
     * Enables the section tabs only when a show is open.
     */
    setShowOpen(open: boolean): void {
        this.tabs.setDisabled(!open);
    }
}
