/**
 * Azioni della schermata iniziale: nuovo show, apri show, modelli.
 */

import { Key, Panel } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { newShow, openShow } from '../show/show-commands.js';
import { openTemplateManager } from '../templates/template-manager-dialog.js';

export class StartActionsPanel extends Panel {
    constructor() {
        super({ title: t('start.actions'), classes: ['start-actions'] });

        const create = new Key({ label: t('start.newShow'), icon: 'file-plus' });
        const open = new Key({ label: t('start.openShow'), icon: 'folder-open' });
        const templates = new Key({ label: t('start.manageTemplates'), icon: 'layout-template' });
        create.onPress(() => void newShow());
        open.onPress(() => void openShow());
        templates.onPress(() => openTemplateManager());

        this.append(create, open, templates);
    }
}
