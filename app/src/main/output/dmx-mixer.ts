/**
 * Merge of the DMX sources into the frame of a universe. Sources (the
 * desk, scenes, chasers, cues of the next phases) write channel levels;
 * intensity channels and channels without a fixture take the highest level
 * (HTP), the others the level written last (LTP). The grand master and the
 * blackout then scale the same channels, 16-bit pairs included.
 */

import { UNIVERSE_SIZE } from '../../shared/fixtures/fixture-definition';
import type { UniverseMap } from './channel-map';

/** Level written by a source, with the order of writing for LTP */
interface SourceLevel {
    value: number;
    stamp: number;
}

/**
 * Tells whether a channel is merged HTP and scaled by the master: the
 * intensity channels of the fixtures and every channel without a fixture
 * (for example dimmers driven on raw channels).
 */
function isIntensity(map: UniverseMap | undefined, index: number): boolean {
    return map === undefined || map.patched[index] === 0 || map.intensity[index] === 1;
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
     * Replaces all the levels of a source. Channels that keep their value
     * keep their order of writing, so a source that writes again the same
     * values (a desk after a fader move, a scene during a fade) never takes
     * an LTP channel from a source written after it.
     * @param universes - Universe -> pairs of DMX address (1 to 512) and value (0 to 255)
     */
    replaceSource(source: string, universes: ReadonlyMap<number, ReadonlyArray<readonly [number, number]>>): void {
        const previous = this.sources.get(source);
        const next = new Map<number, Map<number, SourceLevel>>();
        this.stamp++;
        for (const [universe, levels] of universes) {
            const before = previous?.get(universe);
            const channels = new Map<number, SourceLevel>();
            for (const [address, raw] of levels) {
                if (address < 1 || address > UNIVERSE_SIZE) {
                    continue;
                }
                const value = Math.max(0, Math.min(255, Math.round(raw)));
                const old = before?.get(address - 1);
                channels.set(address - 1, old !== undefined && old.value === value ? old : { value, stamp: this.stamp });
            }
            if (channels.size > 0) {
                next.set(universe, channels);
            }
        }
        if (next.size === 0) {
            this.sources.delete(source);
        } else {
            this.sources.set(source, next);
        }
    }

    /**
     * Universes where at least one source writes levels.
     */
    universes(): number[] {
        const numbers = new Set<number>();
        for (const universes of this.sources.values()) {
            for (const [universe, channels] of universes) {
                if (channels.size > 0) {
                    numbers.add(universe);
                }
            }
        }
        return [...numbers];
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
     * @param exclude - Source left out, to know what a source fades from or back to
     */
    compose(universe: number, map: UniverseMap | undefined, master: number, exclude?: string): Uint8Array {
        const frame = map === undefined ? new Uint8Array(UNIVERSE_SIZE) : map.defaults.slice();
        const latest = new Float64Array(UNIVERSE_SIZE);
        const htpSet = new Uint8Array(UNIVERSE_SIZE);

        for (const [source, universes] of this.sources) {
            if (source === exclude) {
                continue;
            }
            const channels = universes.get(universe);
            if (channels === undefined) {
                continue;
            }
            for (const [index, level] of channels) {
                if (isIntensity(map, index)) {
                    // HTP: the first source replaces the default, the next ones only raise it
                    frame[index] = htpSet[index] === 1 ? Math.max(frame[index], level.value) : level.value;
                    htpSet[index] = 1;
                } else if (level.stamp > latest[index]) {
                    frame[index] = level.value;
                    latest[index] = level.stamp;
                }
            }
        }

        if (master < 1) {
            this.scale(frame, map, master);
        }
        return frame;
    }

    /**
     * Scales the intensity channels by the master; 16-bit pairs are scaled as one value.
     */
    private scale(frame: Uint8Array, map: UniverseMap | undefined, master: number): void {
        const fine = new Set<number>();
        for (const [high, low] of map?.finePairs ?? []) {
            const value = Math.round(((frame[high] << 8) | frame[low]) * master);
            frame[high] = value >> 8;
            frame[low] = value & 0xff;
            fine.add(high);
            fine.add(low);
        }
        for (let index = 0; index < UNIVERSE_SIZE; index++) {
            if (isIntensity(map, index) && !fine.has(index)) {
                frame[index] = Math.round(frame[index] * master);
            }
        }
    }
}
