/**
 * Start page, like the Studio One Start page: actions, open show and this
 * computer on the left, recent shows on the right.
 */

import { Stack } from '../../framework/ts/index.js';
import { CurrentShowPanel } from './current-show-panel.js';
import { InstancePanel } from './instance-panel.js';
import { RecentShowsPanel } from './recent-shows-panel.js';
import { StartActionsPanel } from './start-actions-panel.js';

export class StartPage extends Stack {
    constructor() {
        super({ direction: 'row', gap: 3, align: 'start', classes: ['start-page'] });

        this.append(
            new Stack({ gap: 3, classes: ['start-page__side'], children: [new StartActionsPanel(), new CurrentShowPanel(), new InstancePanel()] }),
            new RecentShowsPanel()
        );
    }
}
