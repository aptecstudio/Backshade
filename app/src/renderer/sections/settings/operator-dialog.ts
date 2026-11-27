/**
 * Adds or changes an operator of the show: name, PIN, administrator and
 * access to every working section (hidden, read only, editable). The
 * operator who entered cannot be deleted.
 */

import { ChoiceKeys, Dialog, Key, Label, Stack, TextField } from '../../../framework/ts/index.js';
import {
    OPERATOR_NAME_LENGTH,
    OPERATOR_SECTIONS,
    PIN_LENGTH,
    SECTION_ACCESS,
    uniformAccess,
    type OperatorProfile,
    type OperatorSection,
    type SectionAccess
} from '../../../shared/show/operators.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { operatorState } from '../../show/operator-store.js';
import { engine } from '../../transport/engine.js';
import { MAIN_SECTIONS } from '../section-definitions.js';

/**
 * Opens the dialog.
 * @param operator - Operator to change, or null for a new one
 */
export function openOperatorDialog(operator: OperatorProfile | null): void {
    const title = operator === null ? t('operators.newOperator') : t('operators.editOperator');
    const dialog = new Dialog({ title, size: 'wide' });
    const name = new TextField({ label: t('operators.name'), value: operator?.name ?? '', maxLength: OPERATOR_NAME_LENGTH });
    const pin = new TextField({
        label: operator === null ? t('operators.pin') : t('operators.pinKeep'),
        maxLength: PIN_LENGTH,
        secret: true,
        inputMode: 'numeric'
    });
    let admin = operator?.admin === true;
    const adminKey = new Key({ label: t('operators.admin') });
    const adminHint = new Label({ text: t('operators.adminHint'), tone: 'secondary', size: 'small' });

    const access = { ...(operator?.access ?? uniformAccess('hidden')) };
    const rows = new Stack({ classes: ['operator-dialog__access'] });
    for (const section of OPERATOR_SECTIONS) {
        const definition = MAIN_SECTIONS.find((item) => item.id === section);
        const choice = new ChoiceKeys<SectionAccess>({
            ariaLabel: definition === undefined ? section : t(definition.labelKey),
            options: SECTION_ACCESS.map((level) => ({ value: level, label: t(`operators.access.${level}`) })),
            value: access[section]
        });
        choice.onChange((level) => {
            access[section as OperatorSection] = level;
        });
        rows.append(new Label({ text: definition === undefined ? section : t(definition.labelKey) }), choice);
    }
    const sections = new Stack({ gap: 1, children: [new Label({ text: t('operators.sections'), weight: 'medium' }), rows] });

    const renderAdmin = (): void => {
        adminKey.setState(admin ? 'active' : 'normal');
        sections.element.hidden = admin;
        adminHint.element.hidden = !admin;
    };
    adminKey.onPress(() => {
        admin = !admin;
        renderAdmin();
    });
    renderAdmin();

    dialog.append(
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, pin] }),
        new Stack({ direction: 'row', children: [adminKey] }),
        adminHint,
        sections
    );

    const cancel = new Key({ label: t('common.cancel') });
    const save = new Key({ label: t('common.save'), state: 'active' });
    cancel.onPress(() => dialog.close());
    dialog.onCancel(() => dialog.close());
    save.onPress(() => void (async () => {
        try {
            const code = pin.value.trim();
            await engine().request('operators.save', {
                ...(operator === null ? {} : { id: operator.id }),
                name: name.value,
                admin,
                access,
                ...(code === '' ? {} : { pin: code })
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    })());
    if (operator !== null && operator.id !== operatorState().operator?.id) {
        const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
        remove.onPress(() => void (async () => {
            try {
                await engine().request('operators.delete', { id: operator.id });
                dialog.close();
            } catch (error) {
                await showError(error);
            }
        })());
        dialog.addActions(remove);
    }
    dialog.addActions(cancel, save);
    dialog.open();
}
