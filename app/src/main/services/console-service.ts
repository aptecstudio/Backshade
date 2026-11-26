/**
 * console.* methods: the two-preset desk of the simple console. Fader
 * moves are sent to every window with console.faderChanged, so several
 * operators (and the remote clients of Phase 10) see the same desk.
 */

import { UNIVERSE_SIZE } from '../../shared/fixtures/fixture-definition';
import type { ChannelLabel, PresetMaster, PresetMode, PresetRow } from '../../shared/console/preset-desk';
import { MAX_UNIVERSE } from '../../shared/patch/patch';
import { PresetDesk } from '../console/preset-desk';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import type { OutputEngine } from '../output/output-engine';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, requireChoice, requireNumber, requireObject, requireRange } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

const ROWS: readonly PresetRow[] = ['a', 'b'];
const MASTERS: readonly PresetMaster[] = ['a', 'b', 'scene'];
const MODES: readonly PresetMode[] = ['ab', 'single'];

/**
 * Registers the methods of the service.
 * @returns the desk, also used by the attributes panel
 */
export function registerConsoleService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary, output: OutputEngine): PresetDesk {
    const desk = new PresetDesk(output.mixer, (universe) => output.universeMap(universe));
    // The patch and the definitions decide which channels the masters scale;
    // the output service is registered first, so its channel map is already updated
    session.onContentChange((part) => {
        if (part === 'patch') {
            desk.refresh();
        }
    });
    bus.addSink((message) => {
        if (message.event === 'fixtures.changed') {
            desk.refresh();
        }
    });
    const stateChanged = (): ReturnType<PresetDesk['getState']> => {
        const state = desk.getState();
        output.setFullOn(state.fullOn);
        bus.emit('console.stateChanged', { state });
        return state;
    };
    const universeOf = (input: Record<string, unknown>): number => requireRange(input, 'universe', 1, MAX_UNIVERSE, 'invalid-universe');

    router.register('console.getState', () => desk.getState());

    router.register('console.getLevels', (params) => desk.getLevels(universeOf(requireObject(params))));

    router.register('console.channelLabels', (params) => {
        const universe = universeOf(requireObject(params));
        const labels: Array<ChannelLabel | null> = new Array<ChannelLabel | null>(UNIVERSE_SIZE).fill(null);
        if (session.summary() === null) {
            return labels;
        }
        for (const fixture of session.patch().fixtures) {
            if (fixture.universe !== universe) {
                continue;
            }
            const definition = library.find(fixture.definition)?.definition;
            const mode = definition?.modes.find((item) => item.name === fixture.mode);
            for (let offset = 0; offset < fixture.channelCount; offset++) {
                const index = fixture.address - 1 + offset;
                if (index >= UNIVERSE_SIZE) {
                    break;
                }
                const key = mode?.channels[offset];
                const channel = definition?.channels.find((item) => item.key === key);
                labels[index] = { number: fixture.number, fixture: fixture.name, channel: channel?.name ?? String(offset + 1) };
            }
        }
        return labels;
    });

    router.register('console.setFader', (params) => {
        const input = requireObject(params);
        const row = requireChoice(input, 'row', ROWS);
        const universe = universeOf(input);
        const channel = requireRange(input, 'channel', 1, UNIVERSE_SIZE);
        const value = requireRange(input, 'value', 0, 255);
        desk.setFader(row, universe, channel, value);
        bus.emit('console.faderChanged', { row, universe, channel, value });
        return undefined;
    });

    router.register('console.setMaster', (params) => {
        const input = requireObject(params);
        desk.setMaster(requireChoice(input, 'master', MASTERS), requireNumber(input, 'position'));
        stateChanged();
        return undefined;
    });

    router.register('console.setFlash', (params) => {
        const input = requireObject(params);
        desk.setFlash(requireChoice(input, 'row', ROWS), universeOf(input), requireRange(input, 'channel', 1, UNIVERSE_SIZE), optionalBoolean(input, 'on') === true);
        return undefined;
    });

    router.register('console.setMode', (params) => {
        desk.setMode(requireChoice(requireObject(params), 'mode', MODES));
        return stateChanged();
    });

    router.register('console.setBank', (params) => {
        const input = requireObject(params);
        desk.setBank(universeOf(input), requireRange(input, 'firstChannel', 1, UNIVERSE_SIZE));
        return stateChanged();
    });

    router.register('console.setBlind', (params) => {
        desk.setBlind(optionalBoolean(requireObject(params), 'on') === true);
        return stateChanged();
    });

    router.register('console.setFullOn', (params) => {
        desk.setFullOn(optionalBoolean(requireObject(params), 'on') === true);
        return stateChanged();
    });

    router.register('console.home', () => {
        desk.home();
        bus.emit('console.levelsChanged', {});
        return undefined;
    });

    return desk;
}
