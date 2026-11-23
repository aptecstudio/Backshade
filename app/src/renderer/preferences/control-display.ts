/**
 * Display preference of fader and knob values: percentage or 0 to 255.
 * The choice is saved per device, separately for faders and knobs, and is
 * applied immediately to every open window of the interface.
 */

import { Emitter, LocalPreference, type Unsubscribe } from '../../framework/ts/index.js';

/** How a control value is shown */
export type ValueDisplayMode = 'percent' | 'dmx';

/** Kind of control with its own preference */
export type ControlKind = 'fader' | 'knob';

const KEYS: Record<ControlKind, string> = { fader: 'backshade.faderValues', knob: 'backshade.knobValues' };
const preferences: Record<ControlKind, LocalPreference> = {
    fader: new LocalPreference(KEYS.fader),
    knob: new LocalPreference(KEYS.knob)
};
const changes = new Emitter<ControlKind>();

// Changes made in another window of the same device; the listener lives as long as the page
window.addEventListener('storage', (event) => {
    for (const kind of Object.keys(KEYS) as ControlKind[]) {
        if (event.key === KEYS[kind]) {
            changes.emit(kind);
        }
    }
});

/**
 * Display mode of a kind of control; percentage if not chosen.
 */
export function displayMode(kind: ControlKind): ValueDisplayMode {
    return preferences[kind].get() === 'dmx' ? 'dmx' : 'percent';
}

/**
 * Saves the display mode of a kind of control and applies it.
 */
export function setDisplayMode(kind: ControlKind, mode: ValueDisplayMode): void {
    preferences[kind].set(mode);
    changes.emit(kind);
}

/**
 * Registers a listener for changes of the display mode.
 */
export function onDisplayModeChange(listener: (kind: ControlKind) => void): Unsubscribe {
    return changes.subscribe(listener);
}
