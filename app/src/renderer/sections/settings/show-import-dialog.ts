/**
 * Import from another show: choice of the source among the recent shows
 * or from a folder, PIN of an administrator of the source when needed,
 * then the items grouped by category, each with its toggle. The items an
 * item needs are imported with it and marked as needed; an item that
 * takes a place already used offers add, replace or skip.
 */

import { ChoiceKeys, Dialog, Key, Label, Spacer, Stack, type Component } from '../../../framework/ts/index.js';
import {
    IMPORT_CATEGORIES,
    IMPORT_KIND_CATEGORY,
    withRequirements,
    type ConflictResolution,
    type ImportCatalog,
    type ImportCategory,
    type ImportItem
} from '../../../shared/show/show-import.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { PinPad } from '../../dialogs/pin-pad.js';
import { errorMessage, showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { currentShow } from '../../show/show-store.js';
import { EngineRequestError } from '../../transport/engine-client.js';
import { pickShow } from '../../files/file-dialogs.js';
import { engine } from '../../transport/engine.js';

/** Controls of an item row */
interface ItemRow {
    item: ImportItem;
    toggle: Key;
    needed: Label;
    conflict: Stack;
}

export function openShowImportDialog(): void {
    const dialog = new Dialog({ title: t('showImport.title'), size: 'large' });
    let step: Component | null = null;
    let folder = '';
    let pin: string | undefined;
    let apply: (() => Promise<void>) | null = null;

    const show = (content: Component): void => {
        step?.destroy();
        step = content;
        dialog.append(content);
    };
    const cancel = new Key({ label: t('common.cancel') });
    const importKey = new Key({ label: t('showImport.import'), icon: 'package-open', state: 'active' });
    importKey.element.hidden = true;
    cancel.onPress(() => dialog.close());
    dialog.onCancel(() => dialog.close());
    importKey.onPress(() => void apply?.());
    dialog.addActions(cancel, importKey);

    /** Reads the catalog; a protected source asks for the PIN */
    const inspect = async (): Promise<void> => {
        try {
            const catalog = await engine().request('showImport.inspect', pin === undefined ? { folder } : { folder, pin });
            showCatalog(catalog);
        } catch (error) {
            const code = error instanceof EngineRequestError ? error.code : '';
            if (code === 'source-pin-required' || (code === 'wrong-pin' && pin !== undefined)) {
                showPin(code === 'wrong-pin' ? errorMessage(error) : t('showImport.pinHint'));
            } else {
                await showError(error);
            }
        }
    };

    const showPin = (message: string): void => {
        const pad = new PinPad(message, dialog.element);
        pad.onComplete((value) => {
            pin = value;
            pad.setBusy(true);
            void inspect();
        });
        show(new Stack({ gap: 12, classes: ['show-import__pin'], children: [pad] }));
    };

    const showSources = async (): Promise<void> => {
        const recent = (await engine().request('recent.list')).filter((item) => !item.missing && item.folder !== currentShow()?.folder);
        const choose = (path: string): void => {
            folder = path;
            pin = undefined;
            void inspect();
        };
        const keys = recent.map((item) => {
            const key = new Key({ label: item.name, icon: 'folder-open' });
            key.onPress(() => choose(item.folder));
            return key;
        });
        const browse = new Key({ label: t('showImport.chooseFolder'), icon: 'folder-search' });
        browse.onPress(() => void pickShow(t('showImport.chooseFolder')).then((path) => {
            if (path !== null) {
                choose(path);
            }
        }).catch(showError));
        show(new Stack({
            gap: 12,
            children: [
                new Label({ text: t('showImport.hint'), tone: 'secondary', size: 'small' }),
                new Label({ text: t('showImport.recent'), weight: 'medium' }),
                keys.length === 0 ? new Label({ text: t('showImport.noRecent'), tone: 'secondary', size: 'small' }) : new Stack({ gap: 8, children: keys }),
                new Stack({ direction: 'row', children: [browse] })
            ]
        }));
    };

    const showCatalog = (catalog: ImportCatalog): void => {
        const chosen = new Set<string>();
        const resolutions = new Map<string, ConflictResolution>();
        const expanded = new Set<ImportCategory>();
        const rows: ItemRow[] = [];
        const categories: Array<{ category: ImportCategory; toggle: Key; expand: Key; list: Stack; rows: ItemRow[] }> = [];
        const neededBy = (key: string): string[] => catalog.items.filter((item) => item.requires.includes(key)).map((item) => item.label);

        const update = (): void => {
            const effective = withRequirements(catalog.items, chosen);
            for (const row of rows) {
                const on = effective.has(row.item.key);
                row.toggle.setState(on ? 'active' : 'normal');
                const needed = on && !chosen.has(row.item.key);
                row.needed.element.hidden = !needed;
                if (needed) {
                    const users = neededBy(row.item.key).filter((_, index) => index < 3).join(', ');
                    row.needed.setText(t('showImport.neededBy', { items: users }));
                }
                row.conflict.element.hidden = !on || row.item.conflict === null;
            }
            for (const entry of categories) {
                const count = entry.rows.filter((row) => effective.has(row.item.key)).length;
                entry.toggle.setState(count > 0 ? 'active' : 'normal');
                entry.toggle.setLabel(t('showImport.categoryCount', { name: t(`showImport.categories.${entry.category}`), count, total: entry.rows.length }));
                const open = expanded.has(entry.category);
                entry.list.element.hidden = !open;
                entry.expand.setIcon(open ? 'chevron-down' : 'chevron-right');
            }
            importKey.setDisabled(effective.size === 0);
        };

        const children: Component[] = [new Label({ text: t('showImport.from', { name: catalog.showName }), weight: 'medium' })];
        for (const category of IMPORT_CATEGORIES) {
            const items = catalog.items.filter((item) => IMPORT_KIND_CATEGORY[item.kind] === category);
            if (items.length === 0) {
                continue;
            }
            const categoryRows = items.map((item): ItemRow => {
                const toggle = new Key({ label: item.label });
                toggle.onPress(() => {
                    if (chosen.has(item.key)) {
                        chosen.delete(item.key);
                    } else {
                        chosen.add(item.key);
                    }
                    update();
                });
                const needed = new Label({ text: '', tone: 'accent', size: 'small' });
                const conflict = new Stack({ direction: 'row', gap: 8, align: 'center', wrap: true, classes: ['show-import__conflict'] });
                if (item.conflict !== null) {
                    const choice = new ChoiceKeys<ConflictResolution>({
                        ariaLabel: t(`showImport.conflicts.${item.conflict.kind}`, { with: item.conflict.with }),
                        options: item.conflict.resolutions.map((resolution) => ({ value: resolution, label: t(`showImport.resolutions.${resolution}`) })),
                        value: 'add'
                    });
                    choice.onChange((resolution) => resolutions.set(item.key, resolution));
                    conflict.append(new Label({ text: t(`showImport.conflicts.${item.conflict.kind}`, { with: item.conflict.with }), tone: 'secondary', size: 'small' }), choice);
                }
                const row: ItemRow = { item, toggle, needed, conflict };
                rows.push(row);
                return row;
            });
            const list = new Stack({
                gap: 8,
                classes: ['show-import__items'],
                children: categoryRows.map((row) => new Stack({
                    gap: 8,
                    classes: ['show-import__item'],
                    children: [
                        new Stack({
                            direction: 'row',
                            gap: 8,
                            align: 'center',
                            wrap: true,
                            children: [
                                row.toggle,
                                new Label({ text: t(`showImport.kinds.${row.item.kind}`), tone: 'secondary', size: 'small' }),
                                new Label({ text: row.item.detail, tone: 'secondary', size: 'small' }),
                                row.needed
                            ]
                        }),
                        row.conflict
                    ]
                }))
            });
            const toggle = new Key({ label: '' });
            toggle.onPress(() => {
                const effective = withRequirements(catalog.items, chosen);
                const all = categoryRows.every((row) => effective.has(row.item.key));
                for (const row of categoryRows) {
                    if (all) {
                        chosen.delete(row.item.key);
                    } else {
                        chosen.add(row.item.key);
                    }
                }
                update();
            });
            const expand = new Key({ label: t('showImport.items'), icon: 'chevron-right', iconOnly: true });
            expand.onPress(() => {
                if (expanded.has(category)) {
                    expanded.delete(category);
                } else {
                    expanded.add(category);
                }
                update();
            });
            categories.push({ category, toggle, expand, list, rows: categoryRows });
            children.push(new Stack({
                gap: 8,
                classes: ['show-import__category'],
                children: [new Stack({ direction: 'row', gap: 8, align: 'center', children: [expand, toggle, new Spacer()] }), list]
            }));
        }
        if (categories.length === 0) {
            children.push(new Label({ text: t('showImport.empty'), tone: 'secondary' }));
        }

        apply = async (): Promise<void> => {
            const effective = withRequirements(catalog.items, chosen);
            try {
                const result = await engine().request('showImport.apply', {
                    folder,
                    ...(pin === undefined ? {} : { pin }),
                    items: [...effective].map((key) => ({ key, resolution: resolutions.get(key) ?? 'add' }))
                });
                dialog.close();
                await askChoice(t('showImport.title'), t('showImport.done', { imported: result.imported, skipped: result.skipped }), [
                    { id: 'ok', label: t('common.ok'), primary: true }
                ]);
            } catch (error) {
                await showError(error);
            }
        };
        importKey.element.hidden = false;
        show(new Stack({ gap: 12, children }));
        update();
    };

    dialog.open();
    void showSources().catch(showError);
}
