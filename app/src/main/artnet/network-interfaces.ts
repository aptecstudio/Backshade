/**
 * IPv4 network interfaces of the computer, with their broadcast address,
 * for the choice of the network used by Art-Net.
 */

import os from 'node:os';
import type { NetworkInterfaceInfo } from '../../shared/transport/engine-api';

function toNumber(address: string): number {
    return address.split('.').reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function toAddress(value: number): string {
    return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}

/**
 * Broadcast address of a network, from an address and its netmask.
 */
export function broadcastAddress(address: string, netmask: string): string {
    return toAddress((toNumber(address) | ~toNumber(netmask)) >>> 0);
}

/**
 * IPv4 interfaces, the loopback last.
 */
export function listNetworkInterfaces(): NetworkInterfaceInfo[] {
    const result: NetworkInterfaceInfo[] = [];
    for (const [name, entries] of Object.entries(os.networkInterfaces())) {
        for (const entry of entries ?? []) {
            if (entry.family !== 'IPv4') {
                continue;
            }
            result.push({
                name,
                address: entry.address,
                netmask: entry.netmask,
                broadcast: entry.internal ? entry.address : broadcastAddress(entry.address, entry.netmask),
                internal: entry.internal
            });
        }
    }
    return result.sort((a, b) => Number(a.internal) - Number(b.internal) || a.name.localeCompare(b.name));
}
