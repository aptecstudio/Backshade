/**
 * Window of an imported model: its name, the unit of its measures and the
 * axis pointing up, with the resulting size, and whether it also goes into
 * the personal library. An existing model can also be removed.
 */

import { ChoiceKeys, Dialog, Key, Label, Stack, TextField } from '../../framework/ts/index.js';
import { MODEL_AXES, MODEL_UNITS, modelDimensions, type CustomModel, type ModelAxis, type ModelUnit } from '../../shared/stage/custom-model.js';
import { askChoice } from '../dialogs/ask-choice.js';
import { libraryCheckbox } from '../dialogs/library-choice.js';
import { currentLocale, t } from '../i18n/i18n.js';

export type CustomModelChoice = (Pick<CustomModel, 'name' | 'unit' | 'up'> & { library: boolean }) | 'remove' | null;

export interface CustomModelDialogOptions {
    size: CustomModel['size'];
    name: string;
    unit: ModelUnit;
    up: ModelAxis;
    /** Said under the sizes of a new model */
    note?: string;
    /** A new import, a model of the show, or one only in the personal library */
    where: 'new' | 'show' | 'library';
}

/** Unit giving a plausible size for a stage object, between 5 cm and 30 m */
export function likelyUnit(size: CustomModel['size']): ModelUnit {
    const largest = Math.max(...size);
    return largest <= 30 ? 'm' : largest <= 3000 ? 'cm' : 'mm';
}

export function askCustomModel(options: CustomModelDialogOptions): Promise<CustomModelChoice> {
    return new Promise((resolve) => {
        const existing = options.where !== 'new';
        const keep = options.where === 'library' ? null : libraryCheckbox();
        const removeLabel = t(options.where === 'library' ? 'stage.removeFromLibrary' : 'stage.removeModel');
        const dialog = new Dialog({ title: t(existing ? 'stage.editModel' : 'stage.importModel') });
        const name = new TextField({ label: t('stage.modelName'), value: options.name, maxLength: 100 });
        const unit = new ChoiceKeys<ModelUnit>({ ariaLabel: t('stage.unit'), options: MODEL_UNITS.map((value) => ({ value, label: t(`stage.units.${value}`) })), value: options.unit });
        const up = new ChoiceKeys<ModelAxis>({ ariaLabel: t('stage.upAxis'), options: MODEL_AXES.map((value) => ({ value, label: t(`stage.axes.${value}`) })), value: options.up });
        const size = new Label({ text: '' });
        const showSize = (): void => {
            const format = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 2 });
            const [width, height, depth] = modelDimensions(options.size, unit.value, up.value).map((value) => format.format(value));
            size.setText(t('stage.modelSize', { width, height, depth }));
        };
        unit.onChange(showSize);
        up.onChange(showSize);
        showSize();
        dialog.append(new Stack({
            gap: 12,
            children: [
                name,
                new Stack({ gap: 4, children: [new Label({ text: t('stage.unit'), size: 'small' }), unit] }),
                new Stack({ gap: 4, children: [new Label({ text: t('stage.upAxis'), size: 'small' }), up] }),
                size,
                ...(options.note === undefined ? [] : [new Label({ text: options.note, tone: 'secondary', size: 'small' })]),
                ...(keep === null ? [] : [keep])
            ]
        }));
        const finish = (choice: CustomModelChoice): void => {
            dialog.close();
            resolve(choice);
        };
        const cancel = new Key({ label: t('common.cancel') });
        cancel.onPress(() => finish(null));
        const save = new Key({ label: t(existing ? 'common.apply' : 'stage.import'), state: 'active' });
        save.onPress(() => {
            const chosen = name.value.trim();
            if (chosen !== '') {
                finish({ name: chosen, unit: unit.value, up: up.value, library: keep?.checked === true });
            }
        });
        const actions = [cancel, save];
        if (existing) {
            const remove = new Key({ label: removeLabel, icon: 'trash-2' });
            remove.onPress(() => void askChoice(removeLabel, t(options.where === 'library' ? 'stage.removeFromLibraryMessage' : 'stage.removeModelMessage'), [
                { id: 'cancel', label: t('common.cancel') },
                { id: 'remove', label: removeLabel, destructive: true, primary: true }
            ]).then((choice) => {
                if (choice === 'remove') {
                    finish('remove');
                }
            }));
            actions.unshift(remove);
        }
        dialog.addActions(...actions);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
