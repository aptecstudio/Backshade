/**
 * Engine of the two-preset desk. It keeps the fader levels of every
 * universe and writes the result into the mixer as one source:
 * - A/B mode: each channel takes the highest of A x Master A and
 *   B x Master B (reversed), the classic two-scene crossfade;
 * - single mode: the two rows are 24 consecutive channels under Master A;
 * - flash keys put their channel at full, ignoring the masters.
 * Only channels above 0 are written, so a fader at 0 never takes a
 * channel from another source. With blind on, the output stays as it was
 * while the faders change; full on is applied by the output engine.
 */

import { UNIVERSE_SIZE } from '../../shared/fixtures/fixture-definition';
import { masterBLevel, type PresetDeskState, type PresetLevels, type PresetMaster, type PresetMode, type PresetRow } from '../../shared/console/preset-desk';
import type { DmxMixer } from '../output/dmx-mixer';

/** Source name of the desk in the mixer */
export const PRESET_SOURCE = 'preset';

interface UniverseLevels {
    a: Uint8Array;
    b: Uint8Array;
}

export class PresetDesk {
    private readonly mixer: DmxMixer;
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

    constructor(mixer: DmxMixer) {
        this.mixer = mixer;
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
        this.universeLevels(universe)[row][channel - 1] = Math.max(0, Math.min(255, Math.round(value)));
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
        }
        this.flashes.clear();
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
        const { mode, masters } = this.state;
        const levelA = masters.a;
        const levelB = mode === 'ab' ? masterBLevel(masters.b) : 0;
        for (const [universe, levels] of this.levels) {
            const result: Array<[number, number]> = [];
            for (let index = 0; index < UNIVERSE_SIZE; index++) {
                const channel = index + 1;
                let value = Math.max(levels.a[index] * levelA, levels.b[index] * levelB);
                if (this.flashes.has(`a:${universe}:${channel}`) || this.flashes.has(`b:${universe}:${channel}`)) {
                    value = 255;
                }
                if (value > 0) {
                    result.push([channel, value]);
                }
            }
            if (result.length > 0) {
                this.mixer.setLevels(PRESET_SOURCE, universe, result);
            }
        }
    }

    private universeLevels(universe: number): UniverseLevels {
        let levels = this.levels.get(universe);
        if (levels === undefined) {
            levels = { a: new Uint8Array(UNIVERSE_SIZE), b: new Uint8Array(UNIVERSE_SIZE) };
            this.levels.set(universe, levels);
        }
        return levels;
    }
}
