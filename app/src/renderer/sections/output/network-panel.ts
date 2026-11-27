/**
 * Output section: Art-Net settings of the workstation (output on or off,
 * network interface) and of the show (frame rate), with the output status.
 */

import { ChoiceKeys, Label, NumberField, Panel, SelectField, Stack, type SelectOption } from '../../../framework/ts/index.js';
import { FRAME_RATE } from '../../../shared/output/output-config.js';
import type { NetworkInterfaceInfo, OutputState } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { markEdit } from '../../show/edit-access.js';
import { applyOutputState, onOutputState } from '../../output/output-store.js';
import { currentShow } from '../../show/show-store.js';
import { engine } from '../../transport/engine.js';

type OnOff = 'on' | 'off';
const ALL_INTERFACES = '';

function interfaceOptions(interfaces: readonly NetworkInterfaceInfo[], selected: string): SelectOption<string>[] {
    const options: SelectOption<string>[] = [
        { value: ALL_INTERFACES, label: t('output.allInterfaces') },
        ...interfaces.map((item) => ({
            value: item.address,
            label: t(item.internal ? 'output.localOnly' : 'output.interfaceOption', { name: item.name, address: item.address })
        }))
    ];
    // An interface saved on this workstation but not connected now stays visible
    if (selected !== ALL_INTERFACES && !interfaces.some((item) => item.address === selected)) {
        options.push({ value: selected, label: t('output.interfaceMissing', { address: selected }) });
    }
    return options;
}

function statusText(state: OutputState): string {
    if (state.error !== null) {
        return t('output.statusError', { error: state.error });
    }
    if (!state.enabled) {
        return t('output.statusOff');
    }
    if (currentShow() === null) {
        return t('output.statusNoShow');
    }
    return state.universes.length === 0 ? t('output.statusIdle') : t('output.status', { count: state.universes.length });
}

export class NetworkPanel extends Panel {
    private readonly frameRate: NumberField;

    constructor() {
        super({ title: t('output.network'), classes: ['network-panel'] });

        const enabled = new ChoiceKeys<OnOff>({
            label: t('output.outputEnabled'),
            options: [{ value: 'on', label: t('output.on') }, { value: 'off', label: t('output.off') }],
            value: 'on'
        });
        const networkInterface = new SelectField<string>({ label: t('output.interface'), options: [], value: ALL_INTERFACES });
        this.frameRate = new NumberField({
            label: t('output.frameRate'),
            unit: t('output.framesPerSecond'),
            value: FRAME_RATE.default,
            min: FRAME_RATE.min,
            max: FRAME_RATE.max
        });
        const status = new Label({ text: '', weight: 'medium' });

        const setWorkstation = (params: { enabled?: boolean; artNetInterface?: string }): void => {
            void engine().request('output.setWorkstation', params).then(applyOutputState).catch(showError);
        };
        markEdit(enabled, networkInterface, this.frameRate);
        enabled.onChange((value) => setWorkstation({ enabled: value === 'on' }));
        networkInterface.onChange((value) => setWorkstation({ artNetInterface: value }));
        this.frameRate.onChange((value) => {
            void engine().request('output.setFrameRate', { frameRate: value }).catch(showError);
        });

        let interfaces: NetworkInterfaceInfo[] = [];
        this.track(onOutputState((state) => {
            enabled.setValue(state.enabled ? 'on' : 'off');
            networkInterface.setOptions(interfaceOptions(interfaces, state.artNetInterface), state.artNetInterface);
            status.setText(statusText(state));
        }));
        void engine().request('output.listInterfaces').then((list) => {
            interfaces = list;
            void engine().request('output.getState').then(applyOutputState);
        }).catch(showError);

        this.append(
            status,
            new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children: [enabled, networkInterface, this.frameRate] }),
            new Label({ text: t('output.workstationHint'), tone: 'secondary', size: 'small' })
        );
    }

    /**
     * Shows the frame rate of the open show.
     */
    setFrameRate(frameRate: number): void {
        this.frameRate.setValue(frameRate);
    }

    /**
     * Enables the show settings only with an open show.
     */
    setShowOpen(open: boolean): void {
        this.frameRate.element.hidden = !open;
    }
}
