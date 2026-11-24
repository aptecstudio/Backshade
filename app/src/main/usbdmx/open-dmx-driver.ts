/**
 * Open DMX USB and compatible interfaces without a processor (FTDI chip
 * only): the computer makes the DMX signal itself at 250000 baud, 8 data
 * bits, 2 stop bits. Every frame starts with a break, then the start code
 * and the 512 channels. The break lasts at least 1 ms, longer than the
 * 88 us that DMX requires, which every receiver accepts.
 */

import type { BindingPortInterface } from '@serialport/bindings-cpp';
import { serialBinding } from './serial-binding';
import { UsbDmxDriver } from './usb-dmx-driver';

const BAUD_RATE = 250000;

export class OpenDmxDriver extends UsbDmxDriver {
    private readonly packet = Buffer.alloc(513);

    private constructor(port: BindingPortInterface) {
        super(port);
    }

    static async open(path: string): Promise<OpenDmxDriver> {
        const binding = serialBinding();
        if (binding === null) {
            throw new Error('Serial ports not available');
        }
        return new OpenDmxDriver(await binding.open({ path, baudRate: BAUD_RATE, dataBits: 8, stopBits: 2, parity: 'none' }));
    }

    protected async write(frame: Uint8Array): Promise<void> {
        this.packet.set(frame.subarray(0, 512), 1);
        await this.port.set({ brk: true, rts: false });
        await new Promise((resolve) => setTimeout(resolve, 1));
        await this.port.set({ brk: false, rts: false });
        await this.port.write(this.packet);
        await this.port.drain();
    }
}
