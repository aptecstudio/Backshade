/**
 * Fullscreen key of the top bar: puts the window of the application in
 * fullscreen and back. The icon and the state follow the window, also when
 * fullscreen changes from the system or the keyboard. It is shown only in
 * the desktop application.
 */

import { Key } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';

export class FullScreenKey extends Key {
    constructor() {
        super({ label: t('shell.fullScreen'), icon: 'maximize', iconOnly: true });
        this.onPress(() => void engine().request('window.toggleFullScreen').then((on) => this.show(on)).catch(showError));
        this.track(engine().on('window.fullScreenChanged', ({ on }) => this.show(on)));
        void engine().request('window.isFullScreen').then((on) => this.show(on)).catch(() => {
            // Not available outside the desktop application
            this.element.hidden = true;
        });
    }

    private show(on: boolean): void {
        this.setIcon(on ? 'minimize' : 'maximize');
        this.setLabel(on ? t('shell.leaveFullScreen') : t('shell.fullScreen'));
        this.setState(on ? 'active' : 'normal');
    }
}
