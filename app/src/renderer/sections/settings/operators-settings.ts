/**
 * Operators of the show, in the show settings: the list with the access of
 * every profile, adding and changing operators.
 */

import { Key, Label, Panel, Spacer, Stack } from '../../../framework/ts/index.js';
import { effectiveAccess, OPERATOR_SECTIONS, type OperatorProfile } from '../../../shared/show/operators.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { canManageShow, operatorState } from '../../show/operator-store.js';
import { engine } from '../../transport/engine.js';
import { openOperatorDialog } from './operator-dialog.js';

function summary(operator: OperatorProfile): string {
    if (operator.admin) {
        return t('operators.administrator');
    }
    const access = effectiveAccess(operator);
    const shown = OPERATOR_SECTIONS.filter((section) => access[section] !== 'hidden').length;
    const edit = OPERATOR_SECTIONS.filter((section) => access[section] === 'edit').length;
    return t('operators.summary', { shown, edit });
}

export class OperatorsSettings extends Panel {
    private content: Stack | null = null;

    constructor() {
        super({ title: t('operators.title') });

        this.append(new Label({ text: t('operators.hint'), tone: 'secondary', size: 'small' }));
        this.track(engine().on('operators.changed', () => void this.load()));
        this.track(() => this.content?.destroy());
        void this.load();
    }

    private async load(): Promise<void> {
        // An operator who left, or who is not an administrator, cannot read the list: the tab closes
        if (!canManageShow()) {
            return;
        }
        try {
            this.render(await engine().request('operators.list'));
        } catch (error) {
            await showError(error);
        }
    }

    private render(operators: OperatorProfile[]): void {
        this.content?.destroy();
        const me = operatorState().operator?.id;
        const children = [
            ...operators.map((operator) => {
                const edit = new Key({ label: t('operators.edit'), icon: 'pencil' });
                edit.onPress(() => openOperatorDialog(operator));
                return new Stack({
                    direction: 'row',
                    gap: 8,
                    align: 'center',
                    classes: ['operator-row'],
                    children: [
                        new Label({ text: operator.id === me ? t('operators.you', { name: operator.name }) : operator.name }),
                        new Label({ text: summary(operator), tone: 'secondary', size: 'small' }),
                        new Spacer(),
                        edit
                    ]
                });
            }),
            this.addKey(t('operators.add'))
        ];
        this.content = new Stack({ gap: 12, children });
        this.append(this.content);
    }

    private addKey(label: string): Stack {
        const key = new Key({ label, icon: 'user-round-plus' });
        key.onPress(() => openOperatorDialog(null));
        return new Stack({ direction: 'row', children: [key] });
    }
}
