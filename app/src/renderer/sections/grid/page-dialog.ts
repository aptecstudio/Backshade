/**
 * Adds or changes a page of the grid: name, columns and rows; an existing
 * page can be deleted. Widgets that no longer fit are moved inside.
 */

import { Dialog, Key, NumberField, Stack, TextField } from '../../../framework/ts/index.js';
import { GRID_LIMITS, type GridPage } from '../../../shared/grid/grid.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { t } from '../../i18n/i18n.js';

/** Result of the dialog: the page data, or delete */
export type PageDialogResult = { action: 'save'; name: string; columns: number; rows: number } | { action: 'delete' };

/**
 * Opens the dialog.
 * @param page - Page to change, or null for a new one
 */
export function openPageDialog(page: GridPage | null, defaultName: string): Promise<PageDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: page === null ? t('grid.addPage') : t('grid.pageSettings') });
        const name = new TextField({ label: t('patch.name'), value: page?.name ?? defaultName, maxLength: 60 });
        const columns = new NumberField({ label: t('grid.columns'), value: page?.columns ?? 12, min: GRID_LIMITS.columns.min, max: GRID_LIMITS.columns.max });
        const rows = new NumberField({ label: t('grid.rows'), value: page?.rows ?? 8, min: GRID_LIMITS.rows.min, max: GRID_LIMITS.rows.max });
        dialog.append(name, new Stack({ direction: 'row', gap: 2, children: [columns, rows] }));
        const finish = (result: PageDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: page === null ? t('grid.add') : t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish({ action: 'save', name: name.value.trim() || defaultName, columns: columns.value, rows: rows.value }));
        if (page !== null) {
            const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
            remove.onPress(() => void askChoice(t('grid.deletePageTitle'), t('grid.deletePageConfirm', { name: page.name }), [
                { id: 'cancel', label: t('common.cancel') },
                { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
            ]).then((choice) => {
                if (choice === 'delete') {
                    finish({ action: 'delete' });
                }
            }));
            dialog.addActions(remove);
        }
        dialog.addActions(cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
