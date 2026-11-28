/**
 * Fixture editor: general data, physical data, channels and modes of a
 * definition, saved into the show and, when asked, into the personal
 * library. The definition is checked before saving and the problems are
 * listed; closing with unsaved changes asks first.
 */

import { Dialog, Key, Stack } from '../../../framework/ts/index.js';
import type { FixtureDefinition } from '../../../shared/fixtures/fixture-definition.js';
import { validateFixture } from '../../../shared/fixtures/validate-fixture.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { libraryCheckbox } from '../../dialogs/library-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { issueMessage } from '../fixture-text.js';
import { ChannelsPanel } from './channels-panel.js';
import { FixtureDraft } from './fixture-draft.js';
import { GeneralPanel } from './general-panel.js';
import { ModesPanel } from './modes-panel.js';
import { PhysicalPanel } from './physical-panel.js';

// Problems shown at most, the first ones are enough to fix the definition
const MAX_ISSUES = 8;

/**
 * Opens the editor.
 * @param source - Definition to start from, or null for a new fixture
 * @param previousId - Identifier of the user definition being edited; without it a new user definition is saved
 */
export function openFixtureEditor(source: FixtureDefinition | null, previousId?: string): void {
    const title = source === null ? t('fixtureEditor.newTitle') : t('fixtureEditor.editTitle');
    const dialog = new Dialog({ title, size: 'large' });
    const draft = new FixtureDraft(source);
    const general = new GeneralPanel(draft);
    dialog.append(new Stack({
        gap: 12,
        classes: ['fixture-editor'],
        children: [general, new ChannelsPanel(draft), new ModesPanel(draft), new PhysicalPanel(draft)]
    }));

    const close = (): void => {
        draft.dispose();
        dialog.close();
    };

    const cancel = async (): Promise<void> => {
        if (!draft.changed) {
            close();
            return;
        }
        const choice = await askChoice(t('fixtureEditor.discardTitle'), t('fixtureEditor.discardMessage'), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'discard', label: t('fixtureEditor.discard'), destructive: true, primary: true }
        ]);
        if (choice === 'discard') {
            close();
        }
    };

    const save = async (): Promise<void> => {
        const result = validateFixture(draft.definition);
        if (!result.ok) {
            const messages = result.issues.slice(0, MAX_ISSUES).map(issueMessage).join('\n');
            await askChoice(t('fixtureEditor.cannotSave'), messages, [{ id: 'ok', label: t('common.ok'), primary: true }]);
            return;
        }
        try {
            await engine().request('fixtures.save', { definition: result.definition, previousId, library: keep.checked });
            close();
        } catch (error) {
            await showError(error);
        }
    };

    const keep = libraryCheckbox();
    const cancelKey = new Key({ label: t('common.cancel') });
    const saveKey = new Key({ label: t('fixtureEditor.save'), state: 'active' });
    cancelKey.onPress(() => void cancel());
    saveKey.onPress(() => void save());
    dialog.addActions(keep, cancelKey, saveKey);
    dialog.onCancel(() => void cancel());
    dialog.open();
    general.focus();
}
