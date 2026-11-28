/**
 * Art-Net destination of a universe: sent or not, Port-Address, broadcast
 * or unicast to the addresses of the nodes, which can be found with an
 * ArtPoll search. Applying saves the destination in the show.
 */

import { ChoiceKeys, Dialog, Key, Label, ListItem, NumberField, Stack, TextField } from '../../../framework/ts/index.js';
import {
    formatPortAddress,
    isIpv4,
    MAX_PORT_ADDRESS,
    MAX_TARGETS,
    type OutputTransport,
    type OutputUniverse
} from '../../../shared/output/output-config.js';
import type { ArtNetNodeInfo } from '../../../shared/transport/engine-api.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { outputState } from '../../output/output-store.js';
import { engine } from '../../transport/engine.js';

type YesNo = 'on' | 'off';

function portAddressHint(portAddress: number): string {
    return t('output.portAddressHint', { net: portAddress >> 8, subNet: (portAddress >> 4) & 0xf, universe: portAddress & 0xf });
}

/**
 * Addresses written by the user, or null if one of them is not valid.
 */
function parseTargets(text: string): string[] | null {
    const targets = [...new Set(text.split(/[\s,;]+/).filter(Boolean))];
    return targets.length <= MAX_TARGETS && targets.every(isIpv4) ? targets : null;
}

/**
 * Opens the destination of a universe.
 */
export function openUniverseDialog(destination: OutputUniverse, configured: boolean): void {
    const dialog = new Dialog({ title: t('output.universeTitle', { number: destination.universe }), size: 'wide' });

    const enabled = new ChoiceKeys<YesNo>({
        label: t('output.enabled'),
        options: [{ value: 'on', label: t('output.on') }, { value: 'off', label: t('output.off') }],
        value: destination.enabled ? 'on' : 'off'
    });
    const portAddress = new NumberField({ label: t('output.portAddress'), value: destination.portAddress, min: 0, max: MAX_PORT_ADDRESS });
    const hint = new Label({ text: portAddressHint(destination.portAddress), tone: 'secondary', size: 'small' });
    portAddress.onChange((value) => hint.setText(portAddressHint(value)));
    const transport = new ChoiceKeys<OutputTransport>({
        label: t('output.transport'),
        options: [{ value: 'broadcast', label: t('output.broadcast') }, { value: 'unicast', label: t('output.unicast') }],
        value: destination.transport
    });
    const targets = new TextField({ label: t('output.targets'), value: destination.targets.join(', '), maxLength: 300 });
    const targetsHint = new Label({ text: t('output.targetsHint'), tone: 'secondary', size: 'small' });
    const discover = new Key({ label: t('output.discover'), icon: 'search' });
    const nodesStatus = new Label({ text: '', tone: 'secondary', size: 'small' });
    const nodes = new Stack({ gap: 8, classes: ['artnet-nodes'] });
    const unicast = new Stack({ gap: 8, children: [targets, targetsHint, new Stack({ direction: 'row', gap: 8, align: 'center', children: [discover, nodesStatus] }), nodes] });

    const showTransport = (value: OutputTransport): void => {
        unicast.element.hidden = value !== 'unicast';
    };
    transport.onChange(showTransport);
    showTransport(destination.transport);

    let nodeRows: ListItem[] = [];
    const showNodes = (found: readonly ArtNetNodeInfo[]): void => {
        nodeRows.forEach((row) => row.destroy());
        nodeRows = found.map((node) => {
            const ports = node.portAddresses.map(formatPortAddress).join(', ') || '-';
            const row = new ListItem({
                label: `${t('output.addTarget')} ${node.address}`,
                children: [new Stack({
                    classes: ['artnet-node__text'],
                    children: [
                        new Label({ text: node.shortName || node.address, weight: 'medium' }),
                        new Label({ text: t('output.nodePorts', { address: node.address, ports }), tone: 'secondary', size: 'small' })
                    ]
                })]
            });
            row.onPress(() => {
                const current = parseTargets(targets.value) ?? [];
                if (!current.includes(node.address)) {
                    targets.setValue([...current, node.address].join(', '));
                }
            });
            return row;
        });
        nodes.append(...nodeRows);
        nodesStatus.setText(found.length === 0 ? t('output.noNodes') : '');
    };
    discover.onPress(() => {
        if (outputState()?.canDiscover === false) {
            nodesStatus.setText(t('output.discoverUnavailable'));
            return;
        }
        discover.setDisabled(true);
        nodesStatus.setText(t('output.discovering'));
        void engine().request('output.discover').then(showNodes).catch(showError).finally(() => discover.setDisabled(false));
    });

    dialog.append(enabled, new Stack({ gap: 8, children: [portAddress, hint] }), transport, unicast);

    const apply = async (): Promise<void> => {
        const list = parseTargets(targets.value);
        if (list === null) {
            await askChoice(t('errors.title'), t('output.invalidTargets'), [{ id: 'ok', label: t('common.ok'), primary: true }]);
            return;
        }
        try {
            await engine().request('output.updateUniverse', {
                universe: destination.universe,
                enabled: enabled.value === 'on',
                portAddress: portAddress.value,
                transport: transport.value,
                targets: list
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };

    const reset = new Key({ label: t('output.resetDefault') });
    reset.setDisabled(!configured);
    reset.onPress(() => {
        void engine().request('output.resetUniverse', { universe: destination.universe }).then(() => dialog.close()).catch(showError);
    });
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(reset, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
}
