/**
 * Import from another show, in the show settings: opens the import dialog.
 */

import { Key, Label, Panel, Stack } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { openShowImportDialog } from './show-import-dialog.js';

export class ShowImportSettings extends Panel {
    constructor() {
        super({ title: t('showImport.title') });

        const open = new Key({ label: t('showImport.open'), icon: 'package-open' });
        open.onPress(() => openShowImportDialog());
        this.append(
            new Stack({ direction: 'row', children: [open] }),
            new Label({ text: t('showImport.panelHint'), tone: 'secondary', size: 'small' })
        );
    }
}
