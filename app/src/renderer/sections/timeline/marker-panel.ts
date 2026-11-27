/**
 * Markers panel of the timeline, beside the editor: the next stop marker,
 * the Go key (playback continues, in go mode up to the next stop) and the
 * Back key (previous marker), and the list of the markers in time order. A
 * row moves the playhead to its marker, its key opens the marker. The
 * marker passed last is shown as the current one, the next stop marker
 * with the armed bar.
 */

import { Emitter, Key, Label, ListItem, Panel, Stack, ValueDisplay, type Unsubscribe } from '../../../framework/ts/index.js';
import type { Marker, Timeline } from '../../../shared/timeline/timeline.js';
import { t } from '../../i18n/i18n.js';
import { timecode } from './timeline-time.js';

/** Commands of the panel */
export type MarkerPanelAction = { kind: 'go' } | { kind: 'back' } | { kind: 'locate'; time: number } | { kind: 'open'; id: string };

export class MarkerPanel extends Panel {
    private readonly actions = new Emitter<MarkerPanelAction>();
    private readonly next: ValueDisplay;
    private readonly list = new Stack({ classes: ['marker-panel__list'] });
    private readonly empty: Label;
    private rows: Array<{ marker: Marker; element: Stack }> = [];
    private markers: Marker[] = [];
    private fps = 25;
    /** Identifiers shown last, to change the rows only when they change */
    private shownCurrent: string | null | undefined;
    private shownNext: string | null | undefined;

    constructor() {
        super({ title: t('timeline.markers'), classes: ['marker-panel'] });
        this.next = new ValueDisplay({ caption: t('timeline.nextStop'), value: t('timeline.noStop') });
        const go = new Key({ label: t('cues.go'), icon: 'play', size: 'large' });
        const back = new Key({ label: t('cues.back'), icon: 'skip-back' });
        go.element.classList.add('marker-panel__go');
        back.element.classList.add('marker-panel__back');
        go.onPress(() => this.actions.emit({ kind: 'go' }));
        back.onPress(() => this.actions.emit({ kind: 'back' }));
        this.empty = new Label({ text: t('timeline.noMarkers'), tone: 'secondary', size: 'small' });
        this.append(new Stack({ gap: 2, children: [this.next, go, back, this.empty, this.list] }));
        this.track(() => this.actions.clear());
    }

    /** Go, Back, a row pressed or a marker to open */
    onAction(listener: (action: MarkerPanelAction) => void): Unsubscribe {
        return this.actions.subscribe(listener);
    }

    /**
     * Shows the markers of a timeline.
     * @param fps - Frames per second of the show timecode
     */
    setTimeline(timeline: Timeline, fps: number): void {
        this.markers = timeline.markers;
        this.fps = fps;
        this.rows.forEach((row) => row.element.destroy());
        this.rows = this.markers.map((marker) => {
            const stop = new Label({ text: marker.stop ? t('timeline.stop') : '', size: 'small' });
            stop.element.classList.add('marker-row__stop');
            const item = new ListItem({
                label: t('timeline.locateMarker', { name: marker.name }),
                classes: ['marker-row__item'],
                children: [new Label({ text: marker.name }), new Label({ text: timecode(marker.time, fps), tone: 'secondary', size: 'small' }), stop]
            });
            item.onPress(() => this.actions.emit({ kind: 'locate', time: marker.time }));
            const edit = new Key({ label: t('timeline.editMarker', { name: marker.name }), icon: 'pencil', iconOnly: true });
            edit.onPress(() => this.actions.emit({ kind: 'open', id: marker.id }));
            const element = new Stack({ direction: 'row', gap: 1, align: 'center', classes: ['marker-row'], children: [item, edit] });
            this.list.append(element);
            return { marker, element };
        });
        this.empty.element.hidden = this.rows.length > 0;
        this.shownCurrent = undefined;
        this.shownNext = undefined;
    }

    /**
     * Follows the playhead: current marker and next stop.
     * @param position - Playhead position in seconds
     */
    setPosition(position: number): void {
        // A marker just reached counts as passed (the playhead stops on it)
        const at = position + 0.005;
        const current = this.markers.filter((marker) => marker.time <= at).pop() ?? null;
        const next = this.markers.find((marker) => marker.stop && marker.time > at) ?? null;
        if (current?.id === this.shownCurrent && next?.id === this.shownNext) {
            return;
        }
        this.shownCurrent = current?.id ?? null;
        this.shownNext = next?.id ?? null;
        this.next.setValue(next === null ? t('timeline.noStop') : `${next.name}, ${timecode(next.time, this.fps)}`);
        for (const row of this.rows) {
            row.element.element.classList.toggle('marker-row--current', row.marker.id === this.shownCurrent);
            row.element.element.classList.toggle('marker-row--next', row.marker.id === this.shownNext);
        }
    }
}
