/**
 * Struttura principale dell'applicazione: barra in alto, area della
 * sezione aperta e barra di stato.
 */

import { Stack } from '../../framework/ts/index.js';
import { SectionHost } from './section-host.js';
import { SectionNavigation } from './section-navigation.js';
import { StatusBar } from './status-bar.js';
import { TopBar } from './top-bar.js';

export class AppShell extends Stack {
    readonly navigation: SectionNavigation;
    readonly topBar: TopBar;
    readonly statusBar: StatusBar;

    constructor() {
        super({ gap: 3, classes: ['app-shell'] });

        this.navigation = new SectionNavigation();
        this.topBar = new TopBar(this.navigation);
        this.statusBar = new StatusBar();

        this.append(this.topBar, new SectionHost(this.navigation), this.statusBar);
    }
}
