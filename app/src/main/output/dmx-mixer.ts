/**
 * Merge of the DMX sources into the frame of a universe. Sources (the
 * programmer, playbacks, cues of the next phases) write channel levels;
 * intensity channels take the highest level (HTP), the others the level
 * written last (LTP). The grand master and the blackout then scale the
 * intensity channels, 16-bit pairs included.
 */

import { UNIVERSE_SIZE } from '../../shared/fixtures/fixture-definition';
import type { UniverseMap } from './channel-map';

/** Level written by a source, with the order of writing for LTP */
interface SourceLevel {
    value: number;
    stamp: number;
}

export class DmxMixer {
    // source -> universe -> channel index -> level
    private readonly sources = new Map<string, Map<number, Map<number, SourceLevel>>>();
    private stamp = 0;

    /**
     * Writes levels of a source.
     * @param levels - Pairs of DMX address (1 to 512) and value (0 to 255)
     */
    setLevels(source: string, universe: number, levels: ReadonlyArray<readonly [number, number]>): void {
        const universes = this.sources.get(source) ?? new Map<number, Map<number, SourceLevel>>();
        this.sources.set(source, universes);
        const channels = universes.get(universe) ?? new Map<number, SourceLevel>();
        universes.set(universe, channels);
        this.stamp++;
        for (const [address, value] of levels) {
            if (address >= 1 && address <= UNIVERSE_SIZE) {
                channels.set(address - 1, { value: Math.max(0, Math.min(255, Math.round(value))), stamp: this.stamp });
            }
        }
    }

    /**
     * Removes all the levels of a source.
     */
    clearSource(source: string): void {
        this.sources.delete(source);
    }

    /**
     * Frame of a universe.
     * @param master - Grand master, 0 to 1 (0 also for blackout)
     */
    compose(universe: number, map: UniverseMap | undefined, master: number): Uint8Array {
        const frame = map === undefined ? new Uint8Array(UNIVERSE_SIZE) : map.defaults.slice();
        const latest = new Float64Array(UNIVERSE_SIZE);
        const htpSet = new Uint8Array(UNIVERSE_SIZE);

        for (const universes of this.sources.values()) {
            const channels = universes.get(universe);
            if (channels === undefined) {
                continue;
            }
            for (const [index, level] of channels) {
                if (map?.intensity[index] === 1) {
                    // HTP: the first source replaces the default, the next ones only raise it
                    frame[index] = htpSet[index] === 1 ? Math.max(frame[index], level.value) : level.value;
                    htpSet[index] = 1;
                } else if (level.stamp > latest[index]) {
                    frame[index] = level.value;
                    latest[index] = level.stamp;
                }
            }
        }

        if (map !== undefined && master < 1) {
            this.scale(frame, map, master);
        }
        return frame;
    }

    /**
     * Scales the intensity channels by the master; 16-bit pairs are scaled as one value.
     */
    private scale(frame: Uint8Array, map: UniverseMap, master: number): void {
        const fine = new Set<number>();
        for (const [high, low] of map.finePairs) {
            const value = Math.round(((frame[high] << 8) | frame[low]) * master);
            frame[high] = value >> 8;
            frame[low] = value & 0xff;
            fine.add(high);
            fine.add(low);
        }
        for (let index = 0; index < UNIVERSE_SIZE; index++) {
            if (map.intensity[index] === 1 && !fine.has(index)) {
                frame[index] = Math.round(frame[index] * master);
            }
        }
    }
}
