/**
 * Actions of the start page: new show, open show, templates, and the remote
 * control of another instance (not inside a remote client).
 */

import { Key, Panel } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { importShow, newShow, openShow } from '../show/show-commands.js';
import { openDiscoverDialog } from '../remote/discover-dialog.js';
import { openTemplateManager } from '../templates/template-manager-dialog.js';
import { isRemote } from '../transport/engine.js';

export class StartActionsPanel extends Panel {
    constructor() {
        super({ title: t('start.actions'), classes: ['start-actions'] });

        const create = new Key({ label: t('start.newShow'), icon: 'file-plus' });
        const open = new Key({ label: t('start.openShow'), icon: 'folder-open' });
        const importKey = new Key({ label: t('start.importShow'), icon: 'package-open' });
        const templates = new Key({ label: t('start.manageTemplates'), icon: 'layout-template' });
        create.onPress(() => void newShow());
        open.onPress(() => void openShow());
        importKey.onPress(() => void importShow());
        templates.onPress(() => openTemplateManager());

        const remote = new Key({ label: t('instance.remoteControl'), icon: 'radar' });
        remote.onPress(() => openDiscoverDialog());
        remote.element.hidden = isRemote();

        this.append(create, open, importKey, templates, remote);
    }
}
