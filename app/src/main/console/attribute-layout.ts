/**
 * Channels of a patched fixture for the attributes panel, built from its
 * definition and mode, and the matching of a channel between fixtures of
 * different models (same key for the same model, otherwise the first
 * channel with the same attribute).
 */

import type { AttributeChannel, AttributeLayout } from '../../shared/console/fixture-attributes';
import type { FixtureChannel, FixtureDefinition } from '../../shared/fixtures/fixture-definition';
import type { PatchedFixture } from '../../shared/patch/patch';

/**
 * Layout of a fixture, or null when its definition or mode is missing.
 */
export function attributeLayout(fixture: PatchedFixture, definition: FixtureDefinition | undefined): AttributeLayout | null {
    const mode = definition?.modes.find((item) => item.name === fixture.mode);
    if (definition === undefined || mode === undefined) {
        return null;
    }
    const byKey = new Map(definition.channels.map((channel) => [channel.key, channel]));
    const offsets = new Map<string, number>();
    mode.channels.forEach((key, offset) => {
        if (offset < fixture.channelCount && !offsets.has(key)) {
            offsets.set(key, offset);
        }
    });
    // Low bytes are shown with their high byte, only when both are in the mode
    const fineOf = new Map<string, number>();
    for (const channel of definition.channels) {
        const offset = offsets.get(channel.key);
        if (channel.fineOf !== undefined && offset !== undefined && offsets.has(channel.fineOf)) {
            fineOf.set(channel.fineOf, offset);
        }
    }
    const channels: AttributeChannel[] = [];
    for (const [key, offset] of offsets) {
        const channel = byKey.get(key);
        if (channel === undefined || isLowByte(channel, offsets)) {
            continue;
        }
        channels.push({ key, name: channel.name, attribute: channel.attribute, offset, fineOffset: fineOf.get(key) ?? null });
    }
    channels.sort((a, b) => a.offset - b.offset);
    return { fixture: fixture.id, universe: fixture.universe, address: fixture.address, channels };
}

/**
 * Channel of a layout that matches a channel of the reference fixture:
 * the same key for the same model, otherwise the first channel with the
 * same attribute; null when the fixture has nothing similar.
 */
export function matchChannel(layout: AttributeLayout, sameModel: boolean, reference: AttributeChannel): AttributeChannel | null {
    if (sameModel) {
        return layout.channels.find((channel) => channel.key === reference.key) ?? null;
    }
    if (reference.attribute === 'generic' || reference.attribute === 'none' || reference.attribute === 'control') {
        return null;
    }
    return layout.channels.find((channel) => channel.attribute === reference.attribute) ?? null;
}

function isLowByte(channel: FixtureChannel, offsets: ReadonlyMap<string, number>): boolean {
    return channel.fineOf !== undefined && offsets.has(channel.fineOf);
}
