/**
 * Default folder of new shows, in the global settings.
 */

import { Key, Label, Panel, Stack, TextField } from '../../../framework/ts/index.js';
import { showError } from '../../dialogs/show-error.js';
import { pickFolder } from '../../files/file-dialogs.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class ShowsFolderSettings extends Panel {
    constructor() {
        super({ title: t('settings.showsFolder') });

        const field = new TextField({ label: t('settings.showsFolder'), value: '', readOnly: true });
        const choose = new Key({ label: t('settings.chooseFolder'), icon: 'folder-open' });
        choose.onPress(() => void (async () => {
            try {
                const folder = await pickFolder(t('settings.showsFolder'), field.value);
                if (folder !== null) {
                    const settings = await engine().request('settings.update', { defaultShowsFolder: folder });
                    field.setValue(settings.defaultShowsFolder);
                }
            } catch (error) {
                await showError(error);
            }
        })());

        this.append(
            new Stack({ direction: 'row', gap: 1, align: 'end', classes: ['folder-picker'], children: [field, choose] }),
            new Label({ text: t('settings.showsFolderHint'), tone: 'secondary', size: 'small' })
        );

        void engine().request('settings.get').then((settings) => field.setValue(settings.defaultShowsFolder));
    }
}
