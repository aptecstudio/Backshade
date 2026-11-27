/**
 * Header of a track: color, name and what it drives (output, layer,
 * target), arm for recording, mute and, for folders, open or closed. Pressing the name opens
 * the settings of the track; dragging the header moves the track.
 */

import { Component, Emitter, SquareKey, create, type Unsubscribe } from '../../../framework/ts/index.js';
import type { Track } from '../../../shared/timeline/timeline.js';
import { t } from '../../i18n/i18n.js';

/** Action asked by a header */
export type HeaderAction = 'settings' | 'arm' | 'mute' | 'collapse';

export class TrackHeader extends Component<HTMLDivElement> {
    private readonly actions = new Emitter<HeaderAction>();

    /**
     * @param depth - Number of folders around the track
     * @param summary - What the track drives
     */
    constructor(track: Track, number: number, depth: number, summary: string) {
        const name = create('button', {
            classes: ['track-header__name'],
            attributes: { type: 'button', title: t('timeline.trackSettings'), 'data-sortable-handle': '' },
            children: [
                create('span', { classes: ['track-header__title'], text: `${number} ${track.name}` }),
                create('span', { classes: ['track-header__summary'], text: summary })
            ]
        });
        super(create('div', { classes: ['track-header', `track-header--${track.kind}`], children: [create('span', { classes: ['track-header__color'] }), name] }));
        this.element.style.setProperty('--track-depth', String(depth));
        this.listen(name, 'click', () => this.actions.emit('settings'));

        const keys = create('div', { classes: ['track-header__keys'] });
        const key = (action: HeaderAction, options: { label: string; icon?: 'chevron-down' | 'chevron-right'; text?: string; on?: boolean }): void => {
            // Arm in the red of recording, mute in orange, folders in the solo color
            const variant = action === 'arm' ? 'select' : action === 'mute' ? 'flash' : 'solo';
            const square = new SquareKey({ variant, label: options.label, icon: options.icon, text: options.text, on: options.on });
            square.onPress(() => this.actions.emit(action));
            square.mount(keys);
            this.track(() => square.destroy());
        };
        if (track.kind === 'folder') {
            key('collapse', { label: track.collapsed ? t('timeline.openFolder') : t('timeline.closeFolder'), icon: track.collapsed ? 'chevron-right' : 'chevron-down' });
        } else if (track.kind !== 'mixer') {
            key('arm', { label: t('timeline.arm'), text: 'r', on: track.armed });
        }
        key('mute', { label: t('timeline.mute'), text: 'm', on: track.muted });
        this.element.append(keys);
        this.track(() => this.actions.clear());
    }

    onAction(listener: (action: HeaderAction) => void): Unsubscribe {
        return this.actions.subscribe(listener);
    }
}
