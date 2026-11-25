/**
 * console.* methods of the attributes panel: the channels of a patched
 * fixture and the values set on the selected fixtures. Values are written
 * into the levels of Preset A of the desk, so the raw faders and the
 * attributes panel always show the same levels. Every window is told with
 * console.fadersChanged, one event per universe.
 */

import { attributeLevels, type AttributeLayout } from '../../shared/console/fixture-attributes';
import type { PatchedFixture } from '../../shared/patch/patch';
import { attributeLayout, matchChannel } from '../console/attribute-layout';
import type { PresetDesk } from '../console/preset-desk';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString, requireStringArray } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/** Values for the selected fixtures: channel key of the reference fixture -> value 0 to 1 */
type AttributeValues = Map<string, number>;

function requireValues(input: Record<string, unknown>): AttributeValues {
    const values = input.values;
    if (typeof values !== 'object' || values === null || Array.isArray(values)) {
        throw new EngineError('invalid-params', 'Invalid field "values"');
    }
    const result: AttributeValues = new Map();
    for (const [key, value] of Object.entries(values)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new EngineError('invalid-params', `Invalid value for "${key}"`);
        }
        result.set(key, Math.max(0, Math.min(1, value)));
    }
    return result;
}

/**
 * Registers the methods of the service.
 */
export function registerAttributeService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary, desk: PresetDesk): void {
    const fixtureOf = (id: string): PatchedFixture => {
        const fixture = session.summary() === null ? undefined : session.patch().fixtures.find((item) => item.id === id);
        if (fixture === undefined) {
            throw new EngineError('fixture-not-patched', `Fixture not in the patch: ${id}`);
        }
        return fixture;
    };
    const layoutOf = (fixture: PatchedFixture): AttributeLayout | null => attributeLayout(fixture, library.find(fixture.definition)?.definition);

    router.register('console.attributeLayout', (params) => layoutOf(fixtureOf(requireString(requireObject(params), 'fixture'))));

    router.register('console.setAttributes', (params) => {
        const input = requireObject(params);
        const ids = requireStringArray(input, 'fixtures');
        const values = requireValues(input);
        if (ids.length === 0) {
            return undefined;
        }
        const reference = fixtureOf(ids[0]);
        const referenceLayout = layoutOf(reference);
        if (referenceLayout === null) {
            throw new EngineError('fixture-not-found', `Definition not found: ${reference.definition}`);
        }

        const byUniverse = new Map<number, Array<[number, number]>>();
        for (const id of new Set(ids)) {
            const fixture = fixtureOf(id);
            const layout = layoutOf(fixture);
            if (layout === null) {
                continue;
            }
            const levels = byUniverse.get(fixture.universe) ?? [];
            byUniverse.set(fixture.universe, levels);
            for (const [key, value] of values) {
                const source = referenceLayout.channels.find((channel) => channel.key === key);
                const target = source === undefined ? null : matchChannel(layout, fixture.definition === reference.definition, source);
                if (target !== null) {
                    levels.push(...attributeLevels(fixture.address, target, value));
                }
            }
        }
        for (const [universe, channels] of byUniverse) {
            if (channels.length > 0) {
                desk.setLevels('a', universe, channels);
                bus.emit('console.fadersChanged', { row: 'a', universe, channels });
            }
        }
        return undefined;
    });
}
