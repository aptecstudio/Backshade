/**
 * What a fixture does with the DMX values of its channels: light, color,
 * shutter, position and beam. Used by the live view of the 3D stage.
 */

import type { FixtureAttribute, FixtureCapability, FixtureChannel, FixtureDefinition } from '../fixtures/fixture-definition.js';
import { EMITTERS, hexColor, hueColor, temperatureColor, type Rgb } from './light-color.js';
import type { LightProfile } from './light-profile.js';

export type ShutterKind = 'open' | 'strobe' | 'pulse' | 'random';

export interface FixtureLight {
    /** Light output, 0 to 1, before strobe */
    level: number;
    color: Rgb;
    shutter: ShutterKind;
    /** Flashes per second of strobe, pulse and random */
    rate: number;
    /** Degrees from the centre of the travel */
    pan: number;
    tilt: number;
    /** Beam angle in degrees */
    angle: number;
    /** Speed of the movements, 0 to 1 of the fastest */
    speed: number;
}

/** Slowest and fastest strobe, flashes per second */
const RATES = { min: 1, max: 15 };

interface Value {
    channel: FixtureChannel;
    /** Value from 0 to 255 */
    dmx: number;
    /** Value from 0 to 1, with the fine channel when there is one */
    amount: number;
}

/** Values of the channels of a mode, fine channels merged with their coarse ones */
function read(definition: FixtureDefinition, modeName: string, values: ArrayLike<number>): Value[] {
    const keys = definition.modes.find((mode) => mode.name === modeName)?.channels ?? [];
    const channels = new Map(definition.channels.map((channel) => [channel.key, channel]));
    const list = keys.map((key, index) => ({ channel: channels.get(key), dmx: values[index] ?? 0 }));
    const fine = new Map(list.flatMap((item) => item.channel?.fineOf === undefined ? [] : [[item.channel.fineOf, item.dmx] as const]));
    return list.flatMap(({ channel, dmx }) => {
        if (channel === undefined || channel.fineOf !== undefined) {
            return [];
        }
        const low = fine.get(channel.key);
        return [{ channel, dmx, amount: low === undefined ? dmx / 255 : (dmx * 256 + low) / 65535 }];
    });
}

const capability = (value: Value): FixtureCapability | undefined => value.channel.capabilities?.find((item) => value.dmx >= item.from && value.dmx <= item.to);

function shutterOf(values: readonly Value[]): { closed: boolean; shutter: ShutterKind; rate: number } {
    let shutter: ShutterKind = 'open';
    let rate = 0;
    for (const value of values) {
        const found = capability(value);
        let position: number;
        let kind: ShutterKind;
        if (value.channel.capabilities === undefined) {
            // A bare strobe channel: off at the bottom, then slow to fast
            if (value.dmx < 10) {
                continue;
            }
            kind = 'strobe';
            position = (value.dmx - 10) / 245;
        } else if (found?.kind === 'closed') {
            return { closed: true, shutter: 'open', rate: 0 };
        } else if (found?.kind === 'strobe' || found?.kind === 'pulse') {
            kind = /random/i.test(found.label) ? 'random' : found.kind;
            position = (value.dmx - found.from) / Math.max(1, found.to - found.from);
            if (/fast\s*(to|-|>)+\s*slow/i.test(found.label)) {
                position = 1 - position;
            }
        } else {
            continue;
        }
        shutter = kind;
        rate = RATES.min + position * (RATES.max - RATES.min);
    }
    return { closed: false, shutter, rate };
}

export function fixtureLight(definition: FixtureDefinition, profile: LightProfile, modeName: string, dmx: ArrayLike<number>): FixtureLight {
    const values = read(definition, modeName, dmx);
    const of = (attribute: FixtureAttribute): Value[] => values.filter((value) => value.channel.attribute === attribute);
    // Several channels of an attribute, as the cells of a bar, count as their average
    const amount = (attribute: FixtureAttribute): number | undefined => {
        const list = of(attribute);
        return list.length === 0 ? undefined : list.reduce((sum, value) => sum + value.amount, 0) / list.length;
    };

    let color: Rgb = [0, 0, 0];
    let level = amount('dimmer') ?? 1;
    const emitters = (Object.keys(EMITTERS) as FixtureAttribute[]).filter((attribute) => of(attribute).length > 0);
    if (emitters.length > 0) {
        for (const attribute of emitters) {
            const share = amount(attribute) ?? 0;
            color = color.map((part, index) => part + share * (EMITTERS[attribute] as Rgb)[index]) as Rgb;
        }
        const strongest = Math.max(...color);
        level *= Math.min(1, strongest);
        color = strongest > 0 ? color.map((part) => part / strongest) as Rgb : [1, 1, 1];
    } else {
        const temperature = amount('colorTemperature');
        color = temperatureColor(temperature === undefined ? profile.colorTemperature : 2700 + temperature * 5300);
        const hue = amount('hue');
        if (hue !== undefined) {
            color = hueColor(hue, amount('saturation') ?? 1);
        }
        for (const value of of('colorWheel')) {
            const slot = capability(value)?.color;
            if (slot !== undefined) {
                color = hexColor(slot);
            }
        }
    }
    // Subtractive filters take their primary away
    for (const [index, attribute] of (['cyan', 'magenta', 'yellow'] as const).entries()) {
        color[index] *= 1 - (amount(attribute) ?? 0);
    }

    const { closed, shutter, rate } = shutterOf(of('shutter'));
    const pan = amount('pan');
    const tilt = amount('tilt');
    const zoom = amount('zoom');
    return {
        level: closed || !profile.emits ? 0 : level,
        color,
        shutter,
        rate,
        pan: pan === undefined ? 0 : (pan - 0.5) * profile.panRange,
        tilt: tilt === undefined ? 0 : (tilt - 0.5) * profile.tiltRange,
        angle: zoom === undefined ? (profile.beam.min + profile.beam.max) / 2 : profile.beam.min + zoom * (profile.beam.max - profile.beam.min),
        // The speed channel goes from the fastest to the slowest
        speed: 1 - 0.85 * (amount('panTiltSpeed') ?? 0)
    };
}
