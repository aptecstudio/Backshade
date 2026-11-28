/**
 * What a fixture does with the DMX values of its channels: light, color,
 * shutter, position and beam. Used by the live view of the 3D stage.
 */

import { applyDimmerCurve } from '../fixtures/dimmer-curve.js';
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
    /** Softness of the edge of the beam, 0 sharp to 1: focus and frost */
    soft: number;
    /** Mask of the gobo in front of the light, null without one */
    gobo: string | null;
    /** Rotation of the gobo, as spin */
    goboSpin: number;
    /** Facets of the prism in front of the light, 1 without one */
    prism: number;
    prismSpin: number;
    /** Shakes per second of the gobo and of the prism, 0 still */
    goboShake: number;
    prismShake: number;
    /** Fixed turn of the gobo and of the prism in radians, null when they are not indexed */
    goboIndex: number | null;
    prismIndex: number | null;
    /** Rotation of the effect, from -1 (anti-clockwise) to 1 (clockwise) */
    spin: number;
    /** An automatic programme of the fixture runs: what it shows is its own */
    program: boolean;
    /** Speed of the movements, 0 to 1 of the fastest */
    speed: number;
}

/** Slowest and fastest strobe, flashes per second */
const RATES = { min: 1, max: 15 };

export interface Value {
    channel: FixtureChannel;
    /** Value from 0 to 255 */
    dmx: number;
    /** Value from 0 to 1, with the fine channel when there is one */
    amount: number;
}

/** One of the lights of a fixture that has several, from left to right */
export interface Cell {
    index: number;
    count: number;
}

/**
 * Values of the channels of a mode, fine channels merged with their coarse
 * ones. For one cell of a fixture, the channels of the other heads of the
 * mode are left out; the common ones, such as the dimmer, stay.
 */
export function read(definition: FixtureDefinition, modeName: string, values: ArrayLike<number>, cell?: Cell): Value[] {
    const mode = definition.modes.find((item) => item.name === modeName);
    const keys = mode?.channels ?? [];
    const heads = mode?.heads ?? [];
    // Fewer heads than cells: neighbouring cells share one
    const own = cell === undefined || heads.length === 0 ? null : heads[Math.floor(cell.index * heads.length / cell.count)];
    const others = new Set(own === null ? [] : heads.flat().filter((key) => !own.includes(key)));
    const channels = new Map(definition.channels.map((channel) => [channel.key, channel]));
    const list = keys.map((key, index) => ({ channel: channels.get(key), dmx: values[index] ?? 0 }));
    const fine = new Map(list.flatMap((item) => item.channel?.fineOf === undefined ? [] : [[item.channel.fineOf, item.dmx] as const]));
    return list.flatMap(({ channel, dmx }) => {
        if (channel === undefined || channel.fineOf !== undefined || others.has(channel.key)) {
            return [];
        }
        const low = fine.get(channel.key);
        return [{ channel, dmx, amount: low === undefined ? dmx / 255 : (dmx * 256 + low) / 65535 }];
    });
}

/** Speed and way of the motor of an effect */
export function spinOf(values: readonly Value[]): number {
    for (const value of values) {
        const found = capability(value);
        if (found?.kind === 'rotation') {
            const speed = 0.1 + 0.9 * (value.dmx - found.from) / Math.max(1, found.to - found.from);
            return /anti|counter/i.test(found.label) ? -speed : speed;
        }
    }
    return 0;
}

/** Slowest and fastest shake, per second */
const SHAKES = { min: 1.5, max: 9 };

/** Where a value is in its range, from 0 to 1, reversed when the label goes from fast to slow */
function along(value: Value, found: FixtureCapability): number {
    const position = (value.dmx - found.from) / Math.max(1, found.to - found.from);
    return /fast\s*(to|-|>)+\s*slow/i.test(found.label) ? 1 - position : position;
}

/** Shakes per second asked for by a shaking range, told by its flag or its name; 0 without one */
function shakeOf(values: readonly Value[]): number {
    for (const value of values) {
        const found = capability(value);
        if (found !== undefined && (found.shake === true || /shak|shock|trembl|jitter/i.test(found.label))) {
            return SHAKES.min + along(value, found) * (SHAKES.max - SHAKES.min);
        }
    }
    return 0;
}

/** Turn of an indexing range in radians, null without one */
function indexOf(values: readonly Value[]): number | null {
    for (const value of values) {
        const found = capability(value);
        if (found !== undefined && (found.kind === 'index' || /index/i.test(found.label))) {
            return along(value, found) * Math.PI * 2;
        }
    }
    return null;
}

export const capability = (value: Value): FixtureCapability | undefined => value.channel.capabilities?.find((item) => value.dmx >= item.from && value.dmx <= item.to);

export function shutterOf(values: readonly Value[]): { closed: boolean; shutter: ShutterKind; rate: number } {
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

export function fixtureLight(definition: FixtureDefinition, profile: LightProfile, modeName: string, dmx: ArrayLike<number>, cell?: Cell): FixtureLight {
    const values = read(definition, modeName, dmx, cell);
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
        // A mode of automatic programmes of a color mixing fixture: what it shows is not known
        if (of('dimmer').length === 0 && definition.channels.some((channel) => channel.attribute in EMITTERS)) {
            level = 0;
        }
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
    // A macro with a known color gives it; the others leave the color as it is
    for (const value of of('colorMacro')) {
        const slot = capability(value)?.color;
        if (slot !== undefined) {
            color = hexColor(slot);
            level = amount('dimmer') ?? 1;
        }
    }
    // The curve tells how the light follows the dimmer
    level = applyDimmerCurve(definition.dimmerCurve, level);
    // An automatic programme, of this fixture or of its cell, takes over
    const program = values.some((value) => capability(value)?.kind === 'program');
    if (program) {
        level = amount('dimmer') ?? 1;
    }
    // Subtractive filters take their primary away
    for (const [index, attribute] of (['cyan', 'magenta', 'yellow'] as const).entries()) {
        color[index] *= 1 - (amount(attribute) ?? 0);
    }

    // Some dimmers also strobe, as their capabilities tell
    const { closed, shutter, rate } = shutterOf([...of('shutter'), ...of('dimmer').filter((value) => value.channel.capabilities !== undefined)]);
    const pan = amount('pan');
    const tilt = amount('tilt');
    let zoom = amount('zoom');
    // Some zooms go from wide to narrow
    if (zoom !== undefined && of('zoom').some((value) => /(wide|big|large|max).*(narrow|small|min|spot)/i.test(capability(value)?.label ?? ''))) {
        zoom = 1 - zoom;
    }
    const frost = amount('frost') ?? 0;
    // Sharp at the middle of the focus travel
    const focus = amount('focus');
    // The iris closes as its value grows
    const iris = amount('iris') ?? 0;
    const angle = zoom === undefined ? (profile.beam.min + profile.beam.max) / 2 : profile.beam.min + zoom * (profile.beam.max - profile.beam.min);
    const gobo = of('gobo').map(capability).find((found) => found?.kind === 'gobo' && found.image !== undefined)?.image ?? null;
    const prism = of('prism').map(capability).find((found) => found?.kind === 'prism' || found?.facets !== undefined);
    return {
        gobo,
        // Some wheels turn their gobos with their own channel
        goboSpin: spinOf([...of('goboRotation'), ...of('gobo')]),
        prism: prism === undefined ? 1 : prism.facets ?? 3,
        prismSpin: spinOf([...of('prismRotation'), ...of('prism')]),
        goboShake: shakeOf([...of('gobo'), ...of('goboRotation')]),
        prismShake: shakeOf([...of('prism'), ...of('prismRotation')]),
        goboIndex: indexOf(of('goboRotation')),
        prismIndex: indexOf(of('prismRotation')),
        level: closed || !profile.emits ? 0 : level,
        color,
        shutter,
        rate,
        pan: pan === undefined ? 0 : (pan - 0.5) * profile.panRange,
        tilt: tilt === undefined ? 0 : (tilt - 0.5) * profile.tiltRange,
        angle: Math.min(160, angle * (1 - 0.8 * iris) * (1 + frost)),
        soft: Math.min(1, frost + (focus === undefined ? 0 : Math.abs(focus - 0.5) * 1.4)),
        spin: spinOf(of('beamEffect')),
        program,
        // The speed channel goes from the fastest to the slowest
        speed: 1 - 0.85 * (amount('panTiltSpeed') ?? 0)
    };
}
