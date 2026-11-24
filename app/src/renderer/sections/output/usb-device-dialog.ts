/**
 * Adds or changes a USB DMX interface: serial port (USB DMX ports
 * first), type, universe and sending. Interfaces belong to the
 * workstation, so the changes are saved at once and are not show changes.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, SelectField, Stack, type SelectOption } from '../../../framework/ts/index.js';
import { USB_DMX_TYPES, type UsbDmxDevice, type UsbDmxType } from '../../../shared/output/usb-dmx.js';
import { MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import type { SerialPortInfo } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { applyOutputState } from '../../output/output-store.js';
import { engine } from '../../transport/engine.js';
import { usbTypeLabel } from './usb-text.js';

type OnOff = 'on' | 'off';

function portLabel(port: SerialPortInfo): string {
    const details = [
        port.likelyDmx ? t('output.usbLikely') : null,
        port.manufacturer,
        port.serialNumber === null ? null : t('output.usbSerial', { serial: port.serialNumber })
    ].filter((item): item is string => item !== null && item !== '');
    return details.length === 0 ? port.path : t('output.usbPortLabel', { path: port.path, details: details.join(', ') });
}

/**
 * Opens the dialog.
 * @param device - Interface to change, or null to add one
 * @param universe - Universe proposed for a new interface
 */
export async function openUsbDeviceDialog(device: UsbDmxDevice | null, universe: number): Promise<void> {
    const dialog = new Dialog({ title: t('output.usbTitle'), size: 'wide' });
    let ports: SerialPortInfo[] = [];

    const port = new SelectField<string>({ label: t('output.usbPort'), options: [], value: '' });
    const noPorts = new Label({ text: t('output.usbNoPorts'), tone: 'secondary', size: 'small' });
    const refresh = new Key({ label: t('output.usbRefresh'), icon: 'search' });
    const type = new SelectField<UsbDmxType>({
        label: t('output.usbType'),
        options: USB_DMX_TYPES.map((value) => ({ value, label: usbTypeLabel(value) })),
        value: device?.type ?? 'enttecPro'
    });
    const universeField = new NumberField({ label: t('output.usbUniverse'), value: device?.universe ?? universe, min: 1, max: MAX_UNIVERSE });
    const enabled = new ChoiceKeys<OnOff>({
        label: t('output.usbEnabled'),
        options: [{ value: 'on', label: t('output.on') }, { value: 'off', label: t('output.off') }],
        value: device?.enabled === false ? 'off' : 'on'
    });

    const loadPorts = async (): Promise<void> => {
        try {
            ports = await engine().request('output.listSerialPorts');
        } catch (error) {
            await showError(error);
            return;
        }
        const options: SelectOption<string>[] = ports.map((item) => ({ value: item.id, label: portLabel(item) }));
        // The interface being changed stays in the list also when it is not connected
        if (device !== null && !ports.some((item) => item.id === device.id)) {
            options.unshift({ value: device.id, label: `${device.path} (${t('output.usbMissing')})` });
        }
        port.setOptions(options, device?.id ?? options[0]?.value ?? '');
        noPorts.element.hidden = options.length > 0;
        save.setDisabled(options.length === 0);
    };
    refresh.onPress(() => void loadPorts());

    dialog.append(
        new Stack({ direction: 'row', gap: 2, align: 'end', classes: ['usb-port-row'], children: [port, refresh] }),
        noPorts,
        type,
        new Stack({ direction: 'row', gap: 2, align: 'end', children: [universeField, enabled] })
    );

    const submit = async (): Promise<void> => {
        const chosen = ports.find((item) => item.id === port.value);
        const next: UsbDmxDevice = {
            id: port.value,
            path: chosen?.path ?? device?.path ?? port.value,
            type: type.value,
            universe: universeField.value,
            enabled: enabled.value === 'on'
        };
        try {
            // A device moved to another port replaces its old entry
            if (device !== null && device.id !== next.id) {
                await engine().request('output.removeUsbDevice', { id: device.id });
            }
            applyOutputState(await engine().request('output.setUsbDevice', next));
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };

    const actions: Key[] = [];
    if (device !== null) {
        const remove = new Key({ label: t('output.usbRemove'), icon: 'trash-2', armed: true });
        remove.onPress(() => {
            void engine().request('output.removeUsbDevice', { id: device.id }).then((state) => {
                applyOutputState(state);
                dialog.close();
            }).catch(showError);
        });
        actions.push(remove);
    }
    const cancel = new Key({ label: t('common.cancel') });
    const save = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    save.onPress(() => void submit());
    dialog.addActions(...actions, cancel, save);
    dialog.onCancel(() => dialog.close());

    await loadPorts();
    dialog.open();
}
