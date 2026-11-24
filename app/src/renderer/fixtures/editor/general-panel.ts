/**
 * Fixture editor: manufacturer, model and category.
 */

import { Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { FIXTURE_NAME_MAX_LENGTH, type FixtureCategory } from '../../../shared/fixtures/fixture-definition.js';
import { t } from '../../i18n/i18n.js';
import { categoryOptions } from '../fixture-text.js';
import type { FixtureDraft } from './fixture-draft.js';

export class GeneralPanel extends Panel {
    private readonly manufacturer: TextField;

    constructor(draft: FixtureDraft) {
        super({ title: t('fixtureEditor.general') });
        const definition = draft.definition;

        this.manufacturer = new TextField({ label: t('fixtureEditor.manufacturer'), value: definition.manufacturer, maxLength: FIXTURE_NAME_MAX_LENGTH });
        const model = new TextField({ label: t('fixtureEditor.model'), value: definition.model, maxLength: FIXTURE_NAME_MAX_LENGTH });
        const category = new SelectField<FixtureCategory>({ label: t('fixtureEditor.category'), options: categoryOptions(), value: definition.category });

        this.track(this.manufacturer.onInput((value) => {
            definition.manufacturer = value;
        }));
        this.track(model.onInput((value) => {
            definition.model = value;
        }));
        this.track(category.onChange((value) => {
            definition.category = value;
        }));

        this.append(new Stack({ direction: 'row', gap: 2, classes: ['fixture-editor__fields'], children: [this.manufacturer, model, category] }));
    }

    /**
     * Moves the focus to the first field.
     */
    focus(): void {
        this.manufacturer.focus();
    }
}
