/**
 * Grid of the 512 channels of a universe, as in many light controllers:
 * every cell is a DMX address. Cells used by a fixture take its color and
 * the first one shows the fixture number; addresses used by more than one
 * fixture are marked as a conflict. Pressing a used cell opens its
 * fixture, pressing a free cell adds fixtures from that address.
 */

import { CHANNEL_COLORS, Component, Emitter, channelColorClass, create, delegate, type Unsubscribe } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { lastAddress } from '../../../shared/patch/address-map.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';
import { entryAddresses, entryFixture } from './patch-text.js';

export class UniverseGrid extends Component<HTMLDivElement> {
    private readonly opens = new Emitter<PatchEntry>();
    private readonly frees = new Emitter<number>();

    /**
     * @param entries - Fixtures of the universe
     */
    constructor(entries: readonly PatchEntry[]) {
        super(create('div', { classes: ['universe-grid'], attributes: { role: 'grid' } }));

        // Fixtures of every address, in address order
        const owners: PatchEntry[][] = Array.from({ length: UNIVERSE_SIZE + 1 }, () => []);
        for (const entry of [...entries].sort((a, b) => a.address - b.address)) {
            for (let address = entry.address; address <= Math.min(lastAddress(entry), UNIVERSE_SIZE); address++) {
                owners[address].push(entry);
            }
        }

        const cells: HTMLButtonElement[] = [];
        for (let address = 1; address <= UNIVERSE_SIZE; address++) {
            cells.push(this.cell(address, owners[address]));
        }
        this.element.append(...cells);

        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        this.track(delegate(this.element, 'click', '.universe-grid__cell', (_event, cell) => {
            const owner = byId.get(cell.dataset.fixture ?? '');
            if (owner === undefined) {
                this.frees.emit(Number(cell.dataset.address));
            } else {
                this.opens.emit(owner);
            }
        }));
        this.track(() => {
            this.opens.clear();
            this.frees.clear();
        });
    }

    /**
     * Registers a listener for the used cells pressed by the user.
     */
    onOpen(listener: (entry: PatchEntry) => void): Unsubscribe {
        return this.opens.subscribe(listener);
    }

    /**
     * Registers a listener for the free cells pressed by the user, with their address.
     */
    onFree(listener: (address: number) => void): Unsubscribe {
        return this.frees.subscribe(listener);
    }

    private cell(address: number, owners: readonly PatchEntry[]): HTMLButtonElement {
        const cell = create('button', {
            classes: ['universe-grid__cell'],
            attributes: { type: 'button', 'data-address': String(address) },
            children: [create('span', { classes: ['universe-grid__address'], text: String(address) })]
        });
        if (owners.length === 0) {
            cell.setAttribute('aria-label', t('patch.freeAddress', { address }));
            return cell;
        }
        // The fixture that starts last is the one drawn, so overlaps are visible
        const owner = owners[owners.length - 1];
        const first = owner.address === address;
        cell.dataset.fixture = owner.id;
        cell.classList.add('universe-grid__cell--used', channelColorClass(CHANNEL_COLORS[owner.number % CHANNEL_COLORS.length]));
        if (first) {
            cell.classList.add('universe-grid__cell--first');
            cell.append(create('span', { classes: ['universe-grid__number'], text: String(owner.number) }));
        }
        if (owners.length > 1) {
            cell.classList.add('universe-grid__cell--conflict');
        }
        const description = `${owner.number} ${owner.name}, ${entryFixture(owner)}, ${entryAddresses(owner)}`
            + (owners.length > 1 ? `, ${t('patch.conflict')}` : '');
        cell.setAttribute('aria-label', `${address}: ${description}`);
        cell.title = description;
        return cell;
    }
}
