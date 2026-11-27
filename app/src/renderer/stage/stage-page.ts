/**
 * Page of the 3D stage window: the editor when a show is open and the
 * operator sees the stage, otherwise why it is not shown.
 */

import { Label, Stack } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { accessTo, isLocked, onOperatorChange } from '../show/operator-store.js';
import { currentShow } from '../show/show-store.js';
import { engine } from '../transport/engine.js';
import type { ModelInfo } from './model-library.js';
import { StageEditor } from './stage-editor.js';

export class StagePage extends Stack {
    private readonly message = new Label({ text: '', tone: 'secondary' });
    private readonly editor: StageEditor;
    /** Show whose stage is in the editor */
    private loaded: string | null = null;

    constructor(models: readonly ModelInfo[]) {
        super({ classes: ['stage-page'] });
        this.editor = new StageEditor(models);
        this.append(this.message, this.editor);
        this.track(onOperatorChange(() => void this.refresh().catch(showError)));
        this.track(engine().on('stage.changed', () => void this.reload().catch(showError)));
        this.track(engine().on('patch.changed', () => void this.reload().catch(showError)));
        void this.refresh().catch(showError);
    }

    private async reload(): Promise<void> {
        if (this.loaded !== null && this.loaded === currentShow()?.id && accessTo('stage') !== 'hidden') {
            await this.editor.load(false);
        }
    }

    private async refresh(): Promise<void> {
        const show = currentShow();
        const access = accessTo('stage');
        const reason = show === null ? t('stage.noShow') : isLocked() ? t('stage.locked') : access === 'hidden' ? t('stage.denied') : null;
        this.message.element.hidden = reason === null;
        this.editor.element.hidden = reason !== null;
        if (reason !== null || show === null) {
            this.message.setText(reason ?? '');
            this.editor.setEditable(false);
            this.loaded = null;
            return;
        }
        this.editor.setEditable(access === 'edit');
        if (this.loaded !== show.id) {
            this.loaded = show.id;
            await this.editor.load(true);
        }
    }
}
