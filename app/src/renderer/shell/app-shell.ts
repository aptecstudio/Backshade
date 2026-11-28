/**
 * Main structure of the application: top bar, area of the open
 * section and status bar with the tabs of the working sections. It follows the open show: without a show it shows
 * the start page, when a show opens it restores the last working section.
 */

import { onShortcut, Stack } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { confirmWindowClose, newShow, openShow, saveShow, saveShowAs } from '../show/show-commands.js';
import { currentShow, onShowChange } from '../show/show-store.js';
import { engine } from '../transport/engine.js';
import { SectionHost } from './section-host.js';
import { startOperatorLock } from './operator-lock.js';
import { SectionNavigation } from './section-navigation.js';
import { StatusBar } from './status-bar.js';
import { TopBar } from './top-bar.js';

export class AppShell extends Stack {
    readonly navigation: SectionNavigation;
    readonly topBar: TopBar;
    readonly statusBar: StatusBar;
    private showOpen: boolean;

    constructor() {
        super({ gap: 8, classes: ['app-shell'] });

        const show = currentShow();
        this.showOpen = show !== null;
        this.navigation = new SectionNavigation('start');
        if (show !== null) {
            this.navigation.open(this.navigation.lastMainSection());
        }
        this.topBar = new TopBar(this.navigation);
        this.statusBar = new StatusBar(this.navigation);

        this.append(this.topBar, new SectionHost(this.navigation), this.statusBar);

        this.applyShow(show);
        startOperatorLock();
        this.track(onShowChange((next) => this.applyShow(next)));
        this.track(engine().on('app.closeRequested', () => void confirmWindowClose()));
        this.track(onShortcut('mod+s', () => void saveShow()));
        this.track(onShortcut('mod+shift+s', () => void saveShowAs()));
        this.track(onShortcut('mod+n', () => void newShow()));
        this.track(onShortcut('mod+o', () => void openShow()));
    }

    /**
     * Updates bar, title and section according to the open show.
     */
    private applyShow(show: ShowSummary | null): void {
        this.topBar.setShow(show);
        this.statusBar.setShowOpen(show !== null);
        document.title = show === null ? t('app.name') : `${show.name}${show.dirty ? ' *' : ''} - ${t('app.name')}`;

        const open = show !== null;
        if (open && !this.showOpen) {
            this.navigation.open(this.navigation.lastMainSection());
        } else if (!open && this.showOpen) {
            this.navigation.open('start');
        }
        this.showOpen = open;
    }
}
