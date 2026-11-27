/**
 * Feedback to the controllers: the LEDs of the keys follow the on state of
 * their targets, motorized faders and LED rings follow the levels. About
 * ten times per second the state of every mapping is read and only the
 * changes are sent, to the output port with the same name as the input.
 * A level being moved from the controller is not sent back for a moment,
 * so a motorized fader never fights the hand.
 */

import type { MidiMapping } from '../../shared/midi/midi';
import type { MidiActions } from './midi-actions';

const REFRESH_MS = 100;
// Time after a message of the controller during which its level is not sent back
const TOUCH_MS = 400;

export class MidiFeedback {
    private readonly actions: MidiActions;
    private readonly mappings: () => MidiMapping[];
    private readonly outputs: () => ReadonlySet<string>;
    private readonly send: (device: string, data: number[]) => void;
    /** Last message sent per mapping */
    private readonly sent = new Map<string, string>();
    private readonly touched = new Map<string, number>();
    private timer: NodeJS.Timeout | null = null;
    private busy = false;

    /**
     * @param outputs - Names of the connected output ports
     * @param send - Sends a message to an output port
     */
    constructor(actions: MidiActions, mappings: () => MidiMapping[], outputs: () => ReadonlySet<string>, send: (device: string, data: number[]) => void) {
        this.actions = actions;
        this.mappings = mappings;
        this.outputs = outputs;
        this.send = send;
    }

    start(): void {
        if (this.timer === null) {
            this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
            this.timer.unref();
        }
    }

    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /** Sends everything again: mappings changed, a controller was plugged */
    reset(): void {
        this.sent.clear();
    }

    /** A message of the controller arrived for a mapping */
    touch(mapping: MidiMapping): void {
        this.touched.set(mapping.id, Date.now());
    }

    private async refresh(): Promise<void> {
        if (this.busy) {
            return;
        }
        const outputs = this.outputs();
        const mappings = this.mappings().filter((mapping) => outputs.has(mapping.input.device));
        if (mappings.length === 0) {
            return;
        }
        this.busy = true;
        try {
            await this.actions.batch(async () => {
                const now = Date.now();
                for (const mapping of mappings) {
                    if (mapping.mode === 'level' && now - (this.touched.get(mapping.id) ?? 0) < TOUCH_MS) {
                        continue;
                    }
                    const data = await this.message(mapping);
                    const key = data === null ? '' : data.join(',');
                    if (data !== null && this.sent.get(mapping.id) !== key) {
                        this.sent.set(mapping.id, key);
                        this.send(mapping.input.device, data);
                    }
                }
            });
        } catch (error) {
            console.warn('MIDI feedback failed:', error instanceof Error ? error.message : error);
        } finally {
            this.busy = false;
        }
    }

    /** Message that shows the state of a mapping; null when it has nothing to show */
    private async message(mapping: MidiMapping): Promise<number[] | null> {
        let value: number | null;
        if (mapping.mode === 'level') {
            value = await this.actions.level(mapping.target);
        } else {
            const active = await this.actions.active(mapping.target);
            value = active === null ? null : active ? 1 : 0;
        }
        if (value === null) {
            return null;
        }
        const { kind, channel, number } = mapping.input;
        const status = channel - 1;
        switch (kind) {
            case 'note':
                return [0x90 | status, number, Math.round(value * 127)];
            case 'cc':
                return [0xb0 | status, number, Math.round(value * 127)];
            case 'pitch': {
                const bend = Math.round(value * 16383);
                return [0xe0 | status, bend & 0x7f, bend >> 7];
            }
            case 'program':
                return null;
        }
    }
}
