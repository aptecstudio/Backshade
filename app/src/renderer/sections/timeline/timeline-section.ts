/**
 * Timeline section: the timelines of the show, as in an audio workstation.
 * On top the choice of the timeline, the transport (start, stop, play,
 * record, loop, go mode), the time, bar and tempo displays, the snap and the
 * zoom; below the editor of the tracks and, beside it, the markers panel
 * with Go, Back and the list of the markers. Space plays or pauses, Delete
 * removes the selected clips, Ctrl+Z and Ctrl+Shift+Z undo and redo,
 * Ctrl+D duplicates, S splits at the playhead, M adds a marker at the
 * playhead, Home goes to the start.
 */

import { Key, Label, Panel, ReadoutDisplay, SelectField, Spacer, Stack } from '../../../framework/ts/index.js';
import { canEdit, markEdit } from '../../show/edit-access.js';
import { markMidi } from '../../midi/midi-target.js';
import { barPosition, newTrack, TRACK_KINDS, type Timeline, type TimelineState, type TrackKind } from '../../../shared/timeline/timeline.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { EMPTY_CONTEXT, type EditorContext } from './editor-context.js';
import { MarkerPanel } from './marker-panel.js';
import { TimelineEditor } from './timeline-editor.js';
import { openTimelineDialog } from './timeline-dialog.js';
import { TimelineSession } from './timeline-session.js';
import { frameRate, SNAP_MODES, snapStep, timecode, type SnapMode } from './timeline-time.js';

export class TimelineSection extends Stack {
    private readonly chooser: SelectField<string>;
    private readonly settings: Key;
    private readonly addTrack: SelectField<string>;
    private readonly play: Key;
    private readonly record: Key;
    private readonly loopKey: Key;
    private readonly goKey: Key;
    private readonly time: ReadoutDisplay;
    private readonly bar: ReadoutDisplay;
    private readonly bpm: ReadoutDisplay;
    private readonly snap: SelectField<SnapMode>;
    private readonly empty: Label;
    private readonly info: Label;
    private readonly holder = new Stack({ classes: ['timeline-section__editor'] });
    private readonly markerPanel = new MarkerPanel();
    private readonly body: Stack;
    private session: TimelineSession | null = null;
    private editor: TimelineEditor | null = null;
    private timelines: Timeline[] = [];
    private state: TimelineState = { timeline: null, playing: false, position: 0, sentAt: 0, loop: null, recording: false, goMode: false };
    private context: EditorContext = EMPTY_CONTEXT;
    private frame = 0;

    constructor() {
        super({ gap: 2, classes: ['timeline-section'] });
        this.chooser = new SelectField<string>({ ariaLabel: t('timeline.choose'), options: [], value: '' });
        this.chooser.onChange((id) => void engine().request('timeline.load', { id }).then((state) => this.applyState(state)).catch(showError));
        const create = new Key({ label: t('timeline.new'), icon: 'plus' });
        create.onPress(() => void engine().request('timeline.create', { name: t('timeline.defaultName', { number: this.timelines.length + 1 }) }).catch(showError));
        this.settings = new Key({ label: t('timeline.settings'), icon: 'settings', iconOnly: true });
        this.settings.onPress(() => void this.changeTimeline());
        this.addTrack = new SelectField<string>({
            ariaLabel: t('timeline.addTrack'),
            options: [{ value: '', label: t('timeline.addTrack') }, ...TRACK_KINDS.map((kind) => ({ value: kind, label: t(`timeline.kinds.${kind}`) }))],
            value: ''
        });
        this.addTrack.onChange((kind) => {
            this.addTrack.setValue('');
            if (kind !== '') {
                this.session?.edit((timeline) => {
                    timeline.tracks.push(newTrack(crypto.randomUUID(), kind as TrackKind, t(`timeline.kinds.${kind as TrackKind}`)));
                });
            }
        });
        const undo = new Key({ label: t('timeline.undo') });
        const redo = new Key({ label: t('timeline.redo') });
        undo.onPress(() => this.session?.undo());
        redo.onPress(() => this.session?.redo());
        const zoomOut = new Key({ label: t('timeline.zoomOut') });
        const zoomIn = new Key({ label: t('timeline.zoomIn') });
        zoomOut.onPress(() => this.editor?.setZoom(this.editor.zoom * 0.67));
        zoomIn.onPress(() => this.editor?.setZoom(this.editor.zoom * 1.5));

        const start = new Key({ label: t('timeline.toStart'), icon: 'skip-back', iconOnly: true });
        const stop = new Key({ label: t('audio.stop'), icon: 'square', iconOnly: true });
        this.play = new Key({ label: t('audio.play'), icon: 'play', iconOnly: true });
        this.record = new Key({ label: t('memories.record'), icon: 'circle-dot', iconOnly: true });
        this.loopKey = new Key({ label: t('timeline.loop'), icon: 'repeat', iconOnly: true });
        this.goKey = new Key({ label: t('timeline.goMode') });
        const marker = new Key({ label: t('timeline.addMarker'), icon: 'flag' });
        marker.onPress(() => this.editor?.addMarker(this.position()));
        markEdit(create, this.settings, this.addTrack, undo, redo, this.record, marker);
        start.onPress(() => this.transport('locate', 0));
        stop.onPress(() => this.transport('stop'));
        this.play.onPress(() => this.transport('toggle'));
        markMidi(this.play, { kind: 'timeline', action: 'toggle' }, 'button');
        markMidi(stop, { kind: 'timeline', action: 'stop' }, 'button');
        this.record.onPress(() => void engine().request('timeline.setRecording', { on: !this.state.recording }).then((state) => this.applyState(state)).catch(showError));
        this.loopKey.onPress(() => this.toggleLoop());
        this.goKey.onPress(() => void engine().request('timeline.setOptions', { goMode: !this.state.goMode }).then((state) => this.applyState(state)).catch(showError));

        this.time = new ReadoutDisplay({ text: timecode(0, 25), label: t('timeline.time') });
        this.bar = new ReadoutDisplay({ text: '1.1.1', label: t('timeline.bar') });
        this.bpm = new ReadoutDisplay({ text: '120.0', label: t('memories.bpm') });
        this.snap = new SelectField<SnapMode>({
            ariaLabel: t('timeline.snap'),
            options: SNAP_MODES.map((mode) => ({ value: mode, label: t(`timeline.snaps.${mode}`) })),
            value: 'beat'
        });
        this.empty = new Label({ text: t('timeline.empty'), tone: 'secondary' });
        this.info = new Label({ text: '', tone: 'secondary', size: 'small' });

        const header = new Panel({ classes: ['timeline-section__header'] });
        header.append(
            new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.chooser, this.settings, create, this.addTrack, undo, redo, new Spacer(), zoomOut, zoomIn, this.snap] }),
            new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [start, stop, this.play, this.record, this.loopKey, this.goKey, marker, new Spacer(), this.time, this.bar, this.bpm] })
        );
        this.markerPanel.onAction((action) => {
            switch (action.kind) {
                case 'go': this.transport('go'); break;
                case 'back': this.transport('back'); break;
                case 'locate': this.transport('locate', action.time); break;
                case 'open': void this.editor?.openMarker(action.id); break;
            }
        });
        this.body = new Stack({ direction: 'row', gap: 2, classes: ['timeline-section__body'], children: [this.holder, this.markerPanel] });
        this.append(header, this.empty, this.body, this.info);

        this.track(engine().on('timeline.changed', ({ recorded }) => void this.load(recorded === true)));
        this.track(engine().on('timeline.stateChanged', ({ state }) => this.applyState(state)));
        for (const event of ['memories.changed', 'patch.changed', 'media.changed', 'video.changed', 'mixers.changed', 'show.changed'] as const) {
            this.track(engine().on(event, () => void this.loadContext()));
        }
        this.listen(document, 'keydown', (event) => this.key(event));
        this.track(() => cancelAnimationFrame(this.frame));
        void this.loadContext();
        void this.load();
        this.animate();
    }

    private async loadContext(): Promise<void> {
        try {
            const [memories, groups, media, video, devices, settings, mixers] = await Promise.all([
                engine().request('memories.get'),
                engine().request('patch.getGroups'),
                engine().request('media.list'),
                engine().request('video.get'),
                engine().request('audio.listDevices'),
                engine().request('show.getSettings'),
                engine().request('mixers.get')
            ]);
            this.context = { memories, groups, media, video, devices, mixers: mixers.mixers, fps: frameRate(settings.timecodeRate) };
            this.editor?.setContext(this.context);
            this.showMarkers();
        } catch (error) {
            await showError(error);
        }
    }

    /**
     * @param recorded - The change is a pass of the recorder, which can be undone
     */
    private async load(recorded = false): Promise<void> {
        try {
            const [list, state] = await Promise.all([engine().request('timeline.list'), engine().request('timeline.getState')]);
            this.timelines = list.timelines;
            this.state = state;
        } catch (error) {
            await showError(error);
            return;
        }
        this.render(recorded);
    }

    private current(): Timeline | null {
        return this.timelines.find((timeline) => timeline.id === this.state.timeline) ?? null;
    }

    private render(recorded = false): void {
        const timeline = this.current();
        this.chooser.setOptions(this.timelines.map((item) => ({ value: item.id, label: item.name })), timeline?.id ?? '');
        this.chooser.element.hidden = this.timelines.length === 0;
        this.settings.element.hidden = timeline === null;
        this.addTrack.setDisabled(timeline === null);
        this.empty.element.hidden = timeline !== null;
        this.body.element.hidden = timeline === null;
        if (timeline === null) {
            this.editor?.destroy();
            this.editor = null;
            this.session = null;
            this.info.setText('');
            return;
        }
        if (this.session === null || this.session.timeline.id !== timeline.id) {
            this.editor?.destroy();
            this.session = new TimelineSession(timeline);
            this.editor = new TimelineEditor(this.session, this.context, () => snapStep(this.snap.value, this.session?.timeline ?? timeline, this.context.fps), () => canEdit('timeline'));
            this.editor.onLocate((time) => this.transport('locate', time));
            this.track(this.session.onChange(() => {
                this.showInfo();
                this.showMarkers();
            }));
            this.holder.append(this.editor);
        } else {
            this.session.replace(timeline, recorded);
        }
        this.editor?.setLoop(this.state.loop);
        this.showInfo();
        this.showMarkers();
        this.applyState(this.state);
    }

    private showInfo(): void {
        const timeline = this.session?.timeline;
        if (timeline === undefined) {
            return;
        }
        const bars = Math.ceil(timeline.length / ((60 / timeline.bpm) * timeline.beatsPerBar));
        this.info.setText(t('timeline.info', { bars, length: timecode(timeline.length, this.context.fps).slice(0, 8) }));
        this.bpm.setText(timeline.bpm.toFixed(1));
    }

    private showMarkers(): void {
        if (this.session !== null) {
            this.markerPanel.setTimeline(this.session.timeline, this.context.fps);
        }
    }

    private applyState(state: TimelineState): void {
        const loaded = state.timeline !== this.state.timeline;
        const loopChanged = JSON.stringify(state.loop) !== JSON.stringify(this.state.loop);
        this.state = state;
        if (loaded) {
            this.render();
            return;
        }
        if (loopChanged) {
            this.editor?.setLoop(state.loop);
        }
        this.play.setState(state.playing ? 'active' : 'normal');
        this.record.setState(state.recording ? 'active' : 'normal');
        this.record.setArmed(state.recording);
        this.loopKey.setState(state.loop !== null ? 'active' : 'normal');
        this.goKey.setState(state.goMode ? 'active' : 'normal');
    }

    /** Position of the playhead now, moved on with the clock of this window */
    private position(): number {
        return this.state.playing ? this.state.position + (Date.now() - this.state.sentAt) / 1000 : this.state.position;
    }

    private animate(): void {
        const frame = (): void => {
            const timeline = this.session?.timeline;
            if (timeline !== undefined) {
                const position = Math.min(timeline.length, this.position());
                this.editor?.setPlayhead(position, this.state.playing);
                this.time.setText(timecode(position, this.context.fps));
                this.bar.setText(barPosition(timeline, position));
                this.markerPanel.setPosition(position);
            }
            this.frame = requestAnimationFrame(frame);
        };
        this.frame = requestAnimationFrame(frame);
    }

    private transport(action: 'play' | 'pause' | 'toggle' | 'stop' | 'locate' | 'go' | 'back', time?: number): void {
        void engine().request('timeline.transport', { action, ...(time === undefined ? {} : { time }) }).then((state) => this.applyState(state)).catch(showError);
    }

    /**
     * Loop on: over the selected clips, or four bars from the playhead; loop off.
     */
    private toggleLoop(): void {
        const timeline = this.session?.timeline;
        if (timeline === undefined) {
            return;
        }
        let loop: { start: number; end: number } | null = null;
        if (this.state.loop === null) {
            const clips = timeline.tracks.flatMap((track) => track.clips).filter((clip) => this.editor?.selected.has(clip.id) === true);
            if (clips.length > 0) {
                loop = { start: Math.min(...clips.map((clip) => clip.start)), end: Math.max(...clips.map((clip) => clip.start + clip.duration)) };
            } else {
                const start = this.position();
                loop = { start, end: Math.min(timeline.length, start + (60 / timeline.bpm) * timeline.beatsPerBar * 4) };
            }
        }
        void engine().request('timeline.setOptions', { loop }).then((state) => this.applyState(state)).catch(showError);
    }

    private async changeTimeline(): Promise<void> {
        const timeline = this.session?.timeline;
        if (timeline === undefined) {
            return;
        }
        const result = await openTimelineDialog(timeline);
        if (result?.action === 'delete') {
            void engine().request('timeline.delete', { id: timeline.id }).catch(showError);
        } else if (result?.action === 'save') {
            this.session?.edit((next) => {
                next.name = result.name;
                next.bpm = result.bpm;
                next.beatsPerBar = result.beatsPerBar;
                next.length = result.length;
            });
        }
    }

    /** Keyboard shortcuts, when no field is being typed in */
    private key(event: KeyboardEvent): void {
        const target = event.target as HTMLElement | null;
        if (target !== null && (target.closest('input, textarea, select, .dialog') !== null || this.session === null)) {
            return;
        }
        const mod = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        let handled = true;
        if (key === ' ') {
            this.transport('toggle');
        } else if (key === 'home') {
            this.transport('locate', 0);
        } else if (!canEdit('timeline')) {
            // The other shortcuts change the timeline
            handled = false;
        } else if (key === 'delete' || key === 'backspace') {
            this.editor?.deleteSelected();
        } else if (mod && key === 'z' && event.shiftKey) {
            this.session?.redo();
        } else if (mod && (key === 'z' || key === 'y')) {
            if (key === 'y') {
                this.session?.redo();
            } else {
                this.session?.undo();
            }
        } else if (mod && key === 'd') {
            this.editor?.duplicateSelected();
        } else if (!mod && key === 's') {
            this.editor?.splitAt(this.position());
        } else if (!mod && key === 'm') {
            this.editor?.addMarker(this.position());
        } else {
            handled = false;
        }
        if (handled) {
            event.preventDefault();
        }
    }
}
