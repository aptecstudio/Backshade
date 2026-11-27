/**
 * MIDI learn in the interface: while it is on, the controls that MIDI can
 * drive are outlined (the ones already mapped with a solid line); touching
 * one chooses it instead of using it, and the engine ties it to the next
 * message of a controller. Escape leaves learn mode.
 */

import { sameTarget, type MidiMapping, type MidiState } from '../../shared/midi/midi.js';
import { showError } from '../dialogs/show-error.js';
import { engine } from '../transport/engine.js';
import { MIDI_ATTRIBUTE, readMidi } from './midi-target.js';

const LEARN_CLASS = 'midi-learn';
const PENDING_CLASS = 'midi-target--pending';
const MAPPED_CLASS = 'midi-target--mapped';

let started = false;
let learning = false;
let mappings: MidiMapping[] = [];
let observer: MutationObserver | null = null;

function markMapped(): void {
    for (const element of document.querySelectorAll(`[${MIDI_ATTRIBUTE}]`)) {
        const own = readMidi(element);
        const mapped = learning && own !== null && mappings.some((mapping) => sameTarget(mapping.target, own.target));
        if (element.classList.contains(MAPPED_CLASS) !== mapped) {
            element.classList.toggle(MAPPED_CLASS, mapped);
        }
    }
}

function clearPending(): void {
    document.querySelectorAll(`.${PENDING_CLASS}`).forEach((element) => element.classList.remove(PENDING_CLASS));
}

function apply(state: MidiState): void {
    learning = state.learn;
    document.body.classList.toggle(LEARN_CLASS, learning);
    if (state.pending === null) {
        clearPending();
    }
    if (learning && observer === null) {
        // Sections build their controls again: the new ones are marked too
        observer = new MutationObserver(() => markMapped());
        observer.observe(document.body, { subtree: true, childList: true });
    } else if (!learning && observer !== null) {
        observer.disconnect();
        observer = null;
    }
    markMapped();
}

async function loadMappings(): Promise<void> {
    try {
        mappings = (await engine().request('midi.getMappings')).mappings;
    } catch {
        mappings = [];
    }
    markMapped();
}

/** A press on a control in learn mode chooses it */
function intercept(event: Event): void {
    if (!learning) {
        return;
    }
    const element = (event.target as Element | null)?.closest(`[${MIDI_ATTRIBUTE}]`);
    if (element === null || element === undefined) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.type !== 'pointerdown') {
        return;
    }
    const chosen = readMidi(element);
    if (chosen !== null) {
        clearPending();
        element.classList.add(PENDING_CLASS);
        void engine().request('midi.choose', chosen).catch(showError);
    }
}

/**
 * Starts following MIDI learn; called once by the shell.
 */
export function followMidiLearn(): void {
    if (started) {
        return;
    }
    started = true;
    for (const type of ['pointerdown', 'pointerup', 'click', 'dblclick'] as const) {
        document.addEventListener(type, intercept, { capture: true });
    }
    document.addEventListener('keydown', (event) => {
        if (learning && event.key === 'Escape') {
            void engine().request('midi.setLearn', { on: false }).catch(showError);
        }
    });
    engine().on('midi.stateChanged', ({ state }) => apply(state));
    engine().on('midi.changed', () => void loadMappings());
    void engine().request('midi.getState').then(apply).catch(() => undefined);
    void loadMappings();
}
