/**
 * Grid of the 512 channels of a universe with the values being sent:
 * each cell shows its address, its value and a level bar; cells of a
 * fixture take its color, like the DMX map of the patch. Only the cells
 * whose value changed are updated.
 */

import { CHANNEL_COLORS, Component, channelColorClass, create } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';

/** How values are shown */
export type MonitorUnit = 'dmx' | 'percent';

export class DmxMonitorGrid extends Component<HTMLDivElement> {
    private readonly cells: HTMLDivElement[] = [];
    private readonly values: HTMLSpanElement[] = [];
    private readonly last = new Int16Array(UNIVERSE_SIZE).fill(-1);
    private unit: MonitorUnit;

    constructor(entries: readonly PatchEntry[], unit: MonitorUnit) {
        super(create('div', { classes: ['dmx-monitor'], attributes: { role: 'grid', 'aria-live': 'off' } }));
        this.unit = unit;

        const owners: Array<PatchEntry | undefined> = new Array(UNIVERSE_SIZE + 1);
        for (const entry of entries) {
            for (let address = entry.address; address < entry.address + entry.channelCount && address <= UNIVERSE_SIZE; address++) {
                owners[address] = entry;
            }
        }
        for (let address = 1; address <= UNIVERSE_SIZE; address++) {
            const value = create('span', { classes: ['dmx-monitor__value'], text: '' });
            const cell = create('div', {
                classes: ['dmx-monitor__cell'],
                attributes: { role: 'gridcell' },
                children: [
                    create('span', { classes: ['dmx-monitor__level'], attributes: { 'aria-hidden': 'true' } }),
                    create('span', { classes: ['dmx-monitor__address'], text: String(address) }),
                    value
                ]
            });
            const owner = owners[address];
            if (owner !== undefined) {
                cell.classList.add('dmx-monitor__cell--used', channelColorClass(CHANNEL_COLORS[owner.number % CHANNEL_COLORS.length]));
                cell.title = `${owner.number} ${owner.name}`;
            }
            this.cells.push(cell);
            this.values.push(value);
        }
        this.element.append(...this.cells);
    }

    /**
     * Changes how values are shown.
     */
    setUnit(unit: MonitorUnit): void {
        this.unit = unit;
        this.last.fill(-1);
    }

    /**
     * Shows the values of the universe.
     */
    update(frame: readonly number[]): void {
        for (let index = 0; index < UNIVERSE_SIZE; index++) {
            const value = frame[index] ?? 0;
            if (value === this.last[index]) {
                continue;
            }
            this.last[index] = value;
            const text = this.unit === 'dmx' ? String(value) : String(Math.round(value / 2.55));
            this.values[index].textContent = text;
            this.cells[index].style.setProperty('--level', String(value / 255));
            this.cells[index].classList.toggle('dmx-monitor__cell--on', value > 0);
            this.cells[index].setAttribute('aria-label', t('output.channelValue', { address: index + 1, value: text }));
        }
    }
}
