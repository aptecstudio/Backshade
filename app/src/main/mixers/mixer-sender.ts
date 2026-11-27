/**
 * Sends the recalls of mixer scenes: the OSC messages of the model of the
 * mixer on UDP (Node.js dgram, no dependency), or MIDI messages.
 * - X32 and M32: /-action/goscene with the number of the scene (00 to 99);
 * - X Air and MR: /-snap/load with the number of the snapshot (1 to 64);
 * - Wing: /$ctl/lib/$actionidx with the number of the item of the show
 *   list, then /$ctl/lib/$action "GO";
 * - generic OSC: the address of the mixer, "{number}" replaced by the
 *   number, with the number as an integer argument when asked;
 * - MIDI: a program change on the channel of the mixer (scene 1 is program
 *   0), after a bank select (control change 0) when the mixer uses banks,
 *   sent to its MIDI output port.
 * A recall sent during the show never stops the engine: errors are logged,
 * and given back only to a test from the interface.
 */

import dgram from 'node:dgram';
import { clampSceneNumber, NUMBER_PLACEHOLDER, type ShowMixer } from '../../shared/mixers/mixers';
import { encodeOscMessage } from '../osc/osc-message';

/** MIDI messages that recall a scene: bank select (when used) and program change */
export function midiRecall(mixer: Pick<ShowMixer, 'midiChannel' | 'bankSelect'>, number: number): number[][] {
    const index = Math.max(0, Math.round(number) - 1);
    const channel = mixer.midiChannel - 1;
    const program = [0xc0 | channel, index % 128];
    return mixer.bankSelect ? [[0xb0 | channel, 0, Math.min(127, Math.floor(index / 128))], program] : [program];
}

export class MixerSender {
    private socket: dgram.Socket | null = null;
    private readonly sendMidi: (device: string, data: number[]) => void;

    /**
     * @param sendMidi - Sends a message to a MIDI output port
     */
    constructor(sendMidi: (device: string, data: number[]) => void) {
        this.sendMidi = sendMidi;
    }

    /**
     * OSC messages that recall a scene on a mixer.
     */
    static messages(mixer: ShowMixer, number: number): Buffer[] {
        const scene = clampSceneNumber(mixer.model, number);
        switch (mixer.model) {
            case 'x32':
                return [encodeOscMessage('/-action/goscene', [{ type: 'i', value: scene }])];
            case 'xair':
                return [encodeOscMessage('/-snap/load', [{ type: 'i', value: scene }])];
            case 'wing':
                return [
                    encodeOscMessage('/$ctl/lib/$actionidx', [{ type: 'i', value: scene }]),
                    encodeOscMessage('/$ctl/lib/$action', [{ type: 's', value: 'GO' }])
                ];
            case 'midi':
                return [];
            case 'osc':
                return [encodeOscMessage(mixer.address.split(NUMBER_PLACEHOLDER).join(String(scene)), mixer.numberArgument ? [{ type: 'i', value: scene }] : [])];
        }
    }

    /**
     * Recalls a scene of a mixer.
     * @returns rejected when the messages cannot be sent (no address, unknown host)
     */
    async recall(mixer: ShowMixer, number: number): Promise<void> {
        if (mixer.model === 'midi') {
            if (mixer.midiDevice === '') {
                throw new Error(`Mixer without a MIDI port: ${mixer.name}`);
            }
            midiRecall(mixer, clampSceneNumber('midi', number)).forEach((data) => this.sendMidi(mixer.midiDevice, data));
            return;
        }
        if (mixer.host === '') {
            throw new Error(`Mixer without an address: ${mixer.name}`);
        }
        const socket = this.open();
        for (const message of MixerSender.messages(mixer, number)) {
            await new Promise<void>((resolve, reject) => {
                socket.send(message, mixer.port, mixer.host, (error) => error === null ? resolve() : reject(error));
            });
        }
    }

    /**
     * Recalls a scene during the show: errors are only logged.
     */
    recallLive(mixer: ShowMixer, number: number): void {
        this.recall(mixer, number).catch((error: unknown) => console.warn(`Mixer recall failed (${mixer.name}):`, error instanceof Error ? error.message : error));
    }

    /** Closes the socket, for example at quit */
    close(): void {
        this.socket?.close();
        this.socket = null;
    }

    private open(): dgram.Socket {
        if (this.socket === null) {
            const socket = dgram.createSocket('udp4');
            socket.on('error', (error) => console.warn('Mixer socket error:', error.message));
            socket.unref();
            this.socket = socket;
        }
        return this.socket;
    }
}
