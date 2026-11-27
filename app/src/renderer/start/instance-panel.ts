/**
 * This computer on the start page: the name that tells it apart among the
 * instances on the network, the key to change it, and its address with the
 * QR code.
 */

import { Key, Label, Panel, Stack } from '../../framework/ts/index.js';
import { INSTANCE_NAME_LENGTH } from '../../shared/remote/instance.js';
import { askText } from '../dialogs/ask-text.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { openConnectionDialog } from '../remote/connection-dialog.js';
import { engine } from '../transport/engine.js';

export class InstancePanel extends Panel {
    private readonly name = new Label({ text: '', size: 'large', weight: 'medium' });

    constructor() {
        super({ title: t('instance.title'), classes: ['instance-panel'] });
        const rename = new Key({ label: t('instance.rename'), icon: 'pencil' });
        rename.onPress(() => void this.rename());
        const connect = new Key({ label: t('remote.connectTitle'), icon: 'scan-line' });
        connect.onPress(() => openConnectionDialog());
        this.append(
            new Stack({ gap: 1, children: [this.name, new Label({ text: t('instance.hint'), tone: 'secondary', size: 'small' })] }),
            new Stack({ direction: 'row', gap: 1, wrap: true, children: [rename, connect] })
        );
        void engine().request('settings.get').then((settings) => this.name.setText(settings.instanceName)).catch(showError);
    }

    private async rename(): Promise<void> {
        const answer = await askText(t('instance.rename'), [{ label: t('instance.name'), value: this.name.element.textContent ?? '', maxLength: INSTANCE_NAME_LENGTH }], t('common.save'));
        if (answer === null || answer[0] === '') {
            return;
        }
        try {
            this.name.setText((await engine().request('settings.update', { instanceName: answer[0] })).instanceName);
        } catch (error) {
            await showError(error);
        }
    }
}
