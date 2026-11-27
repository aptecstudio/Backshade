/**
 * MIDI panel of the show settings: the MIDI ports of the workstation, and
 * the mappings of the show (message, device, what it drives), each one with
 * a key to delete it; the mappings of a device can be deleted together.
 * Mappings are made with MIDI learn (the MIDI key of the top bar).
 */

import { Key, Label, Panel, Stack } from '../../../framework/ts/index.js';
import type { MemoriesSummary } from '../../../shared/console/memories.js';
import type { MidiMapping, MidiState, MidiTarget } from '../../../shared/midi/midi.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

/** Text of the message of a mapping, for example "CC 7, channel 1" */
function messageText(mapping: MidiMapping): string {
    const { kind, number, channel } = mapping.input;
    return t(`midi.messages.${kind}`, { number, channel });
}

export class MidiSettings extends Panel {
    private readonly devices = new Stack({ gap: 1 });
    private readonly list = new Stack({ gap: 1 });
    private memories: MemoriesSummary = { scenes: [], chasers: [], cues: [] };

    constructor() {
        super({ title: t('midi.title') });
        this.append(
            new Label({ text: t('midi.hint'), tone: 'secondary', size: 'small' }),
            new Label({ text: t('midi.devices'), weight: 'medium', size: 'small' }),
            this.devices,
            new Label({ text: t('midi.mappings'), weight: 'medium', size: 'small' }),
            this.list
        );
        this.track(engine().on('midi.stateChanged', ({ state }) => this.showDevices(state)));
        this.track(engine().on('midi.changed', () => void this.load()));
        void engine().request('midi.getState').then((state) => this.showDevices(state)).catch(showError);
        void this.load();
    }

    private showDevices(state: MidiState): void {
        this.devices.element.replaceChildren();
        const inputs = state.devices.filter((device) => device.kind === 'input');
        if (inputs.length === 0) {
            this.devices.append(new Label({ text: t('midi.noDevices'), tone: 'secondary', size: 'small' }));
        }
        for (const device of inputs) {
            this.devices.append(new Label({ text: device.connected ? device.name : t('midi.disconnected', { name: device.name }), size: 'small', tone: device.connected ? 'primary' : 'secondary' }));
        }
    }

    private targetText(target: MidiTarget): string {
        switch (target.kind) {
            case 'scene': return t('midi.targets.scene', { name: this.memories.scenes.find((scene) => scene.id === target.id)?.name ?? t('grid.missing') });
            case 'chaser': return t('midi.targets.chaser', { name: this.memories.chasers.find((chaser) => chaser.id === target.id)?.name ?? t('grid.missing') });
            case 'cue': return t(`grid.cueActions.${target.action}`);
            case 'master': return t(`grid.masters.${target.master}`);
            case 'group': return t('midi.targets.group');
            case 'channel': return t('grid.channelName', { universe: target.universe, channel: target.channel });
            case 'desk': return t(`grid.deskActions.${target.action}`);
            case 'audio': return t(`grid.audioActions.${target.action}`);
            case 'timer': return t('midi.targets.timer');
            case 'timeline': return t(`midi.timeline.${target.action}`);
            case 'none': return '';
        }
    }

    private async load(): Promise<void> {
        let mappings: MidiMapping[];
        try {
            [mappings, this.memories] = await Promise.all([engine().request('midi.getMappings').then((midi) => midi.mappings), engine().request('memories.get')]);
        } catch (error) {
            await showError(error);
            return;
        }
        this.list.element.replaceChildren();
        if (mappings.length === 0) {
            this.list.append(new Label({ text: t('midi.noMappings'), tone: 'secondary', size: 'small' }));
            return;
        }
        for (const device of [...new Set(mappings.map((mapping) => mapping.input.device))]) {
            const clear = new Key({ label: t('midi.clearDevice'), icon: 'trash-2' });
            clear.onPress(() => void engine().request('midi.clearMappings', { device }).catch(showError));
            this.list.append(new Stack({ direction: 'row', gap: 2, align: 'center', children: [new Label({ text: device, weight: 'medium' }), clear] }));
            for (const mapping of mappings.filter((item) => item.input.device === device)) {
                const remove = new Key({ label: t('midi.deleteMapping'), icon: 'trash-2', iconOnly: true });
                remove.onPress(() => void engine().request('midi.deleteMapping', { id: mapping.id }).catch(showError));
                this.list.append(new Stack({
                    direction: 'row',
                    gap: 2,
                    align: 'center',
                    classes: ['midi-mapping-row'],
                    children: [
                        new Label({ text: messageText(mapping), size: 'small' }),
                        new Label({ text: this.targetText(mapping.target), size: 'small', tone: 'secondary' }),
                        remove
                    ]
                }));
            }
        }
    }
}
