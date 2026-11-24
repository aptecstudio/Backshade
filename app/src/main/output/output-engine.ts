/**
 * DMX output engine: at the frame rate of the show it merges the sources
 * of every universe and sends the frames with Art-Net and to the USB DMX
 * interfaces. Art-Net sends the universes used by the patch and those
 * configured in the output, unless disabled; every USB interface sends
 * the universe assigned to it. Grand master and blackout belong to the running session and
 * are not saved; output on or off and the network interface are settings
 * of the workstation.
 */

import { outputUniverse, type ShowOutput } from '../../shared/output/output-config';
import type { ShowPatch } from '../../shared/patch/patch';
import type { FixtureDefinition } from '../../shared/fixtures/fixture-definition';
import type { OutputState } from '../../shared/transport/engine-api';
import { artDmx } from '../artnet/artnet-packets';
import type { ArtNetSocket } from '../artnet/artnet-socket';
import { listNetworkInterfaces } from '../artnet/network-interfaces';
import type { UsbDmxManager } from '../usbdmx/usb-dmx-manager';
import { buildChannelMap, type UniverseMap } from './channel-map';
import { DmxMixer } from './dmx-mixer';

/** Content of the open show that the output needs */
export interface OutputContent {
    patch: ShowPatch;
    output: ShowOutput;
    lookup: (id: string) => FixtureDefinition | undefined;
}

// Broadcast address used when the computer has no network other than the loopback
const LIMITED_BROADCAST = '255.255.255.255';

export class OutputEngine {
    readonly mixer = new DmxMixer();
    private readonly socket: ArtNetSocket;
    private readonly usb: UsbDmxManager;
    private content: OutputContent | null = null;
    private channelMap = new Map<number, UniverseMap>();
    private readonly sequences = new Map<number, number>();
    private timer: NodeJS.Timeout | null = null;
    private grandMaster = 1;
    private blackout = false;
    private enabled: boolean;
    private artNetInterface: string;
    private broadcasts: string[] = [];

    constructor(socket: ArtNetSocket, usb: UsbDmxManager, workstation: { enabled: boolean; artNetInterface: string }) {
        this.socket = socket;
        this.usb = usb;
        this.enabled = workstation.enabled;
        this.artNetInterface = workstation.artNetInterface;
        this.broadcasts = this.findBroadcasts();
    }

    /**
     * Sets the content of the open show, or null when no show is open.
     */
    setContent(content: OutputContent | null): void {
        this.content = content;
        this.channelMap = content === null ? new Map() : buildChannelMap(content.patch, content.lookup);
        this.restart();
    }

    setGrandMaster(level: number): void {
        this.grandMaster = Math.max(0, Math.min(1, level));
    }

    setBlackout(on: boolean): void {
        this.blackout = on;
    }

    /**
     * Turns the output of the workstation on or off and chooses the network interface.
     */
    setWorkstation(enabled: boolean, artNetInterface: string): void {
        this.enabled = enabled;
        this.artNetInterface = artNetInterface;
        this.broadcasts = this.findBroadcasts();
        this.restart();
    }

    /**
     * Starts sending again, for example after the USB interfaces changed.
     */
    refresh(): void {
        this.restart();
    }

    /** Broadcast addresses where Art-Net is sent */
    get broadcastAddresses(): readonly string[] {
        return this.broadcasts;
    }

    /**
     * Universes sent with Art-Net: used by the patch or configured, and enabled.
     */
    artNetUniverses(): number[] {
        if (this.content === null) {
            return [];
        }
        const output = this.content.output;
        const numbers = new Set([...this.channelMap.keys(), ...output.universes.map((item) => item.universe)]);
        return [...numbers].filter((universe) => outputUniverse(output, universe).enabled).sort((a, b) => a - b);
    }

    /**
     * Universes being sent, with Art-Net or USB.
     */
    universes(): number[] {
        if (this.content === null) {
            return [];
        }
        return [...new Set([...this.artNetUniverses(), ...this.usb.universes()])].sort((a, b) => a - b);
    }

    /**
     * Frame of a universe as it is sent now.
     */
    frame(universe: number): Uint8Array {
        return this.mixer.compose(universe, this.channelMap.get(universe), this.blackout ? 0 : this.grandMaster);
    }

    state(): OutputState {
        return {
            grandMaster: this.grandMaster,
            blackout: this.blackout,
            enabled: this.enabled,
            artNetInterface: this.artNetInterface,
            universes: this.enabled ? this.universes() : [],
            canDiscover: this.socket.canDiscover,
            error: this.socket.error,
            usbAvailable: this.usb.available,
            usbDevices: this.usb.state()
        };
    }

    /**
     * Stops sending, for example when the application quits.
     */
    dispose(): void {
        this.stop();
    }

    private restart(): void {
        this.stop();
        if (this.content === null || !this.enabled) {
            return;
        }
        this.socket.open();
        this.timer = setInterval(() => this.send(), Math.round(1000 / this.content.output.frameRate));
    }

    private stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Sends the frame of every universe to its destinations.
     */
    private send(): void {
        if (this.content === null) {
            return;
        }
        const artNet = new Set(this.artNetUniverses());
        for (const universe of this.universes()) {
            const frame = this.frame(universe);
            this.usb.send(universe, frame);
            if (!artNet.has(universe)) {
                continue;
            }
            const destination = outputUniverse(this.content.output, universe);
            const sequence = (this.sequences.get(universe) ?? 0) % 255 + 1;
            this.sequences.set(universe, sequence);
            const packet = artDmx(destination.portAddress, sequence, frame);
            const addresses = destination.transport === 'unicast' ? destination.targets : this.broadcasts;
            for (const address of addresses) {
                this.socket.send(packet, address);
            }
        }
    }

    /**
     * Broadcast addresses of the chosen interface, or of all the external interfaces.
     */
    private findBroadcasts(): string[] {
        const interfaces = listNetworkInterfaces();
        if (this.artNetInterface !== '') {
            const chosen = interfaces.find((item) => item.address === this.artNetInterface);
            // A missing interface (cable unplugged, other computer) sends nothing rather than on a wrong network
            return chosen === undefined ? [] : [chosen.broadcast];
        }
        const external = interfaces.filter((item) => !item.internal).map((item) => item.broadcast);
        return external.length > 0 ? [...new Set(external)] : [LIMITED_BROADCAST];
    }
}
