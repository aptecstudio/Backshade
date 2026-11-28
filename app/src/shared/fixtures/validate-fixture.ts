/**
 * Validation of fixture definitions, used by the engine when it reads,
 * saves or imports a definition and by the editor before saving.
 * The result is a clean copy that contains only the known fields.
 */

import {
    ATTRIBUTE_GROUPS,
    BEAM_ANGLE_LIMITS,
    MASK_MAX_LENGTH,
    MASK_PREFIX,
    PRISM_FACETS,
    CAPABILITY_KINDS,
    DMX_MAX,
    FIXTURE_CATEGORIES,
    FIXTURE_FORMAT_VERSION,
    FIXTURE_NAME_MAX_LENGTH,
    PHYSICAL_LIMITS,
    UNIVERSE_SIZE,
    type CapabilityKind,
    type FixtureAttribute,
    type FixtureCapability,
    type FixtureCategory,
    type FixtureChannel,
    type FixtureDefinition,
    type FixtureMode,
    type FixturePhysical
} from './fixture-definition.js';
import { readDimmerCurve } from './dimmer-curve.js';

/** Problem found in a definition */
export type FixtureIssueCode =
    | 'invalidFormat' | 'newerFormat' | 'missingManufacturer' | 'missingModel' | 'invalidCategory'
    | 'noChannels' | 'invalidChannelKey' | 'duplicateChannelKey' | 'missingChannelName' | 'invalidAttribute'
    | 'invalidFineChannel' | 'invalidDefaultValue' | 'invalidCapability' | 'overlappingCapabilities'
    | 'noModes' | 'missingModeName' | 'duplicateModeName' | 'emptyMode' | 'modeTooLong'
    | 'unknownModeChannel' | 'duplicateModeChannel' | 'fineWithoutCoarse' | 'invalidHead' | 'invalidDimmerCurve' | 'invalidPhysical';

/** Problem with the name of the channel, mode or field it concerns */
export interface FixtureIssue {
    code: FixtureIssueCode;
    /** Channel, mode or field concerned, if any */
    subject?: string;
}

/** Result of the validation */
export type FixtureValidation =
    | { ok: true; definition: FixtureDefinition }
    | { ok: false; issues: FixtureIssue[] };

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

type Input = Record<string, unknown>;

function isObject(value: unknown): value is Input {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function name(value: unknown): string {
    return typeof value === 'string' ? value.trim().slice(0, FIXTURE_NAME_MAX_LENGTH) : '';
}

function isDmxValue(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= DMX_MAX;
}

/**
 * Checks and copies the physical data; invalid fields are reported.
 */
function readPhysical(value: unknown, issues: FixtureIssue[]): FixturePhysical | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!isObject(value)) {
        issues.push({ code: 'invalidPhysical' });
        return undefined;
    }
    const physical: FixturePhysical = {};
    for (const [field, limits] of Object.entries(PHYSICAL_LIMITS) as [keyof typeof PHYSICAL_LIMITS, { min: number; max: number }][]) {
        const number = value[field];
        if (number === undefined) {
            continue;
        }
        if (typeof number !== 'number' || !Number.isFinite(number) || number < limits.min || number > limits.max) {
            issues.push({ code: 'invalidPhysical', subject: field });
            continue;
        }
        physical[field] = number;
    }
    if (value.source !== undefined) {
        const source = name(value.source);
        if (source !== '') {
            physical.source = source;
        }
    }
    if (value.beamAngle !== undefined) {
        const angle = value.beamAngle;
        const valid = isObject(angle)
            && typeof angle.min === 'number' && typeof angle.max === 'number'
            && angle.min >= BEAM_ANGLE_LIMITS.min && angle.max <= BEAM_ANGLE_LIMITS.max && angle.min <= angle.max;
        if (valid) {
            physical.beamAngle = { min: angle.min as number, max: angle.max as number };
        } else {
            issues.push({ code: 'invalidPhysical', subject: 'beamAngle' });
        }
    }
    return Object.keys(physical).length > 0 ? physical : undefined;
}

/**
 * Checks and copies the capabilities of a channel.
 */
function readCapabilities(value: unknown, channel: string, issues: FixtureIssue[]): FixtureCapability[] | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        issues.push({ code: 'invalidCapability', subject: channel });
        return undefined;
    }
    const capabilities: FixtureCapability[] = [];
    for (const item of value) {
        if (!isObject(item) || !isDmxValue(item.from) || !isDmxValue(item.to) || item.from > item.to) {
            issues.push({ code: 'invalidCapability', subject: channel });
            continue;
        }
        const capability: FixtureCapability = { from: item.from, to: item.to, label: name(item.label) };
        if (CAPABILITY_KINDS.includes(item.kind as CapabilityKind)) {
            capability.kind = item.kind as CapabilityKind;
        }
        if (typeof item.color === 'string' && COLOR_PATTERN.test(item.color.toLowerCase())) {
            capability.color = item.color.toLowerCase();
        }
        if (item.image !== undefined) {
            const { image } = item;
            if (typeof image === 'string' && image.length <= MASK_MAX_LENGTH && image.startsWith(MASK_PREFIX) && /^[A-Za-z0-9+/]+=*$/.test(image.slice(MASK_PREFIX.length))) {
                capability.image = image;
            } else {
                issues.push({ code: 'invalidCapability', subject: channel });
            }
        }
        if (typeof item.facets === 'number' && Number.isInteger(item.facets) && item.facets >= PRISM_FACETS.min && item.facets <= PRISM_FACETS.max) {
            capability.facets = item.facets;
        }
        if (item.shake === true) {
            capability.shake = true;
        }
        capabilities.push(capability);
    }
    capabilities.sort((a, b) => a.from - b.from);
    for (let index = 1; index < capabilities.length; index++) {
        if (capabilities[index].from <= capabilities[index - 1].to) {
            issues.push({ code: 'overlappingCapabilities', subject: channel });
            break;
        }
    }
    return capabilities.length > 0 ? capabilities : undefined;
}

/**
 * Checks and copies the channels.
 */
function readChannels(value: unknown, issues: FixtureIssue[]): FixtureChannel[] {
    if (!Array.isArray(value) || value.length === 0) {
        issues.push({ code: 'noChannels' });
        return [];
    }
    const channels: FixtureChannel[] = [];
    const keys = new Set<string>();
    for (const item of value) {
        if (!isObject(item)) {
            issues.push({ code: 'invalidChannelKey' });
            continue;
        }
        const key = typeof item.key === 'string' ? item.key : '';
        const channelName = name(item.name);
        const subject = channelName || key;
        if (!KEY_PATTERN.test(key)) {
            issues.push({ code: 'invalidChannelKey', subject });
        } else if (keys.has(key)) {
            issues.push({ code: 'duplicateChannelKey', subject });
        }
        keys.add(key);
        if (channelName === '') {
            issues.push({ code: 'missingChannelName', subject: key });
        }
        if (!Object.hasOwn(ATTRIBUTE_GROUPS, item.attribute as string)) {
            issues.push({ code: 'invalidAttribute', subject });
        }
        const channel: FixtureChannel = { key, name: channelName, attribute: item.attribute as FixtureAttribute };
        if (item.fineOf !== undefined) {
            channel.fineOf = typeof item.fineOf === 'string' ? item.fineOf : '';
        }
        if (item.defaultValue !== undefined) {
            if (isDmxValue(item.defaultValue)) {
                channel.defaultValue = item.defaultValue;
            } else {
                issues.push({ code: 'invalidDefaultValue', subject });
            }
        }
        if (item.blackout === true) {
            channel.blackout = true;
        }
        const capabilities = readCapabilities(item.capabilities, subject, issues);
        if (capabilities !== undefined) {
            channel.capabilities = capabilities;
        }
        channels.push(channel);
    }
    // A fine channel points to an existing coarse channel, which is not itself a fine channel
    const byKey = new Map(channels.map((channel) => [channel.key, channel]));
    for (const channel of channels) {
        if (channel.fineOf === undefined) {
            continue;
        }
        const coarse = byKey.get(channel.fineOf);
        if (coarse === undefined || coarse === channel || coarse.fineOf !== undefined) {
            issues.push({ code: 'invalidFineChannel', subject: channel.name || channel.key });
        }
    }
    return channels;
}

/**
 * Checks and copies the modes.
 */
function readModes(value: unknown, channels: readonly FixtureChannel[], issues: FixtureIssue[]): FixtureMode[] {
    if (!Array.isArray(value) || value.length === 0) {
        issues.push({ code: 'noModes' });
        return [];
    }
    const byKey = new Map(channels.map((channel) => [channel.key, channel]));
    const names = new Set<string>();
    const modes: FixtureMode[] = [];
    for (const item of value) {
        const input = isObject(item) ? item : {};
        const modeName = name(input.name);
        if (modeName === '') {
            issues.push({ code: 'missingModeName' });
        } else if (names.has(modeName)) {
            issues.push({ code: 'duplicateModeName', subject: modeName });
        }
        names.add(modeName);

        const list = Array.isArray(input.channels) ? input.channels.filter((key): key is string => typeof key === 'string') : [];
        if (list.length === 0) {
            issues.push({ code: 'emptyMode', subject: modeName });
        }
        if (list.length > UNIVERSE_SIZE) {
            issues.push({ code: 'modeTooLong', subject: modeName });
        }
        const seen = new Set<string>();
        for (const key of list) {
            const channel = byKey.get(key);
            if (channel === undefined) {
                issues.push({ code: 'unknownModeChannel', subject: `${modeName}: ${key}` });
            } else if (seen.has(key)) {
                issues.push({ code: 'duplicateModeChannel', subject: `${modeName}: ${channel.name}` });
            } else if (channel.fineOf !== undefined && !list.includes(channel.fineOf)) {
                issues.push({ code: 'fineWithoutCoarse', subject: `${modeName}: ${channel.name}` });
            }
            seen.add(key);
        }
        const mode: FixtureMode = { name: modeName, channels: list };
        if (input.heads !== undefined) {
            const heads = Array.isArray(input.heads) ? input.heads : [];
            const valid = heads.length > 0 && heads.every((head) => Array.isArray(head) && head.length > 0
                && head.every((key) => typeof key === 'string' && list.includes(key)));
            if (valid) {
                mode.heads = heads.map((head: string[]) => [...head]);
            } else {
                issues.push({ code: 'invalidHead', subject: modeName });
            }
        }
        modes.push(mode);
    }
    return modes;
}

/**
 * Validates a definition read from a file or sent by the interface.
 */
export function validateFixture(data: unknown): FixtureValidation {
    if (!isObject(data) || typeof data.formatVersion !== 'number') {
        return { ok: false, issues: [{ code: 'invalidFormat' }] };
    }
    if (data.formatVersion > FIXTURE_FORMAT_VERSION) {
        return { ok: false, issues: [{ code: 'newerFormat' }] };
    }
    const issues: FixtureIssue[] = [];
    const manufacturer = name(data.manufacturer);
    const model = name(data.model);
    if (manufacturer === '') {
        issues.push({ code: 'missingManufacturer' });
    }
    if (model === '') {
        issues.push({ code: 'missingModel' });
    }
    if (!FIXTURE_CATEGORIES.includes(data.category as FixtureCategory)) {
        issues.push({ code: 'invalidCategory' });
    }
    const physical = readPhysical(data.physical, issues);
    const channels = readChannels(data.channels, issues);
    const modes = readModes(data.modes, channels, issues);
    const dimmerCurve = readDimmerCurve(data.dimmerCurve);
    if (dimmerCurve === null) {
        issues.push({ code: 'invalidDimmerCurve' });
    }
    if (issues.length > 0) {
        return { ok: false, issues };
    }

    const definition: FixtureDefinition = {
        formatVersion: FIXTURE_FORMAT_VERSION,
        manufacturer,
        model,
        category: data.category as FixtureCategory,
        ...(physical === undefined ? {} : { physical }),
        ...(dimmerCurve === undefined || dimmerCurve === null ? {} : { dimmerCurve }),
        channels,
        modes
    };
    return { ok: true, definition };
}
