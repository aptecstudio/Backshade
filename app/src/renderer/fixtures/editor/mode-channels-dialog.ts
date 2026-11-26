/**
 * Fixture editor: channels of a mode in DMX order. Available channels
 * are added with one press; channels in the mode can be moved or removed.
 * Returns the channel keys, or null if cancelled.
 */

import { Dialog, Key, Label, ListItem, Panel, Spacer, Stack, makeSortable } from '../../../framework/ts/index.js';
import type { FixtureChannel } from '../../../shared/fixtures/fixture-definition.js';
import { t } from '../../i18n/i18n.js';
import { attributeLabel } from '../fixture-text.js';

function channelText(channel: FixtureChannel): Stack {
    return new Stack({
        gap: 1,
        classes: ['mode-channels__text'],
        children: [
            new Label({ text: channel.name, weight: 'medium' }),
            new Label({ text: attributeLabel(channel.attribute), tone: 'secondary', size: 'small' })
        ]
    });
}

/**
 * Opens the editor of the channels of a mode.
 */
export function editModeChannels(modeName: string, channels: readonly FixtureChannel[], current: readonly string[]): Promise<string[] | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('fixtureEditor.modeTitle', { name: modeName }), size: 'wide' });
        const byKey = new Map(channels.map((channel) => [channel.key, channel]));
        const working = current.filter((key) => byKey.has(key));

        const available = new Panel({ title: t('fixtureEditor.available'), classes: ['mode-channels__list'] });
        const inMode = new Panel({ title: t('fixtureEditor.inMode'), classes: ['mode-channels__list'] });
        let rows: Stack[] = [];

        const render = (): void => {
            rows.forEach((row) => row.destroy());
            rows = [];

            const free = channels.filter((channel) => !working.includes(channel.key));
            const freeRows = free.map((channel) => {
                const item = new ListItem({ label: `${t('fixtureEditor.addToMode')} ${channel.name}`, children: [channelText(channel)] });
                item.onPress(() => {
                    working.push(channel.key);
                    render();
                });
                return new Stack({ children: [item] });
            });
            available.append(...freeRows);

            const modeRows = working.map((key, index) => {
                const channel = byKey.get(key) as FixtureChannel;
                const remove = new Key({ label: t('fixtureEditor.removeFromMode'), icon: 'x', iconOnly: true });
                remove.onPress(() => {
                    working.splice(index, 1);
                    render();
                });
                return new Stack({
                    direction: 'row',
                    gap: 1,
                    align: 'center',
                    classes: ['mode-channels__row'],
                    children: [new Label({ text: String(index + 1), tone: 'secondary', size: 'small' }), channelText(channel), new Spacer(), remove]
                });
            });
            inMode.append(...modeRows);
            rows = [...freeRows, ...modeRows];
            ordered = modeRows;
        };
        let ordered: Stack[] = [];
        // Channels of the mode are reordered by dragging them; the listener lives on the panel
        makeSortable({
            container: inMode.element,
            items: () => ordered.map((row) => row.element),
            onDrop: ({ from, to }) => {
                const [moved] = working.splice(from, 1);
                working.splice(to, 0, moved);
                render();
            }
        });

        dialog.append(
            new Label({ text: t('fixtureEditor.modeHint'), tone: 'secondary', size: 'small' }),
            new Stack({ direction: 'row', gap: 2, align: 'start', classes: ['mode-channels'], children: [available, inMode] })
        );
        render();

        const finish = (result: string[] | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish([...working]));
        dialog.addActions(cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
