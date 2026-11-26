/**
 * Which channels of a universe the masters scale: intensity channels of
 * the patched fixtures and channels without a fixture, with the 16-bit
 * pairs that are faded as one value. Used by the playback of scenes and
 * chasers.
 */

import type { UniverseMap } from '../output/channel-map';

export class IntensityMap {
    private readonly map: UniverseMap | undefined;
    private readonly lowOf = new Map<number, number>();
    private readonly lows = new Set<number>();

    constructor(map: UniverseMap | undefined) {
        this.map = map;
        for (const [high, low] of map?.widePairs ?? []) {
            this.lowOf.set(high, low);
            this.lows.add(low);
        }
    }

    /** The channel (index = address - 1) is scaled by the masters and merged HTP */
    scaled(index: number): boolean {
        return this.map === undefined || this.map.patched[index] === 0 || this.map.intensity[index] === 1;
    }

    /** Low byte of a 16-bit channel, undefined for 8 bits */
    low(index: number): number | undefined {
        return this.lowOf.get(index);
    }

    /** The channel is the low byte of a 16-bit channel */
    isLow(index: number): boolean {
        return this.lows.has(index);
    }
}

/** Values of the channels of a universe: index (address - 1) -> value 0 to 255 */
export type ChannelValues = ReadonlyMap<number, number>;

/** What the other channels fade from (fade in) or back to (fade out) */
export interface FadeBase {
    /** Output of the universe without the memory, index = address - 1 */
    values: ArrayLike<number>;
    /** Fade level of the memory, 0 to 1 */
    level: number;
}

/**
 * Levels of a memory on a universe. Intensity channels crossfade from one
 * set of values to another and are scaled by a factor (fade and scene
 * master). The other channels crossfade too, but are not scaled: during a
 * fade they move between the output without the memory and their values.
 * 16-bit channels move as one value.
 * @param from - Values the crossfade starts from, null for none
 * @param to - Target values
 * @param progress - Crossfade progress, 0 to 1
 * @param factor - Scale of the intensity channels, 0 to 1
 * @param base - Output the other channels fade from or back to, null when the memory is at full
 * @returns pairs of DMX address and value
 */
export function mixLevels(
    from: ChannelValues | null,
    to: ChannelValues,
    progress: number,
    factor: number,
    intensity: IntensityMap,
    base: FadeBase | null = null
): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    const indexes = new Set([...to.keys(), ...(from?.keys() ?? [])]);
    for (const index of [...indexes].sort((a, b) => a - b)) {
        if (intensity.isLow(index)) {
            continue;
        }
        const low = intensity.low(index);
        const read = (values: ArrayLike<number> | ChannelValues | null | undefined): number | undefined => {
            const get = (at: number): number | undefined => values === null || values === undefined
                ? undefined
                : 'get' in values ? (values as ChannelValues).get(at) : (values as ArrayLike<number>)[at];
            const high = get(index);
            if (low === undefined || high === undefined) {
                return high;
            }
            return (high << 8) | (get(low) ?? 0);
        };
        const target = read(to);
        const source = read(from);
        let value: number;
        if (intensity.scaled(index)) {
            value = ((source ?? 0) * (1 - progress) + (target ?? 0) * progress) * factor;
            if (Math.round(value) <= 0) {
                continue;
            }
        } else {
            // A channel the target does not use is left to the other sources
            if (target === undefined) {
                continue;
            }
            value = source === undefined ? target : source * (1 - progress) + target * progress;
            const start = base === null ? undefined : read(base.values);
            if (base !== null && start !== undefined && base.level < 1) {
                value = start + (value - start) * base.level;
            }
        }
        const rounded = Math.round(value);
        if (low === undefined) {
            result.push([index + 1, rounded]);
        } else {
            result.push([index + 1, rounded >> 8], [low + 1, rounded & 0xff]);
        }
    }
    return result;
}
