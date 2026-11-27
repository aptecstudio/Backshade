/**
 * Row of an entry: selection key, icon of the kind, name and details.
 * Pressing the row activates the entry; the key selects it.
 */

import { Component, create, icon, Label, ListItem, SquareKey, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import type { FileEntry } from '../../shared/files/file-entry.js';
import { t } from '../i18n/i18n.js';
import { fileDate, fileSize } from './file-format.js';
import { KIND_ICONS, KIND_LABELS } from './file-kinds.js';

export class FileRow extends Component<HTMLDivElement> {
    readonly entry: FileEntry;
    private readonly check: SquareKey;
    private readonly item: ListItem;

    /**
     * @param muted - The entry cannot be chosen here
     */
    constructor(entry: FileEntry, muted: boolean) {
        super(create('div', { classes: ['file-row'] }));
        this.entry = entry;
        this.check = new SquareKey({ variant: 'select', label: t('files.select', { name: entry.name }), icon: 'circle' });
        const details = entry.size > 0 || !['folder', 'show'].includes(entry.kind)
            ? `${t(KIND_LABELS[entry.kind])}, ${fileSize(entry.size)}, ${fileDate(entry.modifiedAt)}`
            : `${t(KIND_LABELS[entry.kind])}, ${fileDate(entry.modifiedAt)}`;
        this.item = new ListItem({
            muted,
            children: [new Stack({
                classes: ['file-row__text'],
                children: [new Label({ text: entry.name }), new Label({ text: details, size: 'small', tone: 'secondary' })]
            })]
        });
        this.item.element.prepend(icon(KIND_ICONS[entry.kind], { classes: ['icon--large'] }));
        this.append(this.check, this.item);
    }

    setSelected(selected: boolean): void {
        this.check.setOn(selected);
        this.item.setSelected(selected);
    }

    /** The row was pressed */
    onActivate(listener: () => void): Unsubscribe {
        return this.item.onPress(listener);
    }

    /** The selection key was pressed */
    onCheck(listener: () => void): Unsubscribe {
        return this.check.onPress(listener);
    }
}
