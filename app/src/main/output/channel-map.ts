/**
 * Map of the DMX channels of every universe, built from the patch and the
 * fixture definitions: default values, channels merged with HTP (highest
 * takes precedence, the intensity channels) and channels scaled by the
 * grand master and blackout. Every other channel is merged with LTP
 * (latest takes precedence). Fixtures without definition keep their
 * channels at 0. Channels of LED matrices are intensity channels.
 */

import { UNIVERSE_SIZE, type FixtureAttribute, type FixtureDefinition } from '../../shared/fixtures/fixture-definition';
import { matrixSegments } from '../../shared/patch/matrix';
import type { ShowPatch } from '../../shared/patch/patch';

/** Channels of one universe; indexes are addresses - 1 */
export interface UniverseMap {
    /** Value when no source controls the channel */
    defaults: Uint8Array;
    /** 1 for the intensity channels, merged with HTP and scaled by the master */
    intensity: Uint8Array;
    /** Intensity channels with 16 bits: index of the high byte and of the low byte */
    finePairs: Array<[number, number]>;
    /** Every 16-bit channel (intensity or not): index of the high byte and of the low byte */
    widePairs: Array<[number, number]>;
    /** 1 for the channels used by a fixture */
    patched: Uint8Array;
}

// Color channels that give the intensity of fixtures without a dimmer channel
const ADDITIVE_COLORS: ReadonlySet<FixtureAttribute> = new Set([
    'red', 'green', 'blue', 'white', 'warmWhite', 'coldWhite', 'amber', 'uv', 'lime'
]);

function emptyUniverse(): UniverseMap {
    return {
        defaults: new Uint8Array(UNIVERSE_SIZE),
        intensity: new Uint8Array(UNIVERSE_SIZE),
        finePairs: [],
        widePairs: [],
        patched: new Uint8Array(UNIVERSE_SIZE)
    };
}

/**
 * Builds the map of every universe used by the patch.
 */
export function buildChannelMap(patch: ShowPatch, lookup: (id: string) => FixtureDefinition | undefined): Map<number, UniverseMap> {
    const universes = new Map<number, UniverseMap>();
    for (const fixture of patch.fixtures) {
        const map = universes.get(fixture.universe) ?? emptyUniverse();
        universes.set(fixture.universe, map);

        map.patched.fill(1, fixture.address - 1, Math.min(UNIVERSE_SIZE, fixture.address - 1 + fixture.channelCount));
        const definition = lookup(fixture.definition);
        const mode = definition?.modes.find((item) => item.name === fixture.mode);
        if (definition === undefined || mode === undefined) {
            continue;
        }
        const channels = new Map(definition.channels.map((channel) => [channel.key, channel]));
        const inMode = mode.channels.map((key) => channels.get(key));
        // With a dimmer channel the dimmer gives the intensity, otherwise the additive colors
        const hasDimmer = inMode.some((channel) => channel?.attribute === 'dimmer');
        const isIntensity = (attribute: FixtureAttribute): boolean => hasDimmer ? attribute === 'dimmer' : ADDITIVE_COLORS.has(attribute);

        const indexOf = new Map<string, number>();
        mode.channels.forEach((key, offset) => {
            const index = fixture.address - 1 + offset;
            const channel = channels.get(key);
            if (channel === undefined || index >= UNIVERSE_SIZE || offset >= fixture.channelCount) {
                return;
            }
            indexOf.set(key, index);
            map.defaults[index] = channel.defaultValue ?? 0;
            if (isIntensity(channel.attribute)) {
                map.intensity[index] = 1;
            }
        });
        for (const channel of definition.channels) {
            const fine = indexOf.get(channel.key);
            const coarse = channel.fineOf === undefined ? undefined : indexOf.get(channel.fineOf);
            if (fine === undefined || coarse === undefined) {
                continue;
            }
            map.widePairs.push([coarse, fine]);
            if (map.intensity[coarse] === 1) {
                map.finePairs.push([coarse, fine]);
            }
        }
    }
    // Matrix pixels are additive colors without a dimmer: intensity channels
    for (const matrix of patch.matrices) {
        for (const segment of matrixSegments(matrix)) {
            const map = universes.get(segment.universe) ?? emptyUniverse();
            universes.set(segment.universe, map);
            const end = segment.address - 1 + segment.channelCount;
            map.patched.fill(1, segment.address - 1, end);
            map.intensity.fill(1, segment.address - 1, end);
        }
    }
    return universes;
}
