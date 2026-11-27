/**
 * Window with the address and the QR code of this computer.
 */

import { Dialog, Key } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { ConnectionInfo } from './connection-info.js';

export function openConnectionDialog(): void {
    const dialog = new Dialog({ title: t('remote.connectTitle'), size: 'wide' });
    dialog.append(new ConnectionInfo());
    const close = new Key({ label: t('common.close') });
    close.onPress(() => dialog.close());
    dialog.addActions(close);
    dialog.onCancel(() => dialog.close());
    dialog.open();
}
