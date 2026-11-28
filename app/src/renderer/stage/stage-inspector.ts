/**
 * Panel of the selected stage object: its name, position, model for
 * fixtures, and the actions on it.
 */

import { Emitter, Key, Label, Panel, SelectField, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import type { StageObject } from '../../shared/stage/stage.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { currentLocale, t } from '../i18n/i18n.js';
import type { ModelInfo } from './model-library.js';
import { modelName } from './stage-library-panel.js';

export type InspectorAction = 'hang' | 'mount' | 'detach' | 'duplicate' | 'remove';

export interface InspectorState {
    object: StageObject | null;
    fixture: PatchEntry | null;
    editable: boolean;
    /** There is a truss to hang on */
    hasTruss: boolean;
    /** There is a stand to mount on */
    hasStand: boolean;
    /** Height of the top of an adjustable stand, null for other objects */
    height: number | null;
    /** The object is on a stand */
    mounted: boolean;
}

export class StageInspector extends Panel {
    private readonly actions = new Emitter<InspectorAction>();
    private readonly modelChanges = new Emitter<string>();
    private content = new Stack();
    private readonly area = new Stack();

    constructor(private readonly models: readonly ModelInfo[]) {
        super({ title: t('stage.object'), classes: ['stage-panel'] });
        this.append(this.area);
    }

    onAction(listener: (action: InspectorAction) => void): Unsubscribe {
        return this.actions.subscribe(listener);
    }

    onModel(listener: (model: string) => void): Unsubscribe {
        return this.modelChanges.subscribe(listener);
    }

    show({ object, fixture, editable, hasTruss, hasStand, height, mounted }: InspectorState): void {
        this.content.destroy();
        this.content = new Stack({ gap: 12 });
        this.area.append(this.content);
        if (object === null) {
            this.content.append(new Label({ text: t('stage.noSelection'), size: 'small' }));
            return;
        }
        const format = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 2 });
        const [x, y, z] = object.position.map((value) => format.format(value));
        this.content.append(
            new Label({ text: fixture === null ? modelName(object.model) : `${fixture.number}  ${fixture.name}`, weight: 'medium' }),
            new Label({ text: t('stage.position', { x, y, z }), tone: 'secondary', size: 'small' })
        );
        if (height !== null) {
            this.content.append(new Label({ text: t('stage.height', { height: format.format(height) }), size: 'small' }));
        }
        if (object.hungOn !== null) {
            this.content.append(new Label({ text: t(mounted ? 'stage.mounted' : 'stage.hung'), tone: 'secondary', size: 'small' }));
        }
        if (!editable) {
            return;
        }
        if (object.fixture !== null) {
            const choice = new SelectField<string>({
                label: t('stage.model'),
                options: this.models.filter((model) => model.category === 'fixtures').map((model) => ({ value: model.id, label: modelName(model.id) })),
                value: object.model
            });
            choice.onChange((model) => this.modelChanges.emit(model));
            this.content.append(choice);
            if (object.hungOn === null) {
                this.content.append(this.key('hang', !hasTruss), this.key('mount', !hasStand));
            } else {
                this.content.append(this.key('detach', false, undefined, mounted ? t('stage.unmount') : undefined));
            }
        } else {
            this.content.append(this.key('duplicate', false, 'copy'));
        }
        this.content.append(this.key('remove', false, 'trash-2'));
    }

    private key(action: InspectorAction, disabled: boolean, icon?: 'copy' | 'trash-2', label = t(`stage.${action}`)): Key {
        const key = new Key({ label, icon });
        key.setDisabled(disabled);
        key.onPress(() => this.actions.emit(action));
        return key;
    }
}
