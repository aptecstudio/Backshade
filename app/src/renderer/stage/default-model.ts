/**
 * Model a fixture of the patch gets when it is placed: from its category and,
 * for moving heads, from what its definition tells (a narrow beam, gobos).
 * It can be changed afterwards.
 */

import { lightProfile } from '../../shared/stage/light-profile.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';

/** Widest beam of a beam head, in degrees */
const BEAM_ANGLE = 8;

async function headModel(definitionId: string): Promise<string> {
    try {
        const { definition } = await engine().request('fixtures.get', { id: definitionId });
        if (lightProfile(definition).beam.max <= BEAM_ANGLE) {
            return 'moving-head-beam';
        }
        return definition.channels.some((channel) => channel.attribute === 'gobo') ? 'moving-head' : 'moving-head-wash';
    } catch {
        // A definition missing from the library: the common head
        return 'moving-head';
    }
}

/** Fixtures that have a model of their own */
const OWN_MODELS: Readonly<Record<string, string>> = {
    'stairville/stage-quad-led-bundle-rgb-ww': 'stairville-quad',
    'stairville/led-bossfx-1-pro-bundle': 'stairville-bossfx'
};

export async function defaultModel(fixture: PatchEntry): Promise<string> {
    const own = OWN_MODELS[fixture.definition];
    if (own !== undefined) {
        return own;
    }
    switch (fixture.category) {
        case 'movingHead':
            return headModel(fixture.definition);
        case 'scanner':
            return 'moving-head';
        case 'ledBar':
        case 'pixelBar':
            return 'led-bar';
        case 'blinder':
        case 'strobe':
            return fixture.category;
        default:
            return 'par';
    }
}
