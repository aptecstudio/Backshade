/**
 * Touch mode: larger keys, fields, rows and handles, for touch screens.
 * Chosen per device: automatic (on when the main pointer is a finger), on
 * or off; applied at once, also to the other open windows of the device,
 * with the class "touch-mode" of the document.
 */

import { LocalPreference } from '../../framework/ts/index.js';

/** Choice of the touch mode */
export type TouchModeChoice = 'auto' | 'on' | 'off';

const KEY = 'backshade.touchMode';
const preference = new LocalPreference(KEY);
const coarse = window.matchMedia('(pointer: coarse)');

/** Touch mode chosen on this device; automatic if not chosen */
export function touchModeChoice(): TouchModeChoice {
    const value = preference.get();
    return value === 'on' || value === 'off' ? value : 'auto';
}

/** Applies the touch mode to the document */
function apply(): void {
    const choice = touchModeChoice();
    document.documentElement.classList.toggle('touch-mode', choice === 'on' || (choice === 'auto' && coarse.matches));
}

/** Saves the choice of the touch mode and applies it */
export function setTouchMode(choice: TouchModeChoice): void {
    preference.set(choice);
    apply();
}

/**
 * Applies the touch mode and follows its changes (other windows, a touch
 * screen connected); called once by each page.
 */
export function initTouchMode(): void {
    apply();
    coarse.addEventListener('change', apply);
    window.addEventListener('storage', (event) => {
        if (event.key === KEY) {
            apply();
        }
    });
}
