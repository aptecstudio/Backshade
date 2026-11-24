/**
 * Output section: DMX monitor. It shows the values sent on one universe,
 * read from the engine about 15 times per second while the panel is open.
 * The unit (0 to 255 or percent) is remembered per device.
 */

import { ChoiceKeys, Key, Label, LocalPreference, Panel, Stack } from '../../../framework/ts/index.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { DmxMonitorGrid, type MonitorUnit } from './dmx-monitor-grid.js';

const REFRESH_MS = 66;
const unitPreference = new LocalPreference('backshade.monitorUnit');

export class MonitorPanel extends Panel {
    private readonly universeKeys = new Stack({ direction: 'row', gap: 1, wrap: true });
    private readonly empty = new Label({ text: t('output.monitorEmpty'), tone: 'secondary', size: 'small' });
    private keys: Key[] = [];
    private grid: DmxMonitorGrid | null = null;
    private universe: number | null = null;
    private unit: MonitorUnit = unitPreference.get() === 'percent' ? 'percent' : 'dmx';
    private entries: readonly PatchEntry[] = [];
    private universes: number[] = [];
    private timer: number | null = null;
    private stopped = false;

    constructor() {
        super({ title: t('output.monitor'), classes: ['monitor-panel'] });
        const unit = new ChoiceKeys<MonitorUnit>({
            ariaLabel: t('output.monitor'),
            options: [{ value: 'dmx', label: t('output.valuesDmx') }, { value: 'percent', label: t('output.valuesPercent') }],
            value: this.unit
        });
        unit.onChange((value) => {
            this.unit = value;
            unitPreference.set(value);
            this.grid?.setUnit(value);
        });
        this.append(new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.universeKeys, unit] }), this.empty);
        this.track(() => {
            this.stopped = true;
            if (this.timer !== null) {
                window.clearTimeout(this.timer);
            }
        });
        this.poll();
    }

    /**
     * Shows the universes that can be monitored.
     */
    show(universes: readonly number[], entries: readonly PatchEntry[]): void {
        this.universes = [...universes];
        this.entries = entries;
        const universe = this.universe !== null && universes.includes(this.universe) ? this.universe : universes[0] ?? null;
        this.select(universe);
    }

    private select(universe: number | null): void {
        this.universe = universe;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.universes.map((number) => {
            const key = new Key({ label: t('patch.universe', { number }), state: number === universe ? 'active' : 'normal' });
            key.onPress(() => this.select(number));
            return key;
        });
        this.universeKeys.append(...this.keys);
        this.empty.element.hidden = universe !== null;

        this.grid?.destroy();
        this.grid = null;
        if (universe !== null) {
            this.grid = new DmxMonitorGrid(this.entries.filter((entry) => entry.universe === universe), this.unit);
            this.append(this.grid);
        }
    }

    /**
     * Reads the values of the shown universe, then waits for the next reading.
     */
    private poll(): void {
        if (this.stopped) {
            return;
        }
        const universe = this.universe;
        const read = universe === null ? Promise.resolve() : engine().request('output.getFrame', { universe }).then((frame) => {
            if (universe === this.universe) {
                this.grid?.update(frame);
            }
        });
        void read.catch(() => undefined).finally(() => {
            if (!this.stopped) {
                this.timer = window.setTimeout(() => this.poll(), REFRESH_MS);
            }
        });
    }
}
