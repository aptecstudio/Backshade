/**
 * Editor of a timeline, as in an audio workstation: headers of the tracks
 * on the left (folders indented and closable), ruler on top, a lane per
 * track with its clips or its automation curve, and the playhead. Tracks
 * are moved by dragging their header, also into a folder.
 * Clips are selected (Shift or Ctrl add to the selection), moved (also to
 * another track of the same kind), resized from their edges and given fades
 * from their top corners, with snap to the grid; a double click opens a clip
 * or adds one. Automation points are added with a click, moved by dragging
 * and removed with a double click. Audio clips show the waveform of the
 * part of the file they play. Markers are added with a double click on the
 * ruler or at the playhead, moved by dragging and opened with a double
 * click. Every change goes through the session, so it can be undone.
 */

import { CHANNEL_COLORS, Component, Emitter, channelColorClass, create, makeSortable, type SortableDrop, type Unsubscribe } from '../../../framework/ts/index.js';
import type { Clip, Marker, Timeline, Track } from '../../../shared/timeline/timeline.js';
import { t } from '../../i18n/i18n.js';
import { loadPeaks, peaksKey, peaksNow } from './audio-peaks.js';
import { createWaveform, drawWaveform } from './clip-waveform.js';
import { clipName, targetName, type EditorContext } from './editor-context.js';
import { openClipDialog } from './clip-dialog.js';
import { openMarkerDialog } from './marker-dialog.js';
import { TrackHeader, type HeaderAction } from './track-header.js';
import { TimelineRuler } from './timeline-ruler.js';
import type { TimelineSession } from './timeline-session.js';
import { snapTime } from './timeline-time.js';
import { openTrackDialog } from './track-dialog.js';

/** Width of the track headers, in pixels */
const HEADER_WIDTH = 256;
// Movement in pixels before a press on a clip becomes a drag
const DRAG_THRESHOLD = 4;

const KIND_COLORS: Readonly<Record<Track['kind'], typeof CHANNEL_COLORS[number]>> = {
    light: 'blue',
    audio: 'green',
    video: 'teal',
    automation: 'amber',
    folder: 'purple'
};

type DragPart = 'move' | 'start' | 'end' | 'fadeIn' | 'fadeOut';

export class TimelineEditor extends Component<HTMLDivElement> {
    private readonly session: TimelineSession;
    private readonly inner: HTMLDivElement;
    private readonly playhead: HTMLDivElement;
    private readonly locates = new Emitter<number>();
    private context: EditorContext;
    private pps = 40;
    private step: () => number;
    private loop: { start: number; end: number } | null = null;
    private readonly selection = new Set<string>();
    private views: Component[] = [];
    /** Tracks shown, in order, as the rows of the editor */
    private shown: Track[] = [];

    /**
     * @param step - Length of a step of the grid, in seconds (zero for no snap)
     */
    constructor(session: TimelineSession, context: EditorContext, step: () => number) {
        super(create('div', { classes: ['timeline-editor'], attributes: { tabindex: '0' } }));
        this.session = session;
        this.context = context;
        this.step = step;
        this.inner = create('div', { classes: ['timeline-editor__inner'] });
        this.playhead = create('div', { classes: ['timeline-editor__playhead'] });
        this.element.append(this.inner);
        this.element.style.setProperty('--header-width', `${HEADER_WIDTH}px`);
        this.track(session.onChange(() => this.render()));
        this.track(makeSortable({
            container: this.inner,
            items: () => [...this.inner.querySelectorAll<HTMLElement>('.timeline-row')],
            handle: '.track-header',
            canDropInto: (target, dragged) => this.canNest(this.shown[target], this.shown[dragged]),
            onDrop: (drop) => this.moveTrack(drop)
        }));
        this.track(() => this.locates.clear());
        // Ctrl and the wheel zoom the time, around the pointer
        this.listen(this.element, 'wheel', (event) => {
            if (!event.ctrlKey) {
                return;
            }
            event.preventDefault();
            const rect = this.element.getBoundingClientRect();
            const time = (event.clientX - rect.left + this.element.scrollLeft - HEADER_WIDTH) / this.pps;
            this.setZoom(this.pps * (event.deltaY < 0 ? 1.25 : 0.8));
            this.element.scrollLeft = time * this.pps - (event.clientX - rect.left - HEADER_WIDTH);
        }, { passive: false });
        this.render();
    }

    /** Pixels per second */
    get zoom(): number {
        return this.pps;
    }

    /** Clips selected */
    get selected(): ReadonlySet<string> {
        return this.selection;
    }

    setZoom(pps: number): void {
        this.pps = Math.min(800, Math.max(2, pps));
        this.render();
    }

    setContext(context: EditorContext): void {
        this.context = context;
        this.render();
    }

    setLoop(loop: { start: number; end: number } | null): void {
        this.loop = loop;
        this.render();
    }

    /** Moves the playhead line; while playing it keeps the playhead in view */
    setPlayhead(position: number, follow: boolean): void {
        const x = HEADER_WIDTH + position * this.pps;
        this.playhead.style.setProperty('--playhead-x', `${x}px`);
        if (follow) {
            const right = this.element.scrollLeft + this.element.clientWidth;
            if (x > right - 32 || x < this.element.scrollLeft + HEADER_WIDTH) {
                this.element.scrollLeft = x - HEADER_WIDTH - 32;
            }
        }
    }

    /** Time pressed on the ruler */
    onLocate(listener: (time: number) => void): Unsubscribe {
        return this.locates.subscribe(listener);
    }

    /** Adds a marker at a time, named with the next number */
    addMarker(time: number): void {
        const timeline = this.session.timeline;
        const marker: Marker = { id: crypto.randomUUID(), time: Math.max(0, Math.min(timeline.length, time)), name: t('timeline.markerName', { number: timeline.markers.length + 1 }), stop: false };
        this.session.edit((next) => {
            next.markers.push(marker);
            next.markers.sort((a, b) => a.time - b.time);
        });
    }

    clearSelection(): void {
        this.selection.clear();
        this.render();
    }

    /** Deletes the selected clips */
    deleteSelected(): void {
        const ids = new Set(this.selection);
        this.selection.clear();
        this.session.edit((timeline) => timeline.tracks.forEach((track) => {
            track.clips = track.clips.filter((clip) => !ids.has(clip.id));
        }));
    }

    /** Copies of the selected clips right after them; the copies become the selection */
    duplicateSelected(): void {
        const ids = new Set(this.selection);
        this.selection.clear();
        this.session.edit((timeline) => timeline.tracks.forEach((track) => {
            const chosen = track.clips.filter((clip) => ids.has(clip.id));
            if (chosen.length === 0) {
                return;
            }
            const span = Math.max(...chosen.map((clip) => clip.start + clip.duration)) - Math.min(...chosen.map((clip) => clip.start));
            for (const clip of chosen) {
                const copy = { ...clip, id: crypto.randomUUID(), start: clip.start + span };
                track.clips.push(copy);
                this.selection.add(copy.id);
            }
            track.clips.sort((a, b) => a.start - b.start);
        }));
    }

    /** Splits the selected clips (or every clip) under the playhead */
    splitAt(time: number): void {
        const ids = new Set(this.selection);
        this.session.edit((timeline) => timeline.tracks.forEach((track) => {
            const next: Clip[] = [];
            for (const clip of track.clips) {
                const inside = time > clip.start + 0.01 && time < clip.start + clip.duration - 0.01;
                if (!inside || (ids.size > 0 && !ids.has(clip.id))) {
                    next.push(clip);
                    continue;
                }
                const first = time - clip.start;
                next.push({ ...clip, duration: first, fadeOut: Math.min(clip.fadeOut, first) });
                next.push({ ...clip, id: crypto.randomUUID(), start: time, duration: clip.duration - first, offset: clip.offset + first, fadeIn: 0 });
            }
            track.clips = next;
        }));
    }

    /**
     * Tracks in the order shown: every folder followed by its tracks; tracks
     * of a closed folder are not shown.
     */
    private visibleTracks(timeline: Timeline): Array<{ track: Track; depth: number; number: number }> {
        const result: Array<{ track: Track; depth: number; number: number }> = [];
        const walk = (parent: string | null, depth: number, hidden: boolean): void => {
            for (const track of timeline.tracks.filter((item) => item.parent === parent)) {
                const number = timeline.tracks.indexOf(track) + 1;
                if (!hidden) {
                    result.push({ track, depth, number });
                }
                if (track.kind === 'folder') {
                    walk(track.id, depth + 1, hidden || track.collapsed);
                }
            }
        };
        walk(null, 0, false);
        return result;
    }

    private render(): void {
        this.views.forEach((view) => view.destroy());
        this.views = [];
        this.inner.replaceChildren();
        const timeline = this.session.timeline;
        const width = timeline.length * this.pps;
        this.inner.style.setProperty('--lane-width', `${width}px`);

        const rulerRow = create('div', { classes: ['timeline-editor__ruler-row'], children: [create('div', { classes: ['timeline-editor__corner'], text: t('timeline.trackCount', { count: timeline.tracks.length }) })] });
        const ruler = new TimelineRuler(timeline, this.pps, this.loop, this.step);
        ruler.onLocate((time) => this.locates.emit(Math.max(0, Math.min(timeline.length, time))));
        ruler.onAddMarker((time) => this.addMarker(time));
        ruler.onMoveMarker(({ id, time }) => this.session.edit((next) => {
            next.markers = next.markers.map((marker) => marker.id === id ? { ...marker, time } : marker).sort((a, b) => a.time - b.time);
        }));
        ruler.onOpenMarker((id) => void this.openMarker(id));
        ruler.mount(rulerRow);
        this.views.push(ruler);
        this.inner.append(rulerRow);

        const visible = this.visibleTracks(timeline);
        this.shown = visible.map((item) => item.track);
        for (const { track, depth, number } of visible) {
            const row = create('div', { classes: ['timeline-row', channelColorClass(KIND_COLORS[track.kind])], attributes: { 'data-track': track.id } });
            row.style.setProperty('--row-height', `${track.height}px`);
            const summary = this.summary(track);
            const header = new TrackHeader(track, number, depth, summary);
            header.onAction((action) => void this.headerAction(track, action));
            header.mount(row);
            this.views.push(header);
            const lane = create('div', { classes: ['timeline-row__lane', ...(track.muted ? ['timeline-row__lane--muted'] : [])], attributes: { 'data-track': track.id } });
            row.append(lane);
            if (track.kind === 'automation') {
                this.drawAutomation(lane, track);
            } else if (track.kind !== 'folder') {
                track.clips.forEach((clip) => lane.append(this.clipElement(track, clip)));
                this.listen(lane, 'dblclick', (event) => {
                    if (event.target === lane) {
                        void this.addClip(track, this.timeAt(event.clientX));
                    }
                });
                this.listen(lane, 'pointerdown', (event) => {
                    if (event.target === lane && !event.shiftKey && !event.ctrlKey) {
                        this.clearSelection();
                    }
                });
            }
            this.inner.append(row);
        }
        this.inner.append(this.playhead);
    }

    private summary(track: Track): string {
        switch (track.kind) {
            case 'audio': return this.context.devices.find((device) => device.id === track.device)?.label || t('audio.defaultOutput');
            case 'video': {
                const output = this.context.video.outputs.find((item) => item.id === track.output);
                return output === undefined ? t('timeline.noOutput') : `${output.name}, ${t('video.layer', { number: track.layer + 1 })}`;
            }
            case 'automation': return targetName(track.target, this.context);
            case 'folder': return t('timeline.tracksInside', { count: this.session.timeline.tracks.filter((item) => item.parent === track.id).length });
            case 'light': return t('timeline.kinds.light');
        }
    }

    /** Time under a horizontal position on the screen, in seconds */
    private timeAt(clientX: number): number {
        const rect = this.inner.getBoundingClientRect();
        return Math.max(0, (clientX - rect.left - HEADER_WIDTH) / this.pps);
    }

    private clipElement(track: Track, clip: Clip): HTMLDivElement {
        const element = create('div', {
            classes: ['timeline-clip', ...(this.selection.has(clip.id) ? ['timeline-clip--selected'] : [])],
            attributes: { 'data-clip': clip.id, title: clipName(clip, this.context) },
            children: [
                create('span', { classes: ['timeline-clip__name'], text: clipName(clip, this.context) }),
                create('span', { classes: ['timeline-clip__fade', 'timeline-clip__fade--in'] }),
                create('span', { classes: ['timeline-clip__fade', 'timeline-clip__fade--out'] }),
                create('span', { classes: ['timeline-clip__handle', 'timeline-clip__handle--fade-in'], attributes: { 'data-part': 'fadeIn' } }),
                create('span', { classes: ['timeline-clip__handle', 'timeline-clip__handle--fade-out'], attributes: { 'data-part': 'fadeOut' } }),
                create('span', { classes: ['timeline-clip__edge', 'timeline-clip__edge--start'], attributes: { 'data-part': 'start' } }),
                create('span', { classes: ['timeline-clip__edge', 'timeline-clip__edge--end'], attributes: { 'data-part': 'end' } })
            ]
        });
        if (clip.source.kind === 'audio') {
            this.addWaveform(element, clip, clip.source.file);
        }
        this.place(element, clip);
        this.listen(element, 'pointerdown', (event) => this.startDrag(event, track, clip, element));
        this.listen(element, 'dblclick', () => void this.editClip(track, clip));
        return element;
    }

    /** Waveform under the name of an audio clip, drawn when the peaks of its file are ready */
    private addWaveform(element: HTMLDivElement, clip: Clip, file: string): void {
        const item = this.context.media.find((media) => media.file === file);
        if (item === undefined) {
            return;
        }
        const svg = createWaveform();
        element.insertBefore(svg, element.children[1] ?? null);
        const width = clip.duration * this.pps;
        const key = peaksKey(item);
        const peaks = peaksNow(key);
        if (peaks !== undefined) {
            if (peaks !== null) {
                drawWaveform(svg, peaks, clip.offset, clip.duration, width);
            }
            return;
        }
        void loadPeaks(key, file).then((loaded) => {
            if (loaded !== null && svg.isConnected) {
                drawWaveform(svg, loaded, clip.offset, clip.duration, width);
            }
        });
    }

    /** Opens the dialog of a marker */
    async openMarker(id: string): Promise<void> {
        const marker = this.session.timeline.markers.find((item) => item.id === id);
        if (marker === undefined) {
            return;
        }
        const result = await openMarkerDialog(marker, this.session.timeline);
        if (result === null) {
            return;
        }
        this.session.edit((next) => {
            next.markers = result.action === 'delete'
                ? next.markers.filter((item) => item.id !== id)
                : next.markers.map((item) => item.id === id ? result.marker : item).sort((a, b) => a.time - b.time);
        });
    }

    private place(element: HTMLElement, clip: Pick<Clip, 'start' | 'duration' | 'fadeIn' | 'fadeOut'>): void {
        element.style.setProperty('--clip-x', `${clip.start * this.pps}px`);
        element.style.setProperty('--clip-w', `${Math.max(2, clip.duration * this.pps)}px`);
        element.style.setProperty('--fade-in', `${clip.fadeIn * this.pps}px`);
        element.style.setProperty('--fade-out', `${clip.fadeOut * this.pps}px`);
    }

    private startDrag(event: PointerEvent, track: Track, clip: Clip, element: HTMLDivElement): void {
        if (event.button !== 0) {
            return;
        }
        event.stopPropagation();
        const part = ((event.target as HTMLElement).dataset.part ?? 'move') as DragPart;
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            if (this.selection.has(clip.id)) {
                this.selection.delete(clip.id);
            } else {
                this.selection.add(clip.id);
            }
            element.classList.toggle('timeline-clip--selected', this.selection.has(clip.id));
            return;
        }
        if (!this.selection.has(clip.id)) {
            this.selection.clear();
            this.inner.querySelectorAll('.timeline-clip--selected').forEach((item) => item.classList.remove('timeline-clip--selected'));
            this.selection.add(clip.id);
            element.classList.add('timeline-clip--selected');
        }
        element.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const timeline = this.session.timeline;
        // Clips moved together: every selected clip, with its element
        const moving = timeline.tracks.flatMap((item) => item.clips.filter((other) => this.selection.has(other.id)).map((other) => ({ clip: other, track: item })));
        let dragged = false;
        let delta = 0;
        let lastRaw = 0;
        let target: Track = track;
        const move = (moveEvent: PointerEvent): void => {
            const dx = moveEvent.clientX - startX;
            lastRaw = dx / this.pps;
            if (!dragged && Math.abs(dx) < DRAG_THRESHOLD) {
                return;
            }
            dragged = true;
            const step = this.step();
            const raw = lastRaw;
            if (part === 'move') {
                // The clip pressed snaps to the grid; the others keep their distance
                delta = snapTime(clip.start + raw, step) - clip.start;
                delta = Math.max(delta, -Math.min(...moving.map((item) => item.clip.start)));
                for (const item of moving) {
                    const view = this.inner.querySelector<HTMLElement>(`[data-clip="${item.clip.id}"]`);
                    if (view !== null) {
                        this.place(view, { ...item.clip, start: item.clip.start + delta });
                    }
                }
                // Moved to another track of the same kind, when only one track is selected
                const lane = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>('[data-track]');
                const over = timeline.tracks.find((item) => item.id === lane?.dataset.track);
                if (over !== undefined && over.kind === track.kind && moving.every((item) => item.track.id === track.id)) {
                    target = over;
                }
            } else {
                this.place(element, this.resized(clip, part, raw, step));
            }
        };
        const up = (): void => {
            element.removeEventListener('pointermove', move);
            element.removeEventListener('pointerup', up);
            element.removeEventListener('pointercancel', up);
            if (!dragged) {
                this.render();
                return;
            }
            const step = this.step();
            const finalDx = delta;
            this.session.edit((next) => {
                if (part === 'move') {
                    const ids = new Set(moving.map((item) => item.clip.id));
                    const moved: Clip[] = [];
                    for (const item of next.tracks) {
                        moved.push(...item.clips.filter((other) => ids.has(other.id)).map((other) => ({ ...other, start: other.start + finalDx })));
                        item.clips = item.clips.filter((other) => !ids.has(other.id));
                    }
                    for (const movedClip of moved) {
                        const origin = moving.find((item) => item.clip.id === movedClip.id)?.track.id ?? track.id;
                        const destination = next.tracks.find((item) => item.id === (target.id !== track.id ? target.id : origin));
                        destination?.clips.push(movedClip);
                    }
                    next.tracks.forEach((item) => item.clips.sort((a, b) => a.start - b.start));
                } else {
                    const own = next.tracks.find((item) => item.id === track.id)?.clips;
                    const index = own?.findIndex((other) => other.id === clip.id) ?? -1;
                    if (own !== undefined && index >= 0) {
                        own[index] = { ...own[index], ...this.resized(clip, part, lastRaw, step) };
                    }
                }
            });
        };
        element.addEventListener('pointermove', move);
        element.addEventListener('pointerup', up);
        element.addEventListener('pointercancel', up);
    }

    /** Clip after dragging one of its edges or fade handles by a time */
    private resized(clip: Clip, part: DragPart, raw: number, step: number): Clip {
        const end = clip.start + clip.duration;
        switch (part) {
            case 'start': {
                const start = Math.min(end - 0.05, Math.max(0, snapTime(clip.start + raw, step), clip.start - clip.offset));
                const moved = start - clip.start;
                return { ...clip, start, duration: end - start, offset: clip.offset + moved, fadeIn: Math.min(clip.fadeIn, end - start) };
            }
            case 'end': {
                const duration = Math.max(0.05, snapTime(end + raw, step) - clip.start);
                return { ...clip, duration, fadeOut: Math.min(clip.fadeOut, duration) };
            }
            case 'fadeIn':
                return { ...clip, fadeIn: Math.max(0, Math.min(clip.duration - clip.fadeOut, clip.fadeIn + raw)) };
            case 'fadeOut':
                return { ...clip, fadeOut: Math.max(0, Math.min(clip.duration - clip.fadeIn, clip.fadeOut - raw)) };
            case 'move':
                return clip;
        }
    }

    private async addClip(track: Track, time: number): Promise<void> {
        const timeline = this.session.timeline;
        const bar = (60 / timeline.bpm) * timeline.beatsPerBar;
        const draft: Clip = {
            id: crypto.randomUUID(),
            start: snapTime(time, this.step()),
            duration: bar * 4,
            offset: 0,
            fadeIn: 0,
            fadeOut: 0,
            name: '',
            source: track.kind === 'audio' ? { kind: 'audio', file: '', volume: 1 } : { kind: 'scene', id: '' }
        };
        const result = await openClipDialog(track, draft, true, this.context);
        if (result?.action === 'save') {
            this.selection.clear();
            this.selection.add(result.clip.id);
            this.session.edit((next) => {
                const own = next.tracks.find((item) => item.id === track.id);
                own?.clips.push(result.clip);
                own?.clips.sort((a, b) => a.start - b.start);
                next.length = Math.max(next.length, result.clip.start + result.clip.duration);
            });
        }
    }

    private async editClip(track: Track, clip: Clip): Promise<void> {
        const result = await openClipDialog(track, clip, false, this.context);
        if (result === null) {
            return;
        }
        this.session.edit((next) => {
            const own = next.tracks.find((item) => item.id === track.id);
            if (own === undefined) {
                return;
            }
            own.clips = result.action === 'delete'
                ? own.clips.filter((item) => item.id !== clip.id)
                : own.clips.map((item) => item.id === clip.id ? result.clip : item).sort((a, b) => a.start - b.start);
            if (result.action === 'save') {
                next.length = Math.max(next.length, result.clip.start + result.clip.duration);
            }
        });
    }

    private async headerAction(track: Track, action: HeaderAction): Promise<void> {
        if (action === 'settings') {
            const result = await openTrackDialog(track, this.session.timeline, this.context);
            if (result === null) {
                return;
            }
            this.session.edit((next) => {
                if (result.action === 'delete') {
                    // The tracks of a deleted folder go to its parent
                    next.tracks.forEach((item) => {
                        if (item.parent === track.id) {
                            item.parent = track.parent;
                        }
                    });
                    next.tracks = next.tracks.filter((item) => item.id !== track.id);
                } else {
                    next.tracks = next.tracks.map((item) => item.id === track.id ? result.track : item);
                }
            });
            return;
        }
        this.session.edit((next) => {
            const own = next.tracks.find((item) => item.id === track.id);
            if (own === undefined) {
                return;
            }
            if (action === 'mute') {
                own.muted = !own.muted;
            } else {
                own.collapsed = !own.collapsed;
            }
        });
    }

    /** A track is inside a folder, at any depth */
    private isInside(track: Track, folder: Track): boolean {
        const timeline = this.session.timeline;
        let current: Track | undefined = track;
        while (current !== undefined && current.parent !== null) {
            if (current.parent === folder.id) {
                return true;
            }
            current = timeline.tracks.find((item) => item.id === current?.parent);
        }
        return false;
    }

    /** A track can be dropped into a folder that is not itself or one of its tracks */
    private canNest(target: Track | undefined, dragged: Track | undefined): boolean {
        return target !== undefined && dragged !== undefined && target.kind === 'folder' && target.id !== dragged.id && !this.isInside(target, dragged);
    }

    /**
     * Moves a dragged track: into a folder (at its end), or before the track
     * it lands on, in the same folder as that track.
     */
    private moveTrack(drop: SortableDrop): void {
        const dragged = this.shown[drop.from];
        if (dragged === undefined) {
            return;
        }
        const folder = drop.into === null ? null : this.shown[drop.into];
        const rest = this.shown.filter((track) => track.id !== dragged.id);
        const before = folder === null ? rest[drop.to] ?? null : null;
        // A folder never lands among its own tracks
        if (before !== null && dragged.kind === 'folder' && this.isInside(before, dragged)) {
            return;
        }
        this.session.edit((timeline) => {
            const own = timeline.tracks.find((track) => track.id === dragged.id);
            if (own === undefined) {
                return;
            }
            timeline.tracks = timeline.tracks.filter((track) => track.id !== own.id);
            if (folder !== null) {
                own.parent = folder.id;
                timeline.tracks.push(own);
                const target = timeline.tracks.find((track) => track.id === folder.id);
                if (target !== undefined) {
                    target.collapsed = false;
                }
                return;
            }
            const next = before === null ? -1 : timeline.tracks.findIndex((track) => track.id === before.id);
            own.parent = before === null ? null : before.parent;
            if (next < 0) {
                timeline.tracks.push(own);
            } else {
                timeline.tracks.splice(next, 0, own);
            }
        });
    }

    private drawAutomation(lane: HTMLDivElement, track: Track): void {
        const height = track.height;
        const width = this.session.timeline.length * this.pps;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('timeline-automation');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        const pad = 8;
        const y = (value: number): number => pad + (1 - value) * (height - pad * 2);
        const points = track.points;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const coordinates = points.length === 0 ? [] : [[0, points[0][1]], ...points, [this.session.timeline.length, points[points.length - 1][1]]];
        line.setAttribute('points', coordinates.map(([time, value]) => `${time * this.pps},${y(value)}`).join(' '));
        line.classList.add('timeline-automation__line');
        svg.append(line);
        points.forEach(([time, value], index) => {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', String(time * this.pps));
            dot.setAttribute('cy', String(y(value)));
            dot.setAttribute('r', '5');
            dot.classList.add('timeline-automation__point');
            dot.dataset.index = String(index);
            svg.append(dot);
        });
        lane.append(svg);

        const valueAt = (clientY: number): number => {
            const rect = lane.getBoundingClientRect();
            return Math.max(0, Math.min(1, 1 - (clientY - rect.top - pad) / (rect.height - pad * 2)));
        };
        this.listen(lane, 'pointerdown', (event) => {
            const dot = (event.target as Element).closest('.timeline-automation__point') as SVGCircleElement | null;
            if (dot === null) {
                // A new point where the lane is pressed
                const time = snapTime(this.timeAt(event.clientX), this.step());
                const value = valueAt(event.clientY);
                this.session.edit((next) => {
                    const own = next.tracks.find((item) => item.id === track.id);
                    own?.points.push([time, value]);
                    own?.points.sort((a, b) => a[0] - b[0]);
                });
                return;
            }
            const index = Number(dot.dataset.index);
            lane.setPointerCapture(event.pointerId);
            let latest: [number, number] = points[index];
            const move = (moveEvent: PointerEvent): void => {
                latest = [snapTime(this.timeAt(moveEvent.clientX), this.step()), valueAt(moveEvent.clientY)];
                dot.setAttribute('cx', String(latest[0] * this.pps));
                dot.setAttribute('cy', String(y(latest[1])));
            };
            const up = (): void => {
                lane.removeEventListener('pointermove', move);
                lane.removeEventListener('pointerup', up);
                this.session.edit((next) => {
                    const own = next.tracks.find((item) => item.id === track.id);
                    if (own !== undefined && own.points[index] !== undefined) {
                        own.points[index] = latest;
                        own.points.sort((a, b) => a[0] - b[0]);
                    }
                });
            };
            lane.addEventListener('pointermove', move);
            lane.addEventListener('pointerup', up);
        });
        this.listen(lane, 'dblclick', (event) => {
            const dot = (event.target as Element).closest('.timeline-automation__point') as SVGCircleElement | null;
            if (dot !== null) {
                const index = Number(dot.dataset.index);
                this.session.edit((next) => {
                    const own = next.tracks.find((item) => item.id === track.id);
                    own?.points.splice(index, 1);
                });
            }
        });
    }
}
