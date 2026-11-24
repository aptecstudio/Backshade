/**
 * USB DMX interfaces of the workstation: opens the configured devices,
 * sends them the frame of their universe, and reconnects them when they
 * are plugged in again. A device is found by its serial number, so it
 * keeps its universe when it moves to another USB socket.
 */

import fs from 'node:fs';
import type { PortInfo } from '@serialport/bindings-cpp';
import type { UsbDmxDevice, UsbDmxStatus } from '../../shared/output/usb-dmx';
import type { UsbDmxDeviceState } from '../../shared/transport/engine-api';
import { EnttecProDriver } from './enttec-pro-driver';
import { OpenDmxDriver } from './open-dmx-driver';
import { listSerialPorts, serialBinding } from './serial-binding';
import type { UsbDmxDriver } from './usb-dmx-driver';

// Interval of the search of disconnected devices
const RECONNECT_MS = 3000;

interface Connection {
    device: UsbDmxDevice;
    driver: UsbDmxDriver | null;
    status: UsbDmxStatus;
    error: string | null;
    /** An open is in progress */
    opening: boolean;
}

/**
 * Identifier of a port: its serial number when known, otherwise its path.
 */
export function portId(port: PortInfo): string {
    return port.serialNumber !== undefined && port.serialNumber !== '' ? port.serialNumber : port.path;
}

export class UsbDmxManager {
    private connections: Connection[] = [];
    private timer: NodeJS.Timeout | null = null;
    private readonly changed: () => void;

    /**
     * @param changed - Called when the connection of a device changes
     */
    constructor(changed: () => void) {
        this.changed = changed;
    }

    /** The serial ports can be used on this computer */
    get available(): boolean {
        return serialBinding() !== null;
    }

    /**
     * Replaces the configured devices; devices no longer configured are closed.
     */
    configure(devices: readonly UsbDmxDevice[]): void {
        const previous = this.connections;
        this.connections = devices.map((device) => {
            const same = previous.find((item) => item.device.id === device.id && item.device.type === device.type);
            if (same !== undefined && device.enabled) {
                same.device = device;
                if (same.driver === null && same.status === 'disabled') {
                    same.status = 'missing';
                }
                return same;
            }
            return { device, driver: null, status: device.enabled ? 'missing' : 'disabled', error: null, opening: false };
        });
        for (const connection of previous) {
            if (!this.connections.includes(connection)) {
                void connection.driver?.close();
            }
        }
        this.schedule();
        void this.connect();
    }

    /** Universes sent by the enabled devices */
    universes(): number[] {
        return [...new Set(this.connections.filter((item) => item.device.enabled).map((item) => item.device.universe))];
    }

    /**
     * Sends the frame of a universe to its devices.
     */
    send(universe: number, frame: Uint8Array): void {
        for (const connection of this.connections) {
            if (connection.device.universe !== universe || connection.driver === null) {
                continue;
            }
            connection.driver.send(frame);
            if (connection.driver.error !== null) {
                this.fail(connection, connection.driver.error.message);
            }
        }
    }

    state(): UsbDmxDeviceState[] {
        return this.connections.map(({ device, status, error }) => ({ ...device, status, error }));
    }

    /**
     * Closes every device, for example when the application quits.
     */
    async dispose(): Promise<void> {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await Promise.all(this.connections.map((connection) => connection.driver?.close()));
    }

    private schedule(): void {
        if (this.timer === null && this.connections.length > 0) {
            this.timer = setInterval(() => void this.connect(), RECONNECT_MS);
        } else if (this.timer !== null && this.connections.length === 0) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Opens the enabled devices that are not connected, if they are plugged in.
     */
    private async connect(): Promise<void> {
        const waiting = this.connections.filter((item) => item.device.enabled && item.driver === null && !item.opening);
        if (waiting.length === 0 || !this.available) {
            return;
        }
        const ports = await listSerialPorts();
        for (const connection of waiting) {
            const listed = ports.find((item) => portId(item) === connection.device.id) ?? ports.find((item) => item.path === connection.device.path);
            // Some ports are not listed by the system (adapters, virtual ports) but can be opened by path
            const path = listed?.path ?? (process.platform !== 'win32' && fs.existsSync(connection.device.path) ? connection.device.path : null);
            if (path === null) {
                this.setStatus(connection, 'missing', null);
                continue;
            }
            connection.opening = true;
            try {
                const driver = connection.device.type === 'enttecPro' ? await EnttecProDriver.open(path) : await OpenDmxDriver.open(path);
                if (this.connections.includes(connection)) {
                    connection.driver = driver;
                    this.setStatus(connection, 'connected', null);
                } else {
                    await driver.close();
                }
            } catch (error) {
                this.setStatus(connection, 'error', error instanceof Error ? error.message : String(error));
            } finally {
                connection.opening = false;
            }
        }
    }

    /**
     * Closes a device that stopped working; it is opened again when it comes back.
     */
    private fail(connection: Connection, message: string): void {
        void connection.driver?.close();
        connection.driver = null;
        this.setStatus(connection, 'error', message);
    }

    private setStatus(connection: Connection, status: UsbDmxStatus, error: string | null): void {
        if (connection.status !== status || connection.error !== error) {
            connection.status = status;
            connection.error = error;
            this.changed();
        }
    }
}
