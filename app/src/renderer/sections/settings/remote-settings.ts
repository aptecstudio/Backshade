/**
 * Remote control panel of the application settings: the addresses where
 * other devices of the network reach this computer.
 */

import { Label, Panel, Stack } from '../../../framework/ts/index.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class RemoteSettings extends Panel {
    constructor() {
        super({ title: t('remote.title') });
        const addresses = new Stack({ gap: 1 });
        this.append(new Label({ text: t('remote.settingsHint'), tone: 'secondary', size: 'small' }), addresses);
        void engine().request('remote.getInfo').then((info) => {
            const texts = info.port === null ? [t('remote.unavailable')] : info.addresses.length === 0 ? [t('remote.noNetwork')] : info.addresses;
            addresses.append(...texts.map((text) => new Label({ text, weight: 'medium' })));
        }).catch(showError);
    }
}
