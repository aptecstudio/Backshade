/**
 * Common part of the USB DMX drivers: an open serial port that sends one
 * frame at a time. A frame that arrives while the previous one is still
 * being written is skipped, so a slow device never delays the engine.
 */

import type { BindingPortInterface } from '@serialport/bindings-cpp';

export abstract class UsbDmxDriver {
    protected readonly port: BindingPortInterface;
    private busy = false;
    private failure: Error | null = null;

    protected constructor(port: BindingPortInterface) {
        this.port = port;
    }

    /** Error that broke the connection, or null */
    get error(): Error | null {
        return this.failure;
    }

    /**
     * Sends the 512 channels of a universe, unless a frame is still being written.
     */
    send(frame: Uint8Array): void {
        if (this.busy || this.failure !== null || !this.port.isOpen) {
            return;
        }
        this.busy = true;
        this.write(frame)
            .catch((error: unknown) => {
                this.failure = error instanceof Error ? error : new Error(String(error));
            })
            .finally(() => {
                this.busy = false;
            });
    }

    /**
     * Closes the port.
     */
    async close(): Promise<void> {
        if (this.port.isOpen) {
            await this.port.close().catch(() => undefined);
        }
    }

    /** Writes one frame with the protocol of the device */
    protected abstract write(frame: Uint8Array): Promise<void>;
}
