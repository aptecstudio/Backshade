/**
 * Page of the 3D stage window: the camera views on top, the catalog of the
 * bundled models on the side and the 3D view.
 */

import { ChoiceKeys, Label, ListItem, Panel, Stack } from '../../framework/ts/index.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { listModels, loadModel, type ModelCategory, type ModelInfo } from './model-library.js';
import { STAGE_CAMERAS, StageView, type StageCamera } from './stage-view.js';

const CATEGORIES: readonly ModelCategory[] = ['truss', 'stage', 'fixtures', 'musicians', 'elements'];

export class StagePage extends Stack {
    private readonly view = new StageView();
    private readonly catalog = new Panel({ title: t('stage.library'), classes: ['stage-catalog'] });
    private readonly items = new Map<string, ListItem>();

    constructor() {
        super({ gap: 2, classes: ['stage-page'] });
        const cameras = new ChoiceKeys<StageCamera>({
            ariaLabel: t('stage.camera'),
            options: STAGE_CAMERAS.map((value) => ({ value, label: t(`stage.cameras.${value}`) })),
            value: 'free'
        });
        cameras.onChange((camera) => this.view.setCamera(camera));
        this.append(
            new Stack({ direction: 'row', gap: 2, align: 'center', children: [cameras] }),
            new Stack({ direction: 'row', gap: 2, classes: ['stage-page__body'], children: [this.catalog, this.view] })
        );
        void this.load();
    }

    private async load(): Promise<void> {
        try {
            const models = await listModels();
            for (const category of CATEGORIES) {
                const rows = models.filter((model) => model.category === category).map((model) => {
                    const item = new ListItem({ children: [new Label({ text: t(`stage.models.${model.id}` as 'stage.models.par'), size: 'small' })] });
                    item.onPress(() => void this.show(model));
                    this.items.set(model.id, item);
                    return item;
                });
                if (rows.length > 0) {
                    this.catalog.append(new Label({ text: t(`stage.categories.${category}`), tone: 'secondary', size: 'small' }), new Stack({ children: rows }));
                }
            }
            if (models.length > 0) {
                await this.show(models.find((model) => model.id === 'moving-head') ?? models[0]);
            }
        } catch (error) {
            await showError(error);
        }
    }

    private async show(model: ModelInfo): Promise<void> {
        this.items.forEach((item, id) => item.setSelected(id === model.id));
        try {
            this.view.setContent([await loadModel(model)]);
        } catch (error) {
            await showError(error);
        }
    }
}
