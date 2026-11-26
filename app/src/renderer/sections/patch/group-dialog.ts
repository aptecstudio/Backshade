/**
 * Fixture groups of the show: the list of groups with their members, and
 * the editor of a group (number, name, fixtures chosen with keys, in the
 * order they are pressed), with delete.
 */

import { Dialog, Key, Label, ListItem, NumberField, Stack, TextField } from '../../../framework/ts/index.js';
import { MAX_GROUP_NUMBER, type FixtureGroup } from '../../../shared/patch/groups.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { categoryIcon } from '../../fixtures/fixture-icons.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

/**
 * Opens the editor of a group.
 * @param group - Group to change, or null for a new one
 * @param fixtures - Patched fixtures
 * @param groups - All the groups, to propose a free number
 */
export function openGroupEditor(group: FixtureGroup | null, fixtures: readonly PatchEntry[], groups: readonly FixtureGroup[]): void {
    const used = new Set(groups.map((item) => item.number));
    let free = 1;
    while (used.has(free)) {
        free++;
    }
    const dialog = new Dialog({ title: group === null ? t('groups.newTitle') : t('groups.editTitle'), size: 'wide' });
    const name = new TextField({ label: t('patch.name'), value: group?.name ?? t('groups.defaultName'), maxLength: 100 });
    const number = new NumberField({ label: t('patch.columnNumber'), value: group?.number ?? free, min: 1, max: MAX_GROUP_NUMBER });
    const members = [...(group?.fixtures ?? [])];
    const count = new Label({ text: '', tone: 'secondary', size: 'small' });
    const keys = new Map<string, Key>();
    const render = (): void => {
        for (const [id, key] of keys) {
            key.setArmed(members.includes(id));
        }
        count.setText(t('groups.members', { count: members.length }));
    };
    const sorted = [...fixtures].sort((a, b) => a.number - b.number);
    const keyRow = new Stack({
        direction: 'row',
        gap: 1,
        wrap: true,
        classes: ['group-editor__fixtures'],
        children: sorted.map((entry) => {
            const key = new Key({ label: `${entry.number} ${entry.name}`, icon: categoryIcon(entry.category) });
            key.onPress(() => {
                const at = members.indexOf(entry.id);
                if (at >= 0) {
                    members.splice(at, 1);
                } else {
                    members.push(entry.id);
                }
                render();
            });
            keys.set(entry.id, key);
            return key;
        })
    });
    dialog.append(new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, number] }), count, keyRow);
    render();

    const apply = async (): Promise<void> => {
        try {
            await engine().request('patch.saveGroup', {
                ...(group === null ? {} : { id: group.id }),
                number: number.value,
                name: name.value,
                fixtures: [...members]
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    if (group !== null) {
        const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
        remove.onPress(() => void askChoice(t('groups.deleteTitle'), t('groups.deleteConfirm', { name: group.name }), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
        ]).then((choice) => {
            if (choice === 'delete') {
                void engine().request('patch.deleteGroup', { id: group.id }).then(() => dialog.close()).catch(showError);
            }
        }));
        dialog.addActions(remove);
    }
    dialog.addActions(cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}

/**
 * Opens the list of the groups of the show.
 */
export async function openGroups(): Promise<void> {
    let fixtures: PatchEntry[];
    let groups: FixtureGroup[];
    try {
        [fixtures, groups] = await Promise.all([engine().request('patch.get'), engine().request('patch.getGroups')]);
    } catch (error) {
        await showError(error);
        return;
    }
    const dialog = new Dialog({ title: t('groups.title') });
    const rows = groups.map((group) => {
        const item = new ListItem({
            label: `${group.number} ${group.name}`,
            classes: ['group-list__row'],
            children: [
                new Label({ text: String(group.number), weight: 'medium' }),
                new Label({ text: group.name }),
                new Label({ text: t('groups.members', { count: group.fixtures.length }), tone: 'secondary', size: 'small' })
            ]
        });
        item.onPress(() => {
            dialog.close();
            openGroupEditor(group, fixtures, groups);
        });
        return item;
    });
    dialog.append(
        groups.length === 0 ? new Label({ text: t('groups.empty'), tone: 'secondary', size: 'small' }) : new Stack({ classes: ['group-list'], children: rows })
    );
    const add = new Key({ label: t('groups.add'), icon: 'plus' });
    const close = new Key({ label: t('common.close'), state: 'active' });
    add.onPress(() => {
        dialog.close();
        openGroupEditor(null, fixtures, groups);
    });
    close.onPress(() => dialog.close());
    add.setDisabled(fixtures.length === 0);
    dialog.addActions(add, close);
    dialog.onCancel(() => dialog.close());
    dialog.open();
}
