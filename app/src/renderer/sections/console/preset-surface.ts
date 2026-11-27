/**
 * Preset surface of the simple console: Preset A and Preset B rows of 12
 * faders on raw DMX channels, the bank of channels with its universe and
 * the mode. In A/B mode both rows show the same channels; in single mode
 * row B continues row A, for 24 consecutive channels.
 */

import { ChoiceKeys, Key, Label, NumberField, Panel, ReadoutDisplay, Spacer, Stack } from '../../../framework/ts/index.js';
import { FADERS_PER_ROW, bankSize, type ChannelLabel, type PresetDeskState, type PresetMode, type PresetRow } from '../../../shared/console/preset-desk.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { PresetStrip } from './preset-strip.js';

/** What a strip controls: the row of levels and the channel */
interface StripTarget {
    row: PresetRow;
    channel: number;
}

function rowTitle(text: string): Stack {
    return new Stack({ classes: ['preset-row__title'], children: [new Label({ text, size: 'small', weight: 'medium' })] });
}

export class PresetSurface extends Panel {
    private readonly strips: { a: PresetStrip[]; b: PresetStrip[] } = { a: [], b: [] };
    private readonly bank: ReadoutDisplay;
    private readonly universeField: NumberField;
    private readonly mode: ChoiceKeys<PresetMode>;
    private readonly titleB: Stack;
    private state: PresetDeskState | null = null;
    private levels: { a: number[]; b: number[] } = { a: [], b: [] };
    private labels: Array<ChannelLabel | null> = [];

    constructor() {
        super({ classes: ['preset-surface'] });

        const previous = new Key({ label: t('deskConsole.previousBank'), icon: 'chevron-left', iconOnly: true });
        const next = new Key({ label: t('deskConsole.nextBank'), icon: 'chevron-right', iconOnly: true });
        this.bank = new ReadoutDisplay({ text: '', label: t('deskConsole.bank', { first: 1, last: FADERS_PER_ROW }) });
        this.universeField = new NumberField({ ariaLabel: t('deskConsole.universe'), value: 1, min: 1, max: MAX_UNIVERSE });
        this.mode = new ChoiceKeys<PresetMode>({
            ariaLabel: t('deskConsole.mode'),
            options: [{ value: 'ab', label: t('deskConsole.modeAb') }, { value: 'single', label: t('deskConsole.modeSingle') }],
            value: 'ab'
        });
        previous.onPress(() => this.moveBank(-1));
        next.onPress(() => this.moveBank(1));
        this.universeField.onChange((universe) => this.setBank(universe, 1));
        this.mode.onChange((mode) => void engine().request('console.setMode', { mode }).then((state) => this.apply(state)).catch(showError));

        const rows = (['a', 'b'] as const).map((row) => {
            const strips = Array.from({ length: FADERS_PER_ROW }, (_, index) => {
                const strip = new PresetStrip();
                strip.onMove((value) => this.move(row, index, value));
                strip.onFlash((down) => this.flash(row, index, down));
                return strip;
            });
            this.strips[row] = strips;
            return new Stack({ direction: 'row', gap: 1, classes: ['preset-row__strips'], children: strips });
        });
        this.titleB = rowTitle(t('deskConsole.presetB'));

        this.append(
            new Stack({
                direction: 'row',
                gap: 2,
                align: 'center',
                wrap: true,
                children: [previous, this.bank, next, new Label({ text: t('deskConsole.universe'), tone: 'secondary', size: 'small' }), this.universeField, new Spacer(), this.mode]
            }),
            new Stack({ direction: 'row', gap: 2, classes: ['preset-row'], children: [rowTitle(t('deskConsole.presetA')), rows[0]] }),
            new Stack({ direction: 'row', gap: 2, classes: ['preset-row'], children: [this.titleB, rows[1]] })
        );

        this.track(engine().on('console.stateChanged', ({ state }) => this.apply(state)));
        this.track(engine().on('console.faderChanged', ({ row, universe, channel, value }) => {
            if (universe === this.state?.universe) {
                this.levels[row][channel - 1] = value;
                this.render();
            }
        }));
        this.track(engine().on('console.fadersChanged', ({ row, universe, channels }) => {
            if (universe === this.state?.universe) {
                for (const [channel, value] of channels) {
                    this.levels[row][channel - 1] = value;
                }
                this.render();
            }
        }));
        this.track(engine().on('console.levelsChanged', () => void this.loadUniverse()));
        this.track(engine().on('patch.changed', () => void this.loadUniverse()));
        void engine().request('console.getState').then((state) => this.apply(state)).catch(showError);
    }

    /**
     * Applies the state of the desk; a new universe loads its levels and names.
     */
    private apply(state: PresetDeskState): void {
        const universeChanged = state.universe !== this.state?.universe;
        this.state = state;
        this.mode.setValue(state.mode);
        this.universeField.setValue(state.universe);
        this.titleB.element.classList.toggle('preset-row__title--continued', state.mode === 'single');
        this.element.classList.toggle('preset-surface--blind', state.blind);
        if (universeChanged) {
            void this.loadUniverse();
        } else {
            this.render();
        }
    }

    private async loadUniverse(): Promise<void> {
        const universe = this.state?.universe;
        if (universe === undefined) {
            return;
        }
        try {
            const [levels, labels] = await Promise.all([
                engine().request('console.getLevels', { universe }),
                engine().request('console.channelLabels', { universe })
            ]);
            if (universe === this.state?.universe) {
                this.levels = { a: levels.a, b: levels.b };
                this.labels = labels;
                this.render();
            }
        } catch (error) {
            await showError(error);
        }
    }

    /**
     * Channel and row of levels of a strip, or null beyond the universe.
     */
    private target(row: PresetRow, index: number): StripTarget | null {
        if (this.state === null) {
            return null;
        }
        const single = this.state.mode === 'single';
        // In single mode row B continues row A and both use the levels of row A
        const channel = this.state.firstChannel + index + (single && row === 'b' ? FADERS_PER_ROW : 0);
        if (channel > UNIVERSE_SIZE) {
            return null;
        }
        return { row: single ? 'a' : row, channel };
    }

    private render(): void {
        if (this.state === null) {
            return;
        }
        const size = bankSize(this.state.mode);
        const last = Math.min(UNIVERSE_SIZE, this.state.firstChannel + size - 1);
        this.bank.setText(t('deskConsole.bank', { first: this.state.firstChannel, last }));
        for (const row of ['a', 'b'] as const) {
            this.strips[row].forEach((strip, index) => {
                const target = this.target(row, index);
                strip.setChannel(target?.channel ?? null, target === null ? null : this.labels[target.channel - 1] ?? null);
                // MIDI drives the channels of Preset A, like the grid
                strip.setMidiChannel(this.state?.universe ?? 1, target?.row === 'a' ? target.channel : null);
                if (target !== null) {
                    strip.setValue(this.levels[target.row][target.channel - 1] ?? 0);
                }
            });
        }
    }

    private moveBank(direction: number): void {
        if (this.state === null) {
            return;
        }
        const size = bankSize(this.state.mode);
        const first = this.state.firstChannel + direction * size;
        if (first >= 1 && first <= UNIVERSE_SIZE) {
            this.setBank(this.state.universe, first);
        }
    }

    private setBank(universe: number, firstChannel: number): void {
        void engine().request('console.setBank', { universe, firstChannel }).then((state) => this.apply(state)).catch(showError);
    }

    private move(row: PresetRow, index: number, value: number): void {
        const target = this.target(row, index);
        if (target === null || this.state === null) {
            return;
        }
        this.levels[target.row][target.channel - 1] = value;
        void engine().request('console.setFader', { row: target.row, universe: this.state.universe, channel: target.channel, value }).catch(showError);
    }

    private flash(row: PresetRow, index: number, on: boolean): void {
        const target = this.target(row, index);
        if (target === null || this.state === null) {
            return;
        }
        void engine().request('console.setFlash', { row: target.row, universe: this.state.universe, channel: target.channel, on }).catch(showError);
    }
}
