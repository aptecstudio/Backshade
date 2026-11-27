/**
 * Profiles of common MIDI controllers (Phase 16.2.7). A guided profile
 * lists the controls of a controller in the order they are touched, each
 * one with its role in the show (a master, a group, a scene or chaser
 * place, a cue, desk or timeline command); the interface asks to touch them
 * one at a time and learns each message, so templates and firmware versions
 * do not matter. LED values are given only where the maker documents them.
 * The Mackie Control profile is automatic: its messages are fixed by the
 * protocol. Shared between engine and interface.
 */

import type { CueAction, DeskAction, GridMaster } from '../grid/grid.js';
import type { MidiEncoding, MidiMapping, MidiMode, TimelineCommand } from './midi.js';

/** Role of a control in the show */
export type ProfileRole =
    | { kind: 'master'; master: GridMaster }
    | { kind: 'group'; index: number }
    | { kind: 'scene'; slot: number }
    | { kind: 'chaser'; slot: number }
    | { kind: 'cue'; action: CueAction }
    | { kind: 'desk'; action: DeskAction }
    | { kind: 'timeline'; action: TimelineCommand };

/** Kind of control, for the text shown while learning */
export type ProfileControl = 'fader' | 'knob' | 'encoder' | 'pad' | 'button' | 'topButton' | 'bottomButton' | 'sideButton'
    | 'soloButton' | 'muteButton' | 'recButton' | 'play' | 'stop' | 'rewind' | 'forward' | 'record' | 'cycle';

/** Control of a guided profile */
export interface ProfileStep {
    control: ProfileControl;
    /** Number of the control, from 1; 0 for named controls */
    number: number;
    role: ProfileRole;
    mode: MidiMode;
}

/** Guided profile */
export interface GuidedProfile {
    id: string;
    name: string;
    steps: ProfileStep[];
    /** Value that lights the keys, when the maker documents it */
    led: number | null;
}

const MASTERS: readonly GridMaster[] = ['a', 'b', 'scene', 'grand'];

/** Eight faders (or knobs): masters A, B, scene and grand, then groups 1 to 4 */
function levels(control: ProfileControl, count = 8): ProfileStep[] {
    return Array.from({ length: count }, (_, index) => ({
        control,
        number: index + 1,
        role: index < MASTERS.length ? { kind: 'master', master: MASTERS[index] } : { kind: 'group', index: index - MASTERS.length },
        mode: 'level'
    }));
}

/** Keys of scene or chaser places */
function places(control: ProfileControl, kind: 'scene' | 'chaser', first: number, count: number, number = 1): ProfileStep[] {
    return Array.from({ length: count }, (_, index) => ({ control, number: number + index, role: { kind, slot: first + index }, mode: 'button' }));
}

/** Eight command keys: cue Go, Back, Pause, Release, blackout, full on, timeline play and Go */
function commands(control: ProfileControl): ProfileStep[] {
    const roles: ProfileRole[] = [
        { kind: 'cue', action: 'go' }, { kind: 'cue', action: 'back' }, { kind: 'cue', action: 'pause' }, { kind: 'cue', action: 'release' },
        { kind: 'desk', action: 'blackout' }, { kind: 'desk', action: 'fullOn' }, { kind: 'timeline', action: 'toggle' }, { kind: 'timeline', action: 'go' }
    ];
    return roles.map((role, index) => ({ control, number: index + 1, role, mode: 'button' }));
}

export const GUIDED_PROFILES: readonly GuidedProfile[] = [
    {
        id: 'apcMini',
        name: 'Akai APC mini',
        // Faders 1 to 8 and the master fader; pads from the bottom row up: 24 scenes and 12 chasers; side keys: commands
        steps: [...levels('fader'), { control: 'fader', number: 9, role: { kind: 'master', master: 'grand' }, mode: 'level' },
            ...places('pad', 'scene', 1, 24), ...places('pad', 'chaser', 1, 12, 25), ...commands('sideButton')],
        led: null
    },
    {
        id: 'apcMiniMk2',
        name: 'Akai APC mini mk2',
        steps: [...levels('fader'), { control: 'fader', number: 9, role: { kind: 'master', master: 'grand' }, mode: 'level' },
            ...places('pad', 'scene', 1, 24), ...places('pad', 'chaser', 1, 12, 25), ...commands('sideButton')],
        // Green of the pads (forum of Bome, APC mini mk2 LED map)
        led: 87
    },
    {
        id: 'launchpad',
        name: 'Novation Launchpad',
        steps: [...places('pad', 'scene', 1, 24), ...places('pad', 'chaser', 1, 12, 25), ...commands('sideButton')],
        led: null
    },
    {
        id: 'launchControlXl',
        name: 'Novation Launch Control XL',
        steps: [...levels('fader'), ...places('topButton', 'scene', 1, 8), ...commands('bottomButton')],
        // Green at full brightness (Launch Control XL Programmer's Reference)
        led: 60
    },
    {
        id: 'nanoKontrol2',
        name: 'Korg nanoKONTROL2',
        steps: [
            ...levels('fader'),
            ...places('soloButton', 'scene', 1, 8),
            ...places('muteButton', 'scene', 9, 8),
            ...places('recButton', 'chaser', 1, 8),
            { control: 'play', number: 0, role: { kind: 'timeline', action: 'toggle' }, mode: 'button' },
            { control: 'stop', number: 0, role: { kind: 'timeline', action: 'stop' }, mode: 'button' },
            { control: 'rewind', number: 0, role: { kind: 'cue', action: 'back' }, mode: 'button' },
            { control: 'forward', number: 0, role: { kind: 'cue', action: 'go' }, mode: 'button' },
            { control: 'record', number: 0, role: { kind: 'cue', action: 'release' }, mode: 'button' },
            { control: 'cycle', number: 0, role: { kind: 'desk', action: 'blackout' }, mode: 'button' }
        ],
        led: null
    },
    {
        id: 'xTouchMini',
        name: 'Behringer X-Touch Mini',
        steps: [...levels('encoder'), ...places('topButton', 'scene', 1, 8), ...commands('bottomButton'),
            { control: 'fader', number: 1, role: { kind: 'master', master: 'scene' }, mode: 'level' }],
        led: null
    }
];

/** Place of a Mackie Control control: a note, or a fader on a channel */
type MackieInput = { kind: 'note'; number: number } | { kind: 'pitch'; channel: number } | { kind: 'cc'; number: number; encoding: MidiEncoding };

/**
 * Mackie Control layout (Mackie Control MIDI map): faders are pitch bend on
 * channels 1 to 8 and 9 (master), Rec 0 to 7, Solo 8 to 15, Mute 16 to 23,
 * Select 24 to 31 (notes on channel 1, 127 pressed, 0 released), V-Pots
 * control changes 16 to 23 in sign and magnitude, transport notes 91 to 95.
 */
export const MACKIE_LAYOUT: ReadonlyArray<{ input: MackieInput; role: ProfileRole; mode: MidiMode }> = [
    // Strip faders: groups 1 to 8; master fader: grand master
    ...Array.from({ length: 8 }, (_, index) => ({ input: { kind: 'pitch', channel: index + 1 } as MackieInput, role: { kind: 'group', index } as ProfileRole, mode: 'level' as MidiMode })),
    { input: { kind: 'pitch', channel: 9 }, role: { kind: 'master', master: 'grand' }, mode: 'level' },
    // V-Pots 1 to 3: masters A, B and scene
    ...(['a', 'b', 'scene'] as const).map((master, index) => ({ input: { kind: 'cc', number: 16 + index, encoding: 'signMagnitude' } as MackieInput, role: { kind: 'master', master } as ProfileRole, mode: 'level' as MidiMode })),
    // Select: scenes 1 to 8; Mute: scenes 9 to 16; Solo: chasers 1 to 8
    ...Array.from({ length: 8 }, (_, index) => ({ input: { kind: 'note', number: 24 + index } as MackieInput, role: { kind: 'scene', slot: index + 1 } as ProfileRole, mode: 'button' as MidiMode })),
    ...Array.from({ length: 8 }, (_, index) => ({ input: { kind: 'note', number: 16 + index } as MackieInput, role: { kind: 'scene', slot: index + 9 } as ProfileRole, mode: 'button' as MidiMode })),
    ...Array.from({ length: 8 }, (_, index) => ({ input: { kind: 'note', number: 8 + index } as MackieInput, role: { kind: 'chaser', slot: index + 1 } as ProfileRole, mode: 'button' as MidiMode })),
    // Transport: rewind Back, fast forward Go, stop, play, record releases the cue
    { input: { kind: 'note', number: 91 }, role: { kind: 'cue', action: 'back' }, mode: 'button' },
    { input: { kind: 'note', number: 92 }, role: { kind: 'cue', action: 'go' }, mode: 'button' },
    { input: { kind: 'note', number: 93 }, role: { kind: 'timeline', action: 'stop' }, mode: 'button' },
    { input: { kind: 'note', number: 94 }, role: { kind: 'timeline', action: 'toggle' }, mode: 'button' },
    { input: { kind: 'note', number: 95 }, role: { kind: 'cue', action: 'release' }, mode: 'button' }
];

/**
 * Mappings of Mackie Control for a device.
 * @param target - Resolves a role in the show; null when the show has no such scene, chaser or group
 */
export function mackieMappings(device: string, target: (role: ProfileRole) => MidiMapping['target'] | null): Array<Omit<MidiMapping, 'id'>> {
    const result: Array<Omit<MidiMapping, 'id'>> = [];
    for (const item of MACKIE_LAYOUT) {
        const resolved = target(item.role);
        if (resolved === null) {
            continue;
        }
        const input = item.input.kind === 'pitch'
            ? { device, kind: 'pitch' as const, channel: item.input.channel, number: 0 }
            : { device, kind: item.input.kind, channel: 1, number: item.input.number };
        result.push({ input, target: resolved, mode: item.mode, encoding: item.input.kind === 'cc' ? item.input.encoding : 'absolute', led: null });
    }
    return result;
}
