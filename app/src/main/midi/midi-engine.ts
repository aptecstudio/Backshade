/**
 * MIDI layer of the engine: ports of the workstation (reported by the
 * playback window), MIDI learn and the mappings of the open show. A message
 * received runs the actions of its mappings; in learn mode it is tied
 * instead to the control chosen in the interface. Faders and knobs without
 * motors use pickup: a mapped level moves its target only after the control
 * reaches the current level, so nothing jumps.
 */

import { sameInput, type MidiDevice, type MidiInputKey, type MidiMapping, type MidiMode, type MidiState, type MidiTarget } from '../../shared/midi/midi';
import type { MidiActions } from './midi-actions';
import { parseMidi } from './midi-parse';

// Distance from the current level within which a fader is picked up
const PICKUP_RANGE = 0.03;
// Change of a level made elsewhere that releases the pickup
const MOVED_ELSEWHERE = 0.02;

/** What the engine needs from the show */
export interface MidiShow {
    mappings(): MidiMapping[];
    /** Adds a mapping learned; the ones with the same message are replaced */
    learned(input: MidiInputKey, target: MidiTarget, mode: MidiMode): void;
}

/** Pickup of a level mapping */
interface Pickup {
    caught: boolean;
    /** Last value of the control and last level sent */
    control: number | null;
    sent: number | null;
}

export class MidiEngine {
    private readonly actions: MidiActions;
    private readonly show: MidiShow;
    private readonly onState: (state: MidiState) => void;
    private devices: MidiDevice[] = [];
    private learn = false;
    private pending: MidiState['pending'] = null;
    private readonly pickups = new Map<string, Pickup>();
    /** Messages run one after the other, so a fast fader keeps its order */
    private queue: Promise<void> = Promise.resolve();

    constructor(actions: MidiActions, show: MidiShow, onState: (state: MidiState) => void) {
        this.actions = actions;
        this.show = show;
        this.onState = onState;
    }

    state(): MidiState {
        return { learn: this.learn, pending: this.pending, devices: this.devices };
    }

    /** Ports reported by the playback window */
    setDevices(devices: MidiDevice[]): void {
        this.devices = devices;
        this.announce();
    }

    /** Turns MIDI learn on or off; turning it off forgets the chosen control */
    setLearn(on: boolean): void {
        this.learn = on;
        if (!on) {
            this.pending = null;
        }
        this.announce();
    }

    /** Control chosen in learn mode: the next message is tied to it */
    choose(target: MidiTarget, mode: MidiMode): void {
        if (this.learn) {
            this.pending = { target, mode };
            this.announce();
        }
    }

    /** The mappings changed (show opened, mapping deleted): the pickups start again */
    mappingsChanged(): void {
        this.pickups.clear();
    }

    /**
     * Message received from an input.
     * @param device - Name of the input port
     */
    receive(device: string, data: readonly number[]): void {
        const event = parseMidi(data);
        if (event === null) {
            return;
        }
        const input: MidiInputKey = { device, kind: event.kind, channel: event.channel, number: event.number };
        if (this.learn) {
            // A key is learned when pressed, not when released
            if (this.pending !== null && (event.pressed || event.kind === 'pitch' || event.kind === 'cc')) {
                this.show.learned(input, this.pending.target, this.pending.mode);
                this.pickups.clear();
                this.pending = null;
                this.announce();
            }
            return;
        }
        const mappings = this.show.mappings().filter((mapping) => sameInput(mapping.input, input));
        for (const mapping of mappings) {
            this.queue = this.queue
                .then(() => mapping.mode === 'level' ? this.level(mapping, event.value) : this.actions.press(mapping.target, event.pressed))
                .catch((error: unknown) => console.warn('MIDI action failed:', error instanceof Error ? error.message : error));
        }
    }

    /** Level with pickup */
    private async level(mapping: MidiMapping, value: number): Promise<void> {
        const current = await this.actions.level(mapping.target);
        if (current === null) {
            await this.actions.setLevel(mapping.target, value);
            return;
        }
        const pickup = this.pickups.get(mapping.id) ?? { caught: false, control: null, sent: null };
        this.pickups.set(mapping.id, pickup);
        // Moved by something else since the last level sent: pick up again
        if (pickup.caught && pickup.sent !== null && Math.abs(current - pickup.sent) > MOVED_ELSEWHERE) {
            pickup.caught = false;
        }
        if (!pickup.caught) {
            const crossed = pickup.control !== null && (pickup.control - current) * (value - current) <= 0;
            pickup.caught = Math.abs(value - current) <= PICKUP_RANGE || crossed;
        }
        pickup.control = value;
        if (pickup.caught) {
            pickup.sent = value;
            await this.actions.setLevel(mapping.target, value);
        }
    }

    private announce(): void {
        this.onState(this.state());
    }
}
