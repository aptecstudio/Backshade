/**
 * What the 3D stage needs to know about a fixture model: travel of pan and
 * tilt, beam angle or zoom range and light output. Taken from the physical
 * data of the definition, with usual values for what it does not tell.
 */

import type { FixtureCategory, FixtureDefinition } from '../fixtures/fixture-definition.js';

export interface LightProfile {
    /** Pan travel in degrees */
    panRange: number;
    /** Tilt travel in degrees */
    tiltRange: number;
    /** Narrowest and widest beam in degrees */
    beam: { min: number; max: number };
    lumens: number;
    /** Color temperature of the source in kelvin */
    colorTemperature: number;
    /** It gives light: smoke machines and lasers do not */
    emits: boolean;
}

const BEAM: Readonly<Record<FixtureCategory, number>> = {
    dimmer: 30, par: 25, ledBar: 30, pixelBar: 40, movingHead: 15, scanner: 12, strobe: 90,
    blinder: 60, effect: 25, laser: 3, smoke: 25, hazer: 25, other: 25
};

const DARK: readonly FixtureCategory[] = ['laser', 'smoke', 'hazer'];

export function lightProfile(definition: FixtureDefinition): LightProfile {
    const physical = definition.physical ?? {};
    const usual = BEAM[definition.category];
    return {
        panRange: physical.panRange ?? 540,
        tiltRange: physical.tiltRange ?? 270,
        beam: physical.beamAngle ?? { min: usual, max: usual },
        lumens: physical.lumens ?? 3000,
        colorTemperature: physical.colorTemperature ?? (definition.category === 'dimmer' || definition.category === 'blinder' ? 3200 : 6000),
        emits: !DARK.includes(definition.category)
    };
}
