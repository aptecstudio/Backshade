/**
 * MIDI panel of the show settings: the MIDI ports of the workstation, the
 * mappings of the show (message, device, what it drives, and for control
 * changes driving a level the encoding of an endless encoder), each one
 * with a key to delete it; the mappings of a device can be deleted
 * together. Profiles of common controllers set up the mappings (guided, or
 * at once for Mackie Control). Then MIDI Show Control, the MIDI timecode
 * followed by the timeline, and the monitor.
 * Mappings are made with MIDI learn (the MIDI key of the top bar).
 */

import { ChoiceKeys, Key, Label, NumberField, Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import type { MemoriesSummary } from '../../../shared/console/memories.js';
import { MIDI_ENCODINGS, type MidiEncoding, type MidiMapping, type MidiMonitorEntry, type MidiState, type MidiTarget, type MscSettings, type MtcSettings } from '../../../shared/midi/midi.js';
import { GUIDED_PROFILES, mackieMappings } from '../../../shared/midi/midi-profiles.js';
import { showError } from '../../dialogs/show-error.js';
import { resolveRole } from '../../midi/profile-roles.js';
import { frameRate, timecode } from '../timeline/timeline-time.js';
import { openProfileDialog } from './midi-profile-dialog.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

/** Text of the message of a mapping, for example "CC 7, channel 1" */
function messageText(mapping: MidiMapping): string {
    const { kind, number, channel } = mapping.input;
    return t(`midi.messages.${kind}`, { number, channel });
}

export class MidiSettings extends Panel {
    private readonly devices = new Stack({ gap: 8 });
    private readonly list = new Stack({ gap: 8 });
    private readonly msc = new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end' });
    private readonly mtc = new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end' });
    private inputs: string[] = [];
    private fps = 25;
    private readonly monitorList = new Stack({ classes: ['midi-monitor'] });
    private readonly monitorKey: Key;
    private readonly profile: SelectField<string>;
    private readonly profileDevice: SelectField<string>;
    private monitoring = false;
    private memories: MemoriesSummary = { scenes: [], chasers: [], cues: [] };

    constructor() {
        super({ title: t('midi.title') });
        this.append(
            new Label({ text: t('midi.hint'), tone: 'secondary', size: 'small' }),
            new Label({ text: t('midi.devices'), weight: 'medium', size: 'small' }),
            this.devices,
            new Label({ text: t('midi.profiles'), weight: 'medium', size: 'small' })
        );
        this.profile = new SelectField<string>({
            label: t('midi.profile'),
            options: [...GUIDED_PROFILES.map((item) => ({ value: item.id, label: item.name })), { value: 'mackie', label: t('midi.mackie') }],
            value: GUIDED_PROFILES[0].id
        });
        this.profileDevice = new SelectField<string>({ label: t('midi.profileDevice'), options: [], value: '' });
        const setUp = new Key({ label: t('midi.profileStart'), icon: 'piano' });
        setUp.onPress(() => void this.setUpProfile());
        this.profile.onChange(() => this.showProfileDevice());
        this.append(
            new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [this.profile, this.profileDevice, setUp] }),
            new Label({ text: t('midi.profilesHint'), tone: 'secondary', size: 'small' }),
            new Label({ text: t('midi.mappings'), weight: 'medium', size: 'small' }),
            this.list
        );
        this.showProfileDevice();
        this.monitorKey = new Key({ label: t('midi.monitor'), icon: 'activity' });
        this.monitorKey.onPress(() => this.setMonitor(!this.monitoring));
        this.append(
            new Label({ text: t('midi.msc'), weight: 'medium', size: 'small' }),
            new Label({ text: t('midi.mscHint'), tone: 'secondary', size: 'small' }),
            this.msc,
            new Label({ text: t('midi.mtc'), weight: 'medium', size: 'small' }),
            new Label({ text: t('midi.mtcHint'), tone: 'secondary', size: 'small' }),
            this.mtc,
            new Stack({ direction: 'row', gap: 8, align: 'center', children: [new Label({ text: t('midi.monitorTitle'), weight: 'medium', size: 'small' }), this.monitorKey] }),
            this.monitorList
        );
        this.track(engine().on('midi.stateChanged', ({ state }) => this.showDevices(state)));
        this.track(engine().on('midi.changed', () => void this.load()));
        this.track(engine().on('midi.monitor', ({ entries }) => this.showTraffic(entries)));
        this.track(() => {
            if (this.monitoring) {
                void engine().request('midi.setMonitor', { on: false }).catch(() => undefined);
            }
        });
        void engine().request('midi.getState').then((state) => this.showDevices(state)).catch(showError);
        void this.load();
    }

    /** Mackie Control needs the device; guided profiles learn from any */
    private showProfileDevice(): void {
        this.profileDevice.element.hidden = this.profile.value !== 'mackie';
    }

    private async setUpProfile(): Promise<void> {
        const guided = GUIDED_PROFILES.find((item) => item.id === this.profile.value);
        if (guided !== undefined) {
            await openProfileDialog(guided, (target) => this.targetText(target));
            return;
        }
        const device = this.profileDevice.value;
        if (device === '') {
            return;
        }
        try {
            const [memories, groups] = await Promise.all([engine().request('memories.get'), engine().request('patch.getGroups')]);
            await engine().request('midi.addMappings', { mappings: mackieMappings(device, (role) => resolveRole(role, memories, groups)) });
        } catch (error) {
            await showError(error);
        }
    }

    private showDevices(state: MidiState): void {
        this.devices.element.replaceChildren();
        const inputs = state.devices.filter((device) => device.kind === 'input');
        const names = [...new Set(inputs.filter((device) => device.connected).map((device) => device.name))];
        this.inputs = names;
        this.profileDevice.setOptions(names.map((name) => ({ value: name, label: name })), names.includes(this.profileDevice.value) ? this.profileDevice.value : names[0] ?? '');
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

    private setMonitor(on: boolean): void {
        this.monitoring = on;
        this.monitorKey.setState(on ? 'active' : 'normal');
        if (!on) {
            this.monitorList.element.replaceChildren();
        }
        void engine().request('midi.setMonitor', { on }).catch(showError);
    }

    /** Last messages first, at most 40 */
    private showTraffic(entries: MidiMonitorEntry[]): void {
        if (!this.monitoring) {
            return;
        }
        for (const entry of entries) {
            const time = new Date(entry.time).toLocaleTimeString(undefined, { hour12: false });
            const text = entry.msc !== '' ? t('midi.mscMessage', { command: entry.msc })
                : entry.kind === null ? t('midi.otherMessage')
                    : `${t(`midi.messages.${entry.kind}`, { number: entry.number, channel: entry.channel })}, ${entry.value}`;
            const row = new Label({ text: `${time}  ${entry.direction === 'in' ? t('midi.received') : t('midi.sent')}  ${entry.device}  ${text}`, size: 'small', tone: entry.direction === 'in' ? 'primary' : 'secondary' });
            this.monitorList.element.prepend(row.element);
        }
        while (this.monitorList.element.childElementCount > 40) {
            this.monitorList.element.lastElementChild?.remove();
        }
    }

    private showMsc(settings: MscSettings): void {
        this.msc.element.replaceChildren();
        const enabled = new ChoiceKeys<'on' | 'off'>({
            label: t('midi.mscEnabled'),
            options: [{ value: 'off', label: t('output.off') }, { value: 'on', label: t('output.on') }],
            value: settings.enabled ? 'on' : 'off'
        });
        const deviceId = new NumberField({ label: t('midi.mscDevice'), value: settings.deviceId, min: 0, max: 111 });
        const send = (): void => void engine().request('midi.setMsc', { enabled: enabled.value === 'on', deviceId: Math.round(deviceId.value) }).catch(showError);
        enabled.onChange(send);
        deviceId.onChange(send);
        this.msc.append(enabled, deviceId);
    }

    private showMtc(settings: MtcSettings): void {
        this.mtc.element.replaceChildren();
        const enabled = new ChoiceKeys<'on' | 'off'>({
            label: t('midi.mtcEnabled'),
            options: [{ value: 'off', label: t('output.off') }, { value: 'on', label: t('output.on') }],
            value: settings.enabled ? 'on' : 'off'
        });
        const names = settings.device !== '' && !this.inputs.includes(settings.device) ? [...this.inputs, settings.device] : this.inputs;
        const device = new SelectField<string>({
            label: t('midi.mtcDevice'),
            options: [{ value: '', label: t('midi.mtcAny') }, ...names.map((name) => ({ value: name, label: name }))],
            value: settings.device
        });
        const start = new TextField({ label: t('midi.mtcStart'), value: timecode(settings.start, this.fps), maxLength: 11 });
        const send = (): void => {
            // HH:MM:SS:FF at the timecode rate of the show
            const parts = start.value.trim().split(':').map(Number);
            const valid = parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0);
            const seconds = valid ? parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / this.fps : settings.start;
            void engine().request('midi.setMtc', { enabled: enabled.value === 'on', device: device.value, start: seconds }).catch(showError);
        };
        enabled.onChange(send);
        device.onChange(send);
        start.onChange(send);
        this.mtc.append(enabled, device, start);
    }

    private async load(): Promise<void> {
        let mappings: MidiMapping[];
        try {
            const [midi, memories] = await Promise.all([engine().request('midi.getMappings'), engine().request('memories.get')]);
            mappings = midi.mappings;
            this.memories = memories;
            this.showMsc(midi.msc);
            this.fps = frameRate((await engine().request('show.getSettings')).timecodeRate);
            this.showMtc(midi.mtc);
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
            this.list.append(new Stack({ direction: 'row', gap: 8, align: 'center', children: [new Label({ text: device, weight: 'medium' }), clear] }));
            for (const mapping of mappings.filter((item) => item.input.device === device)) {
                const remove = new Key({ label: t('midi.deleteMapping'), icon: 'trash-2', iconOnly: true });
                remove.onPress(() => void engine().request('midi.deleteMapping', { id: mapping.id }).catch(showError));
                // Control changes driving a level can come from endless encoders
                const extra: Array<SelectField<MidiEncoding>> = [];
                if (mapping.mode === 'level' && mapping.input.kind === 'cc') {
                    const encoding = new SelectField<MidiEncoding>({
                        ariaLabel: t('midi.encoding'),
                        options: MIDI_ENCODINGS.map((value) => ({ value, label: t(`midi.encodings.${value}`) })),
                        value: mapping.encoding
                    });
                    encoding.onChange((value) => void engine().request('midi.updateMapping', { id: mapping.id, encoding: value }).catch(showError));
                    extra.push(encoding);
                }
                this.list.append(new Stack({
                    direction: 'row',
                    gap: 8,
                    align: 'center',
                    classes: ['midi-mapping-row'],
                    children: [
                        new Label({ text: messageText(mapping), size: 'small' }),
                        new Label({ text: this.targetText(mapping.target), size: 'small', tone: 'secondary' }),
                        ...extra,
                        remove
                    ]
                }));
            }
        }
    }
}
