/**
 * Bar above the remote control of another instance: its name and address and
 * the key to leave. The view of the other instance fills the window below.
 */

import { Component, create, Key, Label, Spacer, Stack } from '../../framework/ts/index.js';
import type { DiscoveredInstance } from '../../shared/remote/instance.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';

class RemoteBar extends Component<HTMLDivElement> {
    constructor(instance: DiscoveredInstance) {
        super(create('div', { classes: ['remote-bar'] }));
        const close = new Key({ label: t('instance.close'), icon: 'x' });
        close.onPress(() => void this.leave());
        this.append(new Stack({
            direction: 'row',
            gap: 8,
            align: 'center',
            classes: ['remote-bar__content'],
            children: [
                new Label({ text: t('instance.controlling', { name: instance.name }), weight: 'medium' }),
                new Label({ text: `${instance.address}:${instance.port}`, tone: 'secondary', size: 'small' }),
                new Spacer(),
                close
            ]
        }));
        // A question of the application (closing the window) must not stay hidden behind the view
        this.track(engine().on('app.closeRequested', () => void this.leave()));
    }

    private async leave(): Promise<void> {
        try {
            await engine().request('remoteView.close');
        } catch (error) {
            await showError(error);
        }
        this.destroy();
    }
}

/** Opens the remote control of an instance inside the application */
export async function openRemoteControl(instance: DiscoveredInstance): Promise<void> {
    const bar = new RemoteBar(instance);
    bar.mount(document.body);
    try {
        await engine().request('remoteView.open', { address: instance.address, port: instance.port });
    } catch (error) {
        bar.destroy();
        await showError(error);
    }
}
