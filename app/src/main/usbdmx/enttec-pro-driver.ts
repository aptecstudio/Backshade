/**
 * Enttec DMX USB Pro and compatible interfaces (for example DMXking
 * ultraDMX Pro on its first port): every frame is a message with label 6
 * "Output Only Send DMX Packet": 0x7E, label, length, start code and 512
 * channels, 0xE7. The interface makes the DMX timing itself.
 */

import type { BindingPortInterface } from '@serialport/bindings-cpp';
import { serialBinding } from './serial-binding';
import { UsbDmxDriver } from './usb-dmx-driver';

const START = 0x7e;
const END = 0xe7;
const SEND_DMX = 6;
// The baud rate is not used by the USB link, any common value works
const BAUD_RATE = 57600;

export class EnttecProDriver extends UsbDmxDriver {
    private readonly message = Buffer.alloc(5 + 513);

    private constructor(port: BindingPortInterface) {
        super(port);
        const length = 513;
        this.message[0] = START;
        this.message[1] = SEND_DMX;
        this.message[2] = length & 0xff;
        this.message[3] = length >> 8;
        // Start code 0 at index 4, channels from index 5
        this.message[4 + length] = END;
    }

    static async open(path: string): Promise<EnttecProDriver> {
        const binding = serialBinding();
        if (binding === null) {
            throw new Error('Serial ports not available');
        }
        return new EnttecProDriver(await binding.open({ path, baudRate: BAUD_RATE }));
    }

    protected async write(frame: Uint8Array): Promise<void> {
        this.message.set(frame.subarray(0, 512), 5);
        await this.port.write(this.message);
    }
}
