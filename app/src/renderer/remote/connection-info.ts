/**
 * How to reach this computer from another device: its address and the QR
 * code of it. With several networks the address is chosen. The code holds
 * only the address, never the PIN.
 */

import { ChoiceKeys, Label, QrView, Stack } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';

/** Home and office networks first: virtual ones of containers and machines usually use 172 */
function rank(address: string): number {
    return address.startsWith('http://192.168.') ? 0 : address.startsWith('http://10.') ? 1 : 2;
}

export class ConnectionInfo extends Stack {
    private readonly content = new Stack({ gap: 12 });
    private shown: Stack | null = null;

    constructor() {
        super({ gap: 12 });
        this.append(this.content);
        void engine().request('remote.getInfo').then((info) => {
            const addresses = [...info.addresses].sort((a, b) => rank(a) - rank(b));
            if (addresses.length === 0) {
                this.content.append(new Label({ text: t(info.port === null ? 'remote.unavailable' : 'remote.noNetwork'), weight: 'medium' }));
                return;
            }
            if (addresses.length > 1) {
                const choice = new ChoiceKeys<string>({
                    label: t('remote.network'),
                    options: addresses.map((address) => ({ value: address, label: new URL(address).hostname })),
                    value: addresses[0]
                });
                choice.onChange((address) => this.show(address));
                this.content.append(choice);
            }
            this.show(addresses[0]);
        }).catch(showError);
    }

    private show(address: string): void {
        this.shown?.destroy();
        this.shown = new Stack({
            direction: 'row',
            gap: 8,
            align: 'center',
            wrap: true,
            children: [
                new QrView(address, t('remote.qrLabel', { address })),
                new Stack({ gap: 4, children: [new Label({ text: address, size: 'large', weight: 'medium' }), new Label({ text: t('remote.scanHint'), tone: 'secondary', size: 'small' })] })
            ]
        });
        this.content.append(this.shown);
    }
}
