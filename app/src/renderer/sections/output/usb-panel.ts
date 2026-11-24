/**
 * Output section: USB DMX interfaces of the workstation, with their type,
 * universe and connection; pressing a row changes the interface.
 */

import { Key, Label, ListItem, Panel, Stack } from '../../../framework/ts/index.js';
import type { OutputState, UsbDmxDeviceState } from '../../../shared/transport/engine-api.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { onOutputState } from '../../output/output-store.js';
import { openUsbDeviceDialog } from './usb-device-dialog.js';
import { usbStatusLabel, usbTypeLabel } from './usb-text.js';

const COLUMNS: readonly TextKey[] = ['output.columnUniverse', 'output.columnDevice', 'output.usbType', 'output.columnStatus'];

function cell(text: string, tone: 'primary' | 'secondary' = 'primary'): Stack {
    return new Stack({ classes: ['output-table__cell'], children: [new Label({ text, tone, size: 'small' })] });
}

export class UsbPanel extends Panel {
    private readonly list = new Stack({ classes: ['output-table__list'] });
    private readonly add: Key;
    private readonly message = new Label({ text: '', tone: 'secondary', size: 'small' });
    private rows: ListItem[] = [];
    private devices: UsbDmxDeviceState[] = [];
    private lastSignature = '';

    constructor() {
        super({ title: t('output.usb'), classes: ['usb-panel'] });
        this.add = new Key({ label: t('output.addUsb'), icon: 'plus' });
        this.add.onPress(() => {
            const used = this.devices.map((device) => device.universe);
            void openUsbDeviceDialog(null, used.length === 0 ? 1 : Math.max(...used) + 1);
        });
        this.append(
            new Label({ text: t('output.usbHint'), tone: 'secondary', size: 'small' }),
            new Stack({
                direction: 'row',
                classes: ['output-table__row', 'output-table__row--header', 'usb-table__row'],
                children: COLUMNS.map((key) => cell(t(key), 'secondary'))
            }),
            this.list,
            this.message,
            new Stack({ direction: 'row', children: [this.add] })
        );
        this.track(onOutputState((state) => this.show(state)));
    }

    private show(state: OutputState): void {
        const signature = JSON.stringify([state.usbAvailable, state.usbDevices]);
        if (signature === this.lastSignature) {
            return;
        }
        this.lastSignature = signature;
        this.devices = state.usbDevices;
        this.add.setDisabled(!state.usbAvailable);
        this.message.setText(!state.usbAvailable ? t('output.usbUnavailable') : state.usbDevices.length === 0 ? t('output.usbEmpty') : '');
        this.message.element.hidden = this.message.element.textContent === '';

        this.rows.forEach((row) => row.destroy());
        this.rows = state.usbDevices.map((device) => {
            const row = new ListItem({
                label: `${device.path}, ${usbTypeLabel(device.type)}`,
                muted: !device.enabled,
                classes: ['output-table__row', 'usb-table__row'],
                children: [
                    cell(String(device.universe)),
                    cell(device.path),
                    cell(usbTypeLabel(device.type), 'secondary'),
                    new Stack({
                        classes: ['output-table__cell', `usb-status--${device.status}`],
                        children: [new Label({ text: usbStatusLabel(device), size: 'small' })]
                    })
                ]
            });
            row.onPress(() => void openUsbDeviceDialog(device, device.universe));
            return row;
        });
        this.list.append(...this.rows);
    }
}
