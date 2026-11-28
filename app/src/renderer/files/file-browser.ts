/**
 * Internal file manager: the places (home, external drives, open show), the
 * path of the folder, its entries and the actions on the selected ones (new
 * folder, rename, copy, cut and paste, move to the trash, delete, and from
 * a remote client send files of its device). The actions that change files
 * are shown only to who may do them.
 */

import { Emitter, icon, Key, Label, ListItem, Stack, type IconName, type Unsubscribe } from '../../framework/ts/index.js';
import type { FileEntry, FileRoot, FolderContent } from '../../shared/files/file-entry.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { canManageShow } from '../show/operator-store.js';
import { ANY_ACCEPT, pickDeviceFiles } from '../remote/device-files.js';
import { sendFiles } from '../remote/send-files.js';
import { engine, isRemote } from '../transport/engine.js';
import { askDelete, askName } from './file-actions.js';
import { clipboard, setClipboard } from './file-clipboard.js';
import { FileRow } from './file-row.js';

/** How the browser chooses entries */
export interface BrowserOptions {
    /** Entry that can be chosen; the others are muted (folders still open) */
    accepts: (entry: FileEntry) => boolean;
    /** Several entries can be selected */
    multiple: boolean;
    /** Pressing the row of a folder selects it instead of opening it */
    picksFolder?: (entry: FileEntry) => boolean;
}

// Places that are folders and places that are drives
const PLACE_ICONS: Readonly<Record<FileRoot['kind'], IconName>> = { home: 'folder', drive: 'hard-drive', show: 'clapperboard' };

const isFolder = (entry: FileEntry): boolean => entry.kind === 'folder' || entry.kind === 'show';

export class FileBrowser extends Stack {
    private readonly options: BrowserOptions;
    private readonly places = new Stack({ gap: 8, classes: ['file-browser__places'] });
    private readonly pathLabel = new Label({ text: '', size: 'small', tone: 'secondary' });
    private readonly list = new Stack({ classes: ['file-browser__list'] });
    private readonly empty = new Label({ text: t('files.emptyFolder'), tone: 'secondary', size: 'small' });
    private readonly up: Key;
    private readonly selectionKeys: Key[];
    private readonly paste: Key;
    private readonly send: Key;
    private readonly changes = new Emitter<void>();
    private rows: FileRow[] = [];
    private placeItems: Array<{ root: FileRoot; item: ListItem }> = [];
    private content: FolderContent | null = null;
    private readonly selection = new Set<string>();
    private busy = false;

    constructor(options: BrowserOptions) {
        super({ gap: 12, classes: ['file-browser'] });
        this.options = options;

        const key = (label: string, icon: IconName, action: () => void, iconOnly = false, armed = false): Key => {
            const result = new Key({ label, icon, iconOnly, armed });
            result.onPress(action);
            return result;
        };
        this.up = key(t('files.up'), 'arrow-up', () => void this.openFolder(this.content?.parent ?? ''), true);
        const newFolder = key(t('files.newFolder'), 'folder-plus', () => void this.newFolder());
        const rename = key(t('files.rename'), 'pencil', () => void this.rename());
        const copy = key(t('files.copy'), 'copy', () => this.toClipboard('copy'));
        const cut = key(t('files.cut'), 'scissors', () => this.toClipboard('move'));
        this.paste = key(t('files.paste'), 'clipboard-paste', () => void this.pasteHere());
        const trash = key(t('files.trash'), 'trash-2', () => void this.run('fs.trash'));
        const remove = key(t('files.delete'), 'x', () => void this.deleteSelected(), false, true);
        this.selectionKeys = [rename, copy, cut, trash, remove];

        this.send = key(t('upload.fromDevice'), 'upload', () => void this.sendHere());
        const manage = canManageShow();
        // A remote client sends files of its own device into the folder shown
        this.send.element.hidden = !isRemote() || !manage;
        const toolbar = new Stack({
            direction: 'row',
            gap: 8,
            wrap: true,
            classes: ['file-browser__toolbar'],
            children: manage ? [this.up, newFolder, this.send, rename, copy, cut, this.paste, trash, remove] : [this.up, newFolder]
        });
        this.append(
            this.places,
            new Stack({ gap: 8, classes: ['file-browser__main'], children: [toolbar, this.pathLabel, this.empty, this.list] })
        );
        this.track(() => this.changes.clear());
        this.render();
    }

    /** Folder shown, null before it is read */
    get folder(): string | null {
        return this.content?.path ?? null;
    }

    /** Names of the entries of the folder shown */
    get entries(): readonly FileEntry[] {
        return this.content?.entries ?? [];
    }

    /** Selected entries that can be chosen */
    get chosen(): FileEntry[] {
        return this.entries.filter((entry) => this.selection.has(entry.path) && this.options.accepts(entry));
    }

    /** The folder or the selection changed */
    onChange(listener: () => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Reads the places and opens a folder; a missing one (for example the
     * default folder before the first show) opens its nearest existing parent,
     * or the home folder.
     */
    async open(start: string): Promise<void> {
        try {
            const roots = await engine().request('fs.roots');
            this.renderPlaces(roots);
            let folder = start;
            while (folder.length > 1) {
                if (await this.read(folder)) {
                    return;
                }
                folder = folder.slice(0, Math.max(folder.lastIndexOf('/'), folder.lastIndexOf('\\')));
            }
            await this.openFolder(roots[0].path);
        } catch (error) {
            await showError(error);
        }
    }

    private async openFolder(folder: string): Promise<void> {
        if (folder !== '' && !await this.read(folder)) {
            await showError(new Error(t('errors.fileNotFound')));
        }
    }

    /** Shows a folder; false when it cannot be read */
    private async read(folder: string): Promise<boolean> {
        try {
            this.content = await engine().request('fs.list', { path: folder });
        } catch {
            return false;
        }
        this.selection.clear();
        this.renderEntries();
        return true;
    }

    private async reload(): Promise<void> {
        if (this.content !== null) {
            await this.openFolder(this.content.path);
        }
    }

    private renderPlaces(roots: FileRoot[]): void {
        this.placeItems.forEach(({ item }) => item.destroy());
        this.placeItems = roots.map((root) => {
            const item = new ListItem({ children: [new Label({ text: root.kind === 'home' ? t('files.home') : root.name })] });
            item.element.prepend(icon(PLACE_ICONS[root.kind], { classes: ['icon--large'] }));
            item.onPress(() => void this.openFolder(root.path));
            return { root, item };
        });
        this.places.append(...this.placeItems.map(({ item }) => item));
    }

    private renderEntries(): void {
        this.rows.forEach((row) => row.destroy());
        this.rows = this.entries.map((entry) => {
            const row = new FileRow(entry, !isFolder(entry) && !this.options.accepts(entry));
            row.onCheck(() => this.toggle(entry));
            row.onActivate(() => {
                if (isFolder(entry) && this.options.picksFolder?.(entry) !== true) {
                    void this.openFolder(entry.path);
                } else if (this.options.accepts(entry)) {
                    this.pick(entry);
                }
            });
            return row;
        });
        this.list.append(...this.rows);
        this.list.element.scrollTop = 0;
        this.render();
    }

    /** Selection key: adds or removes the entry */
    private toggle(entry: FileEntry): void {
        if (!this.selection.delete(entry.path)) {
            this.selection.add(entry.path);
        }
        this.render();
    }

    /** Row press: chooses the entry, alone unless several can be chosen */
    private pick(entry: FileEntry): void {
        if (this.options.multiple) {
            this.toggle(entry);
            return;
        }
        this.selection.clear();
        this.selection.add(entry.path);
        this.render();
    }

    private render(): void {
        this.pathLabel.setText(this.content?.path ?? '');
        this.empty.element.hidden = this.content === null || this.entries.length > 0;
        for (const row of this.rows) {
            row.setSelected(this.selection.has(row.entry.path));
        }
        for (const { root, item } of this.placeItems) {
            item.setSelected(this.content !== null && this.content.path.startsWith(root.path));
        }
        this.up.setDisabled(this.busy || this.content?.parent === null);
        this.send.setDisabled(this.busy || this.content === null);
        const [rename, ...others] = this.selectionKeys;
        rename.setDisabled(this.busy || this.selection.size !== 1);
        others.forEach((item) => item.setDisabled(this.busy || this.selection.size === 0));
        this.paste.setDisabled(this.busy || clipboard() === null);
        this.changes.emit();
    }

    private selected(): FileEntry[] {
        return this.entries.filter((entry) => this.selection.has(entry.path));
    }

    /** Runs a change, then reads the folder again */
    private async change(operation: () => Promise<unknown>): Promise<void> {
        this.busy = true;
        this.render();
        try {
            await operation();
        } catch (error) {
            await showError(error);
        }
        this.busy = false;
        await this.reload();
    }

    private async newFolder(): Promise<void> {
        const parent = this.folder;
        if (parent === null) {
            return;
        }
        const name = await askName(t('files.newFolder'), t('files.newFolderName'));
        if (name !== null) {
            await this.change(() => engine().request('fs.createFolder', { parent, name }));
        }
    }

    private async sendHere(): Promise<void> {
        const folder = this.folder;
        if (folder === null) {
            return;
        }
        const files = await pickDeviceFiles(ANY_ACCEPT);
        if (await sendFiles(files, (file) => engine().request('upload.file', { ...file, folder }))) {
            await this.reload();
        }
    }

    private async rename(): Promise<void> {
        const [entry] = this.selected();
        if (entry === undefined) {
            return;
        }
        const name = await askName(t('files.rename'), entry.name);
        if (name !== null && name !== entry.name) {
            await this.change(() => engine().request('fs.rename', { path: entry.path, name }));
        }
    }

    private toClipboard(mode: 'copy' | 'move'): void {
        setClipboard({ mode, paths: this.selected().map((entry) => entry.path) });
        this.render();
    }

    private async pasteHere(): Promise<void> {
        const target = this.folder;
        const content = clipboard();
        if (target === null || content === null) {
            return;
        }
        await this.change(async () => {
            await engine().request(content.mode === 'copy' ? 'fs.copy' : 'fs.move', { paths: content.paths, target });
            if (content.mode === 'move') {
                setClipboard(null);
            }
        });
    }

    private async run(method: 'fs.trash' | 'fs.delete'): Promise<void> {
        const paths = this.selected().map((entry) => entry.path);
        await this.change(() => engine().request(method, { paths }));
    }

    private async deleteSelected(): Promise<void> {
        const entries = this.selected();
        if (entries.length > 0 && await askDelete(entries.map((entry) => entry.name))) {
            await this.run('fs.delete');
        }
    }
}
