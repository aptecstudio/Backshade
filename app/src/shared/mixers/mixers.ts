/**
 * External audio mixers of a show (Phase 9.2): scenes and snapshots of a
 * mixer are recalled over the network with OSC (UDP) from the scenes of
 * Backshade, their cues and the mixer tracks of the timelines. Models with a
 * ready profile: Behringer X32 and Midas M32, Behringer X Air and Midas MR,
 * Behringer Wing; any other OSC device with an address written by hand;
 * mixers that recall scenes with a MIDI program change (Phase 9.3, for
 * example Allen & Heath and Yamaha), on a MIDI output port.
 * Saved in show.json under "mixers". Shared between engine and interface.
 */

/** Model of a mixer, which sets the OSC messages of a recall */
export type MixerModel = 'x32' | 'xair' | 'wing' | 'osc' | 'midi';
export const MIXER_MODELS: readonly MixerModel[] = ['x32', 'xair', 'wing', 'osc', 'midi'];

/** Mixer reached over the network */
export interface ShowMixer {
    id: string;
    name: string;
    model: MixerModel;
    /** IP address or host name, and UDP port */
    host: string;
    port: number;
    /**
     * Generic OSC: address sent to recall a scene; "{number}" is replaced by
     * the number of the scene
     */
    address: string;
    /** Generic OSC: the number of the scene is also sent as an integer argument */
    numberArgument: boolean;
    /** MIDI: output port (its name), channel 1 to 16, and bank select before the program change for scenes above 128 */
    midiDevice: string;
    midiChannel: number;
    bankSelect: boolean;
}

/** Mixers section of show.json */
export interface ShowMixers {
    mixers: ShowMixer[];
}

/** Recall of a scene of a mixer */
export interface MixerRecall {
    mixer: string;
    number: number;
}

export const EMPTY_MIXERS: ShowMixers = { mixers: [] };

/** Most mixers of a show */
export const MAX_MIXERS = 16;

/** Defaults of each model: UDP port and numbers of its scenes as shown on the mixer */
export const MIXER_PROFILES: Readonly<Record<MixerModel, { port: number; first: number; last: number }>> = {
    // Scenes 00 to 99 of the show of the mixer
    x32: { port: 10023, first: 0, last: 99 },
    // Snapshots 1 to 64
    xair: { port: 10024, first: 1, last: 64 },
    // Items of the show list of the mixer
    wing: { port: 2223, first: 1, last: 999 },
    osc: { port: 8000, first: 0, last: 9999 },
    // Scene 1 is program 0; with bank select up to 128 banks of 128 programs
    midi: { port: 0, first: 1, last: 16384 }
};

/** Placeholder of the number in the address of a generic OSC mixer */
export const NUMBER_PLACEHOLDER = '{number}';

/** New mixer of a model */
export function newMixer(id: string, name: string, model: MixerModel = 'x32'): ShowMixer {
    return { id, name, model, host: '', port: MIXER_PROFILES[model].port, address: `/scene/${NUMBER_PLACEHOLDER}`, numberArgument: false, midiDevice: '', midiChannel: 1, bankSelect: false };
}

/** Number of a scene kept within the range of the model */
export function clampSceneNumber(model: MixerModel, number: number): number {
    const { first, last } = MIXER_PROFILES[model];
    return Math.min(last, Math.max(first, Math.round(Number.isFinite(number) ? number : first)));
}

const text = (value: unknown, max: number, fallback = ''): string => typeof value === 'string' ? value.trim().slice(0, max) : fallback;

/** Reads one mixer; null when it has no identifier */
export function normalizeMixer(value: unknown): ShowMixer | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof ShowMixer, unknown>>;
    if (typeof input.id !== 'string' || input.id === '') {
        return null;
    }
    const model = MIXER_MODELS.includes(input.model as MixerModel) ? input.model as MixerModel : 'osc';
    const mixer = newMixer(input.id, text(input.name, 60, 'Mixer') || 'Mixer', model);
    mixer.host = text(input.host, 253);
    mixer.port = typeof input.port === 'number' && Number.isInteger(input.port) && input.port >= 1 && input.port <= 65535 ? input.port : MIXER_PROFILES[model].port;
    const address = text(input.address, 200);
    mixer.address = address.startsWith('/') ? address : mixer.address;
    mixer.numberArgument = input.numberArgument === true;
    mixer.midiDevice = text(input.midiDevice, 200);
    mixer.midiChannel = typeof input.midiChannel === 'number' && Number.isInteger(input.midiChannel) && input.midiChannel >= 1 && input.midiChannel <= 16 ? input.midiChannel : 1;
    mixer.bankSelect = input.bankSelect === true;
    return mixer;
}

/** Reads the mixers of a file */
export function normalizeMixers(value: unknown): ShowMixers {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { mixers?: unknown };
    const ids = new Set<string>();
    const mixers: ShowMixer[] = [];
    for (const raw of Array.isArray(input.mixers) ? input.mixers.slice(0, MAX_MIXERS) : []) {
        const mixer = normalizeMixer(raw);
        if (mixer !== null && !ids.has(mixer.id)) {
            ids.add(mixer.id);
            mixers.push(mixer);
        }
    }
    return { mixers };
}

/** Reads a recall saved in a scene or a clip; null when it is missing or invalid */
export function normalizeRecall(value: unknown): MixerRecall | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof MixerRecall, unknown>>;
    if (typeof input.mixer !== 'string' || input.mixer === '' || typeof input.number !== 'number' || !Number.isFinite(input.number)) {
        return null;
    }
    return { mixer: input.mixer, number: Math.max(0, Math.min(9999, Math.round(input.number))) };
}
