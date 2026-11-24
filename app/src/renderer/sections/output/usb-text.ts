/**
 * Texts of the USB DMX interfaces: type and connection.
 */

import type { UsbDmxType } from '../../../shared/output/usb-dmx.js';
import type { UsbDmxDeviceState } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';

/** Name of a type of interface */
export function usbTypeLabel(type: UsbDmxType): string {
    return type === 'enttecPro' ? t('output.usbTypeEnttecPro') : t('output.usbTypeOpenDmx');
}

/** Connection of an interface */
export function usbStatusLabel(device: UsbDmxDeviceState): string {
    switch (device.status) {
        case 'connected':
            return t('output.usbConnected');
        case 'missing':
            return t('output.usbMissing');
        case 'disabled':
            return t('output.usbDisabled');
        case 'error':
            return t('output.usbError', { error: device.error ?? '' });
    }
}
