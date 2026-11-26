/**
 * Audio section: the audio player of the show. On top the item playing
 * with its times and progress, the transport keys, the volume of the
 * player, the audio output and auto advance; below the playlist, where an
 * item is played, changed, moved or removed. Scenes and cues record and
 * recall the item playing.
 */

import {
    ChoiceKeys,
    Key,
    Label,
    LinearSlider,
    Panel,
    ReadoutDisplay,
    SelectField,
    Spacer,
    Stack,
    create,
    formatDuration
} from '../../../framework/ts/index.js';
import type { AudioPlayback, ShowAudio } from '../../../shared/audio/audio.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { openAddAudio } from './add-audio-dialog.js';
import { openAudioItemDialog } from './audio-item-dialog.js';
import { itemDetails, itemRange } from './audio-text.js';

export class AudioSection extends Stack {
    private readonly title: Label;
    private readonly elapsed: ReadoutDisplay;
    private readonly remaining: ReadoutDisplay;
    private readonly bar: HTMLDivElement;
    private readonly pause: Key;
    private readonly volume: LinearSlider;
    private readonly device: SelectField<string>;
    private readonly advance: ChoiceKeys<'no' | 'yes'>;
    private readonly list = new Stack({ classes: ['audio-playlist'] });
    private readonly empty: Label;
    private rows: Stack[] = [];
    private audio: ShowAudio = { device: '', volume: 1, autoAdvance: false, items: [] };
    private playback: AudioPlayback = { item: null, paused: false, position: 0, duration: 0, fromScene: false };

    constructor() {
        super({ gap: 2, classes: ['audio-section'] });

        this.title = new Label({ text: '', size: 'large' });
        this.elapsed = new ReadoutDisplay({ text: '', label: t('audio.elapsed') });
        this.remaining = new ReadoutDisplay({ text: '', label: t('audio.remaining') });
        this.bar = create('div', { classes: ['audio-progress__fill'] });
        const track = create('div', { classes: ['audio-progress'], children: [this.bar] });
        const previous = new Key({ label: t('audio.previous'), icon: 'skip-back', iconOnly: true });
        const play = new Key({ label: t('audio.play'), icon: 'play', size: 'large' });
        this.pause = new Key({ label: t('audio.pause') });
        const stop = new Key({ label: t('audio.stop'), icon: 'square' });
        const next = new Key({ label: t('audio.next'), icon: 'skip-back', iconOnly: true });
        next.element.classList.add('audio-next');
        previous.onPress(() => this.command('audio.previous'));
        play.onPress(() => this.command('audio.play'));
        this.pause.onPress(() => this.command('audio.pause'));
        stop.onPress(() => this.command('audio.stop'));
        next.onPress(() => this.command('audio.next'));

        this.volume = new LinearSlider({ label: t('audio.volume'), value: 1 });
        this.volume.onChange((volume) => void engine().request('audio.setPlayer', { volume }).catch(showError));
        this.device = new SelectField<string>({ label: t('audio.output'), options: [{ value: '', label: t('audio.defaultOutput') }], value: '' });
        this.device.onChange((device) => void engine().request('audio.setPlayer', { device }).catch(showError));
        this.advance = new ChoiceKeys<'no' | 'yes'>({
            label: t('audio.autoAdvance'),
            options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
            value: 'no'
        });
        this.advance.onChange((value) => void engine().request('audio.setPlayer', { autoAdvance: value === 'yes' }).catch(showError));

        const transport = new Panel({ title: t('audio.player'), classes: ['audio-transport'] });
        const progress = new Stack({ gap: 1, classes: ['audio-transport__progress'] });
        progress.element.append(track);
        transport.append(
            this.title,
            new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.elapsed, this.remaining, progress] }),
            new Stack({
                direction: 'row',
                gap: 2,
                align: 'end',
                wrap: true,
                children: [previous, play, this.pause, stop, next, new Spacer(), new Stack({ gap: 1, classes: ['audio-volume'], children: [new Label({ text: t('audio.volume'), size: 'small' }), this.volume] }), this.device, this.advance]
            })
        );

        const playlist = new Panel({ title: t('audio.playlist'), classes: ['audio-playlist-panel'] });
        const add = new Key({ label: t('audio.addFromMedia'), icon: 'plus' });
        add.onPress(() => void openAddAudio());
        this.empty = new Label({ text: t('audio.empty'), tone: 'secondary', size: 'small' });
        playlist.append(new Stack({ direction: 'row', gap: 2, children: [add] }), this.empty, this.list);

        this.append(transport, playlist);
        this.track(engine().on('audio.changed', () => void this.load()));
        this.track(engine().on('audio.stateChanged', ({ state }) => this.applyState(state)));
        void this.load();
        void this.loadDevices();
        void engine().request('audio.getState').then((state) => this.applyState(state)).catch(showError);
    }

    private async loadDevices(): Promise<void> {
        try {
            const devices = await engine().request('audio.listDevices');
            this.device.setOptions([{ value: '', label: t('audio.defaultOutput') }, ...devices.map((item) => ({ value: item.id, label: item.label || item.id }))], this.audio.device);
        } catch (error) {
            await showError(error);
        }
    }

    private async load(): Promise<void> {
        try {
            this.audio = await engine().request('audio.get');
        } catch (error) {
            await showError(error);
            return;
        }
        this.volume.setValue(this.audio.volume);
        this.device.setValue(this.audio.device);
        this.advance.setValue(this.audio.autoAdvance ? 'yes' : 'no');
        this.build();
    }

    private build(): void {
        this.rows.forEach((row) => row.destroy());
        this.rows = this.audio.items.map((item, index) => {
            const play = new Key({ label: t('audio.playItem', { name: item.name }), icon: 'play', iconOnly: true });
            const up = new Key({ label: t('memories.moveUp'), icon: 'arrow-up', iconOnly: true });
            const down = new Key({ label: t('memories.moveDown'), icon: 'arrow-down', iconOnly: true });
            const edit = new Key({ label: t('audio.editItem', { name: item.name }), icon: 'pencil', iconOnly: true });
            up.setDisabled(index === 0);
            down.setDisabled(index === this.audio.items.length - 1);
            play.onPress(() => void engine().request('audio.play', { id: item.id }).then((state) => this.applyState(state)).catch(showError));
            up.onPress(() => void engine().request('audio.moveItem', { id: item.id, offset: -1 }).catch(showError));
            down.onPress(() => void engine().request('audio.moveItem', { id: item.id, offset: 1 }).catch(showError));
            edit.onPress(() => openAudioItemDialog(item));
            const row = new Stack({
                direction: 'row',
                gap: 2,
                align: 'center',
                classes: ['audio-playlist__row'],
                children: [
                    play,
                    new Label({ text: String(index + 1), tone: 'secondary', size: 'small' }),
                    new Label({ text: item.name }),
                    new Label({ text: itemRange(item), tone: 'secondary', size: 'small' }),
                    new Label({ text: itemDetails(item), tone: 'secondary', size: 'small' }),
                    new Spacer(),
                    up,
                    down,
                    edit
                ]
            });
            row.element.dataset.item = item.id;
            this.list.append(row);
            return row;
        });
        this.empty.element.hidden = this.audio.items.length > 0;
        this.render();
    }

    private applyState(state: AudioPlayback): void {
        this.playback = state;
        this.render();
    }

    private render(): void {
        const item = this.audio.items.find((entry) => entry.id === this.playback.item);
        this.title.setText(item === undefined ? t('audio.stopped') : item.name);
        const end = item === undefined ? 0 : item.end ?? this.playback.duration;
        const elapsed = item === undefined ? 0 : Math.max(0, this.playback.position - item.start);
        const length = item === undefined ? 0 : Math.max(0, end - item.start);
        this.elapsed.setText(formatDuration(elapsed));
        this.remaining.setText(item === undefined ? formatDuration(0) : `-${formatDuration(Math.max(0, length - elapsed))}`);
        this.bar.style.setProperty('--audio-progress', String(length > 0 ? Math.min(1, elapsed / length) : 0));
        this.pause.setState(this.playback.paused ? 'active' : 'normal');
        this.pause.setArmed(this.playback.paused);
        for (const row of this.rows) {
            row.element.classList.toggle('audio-playlist__row--current', row.element.dataset.item === this.playback.item);
        }
    }

    private command(method: 'audio.play' | 'audio.pause' | 'audio.stop' | 'audio.next' | 'audio.previous'): void {
        void engine().request(method).then((state) => this.applyState(state)).catch(showError);
    }
}
