/**
 * "Remote control" of the start page: searches the instances on the network
 * and lists them with name and address; one can also be reached by typing
 * its address.
 */

import { Dialog, Key, Label, ListItem, Stack, TextField, type Component } from '../../framework/ts/index.js';
import type { DiscoveredInstance } from '../../shared/remote/instance.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { openRemoteControl } from './remote-bar.js';

// Port of the web server when only the address is typed
const DEFAULT_PORT = 4747;

/** Instance typed as "address" or "address:port"; null when empty */
function typedInstance(value: string): DiscoveredInstance | null {
    const match = /^\s*(?:http:\/\/)?([^\s/:]+)(?::(\d{1,5}))?\/?\s*$/i.exec(value);
    return match === null ? null : { name: match[1], address: match[1], port: match[2] === undefined ? DEFAULT_PORT : Number(match[2]) };
}

export function openDiscoverDialog(): void {
    const dialog = new Dialog({ title: t('instance.remoteControl'), size: 'wide' });
    const status = new Label({ text: '', tone: 'secondary', size: 'small' });
    const list = new Stack({ gap: 1 });
    const address = new TextField({ label: t('instance.address'), value: '', maxLength: 260 });
    const connect = new Key({ label: t('instance.connect') });
    const again = new Key({ label: t('instance.searchAgain'), icon: 'search' });
    let rows: Component[] = [];

    const open = (instance: DiscoveredInstance): void => {
        dialog.close();
        void openRemoteControl(instance);
    };
    const search = async (): Promise<void> => {
        again.setDisabled(true);
        status.setText(t('instance.searching'));
        rows.forEach((row) => row.destroy());
        rows = [];
        try {
            const found = await engine().request('remote.discover');
            status.setText(found.length === 0 ? t('instance.noneFound') : '');
            rows = found.map((instance) => {
                const item = new ListItem({
                    children: [new Stack({
                        children: [
                            new Label({ text: instance.name, weight: 'medium' }),
                            new Label({ text: `${instance.address}:${instance.port}`, tone: 'secondary', size: 'small' })
                        ]
                    })]
                });
                item.onPress(() => open(instance));
                return item;
            });
            list.append(...rows);
        } catch (error) {
            status.setText('');
            await showError(error);
        }
        again.setDisabled(false);
    };
    connect.onPress(() => {
        const instance = typedInstance(address.value);
        if (instance !== null) {
            open(instance);
        }
    });
    again.onPress(() => void search());

    dialog.append(
        status,
        list,
        new Stack({ direction: 'row', gap: 1, align: 'end', children: [address, connect] })
    );
    const close = new Key({ label: t('common.close') });
    close.onPress(() => dialog.close());
    dialog.addActions(again, close);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    void search();
}
