/**
 * Contract between interface and engine: methods the interface can call
 * and events the engine can send, with their data types.
 * The engine checks the parameters of every method, because requests
 * can come from remote clients.
 */

import type { CustomModel, ModelAxis, ModelUnit } from '../stage/custom-model.js';
import type { ShowStage } from '../stage/stage.js';
import type { DiscoveredInstance } from '../remote/instance.js';
import type { FileRoot, FolderContent } from '../files/file-entry.js';
import type { AttributeLayout } from '../console/fixture-attributes.js';
import type { AudioDevice, AudioPlayback, ShowAudio } from '../audio/audio.js';
import type { CueStackState } from '../console/cue-stack.js';
import type { ShowTimer, TimerAction, TimerState } from '../video/show-timer.js';
import type { ShowTimelines, Timeline, TimelineState } from '../timeline/timeline.js';
import type { TextGobo } from '../video/text-gobo.js';
import type { LayerState, OutputComposition, ShowVideo, VideoDisplay, VideoInput, VideoOutputConfig } from '../video/video.js';
import type { MappingSurface } from '../video/mapping.js';
import type { Chaser, ChaserDirection, Cue, MemoriesState, MemoriesSummary, MemoryKind, SceneSummary } from '../console/memories.js';
import type { ChannelLabel, PresetDeskState, PresetLevels, PresetMaster, PresetMode, PresetRow } from '../console/preset-desk.js';
import type { FixtureCategory, FixtureDefinition } from '../fixtures/fixture-definition.js';
import type { FixtureIssue } from '../fixtures/validate-fixture.js';
import type { OutputTransport, ShowOutput } from '../output/output-config.js';
import type { UsbDmxDevice, UsbDmxStatus } from '../output/usb-dmx.js';
import type { ShowGrid } from '../grid/grid.js';
import type { FixtureGroup } from '../patch/groups.js';
import type { MatrixSegment, PatchedMatrix } from '../patch/matrix.js';
import type { MatrixEffect } from '../patch/matrix-effect.js';
import type { PatchedFixture } from '../patch/patch.js';
import type { MediaKind } from '../show/media-kinds.js';
import type { OperatorAccess, OperatorProfile, OperatorState } from '../show/operators.js';
import type { ImportCatalog, ImportChoice, ImportResult } from '../show/show-import.js';
import type { ShowSettings } from '../show/show-settings.js';
import type { MixerRecall, ShowMixer, ShowMixers } from '../mixers/mixers.js';
import type { MidiEncoding, MidiMapping, MidiMode, MidiMonitorEntry, MidiState, MidiTarget, ShowMidi } from '../midi/midi.js';

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
    source: 'bundled' | 'user' | 'show';
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

/** LED matrix of the patch, with its parts on the universes */
export interface MatrixEntry extends PatchedMatrix {
    segments: MatrixSegment[];
    /** It shares addresses with a fixture or another matrix */
    conflict: boolean;
}

/** Data of a matrix to add or change */
export type MatrixRequest = Omit<PatchedMatrix, 'id'>;

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
    /** Name of this computer among the instances on the network */
    instanceName: string;
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
    /** Ticket to send a file into the media of the open show (remote clients only) */
    'upload.media': { params: { name: string; size: number }; result: { ticket: string } };
    /** Ticket to send a file into a folder of the file manager (remote clients only) */
    'upload.file': { params: { folder: string; name: string; size: number }; result: { ticket: string } };
    /** Layout of the 3D stage of the open show */
    'stage.get': { params: undefined; result: ShowStage };
    /** Replaces the layout of the 3D stage (unsaved change) */
    'stage.set': { params: { stage: ShowStage }; result: ShowStage };
    /** Opens the window of the 3D stage (desktop only) */
    'stage.open': { params: undefined; result: undefined };
    /** Measures an .obj before importing it */
    'stage.inspectModel': { params: { file: string }; result: { size: [number, number, number]; name: string; materials: boolean } };
    'stage.importModel': { params: { file: string; name: string; unit: ModelUnit; up: ModelAxis; library?: boolean }; result: CustomModel };
    'stage.updateModel': { params: { id: string; name: string; unit: ModelUnit; up: ModelAxis; library?: boolean }; result: undefined };
    /** Personal library of imported models, for all the shows */
    'stage.listLibraryModels': { params: undefined; result: CustomModel[] };
    'stage.useLibraryModel': { params: { id: string }; result: undefined };
    'stage.removeLibraryModel': { params: { id: string }; result: undefined };
    'stage.removeModel': { params: { id: string }; result: undefined };
    'stage.readModel': { params: { id: string }; result: { obj: string; mtl: string | null } };
    /** Searches the other instances on the local network */
    'remote.discover': { params: undefined; result: DiscoveredInstance[] };
    /** Shows the remote control of another instance in the main window (desktop only) */
    'remoteView.open': { params: { address: string; port: number }; result: undefined };
    /** Closes the remote control shown in the main window (desktop only) */
    'remoteView.close': { params: undefined; result: undefined };
    /** Port of the web server of the remote control and the addresses where it is reached */
    'remote.getInfo': { params: undefined; result: { port: number | null; addresses: string[] } };
    /** Information about the application */
    'app.getInfo': { params: undefined; result: AppInfo };
    /** Closes the main window after the confirmation of the user */
    'app.confirmClose': { params: undefined; result: undefined };
    /** Opens the About window (desktop application only) */
    'window.openAbout': { params: undefined; result: undefined };
    /** The main window is fullscreen (desktop application only) */
    'window.isFullScreen': { params: undefined; result: boolean };
    /** Puts the main window in fullscreen or brings it back; returns the new state (desktop application only) */
    'window.toggleFullScreen': { params: undefined; result: boolean };

    /** Places the internal file manager can browse: home, external drives and the folder of the open show */
    'fs.roots': { params: undefined; result: FileRoot[] };
    /** Content of a folder inside the roots */
    'fs.list': { params: { path: string }; result: FolderContent };
    /** Creates a folder; returns its path */
    'fs.createFolder': { params: { parent: string; name: string }; result: string };
    /** Renames a file or folder; returns its new path */
    'fs.rename': { params: { path: string; name: string }; result: string };
    /** Copies files and folders into a folder; a name already used gets a number */
    'fs.copy': { params: { paths: string[]; target: string }; result: undefined };
    /** Moves files and folders into a folder */
    'fs.move': { params: { paths: string[]; target: string }; result: undefined };
    /** Moves files and folders to the trash of the system */
    'fs.trash': { params: { paths: string[] }; result: undefined };
    /** Deletes files and folders for good */
    'fs.delete': { params: { paths: string[] }; result: undefined };

    /** Open show, or null */
    'show.getCurrent': { params: undefined; result: ShowSummary | null };
    /** Creates a show from a template and opens it */
    'show.create': { params: { name: string; folder: string; templateId: string; admin: { name: string; pin: string } }; result: OpenShowResult };
    /** Opens the show of a folder */
    'show.open': { params: { folder: string }; result: OpenShowResult };
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

    /** Exports the open, saved show to a .bshow archive; returns the file */
    'show.export': { params: { file: string }; result: string };
    /** Imports a show from a .bshow archive into the default folder and opens it */
    'show.import': { params: { file: string }; result: OpenShowResult };

    /** Settings of the open show */
    'show.getSettings': { params: undefined; result: ShowSettings };
    /** Changes the settings of the open show (unsaved change) */
    'show.updateSettings': { params: Partial<ShowSettings>; result: ShowSettings };

    /** Media of the open show */
    'media.list': { params: undefined; result: MediaItem[] };
    /** Copies files into the show media */
    'media.import': { params: { files: string[] }; result: MediaItem[] };
    /** Deletes a media file from the show */
    'media.remove': { params: { file: string }; result: undefined };
    /** Contents of a raster image of the show media, as base64 (for the image effect of the matrices) */
    'media.readImage': { params: { file: string }; result: string };

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
    'fixtures.save': { params: { definition: FixtureDefinition; previousId?: string; library?: boolean }; result: FixtureSummary };
    /** Deletes a user definition */
    'fixtures.delete': { params: { id: string }; result: undefined };
    /** Copies definition files into the user library; returns the identifiers */
    'fixtures.import': { params: { files: string[]; library?: boolean }; result: string[] };
    /** Exports a definition to a file; returns the file */
    'fixtures.readImage': { params: { file: string }; result: string };
    'fixtures.export': { params: { id: string; file: string }; result: string };

    /** Patch of the open show */
    'patch.get': { params: undefined; result: PatchEntry[] };
    /** Definitions used by the open show and not found in the library */
    'patch.missingFixtures': { params: undefined; result: MissingFixture[] };
    /** Adds fixtures to the patch (unsaved change); returns the new ones */
    'patch.add': { params: PatchAddRequest; result: PatchEntry[] };
    /** Changes a patched fixture (unsaved change) */
    'patch.update': { params: PatchUpdateRequest; result: PatchEntry };
    /** LED matrices of the patch */
    'patch.getMatrices': { params: undefined; result: MatrixEntry[] };
    /** Adds an LED matrix (unsaved change) */
    'patch.addMatrix': { params: MatrixRequest; result: MatrixEntry };
    /** Changes an LED matrix (unsaved change) */
    'patch.updateMatrix': { params: MatrixRequest & { id: string }; result: MatrixEntry };
    /** Colors of the pixels of a matrix as they are sent, in grid order (rows from the top), three values per pixel */
    'matrices.getPixels': { params: { id: string }; result: number[] };
    /** Live effects of the matrices: matrix identifier -> effect */
    'matrices.getLive': { params: undefined; result: Record<string, MatrixEffect> };
    /** Sets the live effect of a matrix, or turns it off with null; part of the desk, recorded in scenes */
    'matrices.setLive': { params: { id: string; effect: MatrixEffect | null }; result: Record<string, MatrixEffect> };
    /** Fixture groups, in number order */
    'patch.getGroups': { params: undefined; result: FixtureGroup[] };
    /** Adds (without id) or changes a fixture group (unsaved change) */
    'patch.saveGroup': { params: { id?: string; number: number; name: string; fixtures: string[] }; result: FixtureGroup };
    /** Deletes a fixture group (unsaved change) */
    'patch.deleteGroup': { params: { id: string }; result: undefined };
    /** Removes fixtures and matrices from the patch (unsaved change) */
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

    /** State of the two-preset desk */
    'console.getState': { params: undefined; result: PresetDeskState };
    /** Fader levels of the desk on a universe */
    'console.getLevels': { params: { universe: number }; result: PresetLevels };
    /** Names of the patched channels of a universe, null for free channels */
    'console.channelLabels': { params: { universe: number }; result: Array<ChannelLabel | null> };
    /** Moves a fader of the desk, value 0 to 255 */
    'console.setFader': { params: { row: PresetRow; universe: number; channel: number; value: number }; result: undefined };
    /** Moves a master fader, position 0 to 1 */
    'console.setMaster': { params: { master: PresetMaster; position: number }; result: undefined };
    /** Presses or releases a flash key */
    'console.setFlash': { params: { row: PresetRow; universe: number; channel: number; on: boolean }; result: undefined };
    /** Chooses the mode of the desk */
    'console.setMode': { params: { mode: PresetMode }; result: PresetDeskState };
    /** Moves the faders to a bank of channels */
    'console.setBank': { params: { universe: number; firstChannel: number }; result: PresetDeskState };
    /** Turns blind on or off */
    'console.setBlind': { params: { on: boolean }; result: PresetDeskState };
    /** Turns full on on or off */
    'console.setFullOn': { params: { on: boolean }; result: PresetDeskState };
    /** Brings every fader of the desk back to 0 */
    'console.home': { params: undefined; result: undefined };
    /** Intensity levels of the fixture groups above zero: group identifier -> level 0 to 1 */
    'console.getGroupLevels': { params: undefined; result: Record<string, number> };
    /** Sets the intensity level of a fixture group, 0 to 1 */
    'console.setGroupLevel': { params: { id: string; level: number }; result: undefined };
    /** Flash of a group: full while held, then the level it had */
    'console.flashGroup': { params: { id: string; on: boolean }; result: undefined };
    /** Channels of a patched fixture for the attributes panel, null when its definition is missing */
    'console.attributeLayout': { params: { fixture: string }; result: AttributeLayout | null };
    /**
     * Sets channels of the selected fixtures in the levels of Preset A. The
     * first fixture is the reference: values are keyed by its channel keys,
     * from 0 to 1; other models get the channel with the same attribute.
     */
    'console.setAttributes': { params: { fixtures: string[]; values: Record<string, number> }; result: undefined };

    /** Scenes and chasers of the open show */
    'memories.get': { params: undefined; result: MemoriesSummary };
    /** Memories being played */
    'memories.getState': { params: undefined; result: MemoriesState };
    /**
     * Records the result of the desk in a scene place (unsaved change). A
     * place already used keeps its scene, name and fades: only the levels change.
     */
    'memories.recordScene': { params: { slot: number; name: string }; result: SceneSummary };
    /** Changes the name and fades of a scene (unsaved change) */
    'memories.updateScene': { params: { id: string; name: string; fadeIn: number; fadeOut: number; mixer?: MixerRecall | null }; result: SceneSummary };
    /** Deletes a scene and removes it from the chaser steps (unsaved change) */
    'memories.deleteScene': { params: { id: string }; result: undefined };
    /** Creates (without id) or changes a chaser (unsaved change) */
    'memories.saveChaser': { params: { id?: string; slot: number; name: string; steps: string[]; bpm: number; fade: number; direction: ChaserDirection; followTempo?: boolean }; result: Chaser };
    /** Deletes a chaser (unsaved change) */
    'memories.deleteChaser': { params: { id: string }; result: undefined };
    /** Changes the speed of a chaser and selects it (unsaved change) */
    'memories.setBpm': { params: { id: string; bpm: number }; result: Chaser };
    /** Turns a memory on or off, with its fades */
    'memories.setActive': { params: { kind: MemoryKind; id: string; on: boolean }; result: MemoriesState };
    /** Sets the level of a scene or chaser from a fader, 0 to 1; zero stops it */
    'memories.setLevel': { params: { kind: MemoryKind; id: string; level: number }; result: undefined };
    /** Chooses the chaser that the tempo controls act on */
    'memories.selectChaser': { params: { id: string }; result: MemoriesState };
    /** Turns every memory off with its fade out */
    'memories.releaseAll': { params: undefined; result: MemoriesState };

    /** Audio player and playlist of the open show */
    'audio.get': { params: undefined; result: ShowAudio };
    /** Playback of the audio player */
    'audio.getState': { params: undefined; result: AudioPlayback };
    /** Audio outputs of the computer */
    'audio.listDevices': { params: undefined; result: AudioDevice[] };
    /** Changes output, volume or auto advance of the player (unsaved change) */
    'audio.setPlayer': { params: { device?: string; volume?: number; autoAdvance?: boolean }; result: ShowAudio };
    /** Adds audio files of the show media at the end of the playlist (unsaved change) */
    'audio.addItems': { params: { files: string[] }; result: ShowAudio };
    /** Changes an item of the playlist (unsaved change) */
    'audio.updateItem': { params: { id: string; name: string; start: number; end: number | null; fadeIn: number; fadeOut: number; volume: number; loop: boolean }; result: ShowAudio };
    /** Removes an item of the playlist (unsaved change) */
    'audio.removeItem': { params: { id: string }; result: ShowAudio };
    /** Moves an item of the playlist to a place, from 0 (unsaved change) */
    'audio.moveItem': { params: { id: string; to: number }; result: ShowAudio };
    /** Plays an item; without id resumes after pause or starts the first item */
    'audio.play': { params: { id?: string } | undefined; result: AudioPlayback };
    /** Stops with the fade out of the item */
    'audio.stop': { params: undefined; result: AudioPlayback };
    /** Pauses or resumes */
    'audio.pause': { params: undefined; result: AudioPlayback };
    /** Plays the next item */
    'audio.next': { params: undefined; result: AudioPlayback };
    /** Plays the previous item */
    'audio.previous': { params: undefined; result: AudioPlayback };
    /** Video outputs of the open show */
    'video.get': { params: undefined; result: ShowVideo };
    /** Program and preview of every video output */
    'video.getState': { params: undefined; result: Record<string, OutputComposition> };
    /** Videomapping surfaces of an output, saved in the show */
    'video.setSurfaces': { params: { id: string; surfaces: MappingSurface[] }; result: undefined };
    'video.setTestPattern': { params: { id: string; on: boolean }; result: undefined };
    'video.getTestPatterns': { params: undefined; result: string[] };
    /** Displays of the computer */
    'video.listDisplays': { params: undefined; result: VideoDisplay[] };
    /** Video inputs of the computer: cameras and capture cards */
    'video.listInputs': { params: undefined; result: VideoInput[] };
    /** Adds a video output (unsaved change) */
    'video.addOutput': { params: { name: string }; result: ShowVideo };
    /** Changes a video output: window, display, size, stack, layers (unsaved change) */
    'video.updateOutput': { params: Partial<Omit<VideoOutputConfig, 'id'>> & { id: string }; result: ShowVideo };
    /** Removes a video output (unsaved change) */
    'video.removeOutput': { params: { id: string }; result: ShowVideo };
    /** Adds or changes a text gobo preset (unsaved change) */
    'video.saveGobo': { params: { gobo: TextGobo }; result: ShowVideo };
    /** Deletes a text gobo preset (unsaved change) */
    'video.deleteGobo': { params: { id: string }; result: ShowVideo };
    /** Adds or changes a timer screen preset (unsaved change) */
    'video.saveTimer': { params: { timer: ShowTimer }; result: ShowVideo };
    /** Deletes a timer screen preset (unsaved change) */
    'video.deleteTimer': { params: { id: string }; result: ShowVideo };
    /** MIDI ports of the workstation and MIDI learn */
    'midi.getState': { params: undefined; result: MidiState };
    /** MIDI mappings of the open show */
    'midi.getMappings': { params: undefined; result: ShowMidi };
    /** MIDI learn on or off */
    'midi.setLearn': { params: { on: boolean }; result: MidiState };
    /** Control chosen in learn mode: the next MIDI message is tied to it (the mapping is an unsaved change) */
    'midi.choose': { params: { target: MidiTarget; mode: MidiMode; led?: number | null }; result: MidiState };
    /** Adds the mappings of a profile at once; mappings with the same messages are replaced (unsaved change) */
    'midi.addMappings': { params: { mappings: Array<Omit<MidiMapping, 'id'>> }; result: ShowMidi };
    /** Changes how a control change mapping reads its level: absolute or relative encoder (unsaved change) */
    'midi.updateMapping': { params: { id: string; encoding: MidiEncoding }; result: ShowMidi };
    /** MIDI Show Control on or off and the device identifier of the show (unsaved change) */
    'midi.setMsc': { params: { enabled: boolean; deviceId: number }; result: ShowMidi };
    /** MIDI timecode followed by the loaded timeline: on or off, input port (empty for any), timecode of the start (unsaved change) */
    'midi.setMtc': { params: { enabled: boolean; device: string; start: number }; result: ShowMidi };
    /** Monitor of the MIDI messages on or off: while on, midi.monitor events carry the messages */
    'midi.setMonitor': { params: { on: boolean }; result: undefined };
    /** Deletes a mapping (unsaved change) */
    'midi.deleteMapping': { params: { id: string }; result: ShowMidi };
    /** Deletes the mappings of a device, or all of them (unsaved change) */
    'midi.clearMappings': { params: { device?: string } | undefined; result: ShowMidi };
    /** External audio mixers of the open show */
    'mixers.get': { params: undefined; result: ShowMixers };
    /** Creates (empty id) or changes a mixer (unsaved change) */
    'mixers.save': { params: { mixer: ShowMixer }; result: ShowMixers };
    /** Deletes a mixer (unsaved change) */
    'mixers.delete': { params: { id: string }; result: ShowMixers };
    /** Recalls a scene of a mixer now, for example to test it; mixer-unreachable when it cannot be sent */
    'mixers.recall': { params: { mixer: string; number: number }; result: undefined };
    /** Live states of the timers */
    'video.getTimers': { params: undefined; result: Record<string, TimerState> };
    /** Starts, pauses, resets or changes a timer by a minute */
    'video.timerCommand': { params: { id: string; action: TimerAction }; result: Record<string, TimerState> };
    /** Changes a layer in program (at once) or in preview */
    'video.setLayer': { params: { output: string; target: 'program' | 'preview'; index: number; layer: LayerState }; result: undefined };
    /** Moves a layer of the program (at once) or of the preview to another place of the stack, from 0 at the bottom */
    'video.moveLayer': { params: { output: string; target: 'program' | 'preview'; from: number; to: number }; result: undefined };
    /** Brings the preview of an output, or of all outputs, to program with a transition in seconds */
    'video.take': { params: { output?: string; duration: number }; result: undefined };
    /** Timelines of the open show */
    'timeline.list': { params: undefined; result: ShowTimelines };
    /** Transport of the timeline player */
    'timeline.getState': { params: undefined; result: TimelineState };
    /** Adds an empty timeline and loads it (unsaved change) */
    'timeline.create': { params: { name: string }; result: ShowTimelines };
    /** Saves a whole timeline, checked by the engine (unsaved change) */
    'timeline.save': { params: { timeline: Timeline }; result: ShowTimelines };
    /** Deletes a timeline (unsaved change) */
    'timeline.delete': { params: { id: string }; result: ShowTimelines };
    /** Loads a timeline in the player, stopped at its start */
    'timeline.load': { params: { id: string }; result: TimelineState };
    /** Play, pause, play or pause, stop, move the playhead to a time in seconds, Go (play to the next stop marker) or Back (previous marker) */
    'timeline.transport': { params: { action: 'play' | 'pause' | 'toggle' | 'stop' | 'locate' | 'go' | 'back'; time?: number }; result: TimelineState };
    /** Loop (null to turn it off) and go mode */
    'timeline.setOptions': { params: { loop?: { start: number; end: number } | null; goMode?: boolean }; result: TimelineState };
    /** Record key: live actions become clips on the armed tracks (it changes the timeline, so it needs the section editable) */
    'timeline.setRecording': { params: { on: boolean }; result: TimelineState };
    /** Pages of the virtual console of the open show */
    'grid.get': { params: undefined; result: ShowGrid };
    /** Replaces the pages of the virtual console (unsaved change); returns them as saved */
    'grid.set': { params: { grid: ShowGrid }; result: ShowGrid };
    /** Playback state of the cue list */
    'cues.getState': { params: undefined; result: CueStackState };
    /** Adds a cue at the end of the list, playing a scene (unsaved change) */
    'cues.add': { params: { scene: string }; result: Cue };
    /** Changes a cue; null fades use the times of the scene, null follow is manual (unsaved change) */
    'cues.update': { params: { id: string; number: number; scene: string; note: string; fadeIn: number | null; fadeOut: number | null; follow: number | null }; result: Cue };
    /** Moves a cue to a place of the list, from 0: it takes a number between its neighbours (unsaved change) */
    'cues.move': { params: { id: string; to: number }; result: Cue };
    /** Deletes a cue (unsaved change) */
    'cues.delete': { params: { id: string }; result: undefined };
    /** Plays the next cue, or continues after Pause */
    'cues.go': { params: undefined; result: CueStackState };
    /** Plays the previous cue */
    'cues.back': { params: undefined; result: CueStackState };
    /** Stops or continues the fades and the follow wait */
    'cues.pause': { params: undefined; result: CueStackState };
    /** Fades out the current cue */
    'cues.release': { params: undefined; result: CueStackState };
    /** Chooses the cue played by the next Go */
    'cues.setNext': { params: { id: string }; result: CueStackState };

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
    /** Exports a template to a .btemplate archive; returns the file */
    'template.export': { params: { id: string; file: string }; result: string };
    /** Imports a template from a .btemplate archive */
    'template.import': { params: { file: string }; result: TemplateInfo };

    /** Global settings */
    'settings.get': { params: undefined; result: AppSettings };
    /** Changes the global settings */
    'settings.update': { params: Partial<AppSettings>; result: AppSettings };
    /** Operator state of the open show */
    'operators.getState': { params: undefined; result: OperatorState };
    /**
     * Enters with the PIN of an operator; a wrong PIN fails with "wrong-pin".
     * When several operators have the PIN, nobody enters and the choices
     * list them: the login is repeated with the chosen id.
     */
    'operators.login': { params: { pin: string; id?: string }; result: { state: OperatorState; choices: Array<{ id: string; name: string }> } };
    /** Leaves: the show asks for a PIN again */
    'operators.logout': { params: undefined; result: OperatorState };
    /** Operators of the open show; administrators only, or anyone while the show has none */
    'operators.list': { params: undefined; result: OperatorProfile[] };
    /**
     * Adds (without id) or changes an operator; administrators only. The PIN
     * is needed for a new operator and changes the PIN when given. The first
     * operator of a show is an administrator and enters at once.
     */
    'operators.save': {
        params: { id?: string; name: string; admin: boolean; access: OperatorAccess; pin?: string };
        result: OperatorProfile[];
    };
    /**
     * Deletes an operator; administrators only. The operator who entered
     * cannot be deleted, so a show always keeps its operators.
     */
    'operators.delete': { params: { id: string }; result: OperatorProfile[] };
    /**
     * Reads what can be imported from another show; administrators only.
     * When the source has operators and the administrator who entered is not
     * one of its administrators (same name and PIN), the PIN of a source
     * administrator is needed: "source-pin-required", or "wrong-pin".
     */
    'showImport.inspect': { params: { folder: string; pin?: string }; result: ImportCatalog };
    /** Imports the chosen items, with the items they need */
    'showImport.apply': { params: { folder: string; pin?: string; items: ImportChoice[] }; result: ImportResult };
}

/** Engine events and their data */
export interface EngineEvents {
    /** The main window entered or left fullscreen */
    'window.fullScreenChanged': { on: boolean };
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
    /** The state of the desk has changed (mode, bank, masters, blind, full on) */
    'console.stateChanged': { state: PresetDeskState };
    /** A fader of the desk has moved */
    'console.faderChanged': { row: PresetRow; universe: number; channel: number; value: number };
    /** Several faders of a row and universe have moved, as pairs of channel and value (attributes panel) */
    'console.fadersChanged': { row: PresetRow; universe: number; channels: Array<[number, number]> };
    /** Many faders have changed at once (home), the levels must be read again */
    'console.levelsChanged': Record<string, never>;
    /** Scenes or chasers of the open show have changed */
    'memories.changed': Record<string, never>;
    /** Memories turned on or off, a chaser step or the selected chaser changed */
    'memories.stateChanged': { state: MemoriesState };
    /** The audio player or playlist of the open show has changed */
    'audio.changed': Record<string, never>;
    /** The playback of the audio player has changed, or its position moved */
    'audio.stateChanged': { state: AudioPlayback };
    /** The video outputs of the open show have changed */
    'video.changed': Record<string, never>;
    /** MIDI ports or learn changed */
    'midi.stateChanged': { state: MidiState };
    /** The MIDI mappings of the open show have changed */
    'midi.changed': Record<string, never>;
    /** Messages received and sent, while the monitor is on */
    'midi.monitor': { entries: MidiMonitorEntry[] };
    /** The mixers of the open show have changed */
    'mixers.changed': Record<string, never>;
    /** A timer was started, paused, reset or changed */
    'video.timersChanged': { states: Record<string, TimerState> };
    /** Program or preview of the video outputs have changed */
    'video.stateChanged': { compositions: Record<string, OutputComposition> };
    /** The timelines of the open show have changed; recorded when the change is a pass of the recorder */
    'timeline.changed': { recorded?: boolean };
    /** The transport of the timeline player has changed */
    'timeline.stateChanged': { state: TimelineState };
    /** The pages of the virtual console have changed */
    'grid.changed': Record<string, never>;
    'stage.changed': Record<string, never>;
    /** The intensity levels of the fixture groups have changed */
    'console.groupLevelsChanged': { levels: Record<string, number> };
    /** The live effects of the matrices have changed */
    'matrices.liveChanged': { effects: Record<string, MatrixEffect> };
    /** The playback state of the cue list has changed */
    'cues.stateChanged': { state: CueStackState };
    /** The operators of the show or the operator who entered have changed */
    'operators.changed': { state: OperatorState };
    /** The list of templates has changed */
    'templates.changed': Record<string, never>;
    /** The user wants to close the window with unsaved changes */
    'app.closeRequested': Record<string, never>;
}

/** Name of an engine method */
export type EngineMethod = keyof EngineMethods;

/** Name of an engine event */
export type EngineEvent = keyof EngineEvents;
