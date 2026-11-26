/**
 * Intensity of the fixture groups, set by the group faders of the grid:
 * each group puts the intensity channels of its fixtures at its level
 * (16-bit channels as one value). It is one source of the mixer, merged
 * HTP with the desk and the memories, like the submasters of a desk.
 */

import type { ShowPatch } from '../../shared/patch/patch';
import type { DmxMixer } from '../output/dmx-mixer';
import type { UniverseMapLookup } from './preset-desk';

/** Source name of the group levels in the mixer */
export const GROUP_SOURCE = 'groups';

export class GroupLevels {
    private readonly mixer: DmxMixer;
    private readonly patch: () => ShowPatch | null;
    private readonly mapOf: UniverseMapLookup;
    private readonly levels = new Map<string, number>();

    constructor(mixer: DmxMixer, patch: () => ShowPatch | null, mapOf: UniverseMapLookup) {
        this.mixer = mixer;
        this.patch = patch;
        this.mapOf = mapOf;
    }

    /** Levels of the groups above zero: group identifier -> level 0 to 1 */
    get(): Record<string, number> {
        return Object.fromEntries(this.levels);
    }

    set(id: string, level: number): void {
        const value = Math.max(0, Math.min(1, level));
        if (value > 0) {
            this.levels.set(id, value);
        } else {
            this.levels.delete(id);
        }
        this.apply();
    }

    /**
     * Forgets the levels of deleted groups and writes again, after a change of the patch.
     */
    refresh(): void {
        const ids = new Set(this.patch()?.groups.map((group) => group.id) ?? []);
        for (const id of [...this.levels.keys()]) {
            if (!ids.has(id)) {
                this.levels.delete(id);
            }
        }
        this.apply();
    }

    clear(): void {
        this.levels.clear();
        this.apply();
    }

    private apply(): void {
        const patch = this.patch();
        const output = new Map<number, Map<number, number>>();
        for (const group of patch?.groups ?? []) {
            const level = this.levels.get(group.id);
            if (level === undefined) {
                continue;
            }
            for (const id of group.fixtures) {
                const fixture = patch?.fixtures.find((item) => item.id === id);
                const map = fixture === undefined ? undefined : this.mapOf(fixture.universe);
                if (fixture === undefined || map === undefined) {
                    continue;
                }
                const channels = output.get(fixture.universe) ?? new Map<number, number>();
                output.set(fixture.universe, channels);
                const first = fixture.address - 1;
                const last = first + fixture.channelCount - 1;
                const lows = new Map(map.finePairs.filter(([high]) => high >= first && high <= last));
                const lowSet = new Set(lows.values());
                for (let index = first; index <= last; index++) {
                    if (map.intensity[index] !== 1 || lowSet.has(index)) {
                        continue;
                    }
                    const low = lows.get(index);
                    // HTP between groups that share a fixture
                    if (low === undefined) {
                        channels.set(index + 1, Math.max(channels.get(index + 1) ?? 0, Math.round(level * 255)));
                    } else {
                        const wide = Math.round(level * 0xffff);
                        if (wide >= (((channels.get(index + 1) ?? 0) << 8) | (channels.get(low + 1) ?? 0))) {
                            channels.set(index + 1, wide >> 8);
                            channels.set(low + 1, wide & 0xff);
                        }
                    }
                }
            }
        }
        this.mixer.replaceSource(GROUP_SOURCE, new Map([...output].map(([universe, channels]) => [universe, [...channels]])));
    }
}
