/**
 * Access to the serial ports through the native bindings of serialport.
 * The bindings are loaded on first use; if they cannot be loaded (an
 * unsupported platform) USB DMX is reported as unavailable instead of
 * stopping the engine.
 */

import type { AutoDetectTypes, PortInfo } from '@serialport/bindings-cpp';

let binding: AutoDetectTypes | null | undefined;

/**
 * Binding of the platform, or null if it is not available.
 */
export function serialBinding(): AutoDetectTypes | null {
    if (binding === undefined) {
        try {
            // Loaded lazily, so a missing native module only disables USB DMX
            const module = require('@serialport/bindings-cpp') as typeof import('@serialport/bindings-cpp');
            binding = module.autoDetect();
        } catch (error) {
            console.warn('Serial ports not available', error);
            binding = null;
        }
    }
    return binding;
}

/**
 * Serial ports of the computer; empty if they cannot be listed.
 */
export async function listSerialPorts(): Promise<PortInfo[]> {
    const current = serialBinding();
    if (current === null) {
        return [];
    }
    try {
        return await current.list();
    } catch (error) {
        console.warn('Serial ports not listed', error);
        return [];
    }
}
