/**
 * Global application settings, saved in the user data
 * folder and separate from the show settings.
 */

import path from 'node:path';
import { app } from 'electron';
import { normalizeUsbDmxDevice, type UsbDmxDevice } from '../../shared/output/usb-dmx';
import type { AppSettings } from '../../shared/transport/engine-api';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';

function settingsFile(): string {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * Default values: new shows go to Documents/Backshade/Shows; DMX output
 * is on, with Art-Net on all the network interfaces.
 */
function defaults(): AppSettings {
    return {
        defaultShowsFolder: path.join(app.getPath('documents'), 'Backshade', 'Shows'),
        artNetInterface: '',
        outputEnabled: true,
        usbDmxDevices: []
    };
}

/**
 * Reads the settings; missing or invalid values take the default.
 */
export function readSettings(): AppSettings {
    const result = defaults();
    try {
        const data = readJsonFile(settingsFile()) as Partial<AppSettings> | undefined;
        if (typeof data?.defaultShowsFolder === 'string' && data.defaultShowsFolder !== '') {
            result.defaultShowsFolder = data.defaultShowsFolder;
        }
        if (typeof data?.artNetInterface === 'string') {
            result.artNetInterface = data.artNetInterface;
        }
        if (typeof data?.outputEnabled === 'boolean') {
            result.outputEnabled = data.outputEnabled;
        }
        if (Array.isArray(data?.usbDmxDevices)) {
            result.usbDmxDevices = data.usbDmxDevices
                .map(normalizeUsbDmxDevice)
                .filter((device): device is UsbDmxDevice => device !== null);
        }
    } catch (error) {
        console.warn('Unreadable settings, using the default values', error);
    }
    return result;
}

/**
 * Saves the given settings, keeping the others.
 */
export function updateSettings(changes: Partial<AppSettings>): AppSettings {
    const next = { ...readSettings(), ...changes };
    writeJsonFileAtomic(settingsFile(), next);
    return next;
}
