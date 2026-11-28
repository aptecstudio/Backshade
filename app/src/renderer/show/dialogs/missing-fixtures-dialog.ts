/**
 * Missing resources after opening a show: the fixture definitions used
 * by the patch and not found on this workstation. The user can import
 * the definitions or open the library; the list is checked again after
 * each import, and the dialog closes when nothing is missing.
 */

import { Dialog, Key, Label, Panel, Stack } from '../../../framework/ts/index.js';
import type { MissingFixture } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { importFixtures, openFixtureLibrary } from '../../fixtures/fixture-library-dialog.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

function item(missing: MissingFixture): Stack {
    return new Stack({
        gap: 8,
        classes: ['missing-fixture'],
        children: [
            new Label({ text: missing.definition, weight: 'medium' }),
            new Label({ text: t('missingFixtures.item', { count: missing.count, modes: missing.modes.join(', ') }), tone: 'secondary', size: 'small' })
        ]
    });
}

/**
 * Shows the missing definitions and waits until the user continues.
 */
export function showMissingFixtures(initial: readonly MissingFixture[]): Promise<void> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('missingFixtures.title'), size: 'wide' });
        const list = new Panel();
        const status = new Label({ text: '', tone: 'secondary', size: 'small' });
        let items: Stack[] = [];

        const render = (missing: readonly MissingFixture[]): void => {
            items.forEach((entry) => entry.destroy());
            items = missing.map(item);
            list.append(...items);
            list.element.hidden = missing.length === 0;
            status.setText(missing.length === 0 ? t('missingFixtures.allFound') : '');
        };

        const refresh = async (): Promise<void> => {
            try {
                render(await engine().request('patch.missingFixtures'));
            } catch (error) {
                await showError(error);
            }
        };

        dialog.append(new Label({ text: t('missingFixtures.message') }), list, status);
        render(initial);

        const importKey = new Key({ label: t('missingFixtures.import'), icon: 'package-open' });
        const library = new Key({ label: t('missingFixtures.openLibrary'), icon: 'layout-template' });
        const done = new Key({ label: t('missingFixtures.continue'), state: 'active' });
        importKey.onPress(() => void importFixtures().then((count) => count > 0 ? refresh() : undefined));
        library.onPress(() => openFixtureLibrary());
        // The library can add the definitions too
        const stop = engine().on('fixtures.changed', () => void refresh());

        const finish = (): void => {
            stop();
            dialog.close();
            resolve();
        };
        done.onPress(finish);
        dialog.onCancel(finish);
        dialog.addActions(importKey, library, done);
        dialog.open();
    });
}
