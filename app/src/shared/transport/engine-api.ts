/**
 * Contract between interface and engine: methods the interface can call
 * and events the engine can send, with their data types.
 * The engine checks the parameters of every method, because requests
 * can come from remote clients.
 */

import type { FixtureCategory, FixtureDefinition } from '../fixtures/fixture-definition.js';
import type { FixtureIssue } from '../fixtures/validate-fixture.js';
import type { OutputTransport, ShowOutput } from '../output/output-config.js';
import type { UsbDmxDevice, UsbDmxStatus } from '../output/usb-dmx.js';
import type { PatchedFixture } from '../patch/patch.js';
import type { MediaKind } from '../show/media-kinds.js';
import type { ShowSettings } from '../show/show-settings.js';

/** Information about the application, for the About window */
export interface AppInfo {
    name: string;
    version: string;
    license: string;
    electron: string;
    chrome: string;
    node: string;
    platform: string;
    arch: string;
}

/** Text in one language or translated in several languages (language code -> text) */
export type LocalizedText = string | Record<string, string>;

/** Open show */
export interface ShowSummary {
    id: string;
    name: string;
    /** Show folder */
    folder: string;
    /** Date of the last save, ISO 8601 */
    modifiedAt: string;
    /** There are unsaved changes */
    dirty: boolean;
}

/** Fixture definition referenced by the patch but not found in the library */
export interface MissingFixture {
    /** Identifier of the definition, for example "clay-paky/sharpy" */
    definition: string;
    /** Modes used by the patch; for a definition found without some of its modes, only those */
    modes: string[];
    /** Number of patched fixtures concerned */
    count: number;
}

/** Result of opening a show */
export interface OpenShowResult {
    show: ShowSummary;
    /** There is a recovery copy newer than the last save */
    recoveryAvailable: boolean;
    /** Resources used by the show and not available on this workstation */
    missingFixtures: MissingFixture[];
}

/** Recent show */
export interface RecentShow {
    name: string;
    folder: string;
    /** Date of the last opening, ISO 8601 */
    openedAt: string;
    /** Date of the last save, ISO 8601, if the show still exists */
    modifiedAt: string | null;
    /** The show is no longer in its folder (moved or deleted) */
    missing: boolean;
}

/** Show template */
export interface TemplateInfo {
    /** Identifier, for example "bundled:empty" or "user:Small stage" */
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    /** Included in the application (read-only) or created by the user */
    source: 'bundled' | 'user';
}

/** Media of a show */
export interface MediaItem {
    /** Path relative to the media/ folder, with "/" as separator */
    file: string;
    /** File name */
    name: string;
    kind: MediaKind;
    /** Size in bytes */
    size: number;
    /** Date of the last change of the file, ISO 8601 */
    modifiedAt: string;
}

/** Mode of a definition in the library list */
export interface FixtureModeSummary {
    name: string;
    channelCount: number;
}

/** Fixture definition in the library list */
export interface FixtureSummary {
    /** Identifier, for example "clay-paky/sharpy" */
    id: string;
    manufacturer: string;
    model: string;
    category: FixtureCategory;
    /** Included in the application (read-only) or created or imported by the user */
    source: 'bundled' | 'user';
    /** User definition that replaces an included one with the same identifier */
    replacesBundled: boolean;
    modes: FixtureModeSummary[];
}

/** Fixture definition with its library data */
export interface FixtureRecordInfo extends FixtureSummary {
    definition: FixtureDefinition;
}

/** Patched fixture with the state of its definition */
export interface PatchEntry extends PatchedFixture {
    /** Manufacturer, model and category from the definition, null if it is missing */
    manufacturer: string | null;
    model: string | null;
    category: FixtureCategory | null;
    /** The definition or its mode is not in the library */
    missing: boolean;
    /** It shares addresses with another fixture */
    conflict: boolean;
}

/** Fixtures to add to the patch */
export interface PatchAddRequest {
    /** Identifier of the definition */
    definition: string;
    mode: string;
    /** Number of fixtures, placed on consecutive addresses */
    count: number;
    universe: number;
    /** Start address of the first fixture */
    address: number;
    /** Number of the first fixture; the next ones get the following numbers */
    number: number;
    /** Name; with more fixtures, each one gets its number after the name */
    name: string;
}

/** Changes to a patched fixture */
export interface PatchUpdateRequest {
    id: string;
    name?: string;
    number?: number;
    universe?: number;
    address?: number;
    mode?: string;
}

/** Global application settings */
export interface AppSettings {
    /** Default folder of new shows */
    defaultShowsFolder: string;
    /** Address of the network interface used by Art-Net; empty for all the interfaces */
    artNetInterface: string;
    /** The workstation sends DMX output */
    outputEnabled: boolean;
    /** USB DMX interfaces of the workstation */
    usbDmxDevices: UsbDmxDevice[];
}

/** Serial port of the computer, for the choice of a USB DMX interface */
export interface SerialPortInfo {
    path: string;
    /** Serial number, or null if the system does not give it */
    serialNumber: string | null;
    manufacturer: string | null;
    vendorId: string | null;
    productId: string | null;
    /** Identifier used to find the device again */
    id: string;
    /** FTDI chip, used by most USB DMX interfaces */
    likelyDmx: boolean;
}

/** USB DMX interface with its connection */
export interface UsbDmxDeviceState extends UsbDmxDevice {
    status: UsbDmxStatus;
    error: string | null;
}

/** IPv4 network interface of the computer */
export interface NetworkInterfaceInfo {
    name: string;
    address: string;
    netmask: string;
    broadcast: string;
    /** Loopback interface (this computer only) */
    internal: boolean;
}

/** Art-Net node found on the network */
export interface ArtNetNodeInfo {
    address: string;
    shortName: string;
    longName: string;
    /** Port-Addresses of its output ports */
    portAddresses: number[];
}

/** State of the DMX output */
export interface OutputState {
    /** Grand master, 0 to 1 */
    grandMaster: number;
    blackout: boolean;
    /** The workstation sends DMX output */
    enabled: boolean;
    /** Network interface of Art-Net, empty for all */
    artNetInterface: string;
    /** Universes being sent */
    universes: number[];
    /** The search of the nodes is possible (the Art-Net port is free) */
    canDiscover: boolean;
    /** Last network error, or null */
    error: string | null;
    /** The serial ports can be used on this computer */
    usbAvailable: boolean;
    /** USB DMX interfaces of the workstation */
    usbDevices: UsbDmxDeviceState[];
}

/** Changes to the Art-Net destination of a universe */
export interface OutputUniverseUpdate {
    universe: number;
    enabled?: boolean;
    portAddress?: number;
    transport?: OutputTransport;
    targets?: string[];
}

/** Engine methods: parameters and result */
export interface EngineMethods {
    /** Information about the application */
    'app.getInfo': { params: undefined; result: AppInfo };
    /** Closes the main window after the confirmation of the user */
    'app.confirmClose': { params: undefined; result: undefined };
    /** Opens the About window (desktop application only) */
    'window.openAbout': { params: undefined; result: undefined };
    /** Lets the user choose a folder (desktop application only) */
    'dialog.chooseFolder': { params: { defaultPath?: string }; result: string | null };

    /** Open show, or null */
    'show.getCurrent': { params: undefined; result: ShowSummary | null };
    /** Creates a show from a template and opens it */
    'show.create': { params: { name: string; folder: string; templateId: string }; result: OpenShowResult };
    /** Opens the show of a folder */
    'show.open': { params: { folder: string }; result: OpenShowResult };
    /** Lets the user choose the folder of a show and opens it; null if cancelled */
    'show.chooseAndOpen': { params: undefined; result: OpenShowResult | null };
    /** Saves the open show */
    'show.save': { params: undefined; result: ShowSummary };
    /** Saves the open show with a new name in a folder */
    'show.saveAs': { params: { name: string; folder: string }; result: ShowSummary };
    /** Renames the open show (unsaved change) */
    'show.rename': { params: { name: string }; result: ShowSummary };
    /** Loads the recovery copy of the open show */
    'show.recover': { params: undefined; result: ShowSummary };
    /** Deletes the recovery copy of the open show */
    'show.discardRecovery': { params: undefined; result: undefined };
    /** Closes the show; with discard true the unsaved changes are discarded */
    'show.close': { params: { discard?: boolean }; result: undefined };

    /** Exports the open, saved show to a .bshow archive; returns the file, or null if cancelled */
    'show.export': { params: undefined; result: string | null };
    /** Imports a show from a .bshow archive into the default folder and opens it; null if cancelled */
    'show.import': { params: undefined; result: OpenShowResult | null };

    /** Settings of the open show */
    'show.getSettings': { params: undefined; result: ShowSettings };
    /** Changes the settings of the open show (unsaved change) */
    'show.updateSettings': { params: Partial<ShowSettings>; result: ShowSettings };

    /** Media of the open show */
    'media.list': { params: undefined; result: MediaItem[] };
    /** Lets the user choose files and copies them into the show media (desktop application only) */
    'media.import': { params: undefined; result: MediaItem[] };
    /** Deletes a media file from the show */
    'media.remove': { params: { file: string }; result: undefined };
    /** Shows a media file in the system folder (desktop application only) */
    'media.reveal': { params: { file: string }; result: undefined };

    /** Fixture definitions of the library: included and from the user */
    'fixtures.list': { params: undefined; result: FixtureSummary[] };
    /** A definition of the library */
    'fixtures.get': { params: { id: string }; result: FixtureRecordInfo };
    /** Checks a definition without saving it */
    'fixtures.validate': { params: { definition: unknown }; result: FixtureIssue[] };
    /**
     * Saves a user definition; previousId is the identifier it had before the
     * change, so a renamed definition replaces the old file and the patch follows it
     */
    'fixtures.save': { params: { definition: FixtureDefinition; previousId?: string }; result: FixtureSummary };
    /** Deletes a user definition */
    'fixtures.delete': { params: { id: string }; result: undefined };
    /** Lets the user choose definition files and copies them into the user library; returns the identifiers */
    'fixtures.import': { params: undefined; result: string[] };
    /** Exports a definition to a file; returns the file, or null if cancelled */
    'fixtures.export': { params: { id: string }; result: string | null };

    /** Patch of the open show */
    'patch.get': { params: undefined; result: PatchEntry[] };
    /** Definitions used by the open show and not found in the library */
    'patch.missingFixtures': { params: undefined; result: MissingFixture[] };
    /** Adds fixtures to the patch (unsaved change); returns the new ones */
    'patch.add': { params: PatchAddRequest; result: PatchEntry[] };
    /** Changes a patched fixture (unsaved change) */
    'patch.update': { params: PatchUpdateRequest; result: PatchEntry };
    /** Removes fixtures from the patch (unsaved change) */
    'patch.remove': { params: { ids: string[] }; result: undefined };

    /** State of the DMX output */
    'output.getState': { params: undefined; result: OutputState };
    /** Changes the grand master, 0 to 1 */
    'output.setGrandMaster': { params: { level: number }; result: OutputState };
    /** Turns the blackout on or off */
    'output.setBlackout': { params: { on: boolean }; result: OutputState };
    /** Turns the output of this workstation on or off and chooses the network interface of Art-Net */
    'output.setWorkstation': { params: { enabled?: boolean; artNetInterface?: string }; result: OutputState };
    /** Output configuration of the open show */
    'output.getConfig': { params: undefined; result: ShowOutput };
    /** Changes the frame rate of the open show (unsaved change) */
    'output.setFrameRate': { params: { frameRate: number }; result: ShowOutput };
    /** Changes the Art-Net destination of a universe (unsaved change) */
    'output.updateUniverse': { params: OutputUniverseUpdate; result: ShowOutput };
    /** Brings the destination of a universe back to the default (unsaved change) */
    'output.resetUniverse': { params: { universe: number }; result: ShowOutput };
    /** The 512 values sent on a universe */
    'output.getFrame': { params: { universe: number }; result: number[] };
    /** IPv4 network interfaces of the computer */
    'output.listInterfaces': { params: undefined; result: NetworkInterfaceInfo[] };
    /** Searches the Art-Net nodes of the network */
    'output.discover': { params: undefined; result: ArtNetNodeInfo[] };
    /** Serial ports of the computer, USB DMX interfaces first (desktop application only) */
    'output.listSerialPorts': { params: undefined; result: SerialPortInfo[] };
    /** Adds or changes a USB DMX interface of the workstation (desktop application only) */
    'output.setUsbDevice': { params: UsbDmxDevice; result: OutputState };
    /** Removes a USB DMX interface of the workstation (desktop application only) */
    'output.removeUsbDevice': { params: { id: string }; result: OutputState };

    /** Recent shows, most recent first */
    'recent.list': { params: undefined; result: RecentShow[] };
    /** Removes a show from the recent shows */
    'recent.remove': { params: { folder: string }; result: undefined };

    /** Available templates: included and from the user */
    'template.list': { params: undefined; result: TemplateInfo[] };
    /** Saves the open show as a user template */
    'template.saveCurrent': { params: { name: string; description: string }; result: TemplateInfo };
    /** Changes the name and description of a user template */
    'template.update': { params: { id: string; name: string; description: string }; result: TemplateInfo };
    /** Deletes a user template */
    'template.delete': { params: { id: string }; result: undefined };
    /** Exports a template to a .btemplate archive; returns the file, or null if cancelled */
    'template.export': { params: { id: string }; result: string | null };
    /** Imports a template from a .btemplate archive; null if cancelled */
    'template.import': { params: undefined; result: TemplateInfo | null };

    /** Global settings */
    'settings.get': { params: undefined; result: AppSettings };
    /** Changes the global settings */
    'settings.update': { params: Partial<AppSettings>; result: AppSettings };
}

/** Engine events and their data */
export interface EngineEvents {
    /** The list of available languages has changed (pack added or removed) */
    'locales.changed': { codes: string[] };
    /** The open show has changed (opened, saved, modified, closed) */
    'show.changed': { show: ShowSummary | null };
    /** The media of the open show have changed */
    'media.changed': Record<string, never>;
    /** The list of recent shows has changed */
    'recent.changed': Record<string, never>;
    /** The fixture library has changed */
    'fixtures.changed': Record<string, never>;
    /** The patch of the open show has changed */
    'patch.changed': Record<string, never>;
    /** The state of the DMX output has changed */
    'output.stateChanged': { state: OutputState };
    /** The output configuration of the open show has changed */
    'output.configChanged': Record<string, never>;
    /** The list of templates has changed */
    'templates.changed': Record<string, never>;
    /** The user wants to close the window with unsaved changes */
    'app.closeRequested': Record<string, never>;
}

/** Name of an engine method */
export type EngineMethod = keyof EngineMethods;

/** Name of an engine event */
export type EngineEvent = keyof EngineEvents;
