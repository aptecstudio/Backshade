/**
 * Media section: audio, video and image files of the open show, copied
 * into the media/ folder of the show. It updates with the media.changed event.
 */

import { icon, Key, Label, Panel, Spacer, Stack, type Component, type IconName } from '../../../framework/ts/index.js';
import type { MediaKind } from '../../../shared/show/media-kinds.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { formatSize } from '../../i18n/format-size.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { markEdit } from '../../show/edit-access.js';
import { engine } from '../../transport/engine.js';

const KIND_ICONS: Record<MediaKind, IconName> = { audio: 'music', video: 'video', image: 'image' };
const KIND_LABELS: Record<MediaKind, TextKey> = { audio: 'media.kindAudio', video: 'media.kindVideo', image: 'media.kindImage' };

export class MediaSection extends Panel {
    private readonly summary: Label;
    private rows: Component[] = [];

    constructor() {
        super({ title: t('media.title'), classes: ['media-section'] });

        const importKey = new Key({ label: t('media.import'), icon: 'folder-open' });
        importKey.onPress(() => void this.importMedia());
        markEdit(importKey);
        this.summary = new Label({ text: '', tone: 'secondary', size: 'small' });
        this.append(new Stack({ direction: 'row', gap: 2, align: 'center', children: [importKey, this.summary] }));

        void this.load();
        this.track(engine().on('media.changed', () => void this.load()));
    }

    private async importMedia(): Promise<void> {
        try {
            await engine().request('media.import');
        } catch (error) {
            await showError(error);
        }
    }

    private async load(): Promise<void> {
        let items: MediaItem[];
        try {
            items = await engine().request('media.list');
        } catch (error) {
            await showError(error);
            return;
        }
        const total = items.reduce((sum, item) => sum + item.size, 0);
        this.summary.setText(items.length === 0 ? '' : t('media.count', { count: items.length, size: formatSize(total) }));

        this.rows.forEach((row) => row.destroy());
        this.rows = items.length === 0
            ? [new Label({ text: t('media.empty'), tone: 'secondary' })]
            : items.map((item) => this.row(item));
        this.append(...this.rows);
    }

    private row(item: MediaItem): Stack {
        const reveal = new Key({ label: t('media.reveal'), icon: 'folder-search', iconOnly: true });
        const remove = new Key({ label: t('media.delete'), icon: 'trash-2', iconOnly: true });
        reveal.onPress(() => void engine().request('media.reveal', { file: item.file }).catch(showError));
        remove.onPress(() => void this.remove(item));
        markEdit(remove);

        const row = new Stack({ direction: 'row', gap: 2, align: 'center', classes: ['media-row'] });
        row.element.prepend(icon(KIND_ICONS[item.kind], { classes: ['icon--large'] }));
        row.append(
            new Stack({
                gap: 1,
                classes: ['media-row__text'],
                children: [
                    new Label({ text: item.name, weight: 'medium' }),
                    new Label({ text: `${t(KIND_LABELS[item.kind])}, ${formatSize(item.size)}, ${item.file}`, tone: 'secondary', size: 'small' })
                ]
            }),
            new Spacer(),
            reveal,
            remove
        );
        return row;
    }

    private async remove(item: MediaItem): Promise<void> {
        const choice = await askChoice(t('media.deleteTitle'), t('media.deleteConfirm', { name: item.name }), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('media.delete'), destructive: true, primary: true }
        ]);
        if (choice !== 'delete') {
            return;
        }
        try {
            await engine().request('media.remove', { file: item.file });
        } catch (error) {
            await showError(error);
        }
    }
}
