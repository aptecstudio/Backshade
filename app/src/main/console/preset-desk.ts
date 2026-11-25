/**
 * Engine of the two-preset desk. It keeps the fader levels of every
 * universe and writes the result into the mixer as one source.
 * Masters act only on the intensity channels (and on the channels
 * without a fixture), so movements and colors never jump with a crossfade:
 * - A/B mode: an intensity channel takes the highest of A x Master A and
 *   B x Master B (reversed), the classic two-scene crossfade; any other
 *   channel takes the level of the row moved last (LTP);
 * - single mode: the two rows are 24 consecutive channels under Master A;
 * - flash keys put their channel at full, ignoring the masters.
 * Intensity channels are written only above 0, the other channels only once
 * a fader moved them, so the desk never takes a channel from another
 * source or from its default value without reason. With blind on, the
 * output stays as it was while the faders change; full on is applied by the
 * output engine.
 */

import { UNIVERSE_SIZE } from '../../shared/fixtures/fixture-definition';
import { masterBLevel, type PresetDeskState, type PresetLevels, type PresetMaster, type PresetMode, type PresetRow } from '../../shared/console/preset-desk';
import type { UniverseMap } from '../output/channel-map';
import type { DmxMixer } from '../output/dmx-mixer';

/** Source name of the desk in the mixer */
export const PRESET_SOURCE = 'preset';

/** Channel map of a universe, undefined when no fixture is patched on it */
export type UniverseMapLookup = (universe: number) => UniverseMap | undefined;

// Bits of UniverseLevels.touched
const TOUCHED_A = 1;
const TOUCHED_B = 2;

interface UniverseLevels {
    a: Uint8Array;
    b: Uint8Array;
    /** Rows that moved each channel since the last home */
    touched: Uint8Array;
    /** Row that moved each channel last: 0 for A, 1 for B */
    lastRow: Uint8Array;
}

export class PresetDesk {
    private readonly mixer: DmxMixer;
    private readonly mapOf: UniverseMapLookup;
    private readonly levels = new Map<number, UniverseLevels>();
    private readonly flashes = new Set<string>();
    private state: PresetDeskState = {
        mode: 'ab',
        universe: 1,
        firstChannel: 1,
        masters: { a: 1, b: 1, scene: 1 },
        blind: false,
        fullOn: false
    };

    constructor(mixer: DmxMixer, mapOf: UniverseMapLookup) {
        this.mixer = mixer;
        this.mapOf = mapOf;
    }

    getState(): PresetDeskState {
        return { ...this.state, masters: { ...this.state.masters } };
    }

    /**
     * Fader levels of a universe.
     */
    getLevels(universe: number): PresetLevels {
        const levels = this.universeLevels(universe);
        return { universe, a: [...levels.a], b: [...levels.b] };
    }

    setFader(row: PresetRow, universe: number, channel: number, value: number): void {
        this.setLevels(row, universe, [[channel, value]]);
    }

    /**
     * Moves several faders of a row at once, for example the channels of the
     * fixtures selected in the attributes panel.
     * @param levels - Pairs of DMX channel (1 to 512) and value (0 to 255)
     */
    setLevels(row: PresetRow, universe: number, levels: ReadonlyArray<readonly [number, number]>): void {
        const target = this.universeLevels(universe);
        for (const [channel, value] of levels) {
            const index = channel - 1;
            if (index < 0 || index >= UNIVERSE_SIZE) {
                continue;
            }
            target[row][index] = Math.max(0, Math.min(255, Math.round(value)));
            target.touched[index] |= row === 'a' ? TOUCHED_A : TOUCHED_B;
            target.lastRow[index] = row === 'a' ? 0 : 1;
        }
        this.apply();
    }

    setMaster(master: PresetMaster, position: number): void {
        this.state.masters[master] = Math.max(0, Math.min(1, position));
        this.apply();
    }

    setFlash(row: PresetRow, universe: number, channel: number, on: boolean): void {
        const key = `${row}:${universe}:${channel}`;
        if (on) {
            this.flashes.add(key);
        } else {
            this.flashes.delete(key);
        }
        this.apply();
    }

    setMode(mode: PresetMode): void {
        this.state.mode = mode;
        this.apply();
    }

    /**
     * Moves the faders to a bank of channels of a universe.
     */
    setBank(universe: number, firstChannel: number): void {
        this.state.universe = universe;
        this.state.firstChannel = Math.max(1, Math.min(UNIVERSE_SIZE, firstChannel));
    }

    setBlind(on: boolean): void {
        this.state.blind = on;
        this.apply();
    }

    setFullOn(on: boolean): void {
        this.state.fullOn = on;
    }

    /**
     * Brings every fader of every universe back to 0.
     */
    home(): void {
        for (const levels of this.levels.values()) {
            levels.a.fill(0);
            levels.b.fill(0);
            levels.touched.fill(0);
        }
        this.flashes.clear();
        this.apply();
    }

    /**
     * Writes the result again, for example after the patch changed which
     * channels are intensity channels.
     */
    refresh(): void {
        this.apply();
    }

    /**
     * Writes the result of the desk into the mixer, unless blind is on.
     */
    private apply(): void {
        if (this.state.blind) {
            return;
        }
        this.mixer.clearSource(PRESET_SOURCE);
        for (const [universe, levels] of this.levels) {
            const result = this.compose(universe, levels, this.mapOf(universe));
            if (result.length > 0) {
                this.mixer.setLevels(PRESET_SOURCE, universe, result);
            }
        }
    }

    /**
     * Result of the desk on a universe, as pairs of channel and value.
     */
    private compose(universe: number, levels: UniverseLevels, map: UniverseMap | undefined): Array<[number, number]> {
        const { mode, masters } = this.state;
        const levelA = masters.a;
        const levelB = mode === 'ab' ? masterBLevel(masters.b) : 0;
        const flashed = (index: number): boolean => this.flashes.has(`a:${universe}:${index + 1}`) || this.flashes.has(`b:${universe}:${index + 1}`);
        const result: Array<[number, number]> = [];
        const done = new Uint8Array(UNIVERSE_SIZE);

        // 16-bit intensity pairs are scaled by the masters as one value
        for (const [high, low] of map?.finePairs ?? []) {
            const wide = (row: Uint8Array): number => (row[high] << 8) | row[low];
            let value = Math.round(Math.max(wide(levels.a) * levelA, wide(levels.b) * levelB));
            if (flashed(high) || flashed(low)) {
                value = 0xffff;
            }
            done[high] = 1;
            done[low] = 1;
            if (value > 0) {
                result.push([high + 1, value >> 8], [low + 1, value & 0xff]);
            }
        }

        for (let index = 0; index < UNIVERSE_SIZE; index++) {
            if (done[index] === 1) {
                continue;
            }
            const mastered = map === undefined || map.patched[index] === 0 || map.intensity[index] === 1;
            if (mastered) {
                const value = flashed(index) ? 255 : Math.max(levels.a[index] * levelA, levels.b[index] * levelB);
                if (value > 0) {
                    result.push([index + 1, value]);
                }
                continue;
            }
            // In single mode only row A is used; in A/B mode the row moved last wins
            const row = mode === 'single' || levels.lastRow[index] === 0 ? 'a' : 'b';
            const touched = (levels.touched[index] & (row === 'a' ? TOUCHED_A : TOUCHED_B)) !== 0;
            if (flashed(index)) {
                result.push([index + 1, 255]);
            } else if (touched) {
                result.push([index + 1, levels[row][index]]);
            }
        }
        return result;
    }

    private universeLevels(universe: number): UniverseLevels {
        let levels = this.levels.get(universe);
        if (levels === undefined) {
            levels = {
                a: new Uint8Array(UNIVERSE_SIZE),
                b: new Uint8Array(UNIVERSE_SIZE),
                touched: new Uint8Array(UNIVERSE_SIZE),
                lastRow: new Uint8Array(UNIVERSE_SIZE)
            };
            this.levels.set(universe, levels);
        }
        return levels;
    }
}
