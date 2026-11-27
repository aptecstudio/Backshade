/**
 * Remote control panel of the application settings: the address and the QR
 * code that other devices of the network use to reach this computer.
 */

import { Label, Panel } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { ConnectionInfo } from '../../remote/connection-info.js';

export class RemoteSettings extends Panel {
    constructor() {
        super({ title: t('remote.title') });
        this.append(new Label({ text: t('remote.settingsHint'), tone: 'secondary', size: 'small' }), new ConnectionInfo());
    }
}
