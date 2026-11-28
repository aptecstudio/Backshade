/**
 * Fixture library: list of the included and user definitions, with
 * the details of the selected one and the keys to create, edit, copy,
 * import, export and delete definitions. Included definitions are
 * read-only: editing one creates a user copy that replaces it.
 * The list updates with the fixtures.changed event.
 */

import { Dialog, Key, Label, Panel, Stack } from '../../framework/ts/index.js';
import type { FixtureSummary } from '../../shared/transport/engine-api.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { pickFiles, pickSaveFile } from '../files/file-dialogs.js';
import { engine } from '../transport/engine.js';
import { openFixtureEditor } from './editor/fixture-editor-dialog.js';
import { FixturePicker } from './fixture-picker.js';
import { categoryLabel, fixtureTitle, sourceLabel } from './fixture-text.js';

/**
 * Panel with the details and the keys of the selected definition.
 */
class FixtureDetails extends Panel {
    private readonly title = new Label({ text: '', weight: 'medium' });
    private readonly info = new Label({ text: '', tone: 'secondary', size: 'small' });
    private readonly modes = new Stack({ gap: 8 });
    private readonly hint = new Label({ text: t('fixtures.readOnly'), tone: 'secondary', size: 'small' });
    private readonly edit = new Key({ label: t('fixtures.edit'), icon: 'pencil' });
    private readonly exportKey = new Key({ label: t('fixtures.export'), icon: 'package' });
    private readonly remove = new Key({ label: t('fixtures.delete'), icon: 'trash-2' });
    private fixture: FixtureSummary | null = null;

    constructor() {
        super({ classes: ['fixture-details'] });
        this.append(
            this.title,
            this.info,
            this.modes,
            this.hint,
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [this.edit, this.exportKey, this.remove] })
        );
        this.edit.onPress(() => void this.editFixture());
        this.exportKey.onPress(() => void this.exportFixture());
        this.remove.onPress(() => void this.deleteFixture());
        this.show(null);
    }

    show(fixture: FixtureSummary | null): void {
        this.fixture = fixture;
        this.element.hidden = fixture === null;
        if (fixture === null) {
            return;
        }
        this.title.setText(fixtureTitle(fixture));
        this.info.setText(`${categoryLabel(fixture.category)}, ${sourceLabel(fixture)}`);
        this.modes.element.replaceChildren();
        this.modes.append(...fixture.modes.map((mode) =>
            new Label({ text: `${mode.name}: ${t('fixtures.channelCount', { count: mode.channelCount })}`, size: 'small' })));
        this.hint.element.hidden = fixture.source !== 'bundled';
        this.edit.setLabel(fixture.source === 'bundled' ? t('fixtures.editCopy') : t('fixtures.edit'));
        this.remove.element.hidden = fixture.source === 'bundled';
    }

    private async editFixture(): Promise<void> {
        const fixture = this.fixture;
        if (fixture === null) {
            return;
        }
        try {
            const record = await engine().request('fixtures.get', { id: fixture.id });
            // An included definition is edited as a new user definition that replaces it
            openFixtureEditor(record.definition, fixture.source === 'user' ? fixture.id : undefined);
        } catch (error) {
            await showError(error);
        }
    }

    private async exportFixture(): Promise<void> {
        if (this.fixture === null) {
            return;
        }
        try {
            const target = await pickSaveFile(t('fixtures.export'), this.fixture.id.replace('/', '-'), 'json');
            if (target !== null) {
                const file = await engine().request('fixtures.export', { id: this.fixture.id, file: target });
                await askChoice(t('fixtures.export'), t('fixtures.exported', { file }), [{ id: 'ok', label: t('common.ok'), primary: true }]);
            }
        } catch (error) {
            await showError(error);
        }
    }

    private async deleteFixture(): Promise<void> {
        const fixture = this.fixture;
        if (fixture === null) {
            return;
        }
        const name = fixtureTitle(fixture);
        const message = fixture.replacesBundled ? t('fixtures.deleteReplacingConfirm', { name }) : t('fixtures.deleteConfirm', { name });
        const choice = await askChoice(t('fixtures.deleteTitle'), message, [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('fixtures.delete'), destructive: true, primary: true }
        ]);
        if (choice !== 'delete') {
            return;
        }
        try {
            await engine().request('fixtures.delete', { id: fixture.id });
        } catch (error) {
            await showError(error);
        }
    }
}

/**
 * Lets the user import definition files; returns the number of imported definitions.
 */
export async function importFixtures(): Promise<number> {
    try {
        const files = await pickFiles(t('fixtures.import'), (entry) => entry.name.toLowerCase().endsWith('.json'));
        if (files.length === 0) {
            return 0;
        }
        const ids = await engine().request('fixtures.import', { files });
        if (ids.length > 0) {
            await askChoice(t('fixtures.import'), t('fixtures.imported', { count: ids.length }), [{ id: 'ok', label: t('common.ok'), primary: true }]);
        }
        return ids.length;
    } catch (error) {
        await showError(error);
        return 0;
    }
}

/**
 * Opens the fixture library.
 */
export function openFixtureLibrary(): void {
    const dialog = new Dialog({ title: t('fixtures.libraryTitle'), size: 'large' });
    const picker = new FixturePicker();
    const details = new FixtureDetails();
    dialog.append(new Stack({ direction: 'row', gap: 8, align: 'stretch', classes: ['fixture-library'], children: [picker, details] }));
    picker.onSelect((fixture) => details.show(fixture));

    const load = async (): Promise<void> => {
        try {
            picker.setFixtures(await engine().request('fixtures.list'));
        } catch (error) {
            await showError(error);
        }
    };

    const newKey = new Key({ label: t('fixtures.new'), icon: 'plus' });
    const importKey = new Key({ label: t('fixtures.import'), icon: 'package-open' });
    const close = new Key({ label: t('common.close') });
    newKey.onPress(() => openFixtureEditor(null));
    importKey.onPress(() => void importFixtures());
    dialog.addActions(newKey, importKey, close);

    const stop = engine().on('fixtures.changed', () => void load());
    const finish = (): void => {
        stop();
        dialog.close();
    };
    close.onPress(finish);
    dialog.onCancel(finish);

    void load().then(() => {
        dialog.open();
        picker.focus();
    });
}
