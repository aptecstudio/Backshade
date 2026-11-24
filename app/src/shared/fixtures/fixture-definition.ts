/**
 * Fixture definition: the channels a fixture model offers, the modes
 * that arrange them on DMX addresses, and optional physical data used
 * by the 3D stage. Shared between engine and interface.
 *
 * A definition is identified by "<manufacturer>/<model>" in slug form
 * (see fixture-id.ts); shows reference definitions by that identifier.
 */

/** Format version of the definition files */
export const FIXTURE_FORMAT_VERSION = 1;

/** Number of channels of a DMX universe */
export const UNIVERSE_SIZE = 512;

/** Highest DMX value of a channel */
export const DMX_MAX = 255;

/** Kind of fixture, used for grouping, icons and the 3D stage */
export type FixtureCategory =
    | 'dimmer' | 'par' | 'ledBar' | 'pixelBar' | 'movingHead' | 'scanner' | 'strobe'
    | 'blinder' | 'effect' | 'laser' | 'smoke' | 'hazer' | 'other';

/** Categories in presentation order */
export const FIXTURE_CATEGORIES: readonly FixtureCategory[] = [
    'dimmer', 'par', 'ledBar', 'pixelBar', 'movingHead', 'scanner', 'strobe',
    'blinder', 'effect', 'laser', 'smoke', 'hazer', 'other'
];

/** Group of attributes, as the console shows them (intensity, color, position, beam) */
export type AttributeGroup = 'intensity' | 'color' | 'position' | 'beam' | 'effects' | 'control';

/** What a channel controls */
export type FixtureAttribute =
    | 'dimmer' | 'shutter'
    | 'red' | 'green' | 'blue' | 'white' | 'warmWhite' | 'coldWhite' | 'amber' | 'uv' | 'lime'
    | 'cyan' | 'magenta' | 'yellow' | 'hue' | 'saturation' | 'colorTemperature' | 'colorWheel' | 'colorMacro'
    | 'pan' | 'tilt' | 'panTiltSpeed'
    | 'gobo' | 'goboRotation' | 'prism' | 'prismRotation' | 'focus' | 'zoom' | 'iris' | 'frost' | 'beamEffect'
    | 'effect' | 'effectSpeed' | 'speed' | 'fog' | 'fan'
    | 'control' | 'generic' | 'none';

/** Group of every attribute, in presentation order */
export const ATTRIBUTE_GROUPS: Readonly<Record<FixtureAttribute, AttributeGroup>> = {
    dimmer: 'intensity',
    shutter: 'intensity',
    red: 'color',
    green: 'color',
    blue: 'color',
    white: 'color',
    warmWhite: 'color',
    coldWhite: 'color',
    amber: 'color',
    uv: 'color',
    lime: 'color',
    cyan: 'color',
    magenta: 'color',
    yellow: 'color',
    hue: 'color',
    saturation: 'color',
    colorTemperature: 'color',
    colorWheel: 'color',
    colorMacro: 'color',
    pan: 'position',
    tilt: 'position',
    panTiltSpeed: 'position',
    gobo: 'beam',
    goboRotation: 'beam',
    prism: 'beam',
    prismRotation: 'beam',
    focus: 'beam',
    zoom: 'beam',
    iris: 'beam',
    frost: 'beam',
    beamEffect: 'beam',
    effect: 'effects',
    effectSpeed: 'effects',
    speed: 'effects',
    fog: 'effects',
    fan: 'effects',
    control: 'control',
    generic: 'control',
    none: 'control'
};

/** All the attributes, in presentation order */
export const FIXTURE_ATTRIBUTES = Object.keys(ATTRIBUTE_GROUPS) as readonly FixtureAttribute[];

/** Meaning of a capability, when it is a known function */
export type CapabilityKind =
    | 'open' | 'closed' | 'strobe' | 'pulse' | 'rotation' | 'stop' | 'index'
    | 'color' | 'gobo' | 'prism' | 'reset' | 'lampOn' | 'lampOff' | 'none';

/** Known capability meanings */
export const CAPABILITY_KINDS: readonly CapabilityKind[] = [
    'open', 'closed', 'strobe', 'pulse', 'rotation', 'stop', 'index',
    'color', 'gobo', 'prism', 'reset', 'lampOn', 'lampOff', 'none'
];

/** Range of DMX values of a channel with one meaning */
export interface FixtureCapability {
    /** First DMX value, 0 to 255 */
    from: number;
    /** Last DMX value, 0 to 255, not lower than from */
    to: number;
    /** Description, in English as in the manufacturer manual */
    label: string;
    /** Known meaning, if any */
    kind?: CapabilityKind;
    /** Color of a color wheel slot, "#rrggbb" */
    color?: string;
}

/** Channel offered by a fixture */
export interface FixtureChannel {
    /** Identifier, unique in the definition: letters and digits, starting with a letter */
    key: string;
    /** Name shown to the user */
    name: string;
    attribute: FixtureAttribute;
    /** For the low byte of a 16-bit value: key of the channel with the high byte */
    fineOf?: string;
    /** Value when nothing controls the channel, 0 to 255 (default 0) */
    defaultValue?: number;
    /** Ranges of values with their meaning, in increasing order and without overlaps */
    capabilities?: FixtureCapability[];
}

/** Arrangement of channels on consecutive DMX addresses */
export interface FixtureMode {
    /** Name, unique in the definition, for example "16 channels" or "Standard" */
    name: string;
    /** Channel keys in DMX order: the first one is at the start address */
    channels: string[];
    /** For fixtures with several cells (bars, matrices): the channel keys of each cell */
    heads?: string[][];
}

/** Angle range, in degrees */
export interface AngleRange {
    min: number;
    max: number;
}

/** Optional physical data, used by the 3D stage */
export interface FixturePhysical {
    /** Width, height and depth in millimeters */
    width?: number;
    height?: number;
    depth?: number;
    /** Weight in kilograms */
    weight?: number;
    /** Power consumption in watts */
    power?: number;
    /** Light source, for example "LED 7 x 15 W" or "MSD 200W" */
    source?: string;
    /** Luminous flux in lumens */
    lumens?: number;
    /** Color temperature of the source in kelvin */
    colorTemperature?: number;
    /** Beam angle, or zoom range, in degrees */
    beamAngle?: AngleRange;
    /** Pan travel in degrees */
    panRange?: number;
    /** Tilt travel in degrees */
    tiltRange?: number;
}

/** Content of a fixture definition file */
export interface FixtureDefinition {
    formatVersion: number;
    manufacturer: string;
    model: string;
    category: FixtureCategory;
    physical?: FixturePhysical;
    channels: FixtureChannel[];
    modes: FixtureMode[];
}

/** Number fields of FixturePhysical with their limits */
export const PHYSICAL_LIMITS = {
    width: { min: 0, max: 10000 },
    height: { min: 0, max: 10000 },
    depth: { min: 0, max: 10000 },
    weight: { min: 0, max: 1000 },
    power: { min: 0, max: 100000 },
    lumens: { min: 0, max: 1000000 },
    colorTemperature: { min: 0, max: 20000 },
    panRange: { min: 0, max: 720 },
    tiltRange: { min: 0, max: 720 }
} as const;

/** Limits of the beam angle, in degrees */
export const BEAM_ANGLE_LIMITS = { min: 0, max: 180 } as const;

/** Longest name of a manufacturer, model, channel or mode */
export const FIXTURE_NAME_MAX_LENGTH = 100;
