/**
 * USB DMX interfaces of a workstation: which serial device sends which
 * universe, with which protocol. Saved in the workstation settings,
 * because the devices are connected to the computer, not to the show.
 */

import { MAX_UNIVERSE } from '../patch/patch.js';

/** Protocol of a USB DMX interface */
export type UsbDmxType = 'enttecPro' | 'openDmx';

/** Supported protocols, in presentation order */
export const USB_DMX_TYPES: readonly UsbDmxType[] = ['enttecPro', 'openDmx'];

/** USB DMX interface assigned to a universe */
export interface UsbDmxDevice {
    /** Stable identifier: the serial number of the device when known, otherwise its path */
    id: string;
    /** System path of the serial port when the device was configured, for example /dev/ttyUSB0 or COM3 */
    path: string;
    type: UsbDmxType;
    /** Backshade universe sent by the interface */
    universe: number;
    enabled: boolean;
}

/** Connection of an interface */
export type UsbDmxStatus = 'connected' | 'missing' | 'error' | 'disabled';

/**
 * Checks and copies an interface; null if it is not valid.
 */
export function normalizeUsbDmxDevice(value: unknown): UsbDmxDevice | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const input = value as Partial<Record<keyof UsbDmxDevice, unknown>>;
    if (typeof input.id !== 'string' || input.id === '' || typeof input.path !== 'string' || input.path === ''
        || !USB_DMX_TYPES.includes(input.type as UsbDmxType)
        || !Number.isInteger(input.universe) || (input.universe as number) < 1 || (input.universe as number) > MAX_UNIVERSE) {
        return null;
    }
    return { id: input.id, path: input.path, type: input.type as UsbDmxType, universe: input.universe as number, enabled: input.enabled !== false };
}
