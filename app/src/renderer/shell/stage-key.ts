/**
 * Stage key of the top bar: opens the 3D stage in its own window. Shown with
 * a show open and an operator entered, in the application (a remote client
 * cannot open windows of the computer).
 */

import { Key } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { isLocked, onOperatorChange } from '../show/operator-store.js';
import { currentShow, onShowChange } from '../show/show-store.js';
import { engine, isRemote } from '../transport/engine.js';

export class StageKey extends Key {
    constructor() {
        super({ label: t('stage.open'), icon: 'spotlight', iconOnly: true });
        this.onPress(() => void engine().request('stage.open').catch(showError));
        this.track(onShowChange(() => this.visibility()));
        this.track(onOperatorChange(() => this.visibility()));
        this.visibility();
    }

    private visibility(): void {
        this.element.hidden = isRemote() || currentShow() === null || isLocked();
    }
}
