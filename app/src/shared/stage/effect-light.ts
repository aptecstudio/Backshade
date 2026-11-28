/**
 * Parts of multi effect fixtures that are not colored lights: the laser and
 * the strobe LEDs (white and ultraviolet).
 */

import type { FixtureDefinition } from '../fixtures/fixture-definition.js';
import { capability, read, shutterOf, spinOf, type ShutterKind, type Value } from './fixture-light.js';

/** One color of a part: 0 off, 1 on, with its flashing */
export interface EffectBeam {
    level: number;
    shutter: ShutterKind;
    rate: number;
}

export interface LaserLight {
    red: EffectBeam;
    green: EffectBeam;
    spin: number;
    program: boolean;
}

export interface LedLight {
    white: EffectBeam;
    uv: EffectBeam;
    program: boolean;
}

/** What a channel that switches and strobes asks for */
function output(values: readonly Value[]): EffectBeam {
    const { closed, shutter, rate } = shutterOf(values);
    const on = values.some((value) => {
        const found = capability(value);
        return found === undefined ? value.dmx >= 10 : found.kind === 'open' || found.kind === 'strobe' || found.kind === 'pulse';
    });
    return { level: on && !closed ? 1 : 0, shutter, rate };
}

const programmed = (values: readonly Value[]): boolean => values.some((value) => capability(value)?.kind === 'program');

export function laserLight(definition: FixtureDefinition, modeName: string, dmx: ArrayLike<number>): LaserLight {
    const values = read(definition, modeName, dmx);
    return {
        red: output(values.filter((value) => value.channel.attribute === 'laserRed')),
        green: output(values.filter((value) => value.channel.attribute === 'laserGreen')),
        spin: spinOf(values.filter((value) => value.channel.attribute === 'laserRotation')),
        program: programmed(values)
    };
}

/** The LED of an index: with one channel for all the white LEDs, every one follows it */
export function ledLight(definition: FixtureDefinition, modeName: string, dmx: ArrayLike<number>, index: number): LedLight {
    const values = read(definition, modeName, dmx);
    const white = values.filter((value) => value.channel.attribute === 'strobeWhite');
    return {
        white: output(white.length === 0 ? [] : [white[index % white.length]]),
        uv: output(values.filter((value) => value.channel.attribute === 'strobeUv')),
        program: programmed(values)
    };
}
