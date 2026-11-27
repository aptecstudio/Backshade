/**
 * A show without operators (an older show, an imported archive) asks for
 * its administrator before anything else. The dialog cannot be cancelled:
 * the only other way out is closing the show.
 */

import { Dialog, Key } from '../../framework/ts/index.js';
import { uniformAccess } from '../../shared/show/operators.js';
import { t } from '../i18n/i18n.js';
import { closeShow } from '../show/show-commands.js';
import { engine } from '../transport/engine.js';
import { AdminFields } from './admin-fields.js';
import { showError } from './show-error.js';

export class AdminDialog {
    private readonly dialog = new Dialog({ title: t('operators.firstOperator'), size: 'wide' });
    private readonly fields = new AdminFields();

    constructor() {
        this.dialog.append(this.fields);
        const close = new Key({ label: t('operators.closeShow') });
        close.onPress(() => void closeShow());
        const create = new Key({ label: t('operators.createAdmin'), icon: 'user-round-plus', state: 'active' });
        create.onPress(() => void this.create());
        this.dialog.addActions(close, create);
    }

    open(): void {
        this.dialog.open();
    }

    close(): void {
        this.dialog.close();
    }

    private async create(): Promise<void> {
        const admin = this.fields.read();
        if (admin === null) {
            return;
        }
        try {
            // On success the operator state changes and the lock closes the dialog
            await engine().request('operators.save', { ...admin, admin: true, access: uniformAccess('edit') });
        } catch (error) {
            await showError(error);
        }
    }
}
