/**
 * Attributes panel of the simple console: the channels of a patched
 * fixture as the panel shows them, one entry per attribute with its
 * 16-bit low byte when the mode has one. Values are written into the
 * levels of Preset A, so a channel of the panel and the raw fader of the
 * same DMX channel are the same fader. Shared between engine and interface.
 */

import type { FixtureAttribute } from '../fixtures/fixture-definition.js';

/** Channel of a fixture in the attributes panel */
export interface AttributeChannel {
    /** Key of the channel in the definition */
    key: string;
    /** Name of the channel in the definition */
    name: string;
    attribute: FixtureAttribute;
    /** Offset from the start address */
    offset: number;
    /** Offset of the low byte for a 16-bit value, null for 8 bits */
    fineOffset: number | null;
}

/** Channels of a patched fixture */
export interface AttributeLayout {
    /** Identifier of the patched fixture */
    fixture: string;
    universe: number;
    /** Start address, from 1 */
    address: number;
    /** Channels in DMX order, low bytes of 16-bit values excluded */
    channels: AttributeChannel[];
}

/**
 * Value of a channel from the DMX levels of its universe, 0 to 1.
 * @param levels - Levels of the universe, index = address - 1
 */
export function attributeValue(levels: ArrayLike<number>, address: number, channel: AttributeChannel): number {
    const high = levels[address - 1 + channel.offset] ?? 0;
    if (channel.fineOffset === null) {
        return high / 255;
    }
    const low = levels[address - 1 + channel.fineOffset] ?? 0;
    return ((high << 8) | low) / 0xffff;
}

/**
 * DMX levels of a channel for a value from 0 to 1: one pair for 8 bits,
 * the high and the low byte for 16 bits.
 */
export function attributeLevels(address: number, channel: AttributeChannel, value: number): Array<[number, number]> {
    const unit = Math.max(0, Math.min(1, value));
    if (channel.fineOffset === null) {
        return [[address + channel.offset, Math.round(unit * 255)]];
    }
    const wide = Math.round(unit * 0xffff);
    return [[address + channel.offset, wide >> 8], [address + channel.fineOffset, wide & 0xff]];
}
