/**
 * MIDI layer of the engine: ports of the workstation (reported by the
 * playback window), MIDI learn and the mappings of the open show. A message
 * received runs the actions of its mappings; in learn mode it is tied
 * instead to the control chosen in the interface. Faders and knobs without
 * motors use pickup: a mapped level moves its target only after the control
 * reaches the current level, so nothing jumps. Endless encoders move their
 * level by steps. MIDI Show Control commands act on the cue list. Every
 * message received is told to the monitor.
 */

import { sameInput, type MidiDevice, type MidiInputKey, type MidiMapping, type MidiMode, type MidiMonitorEntry, type MidiState, type MidiTarget, type MscSettings } from '../../shared/midi/midi';
import type { MidiActions } from './midi-actions';
import { parseMidi, parseMsc, type MidiEvent } from './midi-parse';

// Distance from the current level within which a fader is picked up
const PICKUP_RANGE = 0.03;
// Change of a level made elsewhere that releases the pickup
const MOVED_ELSEWHERE = 0.02;
// Level change of one step of an endless encoder
const ENCODER_STEP = 0.01;

/** What the engine needs from the show */
export interface MidiShow {
    mappings(): MidiMapping[];
    msc(): MscSettings;
    /** Adds a mapping learned; the ones with the same message are replaced */
    learned(input: MidiInputKey, target: MidiTarget, mode: MidiMode): void;
}

/** Listeners of the engine */
export interface MidiEngineListeners {
    state: (state: MidiState) => void;
    /** A message received (for the monitor) */
    traffic: (entry: MidiMonitorEntry) => void;
    /** A mapping received a message (the feedback waits for it) */
    mapped: (mapping: MidiMapping) => void;
}

/** Pickup of a level mapping */
interface Pickup {
    caught: boolean;
    /** Last value of the control and last level sent */
    control: number | null;
    sent: number | null;
}

/** Steps of an endless encoder from its value: positive up, negative down */
function encoderSteps(encoding: MidiMapping['encoding'], raw: number): number {
    if (encoding === 'relative2c') {
        return raw < 64 ? raw : raw - 128;
    }
    return raw - 64;
}

export class MidiEngine {
    private readonly actions: MidiActions;
    private readonly show: MidiShow;
    private readonly listeners: MidiEngineListeners;
    private devices: MidiDevice[] = [];
    private learn = false;
    private pending: MidiState['pending'] = null;
    private readonly pickups = new Map<string, Pickup>();
    /** Messages run one after the other, so a fast fader keeps its order */
    private queue: Promise<void> = Promise.resolve();

    constructor(actions: MidiActions, show: MidiShow, listeners: MidiEngineListeners) {
        this.actions = actions;
        this.show = show;
        this.listeners = listeners;
    }

    state(): MidiState {
        return { learn: this.learn, pending: this.pending, devices: this.devices };
    }

    /** Names of the connected output ports */
    outputs(): ReadonlySet<string> {
        return new Set(this.devices.filter((device) => device.kind === 'output' && device.connected).map((device) => device.name));
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
        if (data[0] === 0xf0) {
            this.receiveMsc(device, data);
            return;
        }
        const event = parseMidi(data);
        this.listeners.traffic({
            time: Date.now(),
            direction: 'in',
            device,
            kind: event?.kind ?? null,
            channel: event?.channel ?? 0,
            number: event?.number ?? 0,
            value: event === null ? 0 : event.kind === 'pitch' ? Math.round(event.value * 16383) : (data[2] ?? 0),
            msc: ''
        });
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
        for (const mapping of this.show.mappings().filter((item) => sameInput(item.input, input))) {
            this.listeners.mapped(mapping);
            this.queue = this.queue
                .then(() => this.run(mapping, event, data[2] ?? 0))
                .catch((error: unknown) => console.warn('MIDI action failed:', error instanceof Error ? error.message : error));
        }
    }

    private async run(mapping: MidiMapping, event: MidiEvent, raw: number): Promise<void> {
        if (mapping.mode !== 'level') {
            await this.actions.press(mapping.target, event.pressed);
        } else if (mapping.encoding !== 'absolute' && event.kind === 'cc') {
            const current = await this.actions.level(mapping.target) ?? 0;
            await this.actions.setLevel(mapping.target, Math.max(0, Math.min(1, current + encoderSteps(mapping.encoding, raw) * ENCODER_STEP)));
        } else {
            await this.level(mapping, event.value);
        }
    }

    /** MIDI Show Control to the device identifier of the show (or to all) */
    private receiveMsc(device: string, data: readonly number[]): void {
        const msc = parseMsc(data);
        this.listeners.traffic({ time: Date.now(), direction: 'in', device, kind: null, channel: 0, number: 0, value: 0, msc: msc === null ? '' : `${msc.command}${msc.cue === null ? '' : ` ${msc.cue}`}` });
        const settings = this.show.msc();
        if (msc === null || this.learn || !settings.enabled || (msc.deviceId !== 127 && msc.deviceId !== settings.deviceId)) {
            return;
        }
        this.queue = this.queue
            .then(() => this.actions.msc(msc.command, msc.cue))
            .catch((error: unknown) => console.warn('MIDI Show Control failed:', error instanceof Error ? error.message : error));
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
        this.listeners.state(this.state());
    }
}
