/**
 * output.* methods: grand master, blackout, output of the workstation,
 * Art-Net configuration of the open show, USB DMX interfaces of the
 * workstation, values sent (for the DMX monitor) and search of the Art-Net nodes. The engine follows the open
 * show: patch, output configuration and fixture library.
 */

import {
    FRAME_RATE,
    MAX_PORT_ADDRESS,
    MAX_TARGETS,
    isIpv4,
    normalizeOutputUniverse,
    outputUniverse,
    type ShowOutput
} from '../../shared/output/output-config';
import { normalizeUsbDmxDevice } from '../../shared/output/usb-dmx';
import { MAX_UNIVERSE } from '../../shared/patch/patch';
import { ArtNetSocket } from '../artnet/artnet-socket';
import { listNetworkInterfaces } from '../artnet/network-interfaces';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import { OutputEngine } from '../output/output-engine';
import { readSettings, updateSettings } from '../settings/app-settings';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, optionalString, requireInteger, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { listSerialPorts } from '../usbdmx/serial-binding';
import { portId, UsbDmxManager } from '../usbdmx/usb-dmx-manager';

// Time given to the nodes to answer an ArtPoll (the protocol allows up to 3 s)
const DISCOVERY_MS = 2500;

function requireUniverse(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > MAX_UNIVERSE) {
        throw new EngineError('invalid-universe', `Invalid universe: ${value}`);
    }
    return value;
}

/** Output started by the service */
export interface OutputRuntime {
    engine: OutputEngine;
    /** Stops the output, to call when the application quits */
    dispose(): void;
}

/**
 * Starts the output and registers the methods of the service.
 */
export function registerOutputService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary): OutputRuntime {
    const socket = new ArtNetSocket();
    const settings = readSettings();
    // The state is announced when a USB interface connects or disconnects
    let announce = (): void => undefined;
    const usb = new UsbDmxManager(() => announce());
    const engine = new OutputEngine(socket, usb, { enabled: settings.outputEnabled, artNetInterface: settings.artNetInterface });

    const stateChanged = (): ReturnType<OutputEngine['state']> => {
        const state = engine.state();
        bus.emit('output.stateChanged', { state });
        return state;
    };
    announce = () => {
        stateChanged();
    };
    usb.configure(settings.usbDmxDevices);
    const follow = (): void => {
        engine.setContent(session.summary() === null
            ? null
            : { patch: session.patch(), output: session.output(), lookup: (id) => library.find(id)?.definition });
        stateChanged();
    };
    session.onContentChange((part) => {
        // Scenes and chasers do not change the channels or the destinations
        if (part === 'memories' || part === 'grid' || part === 'audio') {
            return;
        }
        follow();
        if (part !== 'patch') {
            bus.emit('output.configChanged', {});
        }
    });
    // Edited or imported definitions change the channels of the patch
    bus.addSink((message) => {
        if (message.event === 'fixtures.changed') {
            follow();
        }
    });

    const changeOutput = (change: (output: ShowOutput) => ShowOutput): ShowOutput => {
        session.setOutput(change(session.output()));
        return session.output();
    };

    router.register('output.getState', () => engine.state());

    router.register('output.setGrandMaster', (params) => {
        const level = requireObject(params).level;
        if (typeof level !== 'number' || !Number.isFinite(level)) {
            throw new EngineError('invalid-params', 'Invalid field "level"');
        }
        engine.setGrandMaster(level);
        return stateChanged();
    });

    router.register('output.setBlackout', (params) => {
        engine.setBlackout(optionalBoolean(requireObject(params), 'on') === true);
        return stateChanged();
    });

    router.register('output.setWorkstation', (params) => {
        const input = requireObject(params);
        const enabled = optionalBoolean(input, 'enabled');
        const artNetInterface = optionalString(input, 'artNetInterface');
        if (artNetInterface !== undefined && artNetInterface !== '' && !isIpv4(artNetInterface)) {
            throw new EngineError('invalid-params', `Invalid interface: ${artNetInterface}`);
        }
        const next = updateSettings({
            ...(enabled === undefined ? {} : { outputEnabled: enabled }),
            ...(artNetInterface === undefined ? {} : { artNetInterface })
        });
        engine.setWorkstation(next.outputEnabled, next.artNetInterface);
        return stateChanged();
    });

    router.register('output.getConfig', () => session.output());

    router.register('output.setFrameRate', (params) => {
        const frameRate = requireInteger(requireObject(params), 'frameRate');
        if (frameRate < FRAME_RATE.min || frameRate > FRAME_RATE.max) {
            throw new EngineError('invalid-params', `Invalid frame rate: ${frameRate}`);
        }
        return changeOutput((output) => ({ ...output, frameRate }));
    });

    router.register('output.updateUniverse', (params) => {
        const input = requireObject(params);
        const universe = requireUniverse(requireInteger(input, 'universe'));
        const current = outputUniverse(session.output(), universe);
        const portAddress = input.portAddress === undefined ? current.portAddress : requireInteger(input, 'portAddress');
        if (portAddress < 0 || portAddress > MAX_PORT_ADDRESS) {
            throw new EngineError('invalid-params', `Invalid Port-Address: ${portAddress}`);
        }
        const targets = input.targets === undefined ? current.targets : input.targets;
        if (!Array.isArray(targets) || targets.length > MAX_TARGETS || !targets.every((item) => typeof item === 'string' && isIpv4(item))) {
            throw new EngineError('invalid-ip-address', 'Invalid unicast addresses');
        }
        const next = normalizeOutputUniverse({
            ...current,
            enabled: optionalBoolean(input, 'enabled') ?? current.enabled,
            portAddress,
            transport: optionalString(input, 'transport') ?? current.transport,
            targets
        });
        if (next === null) {
            throw new EngineError('invalid-params', 'Invalid output universe');
        }
        return changeOutput((output) => ({
            ...output,
            universes: [...output.universes.filter((item) => item.universe !== universe), next].sort((a, b) => a.universe - b.universe)
        }));
    });

    router.register('output.resetUniverse', (params) => {
        const universe = requireUniverse(requireInteger(requireObject(params), 'universe'));
        return changeOutput((output) => ({ ...output, universes: output.universes.filter((item) => item.universe !== universe) }));
    });

    router.register('output.getFrame', (params) => {
        const universe = requireUniverse(requireInteger(requireObject(params), 'universe'));
        return [...engine.frame(universe)];
    });

    router.register('output.listInterfaces', () => listNetworkInterfaces());

    router.register('output.discover', async () => {
        socket.open();
        const nodes = await socket.discover(engine.broadcastAddresses, DISCOVERY_MS);
        return nodes.sort((a, b) => a.address.localeCompare(b.address, undefined, { numeric: true }));
    });

    router.register('output.listSerialPorts', async (_params, context) => {
        requireDesktop(context);
        const ports = await listSerialPorts();
        return ports
            .map((port) => ({
                path: port.path,
                serialNumber: port.serialNumber ?? null,
                manufacturer: port.manufacturer ?? null,
                vendorId: port.vendorId ?? null,
                productId: port.productId ?? null,
                id: portId(port),
                // FTDI, the chip of Enttec and of most compatible interfaces
                likelyDmx: port.vendorId?.toLowerCase() === '0403'
            }))
            .sort((a, b) => Number(b.likelyDmx) - Number(a.likelyDmx) || a.path.localeCompare(b.path));
    });

    router.register('output.setUsbDevice', (params, context) => {
        requireDesktop(context);
        const device = normalizeUsbDmxDevice(params);
        if (device === null) {
            throw new EngineError('invalid-params', 'Invalid USB DMX interface');
        }
        const devices = [...readSettings().usbDmxDevices.filter((item) => item.id !== device.id), device]
            .sort((a, b) => a.universe - b.universe);
        usb.configure(updateSettings({ usbDmxDevices: devices }).usbDmxDevices);
        engine.refresh();
        return stateChanged();
    });

    router.register('output.removeUsbDevice', (params, context) => {
        requireDesktop(context);
        const id = requireString(requireObject(params), 'id');
        usb.configure(updateSettings({ usbDmxDevices: readSettings().usbDmxDevices.filter((item) => item.id !== id) }).usbDmxDevices);
        engine.refresh();
        return stateChanged();
    });

    follow();
    return {
        engine,
        dispose: () => {
            engine.dispose();
            socket.close();
            void usb.dispose();
        }
    };
}
