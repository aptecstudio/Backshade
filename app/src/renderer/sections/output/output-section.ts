/**
 * Output section: grand master and blackout, Art-Net settings, Art-Net
 * destinations of the universes, USB DMX interfaces and DMX monitor. Without an open show
 * only the master and the workstation settings are shown.
 */

import { Stack } from '../../../framework/ts/index.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { currentShow, onShowChange } from '../../show/show-store.js';
import { engine } from '../../transport/engine.js';
import { MasterPanel } from './master-panel.js';
import { MonitorPanel } from './monitor-panel.js';
import { NetworkPanel } from './network-panel.js';
import { UniversesPanel } from './universes-panel.js';
import { UsbPanel } from './usb-panel.js';

export class OutputSection extends Stack {
    private readonly network = new NetworkPanel();
    private readonly universes = new UniversesPanel();
    private readonly monitor = new MonitorPanel();

    constructor() {
        super({ gap: 3, classes: ['output-section'] });
        this.append(
            new Stack({ direction: 'row', gap: 3, align: 'stretch', children: [new MasterPanel(), new Stack({ gap: 3, classes: ['output-section__main'], children: [this.network, this.universes, new UsbPanel()] })] }),
            this.monitor
        );

        void this.load();
        this.track(engine().on('patch.changed', () => void this.load()));
        this.track(engine().on('output.configChanged', () => void this.load()));
        this.track(onShowChange(() => void this.load()));
    }

    private async load(): Promise<void> {
        const open = currentShow() !== null;
        this.network.setShowOpen(open);
        this.universes.element.hidden = !open;
        this.monitor.element.hidden = !open;
        if (!open) {
            return;
        }
        let entries: PatchEntry[];
        try {
            const [patch, output] = await Promise.all([engine().request('patch.get'), engine().request('output.getConfig')]);
            entries = patch;
            this.network.setFrameRate(output.frameRate);
            this.universes.show(output, entries);
            const numbers = new Set([...entries.map((entry) => entry.universe), ...output.universes.map((item) => item.universe)]);
            this.monitor.show([...numbers].sort((a, b) => a - b), entries);
        } catch (error) {
            await showError(error);
        }
    }
}
