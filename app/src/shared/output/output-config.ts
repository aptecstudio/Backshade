/**
 * Output configuration of a show, saved in show.json under "output":
 * frame rate and, for each universe, its Art-Net destination. Universes
 * without an entry use the default: Port-Address universe - 1, broadcast.
 * The network interface depends on the computer and is a workstation setting.
 */

import { MAX_UNIVERSE } from '../patch/patch.js';

/** Highest Art-Net Port-Address (15 bits) */
export const MAX_PORT_ADDRESS = 32767;

/** Limits and default of the output frame rate, in frames per second (DMX allows about 44) */
export const FRAME_RATE = { min: 1, max: 44, default: 40 } as const;

/** Most unicast destinations of a universe */
export const MAX_TARGETS = 16;

/** How the frames of a universe are sent */
export type OutputTransport = 'broadcast' | 'unicast';

/** Art-Net destination of a universe */
export interface OutputUniverse {
    /** Backshade universe, from 1 */
    universe: number;
    /** The universe is sent */
    enabled: boolean;
    /** Art-Net Port-Address: Net (7 bits), Sub-Net (4 bits) and Universe (4 bits) */
    portAddress: number;
    transport: OutputTransport;
    /** IPv4 addresses of the nodes, for unicast */
    targets: string[];
}

/** Output section of show.json */
export interface ShowOutput {
    frameRate: number;
    universes: OutputUniverse[];
}

/** Output of a new show */
export const DEFAULT_OUTPUT: ShowOutput = { frameRate: FRAME_RATE.default, universes: [] };

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/**
 * Tells whether a text is an IPv4 address.
 */
export function isIpv4(value: string): boolean {
    return IPV4_PATTERN.test(value);
}

/**
 * Default destination of a universe: Port-Address universe - 1, broadcast.
 */
export function defaultOutputUniverse(universe: number): OutputUniverse {
    return { universe, enabled: true, portAddress: Math.min(universe - 1, MAX_PORT_ADDRESS), transport: 'broadcast', targets: [] };
}

/**
 * Destination of a universe, configured or default.
 */
export function outputUniverse(output: ShowOutput, universe: number): OutputUniverse {
    return output.universes.find((item) => item.universe === universe) ?? defaultOutputUniverse(universe);
}

/**
 * Port-Address as Net, Sub-Net and Universe, for example "0:0:1".
 */
export function formatPortAddress(portAddress: number): string {
    return `${portAddress >> 8}:${(portAddress >> 4) & 0xf}:${portAddress & 0xf}`;
}

/**
 * Checks and copies the destination of a universe; null if it is not valid.
 */
export function normalizeOutputUniverse(value: unknown): OutputUniverse | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const input = value as Partial<Record<keyof OutputUniverse, unknown>>;
    const integer = (item: unknown, min: number, max: number): item is number =>
        Number.isInteger(item) && (item as number) >= min && (item as number) <= max;
    if (!integer(input.universe, 1, MAX_UNIVERSE) || !integer(input.portAddress, 0, MAX_PORT_ADDRESS)
        || (input.transport !== 'broadcast' && input.transport !== 'unicast')) {
        return null;
    }
    const targets = Array.isArray(input.targets)
        ? [...new Set(input.targets.filter((item): item is string => typeof item === 'string' && isIpv4(item)))].slice(0, MAX_TARGETS)
        : [];
    return {
        universe: input.universe,
        enabled: input.enabled !== false,
        portAddress: input.portAddress,
        transport: input.transport,
        targets
    };
}

/**
 * Reads the output section of a file; invalid values take the default.
 */
export function normalizeOutput(value: unknown): ShowOutput {
    const input = typeof value === 'object' && value !== null ? value as { frameRate?: unknown; universes?: unknown } : {};
    const frameRate = Number.isInteger(input.frameRate) && (input.frameRate as number) >= FRAME_RATE.min && (input.frameRate as number) <= FRAME_RATE.max
        ? input.frameRate as number
        : FRAME_RATE.default;
    const universes: OutputUniverse[] = [];
    for (const item of Array.isArray(input.universes) ? input.universes : []) {
        const universe = normalizeOutputUniverse(item);
        if (universe !== null && !universes.some((other) => other.universe === universe.universe)) {
            universes.push(universe);
        }
    }
    universes.sort((a, b) => a.universe - b.universe);
    return { frameRate, universes };
}
